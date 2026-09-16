import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3138;
const server = spawn(process.execPath, ['dist/server/src/index.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    if (serverOutput.includes(`Listening on port ${port}`)) return;
    if (server.exitCode !== null) throw new Error(`Server exited early:\n${serverOutput}`);
    await wait(100);
  }
  throw new Error(`Server did not start:\n${serverOutput}`);
}
function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}
function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

let host;
let recovered;
let spectator;
try {
  await waitForServer();
  host = await connect();
  const code = `W${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created = await emitAck(host, 'whot:create', { code, playerName: 'RankHost', matchMode: 'ranked' });
  assert.equal(created.ok, true);
  assert.equal(created.state.matchMode, 'ranked');
  assert.deepEqual(created.state.actionLog, []);
  assert.ok(created.reconnectToken);

  const ai = await emitAck(host, 'whot:add-ai', { code, difficulty: 'hard' });
  assert.equal(ai.ok, true);
  const started = await emitAck(host, 'whot:start', { code });
  assert.equal(started.ok, true);
  assert.equal(started.state.matchMode, 'ranked');
  assert.equal(started.state.actionLog[0].action, 'deal');
  assert.match(started.state.actionLog[0].detail, /Ranked WHOT started/);

  const legal = started.state.playableCardIds;
  if (legal.length > 0) {
    const played = await emitAck(host, 'whot:play', { code, cardId: legal[0] });
    assert.equal(played.ok, true);
    assert.ok(played.state.actionLog.some((entry) => entry.action === 'play' && entry.playerName === 'RankHost'));
  } else {
    const drawn = await emitAck(host, 'whot:draw', { code });
    assert.equal(drawn.ok, true);
    assert.ok(drawn.state.actionLog.some((entry) => entry.action === 'draw' && entry.playerName === 'RankHost'));
  }

  await emitAck(host, 'whot:leave', { code });
  host.disconnect();
  host = null;
  recovered = await connect();
  const rejoin = await emitAck(recovered, 'whot:reconnect', { code, playerName: 'RankHost', reconnectToken: created.reconnectToken });
  assert.equal(rejoin.ok, true);
  assert.equal(rejoin.state.matchMode, 'ranked');
  assert.ok(rejoin.state.actionLog.length >= 2);

  spectator = await connect();
  const watched = await emitAck(spectator, 'whot:spectate', { code, playerName: 'Watcher' });
  assert.equal(watched.ok, true);
  assert.equal(watched.state.matchMode, 'ranked');
  assert.equal(watched.state.isSpectator, true);

  console.log('RC 3.3.38 WHOT Ranked lifecycle integration passed.');
} finally {
  host?.disconnect();
  recovered?.disconnect();
  spectator?.disconnect();
  server.kill('SIGTERM');
}
