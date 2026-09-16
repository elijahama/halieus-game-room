import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 36000 + Math.floor(Math.random() * 2000);
const url = `http://127.0.0.1:${port}`;
const temp = await mkdtemp(join(tmpdir(), 'hgr-364-word-arena-'));
const child = spawn(process.execPath, ['server/dist/server/src/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    CLIENT_ORIGINS: '*',
    PUBLIC_APP_URL: url,
    HALIEUS_DATA_DIR: join(temp, 'data'),
    HALIEUS_OWNER_BOOTSTRAP_FILE: join(temp, 'OWNER SETUP CODE.txt'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
child.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
  }
  throw new Error(`Server did not become healthy.\n${serverLog}`);
}
function client() { return io(url, { transports: ['websocket'], forceNew: true, reconnection: false }); }
function connected(socket) { return new Promise((resolveConnect, reject) => { const timer = setTimeout(() => reject(new Error('socket connect timeout')), 5000); socket.once('connect', () => { clearTimeout(timer); resolveConnect(); }); socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); }); }); }
function emitAck(socket, event, payload) { return new Promise((resolveAck, reject) => { const timer = setTimeout(() => reject(new Error(`ack timeout: ${event}`)), 5000); socket.emit(event, payload, (response) => { clearTimeout(timer); resolveAck(response); }); }); }
function nextState(socket, event, predicate = () => true) { return new Promise((resolveState, reject) => { const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`state timeout: ${event}`)); }, 5000); const handler = (state) => { if (!predicate(state)) return; clearTimeout(timer); socket.off(event, handler); resolveState(state); }; socket.on(event, handler); }); }

const sockets = [];
try {
  const health = await waitForHealth();
  assert.equal(health.version, '3.6.4');
  assert.equal(health.activeWordArenaRooms, 0);

  const word = client(); sockets.push(word); await connected(word);
  let response = await emitAck(word, 'word-game:create', { code: 'WG364A', playerName: 'WordTester' });
  assert.equal(response.ok, true, response.reason);
  let statePromise = nextState(word, 'word-game:state', (state) => state.phase === 'playing');
  response = await emitAck(word, 'word-game:start', { code: 'WG364A' }); assert.equal(response.ok, true, response.reason);
  let state = await statePromise; assert.equal(state.viewerSecret, null); assert.equal(state.attemptsRemaining, 6);
  statePromise = nextState(word, 'word-game:state', (next) => next.viewerAttempts?.length === 1 || next.phase === 'finished');
  response = await emitAck(word, 'word-game:submit', { code: 'WG364A', value: 'CRANE' }); assert.equal(response.ok, true, response.reason);
  state = await statePromise; assert.equal(state.viewerAttempts[0].guess, 'CRANE'); assert.equal(state.viewerAttempts[0].marks.length, 5);

  const p1 = client(); const p2 = client(); sockets.push(p1, p2); await Promise.all([connected(p1), connected(p2)]);
  response = await emitAck(p1, 'password:create', { code: 'PW364A', playerName: 'ClueOne' }); assert.equal(response.ok, true, response.reason);
  response = await emitAck(p2, 'password:join', { code: 'PW364A', playerName: 'GuessTwo' }); assert.equal(response.ok, true, response.reason);
  const p1Start = nextState(p1, 'password:state', (next) => next.phase === 'playing');
  const p2Start = nextState(p2, 'password:state', (next) => next.phase === 'playing');
  response = await emitAck(p1, 'password:start', { code: 'PW364A' }); assert.equal(response.ok, true, response.reason);
  const [ps1, ps2] = await Promise.all([p1Start, p2Start]);
  const giverIsP1 = ps1.clueGiverPlayerId === p1.id;
  const giver = giverIsP1 ? p1 : p2; const guesser = giverIsP1 ? p2 : p1;
  const giverState = giverIsP1 ? ps1 : ps2; const guesserState = giverIsP1 ? ps2 : ps1;
  assert.ok(giverState.viewerSecret); assert.equal(guesserState.viewerSecret, null);
  response = await emitAck(giver, 'password:clue', { code: 'PW364A', value: 'hint' }); assert.equal(response.ok, true, response.reason);
  statePromise = nextState(guesser, 'password:state', (next) => next.phase === 'round-over' || next.phase === 'finished');
  response = await emitAck(guesser, 'password:submit', { code: 'PW364A', value: giverState.viewerSecret }); assert.equal(response.ok, true, response.reason);
  state = await statePromise; assert.ok(state.roundWinnerPlayerId);

  const a1 = client(); const a2 = client(); sockets.push(a1, a2); await Promise.all([connected(a1), connected(a2)]);
  response = await emitAck(a1, 'anagrams-race:create', { code: 'AN364A', playerName: 'RaceOne' }); assert.equal(response.ok, true, response.reason);
  response = await emitAck(a2, 'anagrams-race:join', { code: 'AN364A', playerName: 'RaceTwo' }); assert.equal(response.ok, true, response.reason);
  const aStart = nextState(a1, 'anagrams-race:state', (next) => next.phase === 'playing');
  response = await emitAck(a1, 'anagrams-race:start', { code: 'AN364A' }); assert.equal(response.ok, true, response.reason);
  state = await aStart; assert.ok(state.scramble); assert.equal(state.viewerSecret, null);
  const words = ['ORANGE','GARDEN','PLANET','CASTLE','BUTTON','WINTER','CAMERA','MARKET','ROCKET','BRIDGE','PIRATE','TUNNEL','ISLAND','DRAGON','SILVER','POCKET','BOTTLE','STREAM','SPRING','MONKEY'];
  const signature = [...state.scramble].sort().join('');
  const answer = words.find((wordValue) => [...wordValue].sort().join('') === signature);
  assert.ok(answer, `Unable to resolve scramble ${state.scramble}`);
  statePromise = nextState(a2, 'anagrams-race:state', (next) => next.phase === 'round-over' || next.phase === 'finished');
  response = await emitAck(a1, 'anagrams-race:submit', { code: 'AN364A', value: answer }); assert.equal(response.ok, true, response.reason);
  state = await statePromise; assert.ok(state.roundWinnerPlayerId);

  const finalHealth = await fetch(`${url}/health`).then((item) => item.json());
  assert.equal(finalHealth.activeWordArenaRooms, 3);
  console.log('Halieus Game Room 3.6.4 Word Arena runtime smoke: PASS');
} finally {
  for (const socket of sockets) socket.disconnect();
  child.kill('SIGTERM');
  await new Promise((resolveWait) => { const timer = setTimeout(resolveWait, 1200); child.once('exit', () => { clearTimeout(timer); resolveWait(); }); });
  await rm(temp, { recursive: true, force: true });
}
