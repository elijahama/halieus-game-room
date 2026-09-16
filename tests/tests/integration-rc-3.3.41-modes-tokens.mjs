import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3141;
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
function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

let mega;
let ludo;
try {
  await waitForServer();

  mega = await connect();
  const megaCode = `M${Math.random().toString(36).slice(2, 7).toUpperCase()}`.slice(0, 6);
  const created = await emitAck(mega, 'game:create', { code: megaCode, playerName: 'TokenHost', blitz: false, ranked: false });
  assert.equal(created.ok, true);
  const added = await emitAck(mega, 'game:add-ai', { code: megaCode, difficulty: 'normal' });
  assert.equal(added.ok, true);
  const started = await emitAck(mega, 'game:start', { code: megaCode });
  assert.equal(started.ok, true);
  assert.equal(started.state.phase, 'ordering');
  const host = started.state.players.find((player) => player.id === mega.id);
  assert.ok(host);
  const previous = host.tokenId;
  const chosen = previous === 'ship' ? 'dog' : 'ship';
  const selected = await emitAck(mega, 'game:set-token', { code: megaCode, tokenId: chosen });
  assert.equal(selected.ok, true);
  assert.equal(selected.state.players.find((player) => player.id === mega.id)?.tokenId, chosen);

  ludo = await connect();
  const ludoCode = `L${Math.random().toString(36).slice(2, 7).toUpperCase()}`.slice(0, 6);
  const ranked = await emitAck(ludo, 'ludo:create', { code: ludoCode, playerName: 'RankedLudo', matchMode: 'ranked' });
  assert.equal(ranked.ok, true);
  assert.equal(ranked.state.matchMode, 'ranked');
  assert.equal(ranked.state.rulesPreset, 'halieus-classic');

  console.log('RC 3.3.41 modes + Mega piece selection integration passed.');
} finally {
  mega?.disconnect();
  ludo?.disconnect();
  server.kill('SIGTERM');
}
