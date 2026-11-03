import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { createServer } from "node:http";
import { rooms } from "../server/src/games/mega-board/state/rooms.ts";
import {
  createSoloTournamentRegistrationCoordinator as create,
  getSoloTournamentBoundRoom,
  getSoloTournamentStartBlock,
  registerSoloTournamentRegistrationRoutes,
  SoloTournamentError,
} from "../server/src/platform/soloTournamentRegistration.ts";

const root=await mkdtemp(join(tmpdir(),"hgr-solo-room-binding-"));
const file=join(root,"solo.json");
const fixedTime=Date.now();
const room=(code,a,b)=>({
  code,createdAt:fixedTime,updatedAt:fixedTime,hostId:"socket-"+a,
  ranked:false,blitz:false,betaTournamentTest:false,
  hostDisconnectDeadline:null,players:[
    {id:"socket-"+a,name:"Player "+a,isHost:true,isAi:false,isConnected:true,hasLeft:false,replayAccountId:a,reconnectToken:"secret-"+a,disconnectedAt:null},
    {id:"socket-"+b,name:"Player "+b,isHost:false,isAi:false,isConnected:true,hasLeft:false,replayAccountId:b,reconnectToken:"secret-"+b,disconnectedAt:null},
  ],started:false,gameState:null,freeParkingJackpotEnabled:false,
});
const rejectCode=(promise,code)=>assert.rejects(promise,e=>e instanceof SoloTournamentError && e.statusCode===code);
try {
  const c=create(file);await c.load();
  const t=await c.create("host","Four-player real lobby test");
  for(const a of ["beta","gamma","delta"]) await c.join(a,t.id);
  const seed=await c.seed("host",t.id);
  const a=room("SOLOABC1","host","delta");
  const b=room("SOLOABC2","beta","gamma");
  rooms.set(a.code,a);rooms.set(b.code,b);
  await rejectCode(c.bindRoom("beta",t.id,"semi-1",a.code),403);
  await rejectCode(c.bindRoom("host",t.id,"final",a.code),409);
  await rejectCode(c.bindRoom("host",t.id,"semi-1","MISSING"),409);
  const swapped=room("SWAPPED1","host","outsider");rooms.set(swapped.code,swapped);
  await rejectCode(c.bindRoom("host",t.id,"semi-1",swapped.code),409);
  rooms.delete(swapped.code);
  const badTypes=[
    x=>{x.betaTournamentTest=true;},
    x=>{x.ranked=true;},
    x=>{x.blitz=true;},
    x=>{x.players[1].isAi=true;},
    x=>{x.players[1].isConnected=false;},
    x=>{x.players[0].replayAccountId="outsider";},
    x=>{x.hostDisconnectDeadline=Date.now()+6000;},
    x=>{x.players.push({...x.players[1],id:"another",replayAccountId:"extra"});},
    x=>{x.started=true;},
    x=>{x.gameState={phase:"playing"};},
  ];
  for(let i=0;i<badTypes.length;i++){
    const bad=room("INVALID"+i,"host","delta");badTypes[i](bad);rooms.set(bad.code,bad);
    await rejectCode(c.bindRoom("host",t.id,"semi-1",bad.code),409);
    rooms.delete(bad.code);
  }
  assert.equal(c.boundRoom(a.code),null,"not locked until verified persisted binding");
  const linked=await c.bindRoom("host",t.id,"semi-1",a.code);
  assert.equal(linked.matches[0].status,"room-bound");
  assert.equal(linked.matches[0].roomCode,a.code);
  assert.equal(linked.matches[0].roomCreatedAt,a.createdAt);
  assert.match(linked.matches[0].boardMatchId,/^[0-9a-f]{8}-/);
  assert.equal(linked.matches[0].winnerAccountId,null);
  assert.equal(linked.matches[1].roomCode,null);
  assert.equal(c.startBlock(a),null,"unchanged genuine original room can start");
  assert.equal(c.boundRoom(a.code).match.boardMatchId,linked.matches[0].boardMatchId);
  await rejectCode(c.bindRoom("host",t.id,"semi-1",a.code),409);
  await rejectCode(c.bindRoom("host",t.id,"semi-2",a.code),409);
  await rejectCode(c.cancel("host",t.id),409);
  await rejectCode(c.bindRoom("host",t.id,"semi-2","no"),400);
  const linked2=await c.bindRoom("host",t.id,"semi-2",b.code);
  assert.equal(linked2.matches[1].status,"room-bound");
  assert.notEqual(linked2.matches[0].boardMatchId,linked2.matches[1].boardMatchId);
  const restart=create(file);await restart.load();
  assert.deepEqual(restart.visible("gamma")[0],linked2,"room identity and bracket survive restart");
  assert.equal(restart.startBlock(a),null);
  const different={...a,createdAt:a.createdAt+1};rooms.set(a.code,different);
  assert.match(restart.startBlock(different),/replaced/,"room code reuse fails closed");
  rooms.set(a.code,a);
  a.players[1].replayAccountId="outsider";
  assert.match(restart.startBlock(a),/accounts/,"lineup tampering blocks game start");
  a.players[1].replayAccountId="delta";
  a.started=true;
  assert.match(restart.startBlock(a),/unstarted/);
  a.started=false;

  // A separate tournament may not claim the same original room.
  const t2=await restart.create("host2","Second tournament");
  for(const id of ["op1","op2","op3"]) await restart.join(id,t2.id);
  await restart.seed("host2",t2.id);
  await rejectCode(restart.bindRoom("host2",t2.id,"semi-1",a.code),409);

  // Upgrade old, unbound registration-alpha records without inventing room outcomes.
  const legacyFile=join(root,"legacy.json");
  const lc=create(legacyFile);await lc.load();
  const old=await lc.create("legacy-host","Legacy seeded bracket");
  for(const id of ["old-2","old-3","old-4"]) await lc.join(id,old.id);
  await lc.seed("legacy-host",old.id);
  const legacyDoc=JSON.parse(await readFile(legacyFile,"utf8"));
  for(const m of legacyDoc.tournaments[0].matches){
    delete m.roomCreatedAt;
    delete m.boardMatchId;
  }
  await writeFile(legacyFile,JSON.stringify(legacyDoc));
  const compat=create(legacyFile);await compat.load();
  assert.ok(compat.visible("legacy-host")[0].matches.every(m=>m.roomCreatedAt===null && m.boardMatchId===null),
    "old alpha brackets can be recovered safely without inventing a match");

  // Forged bound room generation, seat winner, or duplicate binding fails startup, not reset.
  const raw=JSON.parse(await readFile(file,"utf8"));
  const saved=raw.tournaments.find(v=>v.id===t.id);
  saved.matches[0].winnerAccountId="fake-winner";
  await writeFile(file,JSON.stringify(raw));
  await assert.rejects(create(file).load(),/Unfinished Solo room cannot claim a result/);
  assert.equal(JSON.parse(await readFile(file,"utf8")).tournaments.find(v=>v.id===t.id).matches[0].winnerAccountId,"fake-winner");

  // Live route shares the same match coordinator used by socket lobby/start guards.
  const original=process.env.HALIEUS_DATA_DIR;
  process.env.HALIEUS_DATA_DIR=join(root,"web");
  const app=express();app.use(express.json());
  registerSoloTournamentRegistrationRoutes(app,req=>req.get("x-account")?{id:req.get("x-account"),displayName:"Test"}:null);
  const server=createServer(app);
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    const address=server.address();assert.ok(address&&typeof address==="object");
    const base="http://127.0.0.1:"+address.port;
    const api=async(path,id,body)=>{
      const response=await fetch(base+path,{method:"POST",headers:{
        ...(id?{"x-account":id}:{}),
        "content-type":"application/json","origin":base,
      },body:JSON.stringify(body)});
      return {status:response.status,data:await response.json()};
    };
    const created=await api("/tournaments/solo","host2",{name:"HTTP real binding"});
    assert.equal(created.status,200);
    const id=created.data.tournament.id;
    for(const user of ["a","b","c"]) assert.equal((await api("/tournaments/solo/"+id+"/join",user,{})).status,200);
    assert.equal((await api("/tournaments/solo/"+id+"/seed","host2",{})).status,200);
    const h=room("SOLOHTTP","host2","c");rooms.set(h.code,h);
    assert.equal((await api("/tournaments/solo/"+id+"/matches/semi-1/bind-room","a",{roomCode:h.code})).status,403);
    const bound=await api("/tournaments/solo/"+id+"/matches/semi-1/bind-room","host2",{roomCode:h.code});
    assert.equal(bound.status,200);
    assert.equal(bound.data.tournament.matches[0].roomCode,h.code);
    assert.equal(getSoloTournamentStartBlock(h),null);
    assert.equal(getSoloTournamentBoundRoom(h.code).match.boardMatchId,bound.data.tournament.matches[0].boardMatchId);
    h.players[1].hasLeft=true;
    assert.match(getSoloTournamentStartBlock(h),/unstarted/);
    h.players[1].hasLeft=false;
    rooms.delete(h.code);
  }finally{
    await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    if(original===undefined) delete process.env.HALIEUS_DATA_DIR;
    else process.env.HALIEUS_DATA_DIR=original;
  }
  const code=await readFile(join(process.cwd(),"server/src/games/mega-board/handlers/lobbyHandlers.ts"),"utf8");
  const ai=await readFile(join(process.cwd(),"server/src/games/mega-board/handlers/aiLobbyHandlers.ts"),"utf8");
  const leave=await readFile(join(process.cwd(),"server/src/games/mega-board/handlers/sessionHandlers.ts"),"utf8");
  const startup=await readFile(join(process.cwd(),"server/src/index.ts"),"utf8");
  assert.match(code,/getSoloTournamentBoundRoom\(code\)/);
  assert.match(code,/getSoloTournamentStartBlock\(room\)/);
  assert.match(ai,/getSoloTournamentBoundRoom\(code\)/);
  assert.match(leave,/getSoloTournamentBoundRoom\(code\)/);
  assert.match(startup,/await loadSoloTournamentRegistration\(\)/);
  console.log("PASS Solo real room binding: real 2-human auth seats, exact room creation identity, blocked AI/join/leave, no phantom rooms/winners, persistence, HTTP host route, restart/failure protection");
}finally{
  rooms.clear();
  await rm(root,{recursive:true,force:true});
}
