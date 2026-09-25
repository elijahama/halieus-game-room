import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { io } from 'socket.io-client';

const root = resolve(import.meta.dirname, '..');
const data = await mkdtemp(resolve(tmpdir(), 'hgr-classic-lifecycle-'));
const port = process.env.HGR_CLASSIC_TEST_PORT || '39472';
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['--import', 'tsx', resolve(root, 'tests/fixtures/classic-lifecycle-server.mjs')], {
  cwd: resolve(root, 'server'), env: { ...process.env, PORT: port, HALIEUS_DATA_DIR: data, HALIEUS_OWNER_BOOTSTRAP_FILE: resolve(data, 'bootstrap.txt') }, stdio: 'pipe',
});
let output = '';
child.stdout.on('data', (d) => output += d); child.stderr.on('data', (d) => output += d);
const sockets = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (socket, event, payload) => new Promise((ok, fail) => socket.timeout(5000).emit(event, payload, (error, response) => error ? fail(error) : ok(response)));
const yes = (response) => { assert.equal(response.ok, true, response.reason); return response; };
async function connect() {
  const socket = io(base, { transports: ['websocket'], reconnection: false }); sockets.push(socket);
  await new Promise((ok, fail) => { socket.once('connect', ok); socket.once('connect_error', fail); });
  return socket;
}
let serial = 0;
async function room(game, second = true) {
  const code = `T${String(++serial).padStart(5, '0')}`;
  const host = { socket: await connect(), name: 'Lifecycle Host' };
  const created = yes(await ack(host.socket, `${game}:create`, { code, playerName: host.name, aiCount: 0 }));
  host.token = created.reconnectToken;
  const seats = [host];
  if (second) {
    const guest = { socket: await connect(), name: 'Lifecycle Guest' };
    guest.token = yes(await ack(guest.socket, `${game}:join`, { code, playerName: guest.name })).reconnectToken;
    seats.push(guest);
  }
  return { code, game, host, seats, state: created.state };
}
async function send(r, seat, event, extra = {}) {
  const response = await ack(seat.socket, `${r.game}:${event}`, { code: r.code, matchId: r.state.matchId, ...extra });
  if (response.state) r.state = response.state;
  return response;
}
async function recover(r, seat) { return yes(await send(r, seat, 'reconnect', { reconnectToken: seat.token, playerName: seat.name })).state; }
async function archiveFiles() {
  const dir = resolve(data, 'sessions/finalized');
  try { return await Promise.all((await readdir(dir)).filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await readFile(resolve(dir, f), 'utf8')))); } catch { return []; }
}
async function archived(matchId, code) {
  for (let i = 0; i < 100; i++) {
    const value = (await archiveFiles()).find((v) => v.roomCode === code && v.state.matchId === matchId);
    if (value) return value;
    await wait(20);
  }
  assert.fail(`Archive missing for ${code}/${matchId}\n${output}`);
}
const noResult = (s) => {
  assert.equal(s.phase, 'finished'); assert.equal(s.winnerPlayerId, null);
  assert.equal(s.outcome.kind, 'cancelled'); assert.equal(s.outcome.countsAsCompletedPlay, false);
  assert.ok(s.players.every((p) => p.result === null));
};

