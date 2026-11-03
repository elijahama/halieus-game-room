import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";

const dir=await mkdtemp(join(tmpdir(),"hgr-solo-forfeit-"));
process.env.HALIEUS_DATA_DIR=dir;
process.env.ROOM_SAVE_PATH=join(dir,"rooms.json");
const {rooms}=await import("../server/src/games/mega-board/state/rooms.ts");
const {registerSoloTournamentRegistrationRoutes,recordFinishedSoloTournamentBoard,getSoloTournamentBoundRoom}=
  await import("../server/src/platform/soloTournamentRegistration.ts");
const {registerLobbyHandlers}=await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const {registerSessionHandlers}=await import("../server/src/games/mega-board/handlers/sessionHandlers.ts");
const {endRoom}=await import("../server/src/games/mega-board/utils/room-lifecycle.ts");
const {hostReconnectGraceMs,ACTIVE_HOST_RECONNECT_GRACE_MS,HOST_RECONNECT_GRACE_MS}=
  await import("../server/src/games/mega-board/utils/host-grace.ts");
const {flushRoomSave}=await import("../server/src/games/mega-board/utils/persistence.ts");
const app=express();app.use(express.json());
registerSoloTournamentRegistrationRoutes(app,req=>{
  const id=req.get("x-account");
  return id ? {id,displayName:id} : null;
});
const http=app.listen(0,"127.0.0.1");
await new Promise(resolve=>http.once("listening",resolve));
const origin="http://127.0.0.1:"+http.address().port;
const api=async(path,account,body)=>{
  const res=await fetch(origin+path,{method:"POST",headers:{
    "content-type":"application/json","origin":origin,"x-account":account
  },body:JSON.stringify(body)});
  return {status:res.status,data:await res.json()};
};
const player=(id,account,host=false)=>({
  id,replayAccountId:account,name:account,isHost:host,isConnected:true,
  isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"token-"+account,disconnectedAt:null
});
const lobby=(code,a,b)=>({
  code,hostId:a.id,players:[a,b],started:false,gameState:null,ranked:false,blitz:false,betaTournamentTest:false,
  createdAt:Date.now(),updatedAt:Date.now(),hostDisconnectDeadline:null,
  freeParkingJackpotEnabled:false,boardStyle:"classic-board"
});
const io={
  to:()=>({emit:()=>{}}),in:()=>({socketsLeave:()=>{}}),emit:()=>{},
  sockets:{sockets:new Map()}
};
const socketHandlers=(id)=>{
  const handlers=new Map();
  const socket={id,connected:true,request:{headers:{}},data:{},
    join:()=>{},leave:()=>{},on:(name,fn)=>handlers.set(name,fn)};
  registerLobbyHandlers(io,socket);
  registerSessionHandlers(io,socket);
  return handlers;
};
const event=(handlers,name,payload)=>{
  const fn=handlers.get(name);
  assert.equal(typeof fn,"function","missing event "+name);
  let ack=null;
  fn(payload,value=>{ack=value});
  assert.ok(ack,"expected ack for "+name);
  return ack;
};
try {
  const created=await api("/tournaments/solo","host",{name:"Server-verified Solo forfeits"});
  assert.equal(created.status,200);
  const tid=created.data.tournament.id;
  for(const id of ["beta","gamma","delta"]) {
    assert.equal((await api("/tournaments/solo/"+tid+"/join",id,{})).status,200);
  }
  assert.equal((await api("/tournaments/solo/"+tid+"/seed","host",{})).status,200);

  const one=lobby("FORFEIT1",player("host-s","host",true),player("delta-s","delta"));
  rooms.set(one.code,one);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-1/bind-room","host",
    {roomCode:one.code})).status,200);
  const host=socketHandlers("host-s");
  const wrong=socketHandlers("delta-s");
  assert.equal(event(host,"game:end-room",{code:one.code}).ok,false,"host cannot delete pending tournament");
  assert.equal(event(host,"game:leave",{code:one.code}).ok,false,"prestart host cannot break roster");
  assert.equal(endRoom(io,one.code,"force delete"),false,"all general-purpose deletes blocked");
  assert.equal(hostReconnectGraceMs(one),ACTIVE_HOST_RECONNECT_GRACE_MS,
    "an abandoned tournament lobby must not expire on the ordinary 90-second timeout");
  assert.equal(rooms.get(one.code),one,"original live room remains");
  assert.equal(event(host,"game:start",{code:one.code}).ok,true);
  assert.equal(event(host,"game:leave",{code:one.code}).ok,true,"leaving after start forfeits normal game");
  assert.equal(rooms.get(one.code),one,"forfeit must not delete room");
  assert.equal(one.gameState.phase,"finished");
  assert.equal(one.gameState.winnerId,"delta-s");
  assert.equal(event(wrong,"game:forfeit",{code:one.code}).ok,false,
    "finished-game winner cannot forfeit after outcome but before receipt save");
  assert.equal(one.gameState.winnerId,"delta-s","a completed result must be immutable");
  assert.equal(one.hostId,"delta-s","surviving original account gains host continuity");
  assert.equal(one.players[0].isHost,false);
  assert.equal(one.players[1].isHost,true);
  const receipt1=await recordFinishedSoloTournamentBoard(one,one.gameState);
  assert.equal(receipt1.matches[0].winnerAccountId,"delta");
  assert.equal(receipt1.matches[2].status,"awaiting-opponents");

  const two=lobby("FORFEIT2",player("beta-s","beta",true),player("gamma-s","gamma"));
  rooms.set(two.code,two);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-2/bind-room","host",
    {roomCode:two.code})).status,200);
  const beta=socketHandlers("beta-s");
  const gamma=socketHandlers("gamma-s");
  assert.equal(event(beta,"game:start",{code:two.code}).ok,true);
  const quit=event(gamma,"game:forfeit",{code:two.code});
  assert.equal(quit.ok,true);
  assert.equal(quit.spectator,true,"forfeiter may spectate");
  assert.equal(two.gameState.winnerId,"beta-s");
  assert.equal(two.hostId,"beta-s","non-host forfeit retains original host");
  const receipt2=await recordFinishedSoloTournamentBoard(two,two.gameState);
  assert.equal(receipt2.matches[1].winnerAccountId,"beta");
  assert.equal(receipt2.matches[2].homeAccountId,"delta");
  assert.equal(receipt2.matches[2].awayAccountId,"beta");
  assert.equal(receipt2.championAccountId,null);
  assert.equal(event(host,"game:end-room",{code:one.code}).ok,false,
    "a pending receipt or completed room guard is not an authority to forge results");

  const final=lobby("FORFINAL",player("beta-f","beta",true),player("delta-f","delta"));
  rooms.set(final.code,final);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/final/bind-room","host",
    {roomCode:final.code})).status,200);
  const finalHost=socketHandlers("beta-f");
  assert.equal(event(finalHost,"game:start",{code:final.code}).ok,true);
  assert.equal(event(finalHost,"game:end-room",{code:final.code}).ok,false);
  const result=event(finalHost,"game:forfeit",{code:final.code});
  assert.equal(result.ok,true);
  assert.equal(result.spectator,true);
  assert.equal(final.hostId,"delta-f");
  assert.equal(final.gameState.winnerId,"delta-f");
  assert.equal(event(socketHandlers("delta-f"),"game:forfeit",{code:final.code}).ok,false);
  assert.equal(final.gameState.winnerId,"delta-f","cannot rewrite a final winner after it is finished");
  const champion=await recordFinishedSoloTournamentBoard(final,final.gameState);
  assert.equal(champion.status,"completed");
  assert.equal(champion.championAccountId,"delta");
  assert.ok(champion.matches.every(m=>m.status==="completed"));
  assert.deepEqual(await recordFinishedSoloTournamentBoard(final,final.gameState),champion,
    "duplicate finish emissions produce no extra winner");
  assert.equal(getSoloTournamentBoundRoom(final.code),null,"settled final unblocks ordinary postgame cleanup");
  assert.equal(event(finalHost,"game:end-room",{code:final.code}).ok,false,
    "forfeited former host cannot delete room after host ownership passes");

  const ordinary=lobby("ORDINARY",player("normal-h","normal",true),player("normal-a","normal2"));
  rooms.set(ordinary.code,ordinary);
  assert.equal(hostReconnectGraceMs(ordinary),HOST_RECONNECT_GRACE_MS,
    "unbound ordinary lobby retains its existing 90-second grace");
  const normal=socketHandlers("normal-h");
  assert.equal(event(normal,"game:end-room",{code:ordinary.code}).ok,true,"ordinary close untouched");
  assert.equal(rooms.has(ordinary.code),false);
  await flushRoomSave();
  console.log("PASS real Solo forfeits: host leave and explicit forfeit settle actual game wins, protect pending room from end/delete, promote surviving host, preserve spectator route and ordinary room close");
} finally {
  await new Promise(resolve=>http.close(resolve));
  await flushRoomSave();
  rooms.clear();
  await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:50});
}
