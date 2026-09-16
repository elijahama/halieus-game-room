import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3144;
const server = spawn(process.execPath, ['dist/server/src/index.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'false' },
  stdio: ['ignore','pipe','pipe'],
});
let output='';
server.stdout.on('data', chunk => { output += chunk.toString(); });
server.stderr.on('data', chunk => { output += chunk.toString(); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer(){ for(let i=0;i<80;i++){ if(output.includes(`Listening on port ${port}`)) return; if(server.exitCode!==null) throw new Error(output); await wait(100);} throw new Error(output); }
function connect(){ return new Promise((resolve,reject)=>{ const s=io(`http://127.0.0.1:${port}`,{transports:['websocket'],forceNew:true}); s.once('connect',()=>resolve(s)); s.once('connect_error',reject); }); }
function ack(socket,event,payload){ return new Promise(resolve=>socket.emit(event,payload,resolve)); }
function waitFor(socket,event,predicate,timeout=8000){ return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{socket.off(event,handler);reject(new Error(`Timed out waiting for ${event}`));},timeout); const handler=(value)=>{if(!predicate(value)) return;clearTimeout(timer);socket.off(event,handler);resolve(value);};socket.on(event,handler);}); }

let observer,host;
try {
  await waitForServer();
  observer=await connect();
  host=await connect();
  const code=`P${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created=await ack(host,'poker:create',{code,playerName:'Host',startingChips:5000,smallBlind:25,bigBlind:50,aiDifficulty:'normal',matchMode:'casual',variant:'texas-holdem'});
  assert.equal(created.ok,true);
  assert.equal((await ack(host,'poker:add-ai',{code})).ok,true);
  assert.equal((await ack(host,'poker:start',{code})).ok,true);
  const globalNotice=waitFor(observer,'platform:game-finished',notice=>notice?.game==='poker'&&notice?.code===code);
  assert.equal((await ack(host,'poker:end-table',{code})).ok,true);
  const notice=await globalNotice;
  assert.equal(notice.gameTitle,'Poker');
  assert.equal(notice.status,'game-finished');
  assert.equal(notice.code,code);
  assert.ok(typeof notice.message==='string'&&notice.message.length>0);
  assert.ok(typeof notice.at==='number');
  console.log('RC 3.3.44 global game-finished integration passed.');
} finally {
  observer?.disconnect(); host?.disconnect(); server.kill('SIGTERM');
}
