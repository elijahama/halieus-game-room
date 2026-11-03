import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";

const root=await mkdtemp(join(tmpdir(),"hgr-solo-socket-integration-"));
process.env.HALIEUS_DATA_DIR=root;
process.env.ROOM_SAVE_PATH=join(root,"rooms.json");
const { rooms }=await import("../server/src/games/mega-board/state/rooms.ts");
const { registerSoloTournamentRegistrationRoutes, getSoloTournamentBoundRoom, getSoloTournamentStartBlock }=
  await import("../server/src/platform/soloTournamentRegistration.ts");
const { registerLobbyHandlers }=await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const { registerAiLobbyHandlers }=await import("../server/src/games/mega-board/handlers/aiLobbyHandlers.ts");
const { registerSessionHandlers }=await import("../server/src/games/mega-board/handlers/sessionHandlers.ts");
const { flushRoomSave }=await import("../server/src/games/mega-board/utils/persistence.ts");
const app=express();
app.use(express.json());
registerSoloTournamentRegistrationRoutes(app,r=>r.get("x-account")?{id:r.get("x-account"),displayName:r.get("x-account")}:null);
const server=app.listen(0,"127.0.0.1");
await new Promise(resolve=>server.once("listening",resolve));
const base="http://127.0.0.1:"+server.address().port;
const api=async(path,account,body)=>{
  const response=await fetch(base+path,{method:"POST",headers:{
    "content-type":"application/json","origin":base,...(account?{"x-account":account}:{})
  },body:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
};
const seat=(id,account,host)=>({
  id,name:account,replayAccountId:account,isHost:host,
  isConnected:true,isAi:false,aiDifficulty:null,hasLeft:false,
  reconnectToken:"token-"+account,disconnectedAt:null,
});
const room=(code,first,second)=>{
  const at=Date.now();
  return {code,hostId:first.id,players:[first,second],ranked:false,blitz:false,
    started:false,gameState:null,createdAt:at,updatedAt:at,hostDisconnectDeadline:null,
    freeParkingJackpotEnabled:false,boardStyle:"classic-board"};
};
const io={to:()=>({emit:()=>{}}),emit:()=>{},sockets:{sockets:new Map()}};
const handlerFor=(socketId)=>{
  const handlers=new Map();
  const socket={id:socketId,connected:true,request:{headers:{}},data:{},
    join:()=>{},leave:()=>{},on:(name,h)=>handlers.set(name,h)};
  registerLobbyHandlers(io,socket);
  registerAiLobbyHandlers(io,socket);
  registerSessionHandlers(io,socket);
  return handlers;
};
const emit=(handlers,name,payload)=>{
  const fn=handlers.get(name);
  assert.equal(typeof fn,"function","event must exist "+name);
  let received=null;
  fn(payload,ack=>received=ack);
  assert.ok(received,"event must acknowledge "+name);
  return received;
};
try{
  const created=await api("/tournaments/solo","owner",{name:"Real lobby sockets"});
  assert.equal(created.status,200);
  const tournament=created.data.tournament.id;
  for(const a of ["second","third","fourth"]){
    assert.equal((await api("/tournaments/solo/"+tournament+"/join",a,{})).status,200);
  }
  assert.equal((await api("/tournaments/solo/"+tournament+"/seed","owner",{})).status,200);
  const live=room("SOCKET48",seat("socket-1","owner",true),seat("socket-4","fourth",false));
  rooms.set(live.code,live);
  const bind=await api("/tournaments/solo/"+tournament+"/matches/semi-1/bind-room","owner",{roomCode:live.code});
  assert.equal(bind.status,200);
  assert.ok(getSoloTournamentBoundRoom(live.code));
  assert.equal(getSoloTournamentStartBlock(live),null);
  const host=handlerFor("socket-1");
  assert.equal(emit(host,"game:preview",{code:live.code}).preview.canJoin,false,"bound room not publicly joinable");
  assert.equal(emit(host,"game:join",{code:live.code,playerName:"Intruder"}).ok,false);
  assert.equal(emit(host,"game:add-ai",{code:live.code,difficulty:"easy"}).ok,false);
  assert.equal(emit(host,"game:remove-ai",{code:live.code,playerId:"fake-ai"}).ok,false);
  assert.equal(emit(host,"game:leave",{code:live.code}).ok,false,"bound host cannot silently destroy lobby");
  assert.equal(emit(host,"game:reconnect",{code:live.code,reconnectToken:"token-owner"}).ok,false,
    "session token alone without authenticated account must not recover the locked seat");
  live.players[1].replayAccountId="outsider";
  assert.equal(emit(host,"game:start",{code:live.code}).ok,false);
  assert.equal(live.started,false,"no game created from tampered roster");
  live.players[1].replayAccountId="fourth";
  const started=emit(host,"game:start",{code:live.code});
  assert.equal(started.ok,true,JSON.stringify(started));
  assert.equal(live.started,true);
  assert.equal(live.gameState?.phase,"ordering");
  assert.equal(live.gameState?.ranked,false);
  assert.equal(live.gameState?.blitz,false);
  assert.equal(emit(host,"game:start",{code:live.code}).ok,false,"one game start only");
  assert.equal(getSoloTournamentBoundRoom(live.code).match.winnerAccountId,null,
    "real game started does not fabricate match winner");
  await flushRoomSave();
  console.log("PASS real Socket.IO handler integration: seeded Solo binds genuine lobby, blocks extra joins/AI/leave/token-only recovery, rejects roster swap, permits original normal Mega Board start with no fake results");
}finally{
  await new Promise(resolve=>server.close(resolve));
  await flushRoomSave();
  rooms.clear();
  await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:50});
}
