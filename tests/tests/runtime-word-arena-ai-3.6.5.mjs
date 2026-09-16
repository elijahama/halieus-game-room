import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 38000 + Math.floor(Math.random() * 1200);
const url = `http://127.0.0.1:${port}`;
const temp = await mkdtemp(join(tmpdir(), 'hgr-365-word-ai-'));
const child = spawn(process.execPath, ['server/dist/server/src/index.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), CLIENT_ORIGINS: '*', PUBLIC_APP_URL: url, HALIEUS_DATA_DIR: join(temp, 'data'), HALIEUS_OWNER_BOOTSTRAP_FILE: join(temp, 'OWNER SETUP CODE.txt') },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
child.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try { const response = await fetch(`${url}/health`); if (response.ok) return response.json(); } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server did not become healthy.\n${serverLog}`);
}
function client() { return io(url, { transports: ['websocket'], forceNew: true, reconnection: false }); }
function connected(socket) { return new Promise((resolveConnect, reject) => { const timer=setTimeout(()=>reject(new Error('connect timeout')),5000); socket.once('connect',()=>{clearTimeout(timer);resolveConnect();}); socket.once('connect_error',(error)=>{clearTimeout(timer);reject(error);}); }); }
function emitAck(socket,event,payload){ return new Promise((resolveAck,reject)=>{const timer=setTimeout(()=>reject(new Error(`ack timeout: ${event}`)),6000);socket.emit(event,payload,(response)=>{clearTimeout(timer);resolveAck(response);});}); }
function nextState(socket,event,predicate=()=>true,timeoutMs=8000){ return new Promise((resolveState,reject)=>{const timer=setTimeout(()=>{socket.off(event,handler);reject(new Error(`state timeout: ${event}`));},timeoutMs);const handler=(state)=>{if(!predicate(state))return;clearTimeout(timer);socket.off(event,handler);resolveState(state);};socket.on(event,handler);}); }

const sockets=[];
try {
  const health=await waitForHealth();
  assert.equal(health.version,'3.6.5');

  // Password can now be created and started with one human + one real AI seat.
  const password=client(); sockets.push(password); await connected(password);
  let response=await emitAck(password,'password:create',{code:'PW365A',playerName:'SoloClue',matchMode:'casual',aiCount:1,aiDifficulty:'hard',targetScore:3});
  assert.equal(response.ok,true,response.reason);
  assert.equal(response.state.matchMode,'casual');
  assert.equal(response.state.aiCount,1);
  assert.equal(response.state.targetScore,3);
  assert.equal(response.state.players.length,2);
  assert.equal(response.state.players.filter((p)=>p.isAi).length,1);
  let playing=nextState(password,'password:state',(state)=>state.phase==='playing');
  response=await emitAck(password,'password:start',{code:'PW365A'}); assert.equal(response.ok,true,response.reason);
  let state=await playing;
  assert.equal(state.players.length,2);
  assert.ok(state.viewerSecret,'human host should be clue giver in round one');
  const aiAction=nextState(password,'password:state',(next)=>next.actionLog?.some((entry)=>entry.playerName?.includes('AI')&&entry.action==='guess'),9000);
  response=await emitAck(password,'password:clue',{code:'PW365A',value:'THING'}); assert.equal(response.ok,true,response.reason);
  state=await aiAction;
  assert.ok(state.actionLog.some((entry)=>entry.playerName?.includes('AI')&&entry.action==='guess'),'Password AI must actually guess');

  // Anagrams Race can also be played immediately against AI in a casual room.
  const anagram=client(); sockets.push(anagram); await connected(anagram);
  response=await emitAck(anagram,'anagrams-race:create',{code:'AN365A',playerName:'SoloRace',matchMode:'casual',aiCount:2,aiDifficulty:'hard',targetScore:3});
  assert.equal(response.ok,true,response.reason);
  assert.equal(response.state.matchMode,'casual');
  assert.equal(response.state.aiCount,2);
  assert.equal(response.state.targetScore,3);
  assert.equal(response.state.players.filter((p)=>p.isAi).length,2);
  playing=nextState(anagram,'anagrams-race:state',(next)=>next.phase==='playing');
  response=await emitAck(anagram,'anagrams-race:start',{code:'AN365A'}); assert.equal(response.ok,true,response.reason);
  state=await playing; assert.ok(state.scramble);
  const aiWin=await nextState(anagram,'anagrams-race:state',(next)=>next.phase==='round-over'||next.phase==='finished',7000);
  assert.ok(aiWin.roundWinnerPlayerId);
  assert.ok(aiWin.players.find((p)=>p.id===aiWin.roundWinnerPlayerId)?.isAi,'Anagrams AI should be able to win a round');

  console.log('Halieus Game Room 3.6.5 Password/Anagrams AI runtime smoke: PASS');
} finally {
  for (const socket of sockets) socket.disconnect();
  child.kill('SIGTERM');
  await new Promise((r)=>{const timer=setTimeout(r,1200);child.once('exit',()=>{clearTimeout(timer);r();});});
  await rm(temp,{recursive:true,force:true});
}
