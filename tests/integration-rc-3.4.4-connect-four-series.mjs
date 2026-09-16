import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3153;
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
      clearTimeout(timer);
      socket.off('connect-four:state', handler);
      resolve(state);
    };
    socket.on('connect-four:state', handler);
  });
}
async function drop(socket, observer, code, column, predicate) {
  const stateP = waitForState(observer, predicate);
  const ack = await emitAck(socket, 'connect-four:drop', { code, column });
  assert.equal(ack.ok, true);
  return stateP;
}
async function winVertical(starter, other, code, winnerIsStarter = true) {
  // The starter/winner uses column 0; the other player harmlessly stacks column 1.
  let state;
  state = await drop(starter, other, code, 0, (s) => s.turnNumber === 1); assert.equal(state.phase, 'playing');
  state = await drop(other, starter, code, 1, (s) => s.turnNumber === 2); assert.equal(state.phase, 'playing');
  state = await drop(starter, other, code, 0, (s) => s.turnNumber === 3); assert.equal(state.phase, 'playing');
  state = await drop(other, starter, code, 1, (s) => s.turnNumber === 4); assert.equal(state.phase, 'playing');
  state = await drop(starter, other, code, 0, (s) => s.turnNumber === 5); assert.equal(state.phase, 'playing');
  state = await drop(other, starter, code, 1, (s) => s.turnNumber === 6); assert.equal(state.phase, 'playing');
  return drop(starter, other, code, 0, (s) => s.phase === 'round-over' || s.phase === 'finished');
}

let host;
let guest;
try {
  await waitForServer();
  host = await connect();
  guest = await connect();
  const code = `S${Math.random().toString(36).slice(2, 7).toUpperCase()}`.slice(0, 6);

  const created = await emitAck(host, 'connect-four:create', { code, playerName: 'SeriesHost', matchMode: 'ranked', bestOf: 3 });
  assert.equal(created.ok, true);
  assert.equal(created.state.bestOf, 3);
  assert.equal(created.state.targetWins, 2);
  const joined = await emitAck(guest, 'connect-four:join', { code, playerName: 'SeriesGuest' });
  assert.equal(joined.ok, true);

  const startP = waitForState(host, (s) => s.phase === 'playing' && s.roundNumber === 1);
  assert.equal((await emitAck(host, 'connect-four:start', { code })).ok, true);
  let state = await startP;
  assert.equal(state.currentTurnPlayerId, created.playerId);

  // Round 1: host wins.
  state = await winVertical(host, guest, code);
  assert.equal(state.phase, 'round-over');
  assert.equal(state.roundNumber, 1);
  assert.equal(state.roundHistory.length, 1);
  assert.equal(state.players.find((p) => p.name === 'SeriesHost')?.seriesWins, 1);
  assert.equal(state.players.find((p) => p.name === 'SeriesGuest')?.seriesWins, 0);

  // Round 2 alternates the starter; guest wins.
  const round2P = waitForState(guest, (s) => s.phase === 'playing' && s.roundNumber === 2);
  assert.equal((await emitAck(host, 'connect-four:next-round', { code })).ok, true);
  state = await round2P;
  assert.equal(state.currentTurnPlayerId, joined.playerId);
  state = await winVertical(guest, host, code);
  assert.equal(state.phase, 'round-over');
  assert.equal(state.roundHistory.length, 2);
  assert.equal(state.players.find((p) => p.name === 'SeriesHost')?.seriesWins, 1);
  assert.equal(state.players.find((p) => p.name === 'SeriesGuest')?.seriesWins, 1);

  // Round 3 returns the start to host; host takes the deciding round and series.
  const round3P = waitForState(host, (s) => s.phase === 'playing' && s.roundNumber === 3);
  assert.equal((await emitAck(host, 'connect-four:next-round', { code })).ok, true);
  state = await round3P;
  assert.equal(state.currentTurnPlayerId, created.playerId);
  state = await winVertical(host, guest, code);
  assert.equal(state.phase, 'finished');
  assert.equal(state.bestOf, 3);
  assert.equal(state.roundHistory.length, 3);
  assert.equal(state.winnerPlayerId, created.playerId);
  assert.equal(state.players.find((p) => p.name === 'SeriesHost')?.seriesWins, 2);
  assert.equal(state.players.find((p) => p.name === 'SeriesGuest')?.seriesWins, 1);
  assert.match(state.status, /wins the Connect Four series 2-1/i);
  assert.equal(state.actionLog.at(-1)?.action, 'finish');

  console.log('RC 3.4.4 Connect Four best-of-3 series integration passed.');
} finally {
  host?.disconnect();
  guest?.disconnect();
  server.kill('SIGTERM');
}
