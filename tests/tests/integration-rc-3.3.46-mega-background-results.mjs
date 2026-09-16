import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const port = 3146;
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
function waitFor(socket,event,predicate,timeout=10000){ return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{socket.off(event,handler);reject(new Error(`Timed out waiting for ${event}\n${output}`));},timeout); const handler=(value)=>{if(!predicate(value)) return;clearTimeout(timer);socket.off(event,handler);resolve(value);};socket.on(event,handler);}); }

let observer,host;
try {
  await waitForServer();
  observer=await connect();
  host=await connect();
  const code=`M${Math.random().toString(36).slice(2,7).toUpperCase()}`.slice(0,6);
  const created=await ack(host,'game:create',{code,playerName:'Background Host',blitz:false,ranked:false});
  assert.equal(created.ok,true);
  const ai=await ack(host,'game:add-ai',{code,difficulty:'normal'});
  assert.equal(ai.ok,true);
  const started=await ack(host,'game:start',{code});
  assert.equal(started.ok,true);

  // The observer never joins the room. This mirrors the user parking/leaving
  // the game view while the server continues to own the live match.
  const globalNotice=waitFor(observer,'platform:game-finished',notice=>notice?.game==='mega-board'&&notice?.code===code);
  const forfeited=await ack(host,'game:forfeit',{code});
  assert.equal(forfeited.ok,true);

  const notice=await globalNotice;
  assert.equal(notice.status,'game-finished');
  assert.ok(notice.winner);
  assert.ok(notice.result);
  assert.equal(notice.result.rows.length,2);
  assert.equal(notice.result.rows[0].rank,1);
  assert.equal(notice.result.rows[0].name,notice.winner);
  assert.equal(notice.result.rows[0].winner,true);
  const hostRow=notice.result.rows.find(row=>row.name==='Background Host');
  assert.ok(hostRow);
  assert.match(hostRow.detail,/bankrupt/);
  assert.ok(Array.isArray(notice.result.stats));
  assert.equal(notice.result.stats.find(stat=>stat.label==='Players')?.value,'2');
  assert.ok(typeof notice.result.durationMs==='number' && notice.result.durationMs>=0);
  console.log('RC 3.3.46 Mega background authoritative-results integration passed.');
} finally {
  observer?.disconnect(); host?.disconnect(); server.kill('SIGTERM');
}
