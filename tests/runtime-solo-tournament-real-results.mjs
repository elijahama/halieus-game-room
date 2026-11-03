import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";

const root=await mkdtemp(join(tmpdir(),"hgr-solo-verified-results-"));
process.env.HALIEUS_DATA_DIR=root;
process.env.ROOM_SAVE_PATH=join(root,"rooms.json");
const { rooms }=await import("../server/src/games/mega-board/state/rooms.ts");
const { createSoloTournamentRegistrationCoordinator, registerSoloTournamentRegistrationRoutes,
  getSoloTournamentBoundRoom, recordFinishedSoloTournamentBoard }=
  await import("../server/src/platform/soloTournamentRegistration.ts");
const { registerLobbyHandlers }=await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const { emitGameState }=await import("../server/src/games/mega-board/utils/game-state.ts");
const { flushRoomSave }=await import("../server/src/games/mega-board/utils/persistence.ts");

const app=express();app.use(express.json());
registerSoloTournamentRegistrationRoutes(app,request=>{
  const id=request.get("x-account");
  return id?{id,displayName:id}:null;
});
const server=app.listen(0,"127.0.0.1");
await new Promise(resolve=>server.once("listening",resolve));
const base="http://127.0.0.1:"+server.address().port;
const api=async(path,account,body)=>{
  const response=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{
    ...(account?{"x-account":account}:{}),
    ...(body!==undefined?{"content-type":"application/json","origin":base}:{}),
  },...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const text=await response.text();
  let data;
  try {data=JSON.parse(text);} catch {data={reason:"Route did not return JSON"};}
  return {status:response.status,data};
};
const seat=(socketId,accountId,host=false)=>({
  id:socketId,name:accountId,replayAccountId:accountId,isHost:host,
  isConnected:true,isAi:false,aiDifficulty:null,hasLeft:false,
  reconnectToken:"token-"+accountId,disconnectedAt:null,
});
const gameRoom=(code,a,b)=>({
  code,hostId:a.id,players:[a,b],ranked:false,blitz:false,betaTournamentTest:false,
  started:false,gameState:null,createdAt:Date.now(),updatedAt:Date.now(),
  hostDisconnectDeadline:null,freeParkingJackpotEnabled:false,boardStyle:"classic-board",
});
const io={to:()=>({emit:()=>{}}),emit:()=>{},sockets:{sockets:new Map()}};
const startGame=(room)=>{
  const handlers=new Map();
  const socket={id:room.hostId,connected:true,data:{},request:{headers:{}},
    join:()=>{},leave:()=>{},on:(name,cb)=>handlers.set(name,cb)};
  registerLobbyHandlers(io,socket);
  let ack=null;
  handlers.get("game:start")({code:room.code},a=>ack=a);
  assert.equal(ack?.ok,true,ack?.reason);
  assert.equal(room.gameState?.phase,"ordering");
};
const makeReceipt=async(room,winnerId)=>{
  const state=room.gameState;
  assert.ok(state);
  state.phase="finished";state.winnerId=winnerId;
  emitGameState(io,room.code,state);
  return recordFinishedSoloTournamentBoard(room,state);
};
try{
  const t=(await api("/tournaments/solo","host",{name:"Real Solo winner verification"})).data.tournament;
  for(const id of ["player-b","player-c","player-d"])
    assert.equal((await api("/tournaments/solo/"+t.id+"/join",id,{})).status,200);
  assert.equal((await api("/tournaments/solo/"+t.id+"/seed","host",{})).status,200);
  const semifinal1=gameRoom("SFINALA1",seat("s1","host",true),seat("s4","player-d"));
  const semifinal2=gameRoom("SFINALA2",seat("s2","player-b",true),seat("s3","player-c"));
  rooms.set(semifinal1.code,semifinal1);rooms.set(semifinal2.code,semifinal2);
  for(const [id,room] of [["semi-1",semifinal1],["semi-2",semifinal2]]){
    const bound=await api("/tournaments/solo/"+t.id+"/matches/"+id+"/bind-room","host",{roomCode:room.code});
    assert.equal(bound.status,200,JSON.stringify(bound.data));
  }
  assert.equal((await api("/tournaments/solo/"+t.id+"/matches/final/bind-room","host",
    {roomCode:semifinal1.code})).status,409,"no final before semifinals");

  startGame(semifinal1);
  const state1=semifinal1.gameState;
  await assert.rejects(recordFinishedSoloTournamentBoard(semifinal1,state1),
    /does not match|Completed Solo match/,"ongoing room may not submit result");
  state1.phase="finished";state1.winnerId="foreign-player";
  await assert.rejects(recordFinishedSoloTournamentBoard(semifinal1,state1),/winner/);
  state1.winnerId="s1";
  const cloned={...state1};
  await assert.rejects(recordFinishedSoloTournamentBoard(semifinal1,cloned),/does not match/);
  const origStarted=state1.gameStartedAt;
  state1.gameStartedAt=semifinal1.createdAt-1;
  await assert.rejects(recordFinishedSoloTournamentBoard(semifinal1,state1),/does not match/);
  state1.gameStartedAt=origStarted;
  const first=await makeReceipt(semifinal1,"s1");
  assert.equal(first.status,"seeded");
  assert.equal(first.matches[0].status,"completed");
  assert.equal(first.matches[0].winnerAccountId,"host");
  assert.equal(first.matches[2].status,"awaiting-opponents");
  assert.equal(first.championAccountId,null);
  assert.deepEqual(await recordFinishedSoloTournamentBoard(semifinal1,state1),first,
    "duplicate completed game event is idempotent");
  state1.winnerId="s4";
  await assert.rejects(recordFinishedSoloTournamentBoard(semifinal1,state1),/immutable/);
  state1.winnerId="s1";

  startGame(semifinal2);
  const second=await makeReceipt(semifinal2,"s3");
  assert.equal(second.status,"seeded");
  assert.equal(second.matches[1].winnerAccountId,"player-c");
  assert.equal(second.matches[2].status,"awaiting-room");
  assert.equal(second.matches[2].homeAccountId,"host");
  assert.equal(second.matches[2].awayAccountId,"player-c");
  assert.equal(second.matches[2].winnerAccountId,null);
  assert.equal(second.championAccountId,null);
  const restart=createSoloTournamentRegistrationCoordinator(join(root,"mega-board","tournaments","solo-registration.json"));
  await restart.load();
  assert.deepEqual(restart.visible("player-c")[0],second,"real semifinal results persist across restart");

  const wrong=gameRoom("FINALBAD",seat("final-a","host",true),seat("wrong","player-b"));
  rooms.set(wrong.code,wrong);
  assert.equal((await api("/tournaments/solo/"+t.id+"/matches/final/bind-room","host",
    {roomCode:wrong.code})).status,409,"only actual semifinal winners can join final");
  rooms.delete(wrong.code);
  const finalRoom=gameRoom("REALFINAL",seat("final-h","host",true),seat("final-c","player-c"));
  rooms.set(finalRoom.code,finalRoom);
  const boundFinal=await api("/tournaments/solo/"+t.id+"/matches/final/bind-room","host",{roomCode:finalRoom.code});
  assert.equal(boundFinal.status,200);
  assert.equal(boundFinal.data.tournament.matches[2].status,"room-bound");
  startGame(finalRoom);
  const finished=await makeReceipt(finalRoom,"final-c");
  assert.equal(finished.status,"completed");
  assert.equal(finished.championAccountId,"player-c");
  assert.equal(finished.matches[2].winnerAccountId,"player-c");
  assert.ok(finished.matches.every(m=>m.status==="completed"));
  assert.equal(finished.matches[0].winnerAccountId,"host");
  assert.equal(finished.matches[1].winnerAccountId,"player-c");
  assert.deepEqual(await recordFinishedSoloTournamentBoard(finalRoom,finalRoom.gameState),finished);
  assert.equal(getSoloTournamentBoundRoom(finalRoom.code),null,"completed match no longer blocks post-game exit");
  assert.equal((await api("/tournaments/solo/"+t.id+"/seed","host",{})).status,409);
  assert.equal((await api("/tournaments/solo/"+t.id+"/cancel","host",{})).status,409);
  assert.equal((await api("/tournaments/solo/"+t.id+"/result","host",
    {winnerAccountId:"host"})).status,404,"no client controlled result endpoint");

  // Fail-closed persisted champion tampering, preserving the original file.
  const file=join(root,"mega-board","tournaments","solo-registration.json");
  const parsed=JSON.parse(await readFile(file,"utf8"));
  parsed.tournaments[0].championAccountId="player-b";
  await writeFile(file,JSON.stringify(parsed));
  await assert.rejects(createSoloTournamentRegistrationCoordinator(file).load(),/champion/);
  assert.equal(JSON.parse(await readFile(file,"utf8")).tournaments[0].championAccountId,"player-b");
  await flushRoomSave();
  console.log("PASS server-owned Solo match receipts: two real semifinal starts, once-only winning seats, signed-in exact room generation, verified finalists, real final and persisted champion; forged client result, duplicates, tampering and replay blocked");
}finally{
  await new Promise(resolve=>server.close(resolve));
  await flushRoomSave();
  rooms.clear();
  await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:50});
}