try {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) assert.fail(output);
    try { if ((await fetch(`${base}/health`)).ok) break; } catch {}
    await wait(100);
  }
  const bootstrap = (await readFile(resolve(data, 'bootstrap.txt'), 'utf8')).match(/OWNER-[A-Z0-9-]+/)[0];
  const setup = await fetch(`${base}/auth/setup-owner`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bootstrapCode: bootstrap, username: 'lifecycle', displayName: 'Lifecycle Host', password: 'isolated-lifecycle-test-password' }) });
  assert.equal(setup.status, 201);
  const cookie = setup.headers.get('set-cookie').split(';')[0];
  const account = (await setup.json()).account;
  const stats = async () => (await (await fetch(`${base}/accounts/players/${account.id}/stats`, { headers: { cookie } })).json()).stats;

  // A/B/E/F: same shared administrative semantics for Dominoes and Cheat.
  for (const game of ['dominoes', 'cheat']) {
    const lobby = await room(game, false);
    const ended = yes(await send(lobby, lobby.host, 'end-game')).state;
    noResult(ended); assert.equal(ended.startedAt, null); assert.equal(ended.started, false); assert.equal(ended.matchId, null);
    yes(await send(lobby, lobby.host, 'end-game'));
    assert.equal((await send(lobby, lobby.host, 'start')).ok, false);
    const lobbyArchive = await archived(null, lobby.code);
    assert.equal(lobbyArchive.status, 'host-ended'); assert.equal(lobbyArchive.summary.winner, null);

    const r = await room(game);
    yes(await send(r, r.host, 'start'));
    const before = await recover(r, r.host);
    const unchanged = { matchId: before.matchId, startedAt: before.startedAt, hand: before.viewerTiles ?? before.viewerHand };
    assert.equal((await send(r, r.seats[1], 'end-game')).ok, false, 'Only host may close');
    assert.equal((await send(r, r.host, 'start')).ok, false, 'Cannot redeal active match');
    const after = await recover(r, r.host);
    assert.deepEqual({ matchId: after.matchId, startedAt: after.startedAt, hand: after.viewerTiles ?? after.viewerHand }, unchanged);
    const first = yes(await send(r, r.host, 'end-game')).state;
    noResult(first); assert.equal(first.started, true);
    const second = yes(await send(r, r.host, 'end-game')).state;
    assert.deepEqual(second.outcome, first.outcome);
    assert.equal((await send(r, r.host, 'forfeit')).ok, false);
    const final = await archived(first.matchId, r.code);
    assert.equal(final.status, 'host-ended'); assert.equal(final.summary.countsAsCompletedPlay, false);
    assert.equal((await archiveFiles()).filter((a) => a.roomCode === r.code).length, 1);
  }
  assert.equal((await stats()).played, 0, 'Closures must not count as played/lost/won');
  const quick = await (await fetch(`${base}/accounts/me/quick-play`, { headers: { cookie } })).json();
  assert.deepEqual(quick.profile.preferences, [], 'Cancelled rooms cannot become progression/play history');
  console.log('PASS A/B/E/F: lobby and active cancellation, no stats, no active restart, idempotent End in both games');

  // H: two actual human sockets, recoverable leave and network loss; no new timer.
  for (const game of ['dominoes', 'cheat']) {
    const r = await room(game); yes(await send(r, r.host, 'start'));
    const identity = { matchId: r.state.matchId, startedAt: r.state.startedAt };
    const current = r.seats.find((s) => s.socket.id === r.state.currentTurnPlayerId);
    const other = r.seats.find((s) => s !== current);
    const before = await recover(r, current); const hand = before.viewerTiles ?? before.viewerHand;
    const oldId = current.socket.id; current.socket.disconnect(); await wait(700);
    let state = await recover(r, other);
    assert.equal(state.currentTurnPlayerId, oldId); assert.equal(state.outcome, null);
    assert.equal(state.players.find((p) => p.id === oldId).isConnected, false);
    current.socket = await connect(); state = await recover(r, current);
    assert.equal(state.currentTurnPlayerId, current.socket.id);
    assert.deepEqual(state.viewerTiles ?? state.viewerHand, hand);
    assert.deepEqual({ matchId: state.matchId, startedAt: state.startedAt }, identity);
    yes(await send(r, current, 'leave')); await wait(700);
    state = await recover(r, other); assert.equal(state.currentTurnPlayerId, current.socket.id); assert.equal(state.outcome, null);
    assert.equal((await send(r, current, 'start')).ok, false, 'Detached seat cannot mutate');
    await recover(r, current);
    other.socket.disconnect(); await wait(50); state = await recover(r, current);
    assert.equal(state.currentTurnPlayerId, current.socket.id); assert.equal(state.winnerPlayerId, null);
    other.socket = await connect(); await recover(r, other);
    const spectator = await connect();
    const spectated = yes(await ack(spectator, `${game}:spectate`, { code: r.code }));
    assert.equal(spectated.state.viewerReconnectToken, null, 'Never reveal seat recovery to spectators');
    assert.ok(spectated.state.players.every((p) => p.hand === null || p.tiles === null));
    spectator.disconnect(); await wait(50); state = await recover(r, current);
    assert.equal(state.spectatorCount, 0); assert.equal(state.outcome, null);
    // Prove the recovered player can act, not just receive their old seat.
    if (game === 'dominoes') yes(await send(r, current, 'play', { tileId: state.viewerTiles[0].id, side: 'left' }));
    else yes(await send(r, current, 'play', { cardIds: [state.viewerHand[0].id] }));
    yes(await send(r, r.host, 'end-game'));
  }
  console.log('PASS H: current/non-current/spectator disconnect, explicit Leave, recovery preserves hand/turn/identity and resumes actions');

  // C/D/G: legal public moves on deterministic deals, including rematches.
  const d = await room('dominoes'); const reasons = new Set(); let previous = null;
  for (let match = 0; match < 40 && (reasons.size < 2 || match < 2); match++) {
    yes(await send(d, d.host, 'start'));
    if (previous) {
      assert.notEqual(d.state.matchId, previous.matchId); assert.ok(d.state.startedAt > previous.startedAt);
      assert.equal(d.state.outcome, null); assert.equal(d.state.winnerPlayerId, null);
      assert.ok(d.state.players.every((p) => p.result === null));
      assert.equal((await send(d, d.host, 'end-game', { matchId: previous.matchId })).ok, false, 'Old End must not cancel rematch');
      assert.equal((await send(d, d.host, 'start', { matchId: previous.matchId })).ok, false, 'Old Start must not redeal');
      const old = await archived(previous.matchId, d.code);
      assert.equal(old.state.winnerPlayerId, previous.winnerPlayerId, 'Immediate rematch cannot mutate archive');
      assert.equal(old.state.outcome.kind, 'completed');
    }
    for (let turn = 0; turn < 400 && d.state.phase === 'playing'; turn++) {
      const seat = d.seats.find((s) => s.socket.id === d.state.currentTurnPlayerId);
      const s = await recover(d, seat);
      const tile = s.viewerTiles.filter((t) => s.playableTileIds.includes(t.id)).sort((a,b) => b.a+b.b-a.a-a.b)[0];
      if (tile) yes(await send(d, seat, 'play', { tileId: tile.id, side: s.leftEnd === null || tile.a === s.leftEnd || tile.b === s.leftEnd ? 'left' : 'right' }));
      else if (s.canDraw) yes(await send(d, seat, 'draw'));
      else { assert.equal(s.canPass, true); yes(await send(d, seat, 'pass')); }
    }
    assert.equal(d.state.phase, 'finished'); assert.equal(d.state.outcome.kind, 'completed');
    reasons.add(d.state.outcome.reason);
    previous = structuredClone(d.state);
    const archive = await archived(d.state.matchId, d.code);
    assert.equal(archive.status, 'completed'); assert.equal(archive.state.startedAt, d.state.startedAt);
    assert.equal(archive.state.matchId, archive.sessionId);
    const winner = archive.state.players.find((p) => p.id === archive.state.winnerPlayerId);
    if (archive.state.outcome.reason === 'dominoes-empty-hand') assert.equal(winner.hand.length, 0);
    else {
      assert.equal(archive.state.boneyard.length, 0);
      assert.ok(archive.state.consecutivePasses >= archive.state.players.length);
      const rank = archive.state.players.slice().sort((a,b) => a.hand.reduce((v,t) => v+t.a+t.b,0)-b.hand.reduce((v,t) => v+t.a+t.b,0) || a.seat-b.seat);
      assert.equal(winner.id, rank[0].id, 'Existing blocked pip/seat rule');
    }
    const completed = JSON.stringify(archive);
    yes(await send(d, d.host, 'end-game'));
    assert.equal(JSON.stringify(await archived(d.state.matchId, d.code)), completed, 'End cannot overwrite legitimate completion');
  }
  assert.deepEqual([...reasons].sort(), ['dominoes-blocked', 'dominoes-empty-hand']);
  console.log('PASS C/D/G: empty-hand and blocked wins, existing tie-break fixtures, fresh rematches, stale-request rejection and independent archives');

  // I: Cheat's final claim must still be accepted before winning.
  const c = await room('cheat'); yes(await send(c, c.host, 'start'));
  for (let turn = 0; turn < 80 && c.state.phase === 'playing'; turn++) {
    const seat = c.seats.find((s) => s.socket.id === c.state.currentTurnPlayerId);
    let s = await recover(c, seat);
    if (s.pendingClaim) { yes(await send(c, seat, 'accept')); s = c.state; }
    if (s.phase === 'playing') yes(await send(c, seat, 'play', { cardIds: s.viewerHand.slice(0, 4).map((card) => card.id) }));
  }
  assert.equal(c.state.outcome.reason, 'cheat-final-claim-accepted');
  const cheatFinal = structuredClone(c.state);
  yes(await send(c, c.host, 'start'));
  assert.notEqual(c.state.matchId, cheatFinal.matchId); assert.ok(c.state.startedAt > cheatFinal.startedAt);
  assert.equal(c.state.pendingClaim, null); assert.equal(c.state.outcome, null);
  const previousCheat = await archived(cheatFinal.matchId, c.code);
  assert.equal(previousCheat.state.outcome.kind, 'completed');
  assert.equal(previousCheat.state.pendingClaim, null, 'Completed archive has no unresolved claim');
  assert.equal(previousCheat.state.pendingWinnerId, null);
  yes(await send(c, c.host, 'end-game'));
  for (const game of ['cheat', 'dominoes']) {
    const r = await room(game); yes(await send(r, r.host, 'start'));
    const forfeited = r.state.matchId;
    yes(await send(r, r.seats[1], 'forfeit'));
    const final = await archived(forfeited, r.code);
    assert.equal(final.status, 'forfeit-completed'); assert.equal(final.state.outcome.kind, 'forfeited');
    assert.equal(final.summary.winner, r.host.name); assert.equal(final.state.players.length, 2, 'Archive retains forfeiting participant');
    assert.equal((await send(r, r.seats[1], 'forfeit')).ok, false);
  }
  await wait(300);
  const finals = await archiveFiles();
  assert.equal(new Set(finals.map((f) => f.sessionId)).size, finals.length);
  const index = (await readFile(resolve(data, 'sessions/sessions-index.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(new Set(index.map((f) => f.sessionId)).size, index.length, 'No duplicate index/projection finalizations');
  const expected = finals.filter((f) => f.state.outcome.countsAsCompletedPlay && f.state.players.some((p) => p.name === 'Lifecycle Host'));
  const actualStats = await stats(); assert.equal(actualStats.played, expected.length);
  assert.equal(actualStats.wins, expected.filter((f) => f.summary.winner === 'Lifecycle Host').length);
  console.log('PASS I/archive/stats: Cheat accepted claims and rematch, explicit two-player forfeits, retained participants, exact play/win counts and unique finalizations');
} finally {
  for (const socket of sockets) socket.disconnect();
  child.kill(); if (child.exitCode === null) await new Promise((r) => child.once('exit', r));
  await rm(data, { recursive: true, force: true });
}
