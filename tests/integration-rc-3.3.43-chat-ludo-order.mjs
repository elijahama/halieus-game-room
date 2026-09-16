import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3143;
const server = spawn(process.execPath, ['dist/server/src/index.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'false' },
  stdio: ['ignore','pipe','pipe'],
});
let output='';
server.stdout.on('data', c => { output += c.toString(); });
server.stderr.on('data', c => { output += c.toString(); });
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitForServer(){ for(let i=0;i<80;i++){ if(output.includes(`Listening on port ${port}`)) return; if(server.exitCode!==null) throw new Error(output); await wait(100);} throw new Error(output); }
function connect(){ return new Promise((resolve,reject)=>{ const s=io(`http://127.0.0.1:${port}`,{transports:['websocket'],forceNew:true}); s.once('connect',()=>resolve(s)); s.once('connect_error',reject); }); }
function ack(socket,event,payload){ return new Promise(resolve=>socket.emit(event,payload,resolve)); }
function waitFor(socket,event,predicate,timeout=10000){ return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{socket.off(event,handler);reject(new Error(`Timed out waiting for ${event}`));},timeout); const handler=(value)=>{if(!predicate(value)) return;clearTimeout(timer);socket.off(event,handler);resolve(value);};socket.on(event,handler);}); }

let host,spectator,late,ludo;
try {
  await waitForServer();

  // Players and spectators share one room-chat history without gaining gameplay permissions.
  host=await connect(); spectator=await connect(); late=await connect();
  const code=`C${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  assert.equal((await ack(host,'game:create',{code,playerName:'Host',blitz:false,ranked:false})).ok,true);
  assert.equal((await ack(host,'game:add-ai',{code,difficulty:'normal'})).ok,true);
  assert.equal((await ack(host,'game:start',{code})).ok,true);
  const watched=await ack(spectator,'game:spectate',{code,playerName:'Watcher'});
  assert.equal(watched.ok,true);

  const hostChat=await ack(host,'room-chat:join',{game:'mega-board',code});
  const spectatorChat=await ack(spectator,'room-chat:join',{game:'mega-board',code});
  assert.equal(hostChat.ok,true); assert.equal(hostChat.viewerRole,'player');
  assert.equal(spectatorChat.ok,true); assert.equal(spectatorChat.viewerRole,'spectator');

  const hostMessagePromise=waitFor(spectator,'room-chat:message',m=>m.text==='Hello table');
  const sentHost=await ack(host,'room-chat:send',{game:'mega-board',code,text:'Hello table'});
  assert.equal(sentHost.ok,true); assert.equal(sentHost.message.senderRole,'player');
  assert.equal((await hostMessagePromise).senderName,'Host');

  const spectatorMessagePromise=waitFor(host,'room-chat:message',m=>m.text==='Spectator here');
  const sentSpectator=await ack(spectator,'room-chat:send',{game:'mega-board',code,text:'Spectator here'});
  assert.equal(sentSpectator.ok,true); assert.equal(sentSpectator.message.senderRole,'spectator');
  assert.equal((await spectatorMessagePromise).senderRole,'spectator');

  assert.equal((await ack(late,'game:spectate',{code,playerName:'LateWatcher'})).ok,true);
  const lateChat=await ack(late,'room-chat:join',{game:'mega-board',code});
  assert.equal(lateChat.ok,true);
  assert.equal(lateChat.messages.length,2);
  assert.deepEqual(lateChat.messages.map(m=>m.text),['Hello table','Spectator here']);

  // Ludo starts with a real roll-for-order phase; AI seats roll automatically and ties reroll.
  ludo=await connect();
  const ludoCode=`L${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created=await ack(ludo,'ludo:create',{code:ludoCode,playerName:'Starter',matchMode:'casual'});
  assert.equal(created.ok,true);
  assert.equal((await ack(ludo,'ludo:add-ai',{code:ludoCode,difficulty:'normal'})).ok,true);
  let state=(await ack(ludo,'ludo:start',{code:ludoCode})).state;
  assert.equal(state.phase,'ordering');
  assert.equal(typeof state.startedAt,'number');
  for(let guard=0; guard<24 && state.phase==='ordering'; guard+=1){
    if(state.currentTurnPlayerId===created.playerId && state.canRoll){
      const rolled=await ack(ludo,'ludo:roll',{code:ludoCode});
      assert.equal(rolled.ok,true); state=rolled.state;
    } else {
      state=await waitFor(ludo,'ludo:state',s=>s.phase!=='ordering'||(s.currentTurnPlayerId===created.playerId&&s.canRoll),10000);
    }
  }
  assert.equal(state.phase,'playing');
  assert.ok(state.actionLog.filter(e=>e.action==='order-roll').length>=2);
  assert.equal(state.turnNumber,1);

  console.log('RC 3.3.43 shared chat + Ludo roll-for-order integration passed.');
} finally {
  host?.disconnect(); spectator?.disconnect(); late?.disconnect(); ludo?.disconnect(); server.kill('SIGTERM');
}
