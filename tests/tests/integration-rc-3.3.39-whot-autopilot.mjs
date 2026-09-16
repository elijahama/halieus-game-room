import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3139;
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
  for (let i = 0; i < 50; i += 1) {
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
function waitForState(socket, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('whot:state', handler); reject(new Error('Timed out waiting for WHOT state.')); }, timeout);
    const handler = (state) => {
      if (!predicate(state)) return;
      clearTimeout(timer); socket.off('whot:state', handler); resolve(state);
    };
    socket.on('whot:state', handler);
  });
}

let host;
try {
  await waitForServer();
  host = await connect();
  const code = `A${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created = await emitAck(host, 'whot:create', { code, playerName: 'AutoHost', matchMode: 'casual' });
  assert.equal(created.ok, true);
  assert.equal(created.state.players.find((p) => p.id === created.playerId)?.autopilotEnabled, false);
  assert.equal((await emitAck(host, 'whot:add-ai', { code, difficulty: 'normal' })).ok, true);
  const started = await emitAck(host, 'whot:start', { code });
  assert.equal(started.ok, true);
  assert.equal(started.state.currentTurnPlayerId, created.playerId);

  const nextAction = waitForState(host, (state) => state.actionLog.some((entry) => entry.playerId === created.playerId && ['play', 'draw'].includes(entry.action)), 6000);
  const enabled = await emitAck(host, 'whot:set-autopilot', { code, enabled: true });
  assert.equal(enabled.ok, true);
  assert.equal(enabled.state.players.find((p) => p.id === created.playerId)?.autopilotEnabled, true);
  assert.ok(enabled.state.actionLog.some((entry) => /enabled Autopilot/.test(entry.detail)));

  const acted = await nextAction;
  const autoAction = acted.actionLog.find((entry) => entry.playerId === created.playerId && ['play', 'draw'].includes(entry.action));
  assert.ok(autoAction, 'Autopilot should make a legal same-seat WHOT action.');
  assert.equal(autoAction.playerIsAi, false, 'Delegated human seat remains identified as human in telemetry.');
  assert.ok(autoAction.aiReason, 'Delegated action should retain lightweight AI reasoning evidence.');

  const disabled = await emitAck(host, 'whot:set-autopilot', { code, enabled: false });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.state.players.find((p) => p.id === created.playerId)?.autopilotEnabled, false);
  console.log('RC 3.3.39 WHOT Autopilot integration passed.');
} finally {
  host?.disconnect();
  server.kill('SIGTERM');
}
