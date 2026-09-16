import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3151;
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
    const timer = setTimeout(() => { socket.off('connect-four:state', handler); reject(new Error('Timed out waiting for Connect Four state.')); }, timeout);
    const handler = (state) => {
      if (!predicate(state)) return;
      clearTimeout(timer); socket.off('connect-four:state', handler); resolve(state);
    };
    socket.on('connect-four:state', handler);
  });
}

let host;
let guest;
let recovered;
let spectator;
try {
  await waitForServer();
  host = await connect();
  guest = await connect();
  const code = `C${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);

  const created = await emitAck(host, 'connect-four:create', { code, playerName: 'RedHost', matchMode: 'ranked' });
  assert.equal(created.ok, true);
  assert.equal(created.state.phase, 'lobby');
  assert.equal(created.state.matchMode, 'ranked');
  assert.equal(created.state.players.length, 1);
  assert.equal(created.state.players[0].colour, 'red');
  assert.ok(created.reconnectToken);

  const joined = await emitAck(guest, 'connect-four:join', { code, playerName: 'GoldGuest' });
  assert.equal(joined.ok, true);
  assert.equal(joined.state.players.length, 2);
  assert.equal(joined.state.players[1].colour, 'yellow');
  assert.ok(joined.reconnectToken);

  const startedStateP = waitForState(host, (state) => state.phase === 'playing');
  const started = await emitAck(host, 'connect-four:start', { code });
  assert.equal(started.ok, true);
  let state = await startedStateP;
  assert.equal(state.currentTurnPlayerId, created.playerId);
  assert.equal(state.board.length, 42);

  spectator = await connect();
  const watched = await emitAck(spectator, 'connect-four:spectate', { code, playerName: 'Watcher' });
  assert.equal(watched.ok, true);
  assert.equal(watched.state.isSpectator, true);
  assert.equal(watched.state.viewerPlayerId, null);
  assert.equal(watched.state.spectatorCount, 1);

  // Host drops once, then disconnects and recovers the same seat before continuing.
  let next = waitForState(host, (s) => s.turnNumber === 1);
  assert.equal((await emitAck(host, 'connect-four:drop', { code, column: 0 })).ok, true);
  state = await next;
  assert.equal(state.board.filter((disc) => disc === 1).length, 1);

  next = waitForState(guest, (s) => s.turnNumber === 2);
  assert.equal((await emitAck(guest, 'connect-four:drop', { code, column: 1 })).ok, true);
  await next;

  host.disconnect();
  host = undefined;
  await wait(120);
  recovered = await connect();
  const restored = await emitAck(recovered, 'connect-four:reconnect', { code, reconnectToken: created.reconnectToken, playerName: 'RedHost' });
  assert.equal(restored.ok, true);
  assert.equal(restored.state.phase, 'playing');
  assert.equal(restored.state.viewerPlayerId, restored.playerId);
  assert.equal(restored.state.players.find((p) => p.id === restored.playerId)?.name, 'RedHost');
  assert.equal(restored.state.currentTurnPlayerId, restored.playerId);

  const play = async (socket, column, turnNumber) => {
    const p = waitForState(socket, (s) => s.turnNumber === turnNumber || s.phase === 'finished');
    const ack = await emitAck(socket, 'connect-four:drop', { code, column });
    assert.equal(ack.ok, true);
    return p;
  };

  await play(recovered, 0, 3);
  await play(guest, 1, 4);
  await play(recovered, 0, 5);
  await play(guest, 1, 6);
  const finishP = waitForState(recovered, (s) => s.phase === 'finished');
  assert.equal((await emitAck(recovered, 'connect-four:drop', { code, column: 0 })).ok, true);
  const finished = await finishP;

  assert.equal(finished.phase, 'finished');
  assert.equal(finished.winnerPlayerId, restored.playerId);
  assert.equal(finished.draw, false);
  assert.match(finished.status, /connects four/i);
  assert.equal(finished.board.filter((disc) => disc === 1).length, 4);
  assert.equal(finished.actionLog.at(-1)?.action, 'finish');
  assert.equal(finished.players.find((p) => p.id === restored.playerId)?.result, 'Winner');

  console.log('RC 3.4.3 Connect Four lifecycle + reconnect + spectator integration passed.');
} finally {
  host?.disconnect();
  guest?.disconnect();
  recovered?.disconnect();
  spectator?.disconnect();
  server.kill('SIGTERM');
}
