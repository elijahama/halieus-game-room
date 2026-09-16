import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=39200+Math.floor(Math.random()*500); const url=`http://127.0.0.1:${port}`;
const temp=await mkdtemp(join(tmpdir(),'hgr-366-word-')); const bootstrap=join(temp,'OWNER SETUP CODE.txt');
const child=spawn(process.execPath,['server/dist/server/src/index.js'],{cwd:root,env:{...process.env,PORT:String(port),CLIENT_ORIGINS:'*',PUBLIC_APP_URL:url,HALIEUS_DATA_DIR:join(temp,'data'),HALIEUS_OWNER_BOOTSTRAP_FILE:bootstrap},stdio:['ignore','pipe','pipe']});
let log=''; child.stdout.on('data',c=>log+=c); child.stderr.on('data',c=>log+=c);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function health(){for(let i=0;i<80;i++){try{const r=await fetch(`${url}/health`);if(r.ok)return r.json();}catch{}await sleep(100);}throw new Error(log);}
function client(){return io(url,{transports:['websocket'],forceNew:true,reconnection:false});}
function connected(s){return new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('connect timeout')),5000);s.once('connect',()=>{clearTimeout(t);res();});s.once('connect_error',rej);});}
function ack(s,e,p){return new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error(`ack ${e}`)),6000);s.emit(e,p,r=>{clearTimeout(t);res(r);});});}
function state(s,pred,ms=7000){return new Promise((res,rej)=>{const t=setTimeout(()=>{s.off('word-game:state',h);rej(new Error('state timeout'));},ms);const h=x=>{if(!pred(x))return;clearTimeout(t);s.off('word-game:state',h);res(x);};s.on('word-game:state',h);});}
const sockets=[];
try{
  assert.equal((await health()).version,'3.6.6');
  let ownerCode=''; for(let i=0;i<30&&!ownerCode;i++){try{const txt=await readFile(bootstrap,'utf8');ownerCode=txt.match(/OWNER-[A-Z0-9-]+/)?.[0]??'';}catch{} if(!ownerCode)await sleep(100);}
  assert.ok(ownerCode,'owner bootstrap code');
  const signup=await fetch(`${url}/auth/setup-owner`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bootstrapCode:ownerCode,username:'lagztest',displayName:'Lagz',password:'correct-horse-battery'})});
  assert.equal(signup.status,201); const cookie=signup.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);

  async function failDaily(code){const s=client();sockets.push(s);await connected(s);let r=await ack(s,'word-game:create',{code,playerName:'Lagz',wordGameMode:'daily',matchMode:'casual',aiCount:0,targetScore:1});assert.equal(r.ok,true,r.reason);assert.equal(r.state.wordGameMode,'daily');const playing=state(s,x=>x.phase==='playing');r=await ack(s,'word-game:start',{code});assert.equal(r.ok,true,r.reason);let st=await playing;assert.ok(st.wordPuzzleKey);for(const guess of ['AAAAA','BBBBB','DDDDD','EEEEE','FFFFF','GGGGG']){const priorAttempts=st.viewerAttempts.length;const done=state(s,x=>x.phase==='finished'||x.viewerAttempts.length>priorAttempts,3000);await ack(s,'word-game:submit',{code,value:guess});st=await done;if(st.phase==='finished')break;}assert.equal(st.phase,'finished');assert.ok(st.viewerSecret);return st;}
  const a=await failDaily('D366A1');
  const b=await failDaily('D366B1');
  assert.equal(a.wordPuzzleKey,b.wordPuzzleKey); assert.equal(a.viewerSecret,b.viewerSecret,'daily rooms must use the same word');

  const p=client();sockets.push(p);await connected(p);let r=await ack(p,'word-game:create',{code:'P366A1',playerName:'Lagz',wordGameMode:'practice',matchMode:'casual',aiCount:7,targetScore:1});assert.equal(r.ok,true,r.reason);assert.equal(r.state.wordGameMode,'practice');assert.equal(r.state.wordPuzzleKey,null);assert.equal(r.state.players.length,1,'Word Game stays single-player');

  await sleep(900);
  const board=await fetch(`${url}/accounts/word-game/leaderboard`,{headers:{cookie}});assert.equal(board.status,200);const payload=await board.json();assert.equal(payload.ok,true);assert.equal(payload.leaderboard.stats.dailyPlayed,1,'only first daily attempt counts');assert.equal(payload.leaderboard.stats.dailySolved,0);assert.equal(payload.leaderboard.puzzleKey,a.wordPuzzleKey);
  console.log('Halieus Game Room 3.6.6 Word Game daily runtime smoke: PASS');
} finally {for(const s of sockets)s.disconnect();child.kill('SIGTERM');await sleep(400);await rm(temp,{recursive:true,force:true});}
