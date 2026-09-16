import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3140;
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
  for (let i = 0; i < 60; i += 1) {
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
    const timer = setTimeout(() => { socket.off('ludo:state', handler); reject(new Error('Timed out waiting for Ludo state.')); }, timeout);
    const handler = (state) => {
      if (!predicate(state)) return;
      clearTimeout(timer); socket.off('ludo:state', handler); resolve(state);
    };
    socket.on('ludo:state', handler);
  });
}

let host;
let recovered;
let spectator;
try {
  await waitForServer();
  host = await connect();
  const code = `L${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created = await emitAck(host, 'ludo:create', { code, playerName: 'LudoHost' });
  assert.equal(created.ok, true);
  assert.equal(created.state.rulesPreset, 'halieus-classic');
  assert.equal(created.state.players.length, 1);
  assert.equal(created.state.players[0].pieces.length, 4);
  assert.equal(created.state.players[0].colour, 'red');
  assert.ok(created.reconnectToken);

  const added = await emitAck(host, 'ludo:add-ai', { code, difficulty: 'hard' });
  assert.equal(added.ok, true);
  assert.equal(added.state.players.length, 2);
  assert.equal(added.state.players[1].isAi, true);
  assert.equal(added.state.players[1].colour, 'green');

  const started = await emitAck(host, 'ludo:start', { code });
  assert.equal(started.ok, true);
  assert.equal(started.state.phase, 'ordering');
  assert.equal(started.state.canRoll, true);

  // Newer Ludo releases use a real roll-for-order phase. Drive the human rolls
  // while AI contenders roll automatically, then wait until the human owns a live turn.
  let orderedState = started.state;
  for (let guard = 0; guard < 20 && orderedState.phase === 'ordering'; guard += 1) {
    if (orderedState.currentTurnPlayerId === created.playerId && orderedState.canRoll) {
      const rolled = await emitAck(host, 'ludo:roll', { code });
      assert.equal(rolled.ok, true);
      orderedState = rolled.state;
    } else {
      orderedState = await waitForState(host, (state) => state.phase !== 'ordering' || (state.currentTurnPlayerId === created.playerId && state.canRoll), 8000);
    }
  }
  assert.equal(orderedState.phase, 'playing');
  if (orderedState.currentTurnPlayerId !== created.playerId || !orderedState.canRoll) {
    orderedState = await waitForState(host, (state) => state.phase === 'playing' && state.currentTurnPlayerId === created.playerId && state.canRoll, 10000);
  }
  assert.equal(orderedState.currentTurnPlayerId, created.playerId);

  // Temporary navigation/disconnect preserves the live turn through its recovery key.
  host.disconnect();
  host = undefined;
  await wait(150);
  recovered = await connect();
  const restored = await emitAck(recovered, 'ludo:reconnect', { code, playerName: 'LudoHost', reconnectToken: created.reconnectToken });
  assert.equal(restored.ok, true);
  assert.equal(restored.state.isSpectator, false);
  assert.equal(restored.state.players.find((player) => player.id === restored.playerId)?.name, 'LudoHost');
  assert.equal(restored.state.players.length, 2);
  assert.equal(restored.state.currentTurnPlayerId, restored.playerId, 'Recovery must retarget the live turn to the recovered socket identity.');
  assert.equal(restored.state.canRoll, true);

  // Delegate this recovered human-owned seat. It must act without becoming an AI identity.
  const nextHostRoll = waitForState(recovered, (state) => state.actionLog.some((entry) => entry.playerId === restored.playerId && entry.action === 'roll' && entry.aiReason), 8000);
  const enabled = await emitAck(recovered, 'ludo:set-autopilot', { code, enabled: true });
  assert.equal(enabled.ok, true);
  assert.equal(enabled.state.players.find((player) => player.id === restored.playerId)?.autopilotEnabled, true);
  const acted = await nextHostRoll;
  const autoRoll = acted.actionLog.find((entry) => entry.playerId === restored.playerId && entry.action === 'roll' && entry.aiReason);
  assert.ok(autoRoll);
  assert.equal(autoRoll.playerIsAi, false, 'Delegated human Ludo seat must remain human-owned in telemetry.');
  assert.match(autoRoll.aiReason, /delegated human seat/i);

  const disabled = await emitAck(recovered, 'ludo:set-autopilot', { code, enabled: false });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.state.players.find((player) => player.id === restored.playerId)?.autopilotEnabled, false);

  // Spectators receive public board state but never a player seat/viewer identity.
  spectator = await connect();
  const watched = await emitAck(spectator, 'ludo:spectate', { code, playerName: 'Watcher' });
  assert.equal(watched.ok, true);
  assert.equal(watched.state.isSpectator, true);
  assert.equal(watched.state.viewerPlayerId, null);
  assert.equal(watched.state.players.length, 2);
  assert.equal(watched.state.spectatorCount, 1);
  assert.deepEqual(watched.state.legalPieceIds, []);

  const ended = await emitAck(recovered, 'ludo:end-game', { code });
  assert.equal(ended.ok, true);
  assert.equal(ended.state.phase, 'finished');
  assert.match(ended.state.status, /ended the Ludo game/i);

  console.log('RC 3.3.40 Ludo lifecycle + Autopilot integration passed.');
} finally {
  host?.disconnect();
  recovered?.disconnect();
  spectator?.disconnect();
  server.kill('SIGTERM');
}
