import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3142;
const server = spawn(process.execPath, ['dist/server/src/index.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'false' },
  stdio: ['ignore','pipe','pipe'],
});
let output='';
server.stdout.on('data', c => { output += c.toString(); });
server.stderr.on('data', c => { output += c.toString(); });
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitForServer(){ for(let i=0;i<60;i++){ if(output.includes(`Listening on port ${port}`)) return; if(server.exitCode!==null) throw new Error(output); await wait(100);} throw new Error(output); }
function connect(){ return new Promise((resolve,reject)=>{ const s=io(`http://127.0.0.1:${port}`,{transports:['websocket'],forceNew:true}); s.once('connect',()=>resolve(s)); s.once('connect_error',reject); }); }
function ack(socket,event,payload){ return new Promise(resolve=>socket.emit(event,payload,resolve)); }
let host,spectator;
try {
  await waitForServer();
  host=await connect(); spectator=await connect();
  const code=`S${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  assert.equal((await ack(host,'game:create',{code,playerName:'Host',blitz:false,ranked:false})).ok,true);
  assert.equal((await ack(host,'game:add-ai',{code,difficulty:'normal'})).ok,true);
  const started=await ack(host,'game:start',{code});
  assert.equal(started.ok,true);
  assert.equal(started.state.phase,'ordering');
  for (const tokenId of ['wheelbarrow','t-rex','duck']) {
    const selected=await ack(host,'game:set-token',{code,tokenId});
    assert.equal(selected.ok,true);
    assert.equal(selected.state.players.find(p=>p.id===host.id)?.tokenId,tokenId);
  }
  const watched=await ack(spectator,'game:spectate',{code,playerName:'LinkViewer'});
  assert.equal(watched.ok,true);
  assert.equal(watched.spectator,true);
  assert.ok(watched.state);
  assert.equal(watched.code,code);
  console.log('RC 3.3.42 Mega spectator + expanded token integration passed.');
} finally { host?.disconnect(); spectator?.disconnect(); server.kill('SIGTERM'); }
