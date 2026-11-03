import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";

const root=await mkdtemp(join(tmpdir(),"hgr-solo-double-consent-"));
process.env.HALIEUS_DATA_DIR=root;
process.env.ROOM_SAVE_PATH=join(root,"rooms.json");
const {rooms}=await import("../server/src/games/mega-board/state/rooms.ts");
const {registerSoloTournamentRegistrationRoutes,configureSoloRoomResetCloser,
  getSoloTournamentBoundRoom,getSoloTournamentStartBlock}=await import("../server/src/platform/soloTournamentRegistration.ts");
const {endRoom}=await import("../server/src/games/mega-board/utils/room-lifecycle.ts");
const {registerLobbyHandlers}=await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const {flushRoomSave}=await import("../server/src/games/mega-board/utils/persistence.ts");
const io={to:()=>({emit:()=>{}}),in:()=>({socketsLeave:()=>{}}),emit:()=>{},sockets:{sockets:new Map()}};
let closures=0;
configureSoloRoomResetCloser(code=>{
  const ok=endRoom(io,code,"Original never-started Solo lobby replaced by unanimous consent.");
  if(ok) closures++;
  return ok;
});
const app=express();app.use(express.json());
registerSoloTournamentRegistrationRoutes(app,request=>{
  const a=request.get("x-account");
  return a?{id:a,displayName:a}:null;
});
const http=app.listen(0,"127.0.0.1");
await new Promise(resolve=>http.once("listening",resolve));
const base="http://127.0.0.1:"+http.address().port;
const api=async(path,account,body={})=>{
  const res=await fetch(base+path,{method:"POST",headers:{
    "content-type":"application/json","origin":base,
    ...(account?{"x-account":account}:{})
  },body:JSON.stringify(body)});
  return {status:res.status,data:await res.json()};
};
const seat=(s,a,host=false)=>({
  id:s,name:a,replayAccountId:a,isHost:host,isConnected:true,isAi:false,aiDifficulty:null,
  hasLeft:false,reconnectToken:"token-"+a,disconnectedAt:null
});
const lobby=(code,a,b)=>{
  const now=Date.now();
  return {code,hostId:a.id,players:[a,b],ranked:false,blitz:false,betaTournamentTest:false,
    started:false,gameState:null,createdAt:now,updatedAt:now,hostDisconnectDeadline:null,
    freeParkingJackpotEnabled:false,boardStyle:"classic-board"};
};
const handlers=id=>{
  const h=new Map();
  registerLobbyHandlers(io,{id,request:{headers:{}},connected:true,data:{},
    join:()=>{},leave:()=>{},on:(name,fn)=>h.set(name,fn)});
  return h;
};
const emit=(map,event,payload)=>{
  let out=null;map.get(event)(payload,r=>out=r);assert.ok(out);return out;
};
try {
  const created=await api("/tournaments/solo","host",{name:"Safe pre-start recovery"});
  assert.equal(created.status,200);
  const tid=created.data.tournament.id;
  for(const id of ["beta","gamma","delta"]) assert.equal((await api("/tournaments/solo/"+tid+"/join",id)).status,200);
  assert.equal((await api("/tournaments/solo/"+tid+"/seed","host")).status,200);
  const original=lobby("RECOVERY1",seat("host-s","host",true),seat("delta-s","delta"));
  rooms.set(original.code,original);
  const link=await api("/tournaments/solo/"+tid+"/matches/semi-1/bind-room","host",{roomCode:original.code});
  assert.equal(link.status,200);
  const oldUuid=link.data.tournament.matches[0].boardMatchId;
  const url="/tournaments/solo/"+tid+"/matches/semi-1/approve-prestart-reset";
  assert.equal((await api(url,null)).status,401);
  assert.equal((await api(url,"outsider")).status,403);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-2/approve-prestart-reset","host")).status,403,
    "tournament host cannot reset a match in which they do not play");
  assert.equal((await api(url,"host")).status,200);
  assert.equal((await api(url,"host")).status,409,"duplicate approval not a second consent");
  assert.equal(closures,0,"one approval never closes room");
  assert.ok(getSoloTournamentBoundRoom(original.code),"original match remains bound");
  assert.equal(getSoloTournamentStartBlock(original),null,"first consent alone must not forbid ordinary start");
  const pending=(await api(url,"delta")).data.tournament;
  assert.equal(closures,1,"two distinct original accounts cause one close");
  assert.equal(rooms.has(original.code),false,"original lobby closed and detached");
  assert.equal(getSoloTournamentBoundRoom(original.code),null);
  assert.equal(pending.matches[0].status,"awaiting-room");
  assert.equal(pending.matches[0].roomCode,null);
  assert.equal(pending.matches[0].boardMatchId,null);
  assert.equal(pending.matches[0].winnerAccountId,null);
  assert.deepEqual([pending.matches[0].homeAccountId,pending.matches[0].awayAccountId],["host","delta"]);
  assert.equal((await api(url,"host")).status,403,"unbound match cannot reset again");
  const onDisk=JSON.parse(await readFile(join(root,"mega-board","tournaments","solo-registration.json"),"utf8"));
  assert.equal(onDisk.tournaments[0].matches[0].status,"awaiting-room");

  const replacement=lobby("RECOVERY2",seat("host-new","host",true),seat("delta-new","delta"));
  rooms.set(replacement.code,replacement);
  const linked=await api("/tournaments/solo/"+tid+"/matches/semi-1/bind-room","host",{roomCode:replacement.code});
  assert.equal(linked.status,200);
  assert.notEqual(linked.data.tournament.matches[0].boardMatchId,oldUuid,"new room has new immutable match ID");
  const h=handlers("host-new");
  assert.equal(emit(h,"game:start",{code:replacement.code}).ok,true);
  assert.equal(replacement.started,true);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-1/approve-prestart-reset","delta")).status,409,
    "started authentic game cannot be reset even by a real participant");
  assert.equal(closures,1);
  assert.ok(getSoloTournamentBoundRoom(replacement.code),"played room remains bound");

  const missing=lobby("RECMISS1",seat("beta-s","beta",true),seat("gamma-s","gamma"));
  rooms.set(missing.code,missing);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-2/bind-room","host",{roomCode:missing.code})).status,200);
  rooms.delete(missing.code);
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-2/approve-prestart-reset","beta")).status,409,
    "a disappeared lobby is not proof that it never started");
  rooms.set(missing.code,{...missing,createdAt:missing.createdAt+1});
  assert.equal((await api("/tournaments/solo/"+tid+"/matches/semi-2/approve-prestart-reset","gamma")).status,409,
    "reused room code cannot reset original generation");
  rooms.delete(missing.code);

  // An interrupted original room must remain recoverable through the same signed-in accounts.
  const interrupted=lobby("RECOFF1",seat("beta-2","beta",true),seat("gamma-2","gamma"));
  const independent=await api("/tournaments/solo","admin",{name:"Recovery after disconnect"});
  const other=independent.data.tournament.id;
  for(const id of ["beta","gamma","delta"]) assert.equal((await api("/tournaments/solo/"+other+"/join",id)).status,200);
  assert.equal((await api("/tournaments/solo/"+other+"/seed","admin")).status,200);
  // The third participant of this bracket is gamma, the fourth is delta.
  interrupted.players[0].replayAccountId="admin";
  interrupted.players[0].name="admin";
  interrupted.players[1].replayAccountId="delta";
  interrupted.players[1].name="delta";
  rooms.set(interrupted.code,interrupted);
  assert.equal((await api("/tournaments/solo/"+other+"/matches/semi-1/bind-room","admin",{roomCode:interrupted.code})).status,200);
  interrupted.players[0].isConnected=false;
  interrupted.players[0].disconnectedAt=Date.now();
  interrupted.hostDisconnectDeadline=Date.now()+3600000;
  const url2="/tournaments/solo/"+other+"/matches/semi-1/approve-prestart-reset";
  assert.equal((await api(url2,"admin")).status,200);
  assert.equal((await api(url2,"delta")).status,200);
  assert.equal(rooms.has(interrupted.code),false,"account approvals work even while the phone lobby is disconnected");
  assert.equal(closures,2);

  const aged=(await api("/tournaments/solo","agedhost",{name:"Time-limited recovery approvals"})).data.tournament.id;
  for(const id of ["age2","age3","age4"]) {
    assert.equal((await api("/tournaments/solo/"+aged+"/join",id)).status,200);
  }
  assert.equal((await api("/tournaments/solo/"+aged+"/seed","agedhost")).status,200);
  const ageingRoom=lobby("AGELOBBY",seat("age-h","agedhost",true),seat("age-4","age4"));
  rooms.set(ageingRoom.code,ageingRoom);
  assert.equal((await api("/tournaments/solo/"+aged+"/matches/semi-1/bind-room","agedhost",
    {roomCode:ageingRoom.code})).status,200);
  const agePath="/tournaments/solo/"+aged+"/matches/semi-1/approve-prestart-reset";
  assert.equal((await api(agePath,"agedhost")).status,200);
  const before=closures;
  const clock=Date.now;
  Date.now=()=>clock()+11*60_000;
  try {
    const expired=(await api(agePath,"age4")).data.tournament;
    assert.deepEqual(expired.matches[0].resetApprovedAccountIds,["age4"],
      "approval older than ten minutes does not count as current consent");
    assert.equal(closures,before);
    assert.ok(getSoloTournamentBoundRoom(ageingRoom.code));
    assert.equal((await api(agePath,"agedhost")).status,200);
  } finally {
    Date.now=clock;
  }
  assert.equal(closures,before+1);
  assert.equal(rooms.has(ageingRoom.code),false);
  await flushRoomSave();
  console.log("PASS Solo prestart unanimous recovery: only two signed-in original seats, no phantom winner, durable approval, original room deletion, new unique match binding, missing/reused/started rooms rejected, disconnected host recovery safe");
} finally {
  await new Promise(resolve=>http.close(resolve));
  await flushRoomSave();
  rooms.clear();
  await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:50});
}
