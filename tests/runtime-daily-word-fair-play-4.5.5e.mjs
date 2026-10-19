import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const root=resolve(import.meta.dirname,"..");
const port=39575+Math.floor(Math.random()*110);
const url="http://127.0.0.1:"+port;
const temp=await mkdtemp(join(tmpdir(),"hgr-daily-fair-"));
const bootstrap=join(temp,"OWNER SETUP CODE.txt");
const dataRoot=join(temp,"data");
const list=["CRANE","SLATE","PLANT","BRICK","LIGHT","MOUSE","CROWN","SHARE","POINT","GRAPE","SMILE","TRAIN","WORLD","STONE","CHAIR","BREAD","CLOUD","FLAME","RIVER","NIGHT"];
const sleep=(ms)=>new Promise(done=>setTimeout(done,ms));
const answerForUtcDay=()=>{const date=new Date().toISOString().slice(0,10);const n=Math.floor(Date.parse(date+"T00:00:00.000Z")/86400000);return list[((n%list.length)+list.length)%list.length];};
const clients=[];
let child=null;
let log="";
function boot(){
  child=spawn(process.execPath,["server/dist/server/src/index.js"],{
    cwd:root,env:{...process.env,PORT:String(port),CLIENT_ORIGINS:"*",PUBLIC_APP_URL:url,HALIEUS_DATA_DIR:dataRoot,HALIEUS_OWNER_BOOTSTRAP_FILE:bootstrap},
    stdio:["ignore","pipe","pipe"]});
  child.stdout.on("data",bytes=>log+=bytes);
  child.stderr.on("data",bytes=>log+=bytes);
}
async function health(){
  for(let i=0;i<100;i++){try{const r=await fetch(url+"/health");if(r.ok)return r.json();}catch{} await sleep(100);}
  throw new Error("HGR server did not start: "+log.slice(-2500));
}
async function connect(cookie=null,beta=false){
  const s=io(url,{transports:["websocket"],forceNew:true,reconnection:false,extraHeaders:cookie?{cookie}:{},auth:{betaMode:beta}});
  clients.push(s);
  await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error("socket connect timeout")),5000);s.once("connect",()=>{clearTimeout(timer);done();});s.once("connect_error",fail);});
  return s;
}
const ack=(socket,event,payload)=>socket.timeout(6000).emitWithAck(event,payload);
function nextState(s,pred,ms=8000){
  return new Promise((done,fail)=>{
    const timer=setTimeout(()=>{s.off("word-game:state",listener);fail(new Error("state timeout"));},ms);
    function listener(state){if(!pred(state))return;clearTimeout(timer);s.off("word-game:state",listener);done(state);}
    s.on("word-game:state",listener);
  });
}
async function newRoom(socket,code,name="Lagz",mode="daily",score=5){
  const created=await ack(socket,"word-game:create",{code,playerName:name,wordGameMode:mode,matchMode:"ranked",targetScore:score});
  assert.equal(created.ok,true,created.reason);
  return created;
}
async function startRoom(socket,code){
  const next=nextState(socket,state=>state.phase==="playing"&&state.code===code);
  const response=await ack(socket,"word-game:start",{code});
  if(!response.ok){next.catch(()=>{});return response;}
  return { ...response,state:await next };
}
async function finishAnswer(socket,code,word){
  const done=nextState(socket,state=>state.phase==="finished"&&state.code===code);
  const response=await ack(socket,"word-game:submit",{code,value:word});
  assert.equal(response.ok,true,response.reason);
  return await done;
}
async function stats(cookie){
  const res=await fetch(url+"/accounts/me/stats",{headers:{cookie}});
  assert.equal(res.status,200);
  const data=await res.json();assert.equal(data.ok,true);return data.stats;
}
async function leaderboard(cookie){
  const res=await fetch(url+"/accounts/word-game/leaderboard",{headers:{cookie}});
  assert.equal(res.status,200);const data=await res.json();assert.equal(data.ok,true);return data.leaderboard;
}
try {
  boot();await health();
  let setup="";
  for(let i=0;i<40&&!setup;i++){try{setup=(await readFile(bootstrap,"utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0]??"";}catch{}if(!setup)await sleep(80);}
  assert.ok(setup);
  const login=await fetch(url+"/auth/setup-owner",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({bootstrapCode:setup,username:"dailytest",displayName:"Lagz",password:"correct-horse-battery"})
  });
  assert.equal(login.status,201,await login.text().catch(()=>""));
  const cookie=login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const account=(await (await fetch(url+"/auth/status",{headers:{cookie}})).json()).account;
  assert.ok(account?.id);

  // A guest may practise today's shared answer but MUST NOT submit scores by
  // pretending to have the owner's display name.
  const guest=await connect();await newRoom(guest,"DWG001","Lagz");
  const guestStart=await startRoom(guest,"DWG001");assert.equal(guestStart.ok,true);
  const guestDone=await finishAnswer(guest,"DWG001",answerForUtcDay());
  assert.equal(guestDone.phase,"finished");
  await sleep(400);
  assert.equal((await leaderboard(cookie)).stats.dailyPlayed,0,"guest impersonation must not count");

  const first=await connect(cookie);
  const second=await connect(cookie);
  await newRoom(first,"DWR001","Lagz");
  await newRoom(second,"DWR002","Not My Display Name");
  const firstStart=await startRoom(first,"DWR001");
  const secondStart=await startRoom(second,"DWR002");
  assert.equal(firstStart.ok,true);assert.equal(secondStart.ok,true);
  assert.equal(firstStart.state.targetScore,1,"A daily attempt must always be one round");
  assert.equal(secondStart.state.targetScore,1,"Cannot request a five-point daily match");

  const invalid=await ack(first,"word-game:submit",{code:"DWR001",value:"A"});
  assert.equal(invalid.ok,false,"an invalid guess must not consume a daily attempt");
  assert.match(invalid.reason,/exactly five letters/i);
  const unclaimedPath=join(dataRoot,"accounts","word-game-daily-attempts",new Date().toISOString().slice(0,10));
  const beforeFiles=await readdir(unclaimedPath).catch(error=>error.code==="ENOENT"?[]:Promise.reject(error));
  assert.equal(beforeFiles.length,0,"invalid daily guess must not create a ranked claim");
  const solved=await finishAnswer(first,"DWR001",answerForUtcDay());
  assert.equal(solved.winnerPlayerId,solved.viewerPlayerId);
  const secondReply=await ack(second,"word-game:submit",{code:"DWR002",value:answerForUtcDay()});
  assert.equal(secondReply.ok,false,"second simultaneously started room must lose its claim");
  assert.match(secondReply.reason,/already been attempted/i);
  assert.equal((await ack(first,"word-game:start",{code:"DWR001"})).ok,false,"same-room replay must be denied");
  assert.equal((await ack(first,"word-game:next-round",{code:"DWR001"})).ok,false,"cannot request extra daily rounds");
  await newRoom(second,"DWR003","Lagz");
  const third=await ack(second,"word-game:start",{code:"DWR003"});
  assert.equal(third.ok,false,"new daily room must be barred for this account");
  assert.match(third.reason,/already used/i);

  // A player can keep practising, but daily rank and general Gamer Score
  // cannot receive repeat wins through Word Game Practice.
  await newRoom(second,"DWP001","Lagz","practice",1);
  const practice=await startRoom(second,"DWP001");
  assert.equal(practice.ok,true);
  assert.equal(practice.state.wordGameMode,"practice");

  let daily=null;let personal=null;
  for(let i=0;i<35;i++){
    daily=await leaderboard(cookie);
    personal=await stats(cookie);
    if(daily.stats.dailyPlayed===1&&personal.progression.played===1)break;
    await sleep(140);
  }
  assert.equal(daily.stats.dailyPlayed,1);
  assert.equal(daily.stats.dailySolved,1);
  assert.equal(daily.stats.today?.guesses,1);
  assert.equal(daily.today.length,1);
  assert.equal(personal.progression.played,1);
  assert.equal(personal.progression.wins,1);
  assert.equal(personal.byGame.find(row=>row.game==="word-game")?.played,1,"account stats must count just one authenticated daily attempt");
  assert.equal(personal.byGame.find(row=>row.game==="word-game")?.wins,1);

  // Rebuilding from older or accidentally duplicated finalized JSON must
  // never inflate general progression nor Daily Word streak/leaderboard.
  const sessions=join(dataRoot,"sessions","finalized");
  const files=(await readdir(sessions)).filter(v=>v.endsWith(".json"));
  const firstRecord=JSON.parse(await readFile(join(sessions,files.find(f=>f.includes("DWR001"))),"utf8"));
  const clone={...firstRecord,sessionId:"duplicate-reward-test",roomCode:"DWDUP1",finalisedAt:firstRecord.finalisedAt+50};
  await writeFile(join(sessions,"duplicate-reward-test.json"),JSON.stringify(clone));
  const practiceArchive={...firstRecord,
    sessionId:"practice-must-not-score",roomCode:"DWPRAC",finalisedAt:firstRecord.finalisedAt+100,
    state:{...firstRecord.state,wordGameMode:"practice",wordPuzzleKey:null,wordDailyAccountId:null,wordDailyClaimed:false}};
  await writeFile(join(sessions,"practice-must-not-score.json"),JSON.stringify(practiceArchive));
  daily=await leaderboard(cookie);personal=await stats(cookie);
  assert.equal(daily.stats.dailyPlayed,1,"duplicate archives excluded from Daily leaderboard");
  assert.equal(personal.progression.played,1,"duplicate daily + won practice cannot inflate general progression");
  assert.equal(personal.progression.wins,1);
  assert.equal(personal.byGame.find(row=>row.game==="word-game")?.played,1,"guest spoof, daily replay and practice archives cannot inflate personal stats");
  assert.equal(personal.byGame.find(row=>row.game==="word-game")?.wins,1);

  // Restart to verify a day claim is durable, not an in-memory Set.
  for(const s of clients)s.disconnect();
  child.kill("SIGTERM");
  await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once("exit",resolve);});
  log="";boot();await health();
  const afterRestart=await connect(cookie);
  await newRoom(afterRestart,"DWR004","Lagz");
  const afterReply=await ack(afterRestart,"word-game:start",{code:"DWR004"});
  assert.equal(afterReply.ok,false,"claim must persist after server restart");
  assert.match(afterReply.reason,/already used/i);
  console.log("PASS 4.5.5e: guest spoof excluded, one authenticated daily attempt, 2-room replay blocked, same-room/next-round blocked, practice unranked, duplicate archive dedup, restart durability");
} finally {
  for(const s of clients)s.disconnect();
  child?.kill("SIGTERM");
  await sleep(300);
  await rm(temp,{recursive:true,force:true});
}
