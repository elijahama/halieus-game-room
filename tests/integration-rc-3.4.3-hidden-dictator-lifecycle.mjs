import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3152;
const server = spawn(process.execPath, ['dist/server/src/index.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (chunk) => { output += chunk.toString(); });
server.stderr.on('data', (chunk) => { output += chunk.toString(); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    if (output.includes(`Listening on port ${port}`)) return;
    if (server.exitCode !== null) throw new Error(`Server exited early:\n${output}`);
    await wait(100);
  }
  throw new Error(`Server did not start:\n${output}`);
}
function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}
function emitAck(socket, event, payload) { return new Promise((resolve) => socket.emit(event, payload, resolve)); }
function waitForState(socket, predicate, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('hidden-dictator:state', handler); reject(new Error('Timed out waiting for Hidden Dictator state.')); }, timeout);
    const handler = (state) => {
      if (!predicate(state)) return;
      clearTimeout(timer); socket.off('hidden-dictator:state', handler); resolve(state);
    };
    socket.on('hidden-dictator:state', handler);
  });
}

const players = [];
let spectator;
let recovered;
try {
  await waitForServer();
  for (let i = 0; i < 5; i += 1) players.push(await connect());
  const [host, deputy, p3, p4, p5] = players;
  const code = `H${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);

  const created = await emitAck(host, 'hidden-dictator:create', { code, playerName: 'Speaker', matchMode: 'ranked' });
  assert.equal(created.ok, true);
  assert.equal(created.state.phase, 'lobby');
  assert.equal(created.state.matchMode, 'ranked');
  assert.ok(created.reconnectToken);

  const joined = [];
  for (const [socket, name] of [[deputy, 'Deputy'], [p3, 'Third'], [p4, 'Fourth'], [p5, 'Fifth']]) {
    const response = await emitAck(socket, 'hidden-dictator:join', { code, playerName: name });
    assert.equal(response.ok, true);
    joined.push(response);
  }

  const startStateP = waitForState(host, (s) => s.phase === 'nomination' && s.roundNumber === 1);
  assert.equal((await emitAck(host, 'hidden-dictator:start', { code })).ok, true);
  const initial = await startStateP;
  assert.equal(initial.players.length, 5);
  assert.equal(initial.speakerPlayerId, created.playerId);
  assert.ok(['citizen', 'authoritarian', 'dictator'].includes(initial.viewerRole));
  assert.equal(initial.viewerPolicyHand.length, 0);
  assert.equal(initial.knownAuthoritarianPlayerIds.length, initial.viewerRole === 'citizen' ? 0 : 2);

  spectator = await connect();
  const watched = await emitAck(spectator, 'hidden-dictator:spectate', { code, playerName: 'Watcher' });
  assert.equal(watched.ok, true);
  assert.equal(watched.state.isSpectator, true);
  assert.equal(watched.state.viewerRole, null);
  assert.deepEqual(watched.state.knownAuthoritarianPlayerIds, []);
  assert.deepEqual(watched.state.viewerPolicyHand, []);

  const votingP = waitForState(host, (s) => s.phase === 'voting' && s.nominatedDeputyId === joined[0].state.viewerPlayerId);
  assert.equal((await emitAck(host, 'hidden-dictator:nominate', { code, playerId: joined[0].state.viewerPlayerId })).ok, true);
  await votingP;

  // Deterministic all-approve government. Register the final-state listener before the last vote
  // so a fast local server cannot emit speaker-policy before the test starts listening.
  for (const socket of players.slice(0, -1)) {
    const response = await emitAck(socket, 'hidden-dictator:vote', { code, vote: 'approve' });
    assert.equal(response.ok, true);
  }
  const speakerPolicyP = waitForState(host, (s) => s.phase === 'speaker-policy');
  const finalVote = await emitAck(players.at(-1), 'hidden-dictator:vote', { code, vote: 'approve' });
  assert.equal(finalVote.ok, true);
  const speakerPolicy = await speakerPolicyP;
  assert.equal(speakerPolicy.viewerPolicyHand.length, 3);
  assert.equal(speakerPolicy.revealedVotes.length, 5);
  assert.equal(speakerPolicy.revealedVotes.every((v) => v.vote === 'approve'), true);

  const deputyPolicyP = waitForState(deputy, (s) => s.phase === 'deputy-policy');
  assert.equal((await emitAck(host, 'hidden-dictator:speaker-discard', { code, index: 0 })).ok, true);
  const deputyPolicy = await deputyPolicyP;
  assert.equal(deputyPolicy.viewerPolicyHand.length, 2);

  const nextRoundP = waitForState(deputy, (s) => s.phase === 'nomination' && s.roundNumber === 2);
  assert.equal((await emitAck(deputy, 'hidden-dictator:deputy-enact', { code, index: 0 })).ok, true);
  const nextRound = await nextRoundP;
  assert.equal(nextRound.civicPolicies + nextRound.controlPolicies, 1);
  assert.equal(nextRound.speakerPlayerId, joined[0].state.viewerPlayerId);
  assert.ok(nextRound.actionLog.some((entry) => entry.action === 'policy'));

  // Recover the original host without exposing another player's role.
  host.disconnect();
  players[0] = null;
  await wait(120);
  recovered = await connect();
  const restored = await emitAck(recovered, 'hidden-dictator:reconnect', { code, reconnectToken: created.reconnectToken, playerName: 'Speaker' });
  assert.equal(restored.ok, true);
  assert.equal(restored.state.viewerPlayerId, restored.state.players.find((p) => p.name === 'Speaker')?.id);
  assert.ok(['citizen', 'authoritarian', 'dictator'].includes(restored.state.viewerRole));

  // Original host retains host authority after recovery and can archive the test room.
  const endedStateP = waitForState(recovered, (s) => s.phase === 'finished');
  const ended = await emitAck(recovered, 'hidden-dictator:end-game', { code });
  assert.equal(ended.ok, true);
  const finished = await endedStateP;
  assert.equal(finished.phase, 'finished');
  assert.match(finished.status, /ended Hidden Dictator/i);

  console.log('RC 3.4.3 Hidden Dictator government + privacy + reconnect integration passed.');
} finally {
  for (const socket of players) socket?.disconnect();
  recovered?.disconnect();
  spectator?.disconnect();
  server.kill('SIGTERM');
}
