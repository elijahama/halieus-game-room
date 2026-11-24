import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { io } from "socket.io-client";

// Exercise the assembled server, real account cookies and real Socket.IO clients.
// Every result comes from game:start + the losing player's game:forfeit, never
// an injected winner, fabricated receipt or direct mutation of game state.
const data=await mkdtemp(join(tmpdir(),"hgr-release-tournaments-"));
const codeFile=join(data,"owner-setup.txt"), sockets=new Set();
const portProbe=createServer();await new Promise(r=>portProbe.listen(0,"127.0.0.1",r));
const port=portProbe.address().port;await new Promise(r=>portProbe.close(r));
const base="http://127.0.0.1:"+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let server, log="", roomSequence=0;
async function start(flag){
 const env={...process.env,PORT:String(port),SERVE_CLIENT:"false",HALIEUS_DATA_DIR:data,
  ROOM_SAVE_PATH:join(data,"rooms.json"),HALIEUS_OWNER_BOOTSTRAP_FILE:codeFile};
 delete env.HGR_SOLO_TOURNAMENT_ALPHA;
 if(flag!==undefined)env.HGR_SOLO_TOURNAMENT_ALPHA=flag;
 server=spawn(process.execPath,["--import","tsx","src/index.ts"],{
  cwd:new URL("../server/",import.meta.url),env,windowsHide:true,shell:false,stdio:["ignore","pipe","pipe"]});
 log="";server.stdout.on("data",b=>log+=b);server.stderr.on("data",b=>log+=b);
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw Error("Isolated server exited: "+log);
  try{if((await fetch(base+"/health")).ok)return;}catch{}
  await sleep(150);
 }
 throw Error("Isolated server did not start: "+log);
}
async function stop(){
 for(const s of sockets)s.disconnect();sockets.clear();
 if(!server||server.exitCode!==null)return;
 const exited=new Promise(r=>server.once("exit",r));server.kill("SIGTERM");await exited;
}
async function api(route,account,body){
 const res=await fetch(base+route,{method:body===undefined?"GET":"POST",headers:{
  ...(account?{Cookie:account.cookie}:{}),...(body===undefined?{}:{"Content-Type":"application/json",Origin:base})},
  body:body===undefined?undefined:JSON.stringify(body)});
 let json;try{json=await res.json();}catch{json={};}
 return {status:res.status,json,cookie:res.headers.get("set-cookie")?.split(";")[0]??account?.cookie};
}
async function post(route,account,body={}){
 const r=await api(route,account,body);assert.ok(r.status===200||r.status===201,route+" "+JSON.stringify(r.json));return r.json;
}
async function until(read,accept,label){
 let value;
 for(let i=0;i<60;i++){value=await read();if(accept(value))return value;await sleep(100);}
 assert.fail(label+": "+JSON.stringify(value));
}
async function connect(account){
 const socket=io(base,{transports:["websocket"],extraHeaders:{Cookie:account.cookie},forceNew:true,reconnection:false});
 sockets.add(socket);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("socket connection timeout")),5000);
  socket.once("connect",()=>{clearTimeout(timer);resolve();});socket.once("connect_error",e=>{clearTimeout(timer);reject(e);});});
 return socket;
}
async function ack(socket,name,payload){
 const result=await socket.timeout(5000).emitWithAck(name,payload);
 assert.equal(result.ok,true,name+" "+JSON.stringify(result));return result;
}
async function room(home,away){
 const code="E2E"+String(++roomSequence).padStart(5,"0");
 const a=await connect(home),b=await connect(away);
 await ack(a,"game:create",{code,playerName:home.name,ranked:false});
 const joined=await ack(b,"game:join",{code,playerName:away.name});
 return {code,a,b,home,away,awayToken:joined.reconnectToken};
}
async function finish(board,homeWins){
 await ack(board.a,"game:start",{code:board.code});
 await ack(homeWins?board.b:board.a,"game:forfeit",{code:board.code});
 board.winner=homeWins?board.a:board.b;
}
async function finishWithDisconnectedWinner(board){
 await ack(board.a,"game:start",{code:board.code});
 const oldId=board.b.id;
 const offline=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{board.a.off("lobby:updated",observe);reject(Error("Disconnected seat not reported"));},5000);
  function observe(lobby){if(lobby.players.some(p=>p.id===oldId&&!p.isConnected&&!p.hasLeft)){
   clearTimeout(timeout);board.a.off("lobby:updated",observe);resolve();
  }}
  board.a.on("lobby:updated",observe);
 });
 board.b.disconnect();sockets.delete(board.b);await offline;
 const result=await ack(board.a,"game:forfeit",{code:board.code});
 assert.equal(result.room.hostId,oldId,"The disconnected original winner owns the room");
 assert.equal(result.state.winnerId,oldId,"Disconnect does not forfeit the winning seat");
 board.winner=board.b;board.disconnectedWinner=true;
}
async function recoverFinishedWinner(board){
 if(!board.disconnectedWinner)return;
 board.b=await connect(board.away);
 const recovered=await ack(board.b,"game:reconnect",{code:board.code,reconnectToken:board.awayToken,playerName:board.away.name});
 assert.equal(recovered.room.hostId,board.b.id,"Recovered host authority follows the original winning seat");
 assert.equal(recovered.state.winnerId,board.b.id,"Winner identity remaps without changing outcome");
 assert.equal(recovered.room.players.filter(p=>p.isHost).length,1,"Exactly one host after recovery");
 board.winner=board.b;
}
async function close(board){
 await ack(board.winner,"game:end-room",{code:board.code});
 board.a.disconnect();board.b.disconnect();sockets.delete(board.a);sockets.delete(board.b);
}
try{
 await start();
 assert.equal((await api("/tournaments/capabilities")).status,401);
 const code=(await readFile(codeFile,"utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0];assert.ok(code);
 const ownerResult=await api("/auth/setup-owner",null,{bootstrapCode:code,username:"releaseowner",displayName:"Release Owner",password:"isolated-release-owner-2026"});
 assert.equal(ownerResult.status,201,JSON.stringify(ownerResult.json));
 const owner={cookie:ownerResult.cookie};const people=[];
 for(let i=0;i<8;i++){
  const username="releaseplayer"+i;
  const invite=await post("/admin/invites",owner,{label:username,expiryDays:7});
  const created=await api("/auth/redeem-invite",null,{inviteCode:invite.code,username,displayName:"Release Player "+i,password:"isolated-player-password-2026"});
  assert.equal(created.status,201,JSON.stringify(created.json));
  people.push({id:created.json.account.id,name:created.json.account.displayName,cookie:created.cookie});
 }
 assert.equal((await api("/tournaments/capabilities",people[0])).json.solo,true,"4.8 default enables Solo for ordinary accounts");
 const byId=new Map(people.map(p=>[p.id,p]));
 const savedSolo=[];
 for(const format of ["four-player-single-elimination","four-player-double-elimination"]){
  const host=people[0];let t=(await post("/tournaments/solo",host,{name:"Release "+format,format})).tournament;
  for(const p of people.slice(1,4))await post("/tournaments/solo/"+t.id+"/join",p);
  t=(await post("/tournaments/solo/"+t.id+"/seed",host)).tournament;
  const get=async()=>(await api("/tournaments/solo",host)).json.tournament.find(x=>x.id===t.id);
  let matches=0;
  while(t.status!=="completed"){
   const m=t.matches.find(x=>x.status==="awaiting-room");assert.ok(m,"ready Solo match");
   const board=await room(byId.get(m.homeAccountId),byId.get(m.awayAccountId));
   await post("/tournaments/solo/"+t.id+"/matches/"+m.id+"/bind-room",host,{roomCode:board.code});
   const homeWins=m.id!=="grand-final"; // Force a genuine reset in double elimination.
   if(m.id==="grand-final") await finishWithDisconnectedWinner(board);
   else await finish(board,homeWins);
   t=await until(get,x=>x.matches.find(y=>y.id===m.id).status==="completed","Solo receipt");
   assert.equal(t.matches.find(x=>x.id===m.id).winnerAccountId,homeWins?m.homeAccountId:m.awayAccountId);
   await recoverFinishedWinner(board);
   await close(board);matches++;
  }
  assert.equal(matches,format.includes("double")?7:3);
  assert.ok(t.championAccountId);savedSolo.push(t);
  console.log("PASS full server Solo "+format+": authenticated registration, "+matches+" played forfeits and durable champion");
 }
 const guilds=[];
 for(let i=0;i<4;i++){
  const members=people.slice(i*2,i*2+2),lead=members[0];
  const guild=(await post("/guilds",lead,{name:"Release Guild "+i})).guild;
  await post("/guilds/join",members[1],{inviteCode:guild.inviteCode});
  guilds.push({id:guild.id,lead,members});
 }
 const guildById=new Map(guilds.map(g=>[g.id,g])), savedGuild=[];
 for(const format of ["four-guild-knockout","four-guild-double-elimination"]){
  const host=guilds[0];let t=(await post("/guild-tournaments",host.lead,{guildId:host.id,name:"Release "+format,format})).tournament;
  for(const g of guilds.slice(1))await post("/guild-tournaments/"+t.id+"/register",g.lead,{guildId:g.id});
  t=(await post("/guild-tournaments/"+t.id+"/start",host.lead)).tournament;
  const get=async()=>(await api("/guild-tournaments",host.lead)).json.tournaments.find(x=>x.id===t.id);
  let matches=0,deciders=0;
  while(t.status!=="completed"){
   const m=t.matches.find(x=>x.status==="ready");assert.ok(m,"ready Guild match");
   const home=guildById.get(m.homeGuildId),away=guildById.get(m.awayGuildId);
   const fixture=(await post("/guild-fixtures",home.lead,{homeGuildId:home.id,awayGuildId:away.id,homeLineups:home.members.map(p=>[p.id])})).fixture;
   await post("/guild-fixtures/"+fixture.id+"/accept",away.lead,{awayLineups:away.members.map(p=>[p.id])});
   const boards=[await room(home.members[0],away.members[0]),await room(home.members[1],away.members[1])];
   await post("/guild-fixtures/"+fixture.id+"/bind-rooms",home.lead,{roomCodes:boards.map(b=>b.code)});
   await post("/guild-tournaments/"+t.id+"/matches/"+m.id+"/link",home.lead,{fixtureId:fixture.id});
   const homeWins=m.id!=="grand-final",tie=m.id==="semi-1";
   await finish(boards[0],tie?true:homeWins);
   if(tie) await finishWithDisconnectedWinner(boards[1]);
   else await finish(boards[1],homeWins);
   t=await until(get,x=>["completed","tied"].includes(x.matches.find(y=>y.id===m.id).status),"Guild fixture receipt");
   if(tie){
    await recoverFinishedWinner(boards[1]);
    assert.equal(t.matches.find(x=>x.id===m.id).status,"tied");
    await post("/guild-fixtures/"+fixture.id+"/tiebreaker/nominate",home.lead,{guildId:home.id,accountId:home.members[0].id});
    await post("/guild-fixtures/"+fixture.id+"/tiebreaker/nominate",away.lead,{guildId:away.id,accountId:away.members[1].id});
    const third=await room(home.members[0],away.members[1]);
    await post("/guild-fixtures/"+fixture.id+"/tiebreaker/bind-room",home.lead,{roomCode:third.code});
    await finish(third,homeWins);
    t=await until(get,x=>x.matches.find(y=>y.id===m.id).status==="completed","Guild third-game receipt");
    const saved=(await api("/guild-fixtures",home.lead)).json.fixtures.find(f=>f.id===fixture.id);
    assert.equal(saved.homeBoardWins,1);assert.equal(saved.awayBoardWins,1);
    assert.ok(saved.tiebreaker.result);await close(third);deciders++;
   }
   assert.equal(t.matches.find(x=>x.id===m.id).winnerGuildId,homeWins?home.id:away.id);
   for(const board of boards)await close(board);matches++;
  }
  assert.equal(matches,format.includes("double")?7:3);assert.equal(deciders,1);
  assert.ok(t.championGuildId);savedGuild.push(t);
  console.log("PASS full server Guild "+format+": real membership, "+matches+" fixtures, original-player third game and durable champion");
 }
 await stop();await start();
 const soloReload=(await api("/tournaments/solo",people[0])).json.tournament;
 const guildReload=(await api("/guild-tournaments",people[0])).json.tournaments;
 for(const t of savedSolo){const reloaded=soloReload.find(x=>x.id===t.id);assert.equal(reloaded.championAccountId,t.championAccountId);assert.deepEqual(reloaded.matches,t.matches);}
 for(const t of savedGuild){const reloaded=guildReload.find(x=>x.id===t.id);assert.equal(reloaded.championGuildId,t.championGuildId);assert.deepEqual(reloaded.matches,t.matches);}
 console.log("PASS all four completed formats survive full server restart with original receipts");
 await stop();await start("0");
 assert.equal((await api("/tournaments/capabilities",people[0])).json.solo,false);
 assert.equal((await api("/tournaments/solo",people[0])).status,404);
 console.log("PASS explicit legacy opt-out disables both capability and Solo routes");
}finally{await stop();await rm(data,{recursive:true,force:true,maxRetries:8,retryDelay:100});}
