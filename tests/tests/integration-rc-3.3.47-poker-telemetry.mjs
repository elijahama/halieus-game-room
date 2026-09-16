import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3147;
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
function waitFor(socket,event,predicate,timeout=8000){ return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{socket.off(event,handler);reject(new Error(`Timed out waiting for ${event}\n${output}`));},timeout); const handler=(value)=>{if(!predicate(value)) return;clearTimeout(timer);socket.off(event,handler);resolve(value);};socket.on(event,handler);}); }

let host;
try {
  await waitForServer();
  host=await connect();
  const code=`T${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created=await ack(host,'poker:create',{code,playerName:'Telemetry Host',startingChips:5000,smallBlind:25,bigBlind:50,aiDifficulty:'normal',matchMode:'casual',variant:'texas-holdem'});
  assert.equal(created.ok,true);
  assert.ok(Array.isArray(created.state.actionLog));
  assert.equal((await ack(host,'poker:add-ai',{code})).ok,true);

  const startedStateP=waitFor(host,'poker:state',state=>state?.code===code && state?.actionLog?.some(entry=>entry.action==='hand'));
  assert.equal((await ack(host,'poker:start',{code})).ok,true);
  const startedState=await startedStateP;
  assert.ok(startedState.actionLog.some(entry=>entry.action==='hand' && /dealt/.test(entry.detail)));

  const action = startedState.legalActions?.canCall ? 'call' : startedState.legalActions?.canCheck ? 'check' : null;
  if (action) {
    const actionStateP=waitFor(host,'poker:state',state=>state?.actionLog?.some(entry=>entry.playerName==='Telemetry Host' && entry.action===action));
    assert.equal((await ack(host,'poker:action',{code,action})).ok,true);
    const actionState=await actionStateP;
    const logged=actionState.actionLog.find(entry=>entry.playerName==='Telemetry Host' && entry.action===action);
    assert.ok(logged);
    assert.equal(typeof logged.chipsAfter,'number');
    assert.ok(typeof logged.detail==='string' && logged.detail.length>0);
  }

  const finishedStateP=waitFor(host,'poker:state',state=>state?.hand?.phase==='finished' && state?.actionLog?.some(entry=>entry.action==='table'));
  assert.equal((await ack(host,'poker:end-table',{code})).ok,true);
  const finishedState=await finishedStateP;
  assert.ok(finishedState.actionLog.some(entry=>entry.action==='table'));
  console.log('RC 3.3.47 Poker telemetry integration passed.');
} finally {
  host?.disconnect(); server.kill('SIGTERM');
}
