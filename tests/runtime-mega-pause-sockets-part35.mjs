import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";

const dir=await mkdtemp(path.join(tmpdir(),"hgr-pause-socket-"));
process.env.ROOM_SAVE_PATH=path.join(dir,"rooms.json");
const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
const { registerMegaSavedGameHandlers } = await import("../server/src/games/mega-board/handlers/savedGameHandlers.ts");
const http=createServer();
const io=new Server(http);
io.on("connection",socket => registerMegaSavedGameHandlers(io,socket));
await new Promise(resolve=>http.listen(0,"127.0.0.1",resolve));
const url="http://127.0.0.1:"+http.address().port;
const host=connect(url,{transports:["websocket"],forceNew:true});
const guest=connect(url,{transports:["websocket"],forceNew:true});
const outsider=connect(url,{transports:["websocket"],forceNew:true});
const connected=socket=>new Promise((resolve,reject)=>{
  if(socket.connected)return resolve();
  socket.once("connect",resolve);socket.once("connect_error",reject);
});
const rpc=(socket,event,payload)=>new Promise((resolve,reject)=>{
 socket.timeout(4000).emit(event,payload,(error,reply)=>error?reject(error):resolve(reply));
});
try {
  await Promise.all([connected(host),connected(guest),connected(outsider)]);
  const players=[
    {id:host.id,name:"Host",isHost:true,isConnected:true,isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"private-h",disconnectedAt:null},
    {id:guest.id,name:"Guest",isHost:false,isConnected:true,isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"private-g",disconnectedAt:null},
  ];
  const state=createInitialGameState("PAUS35",players);
  state.phase="playing";state.turnPhase="roll";
  state.turnRollDeadline=Date.now()+30000;
  state.turnRollDeadlinePlayerId=host.id;
  const room={code:"PAUS35",ranked:false,blitz:false,hostId:host.id,players,started:true,gameState:state,createdAt:Date.now(),updatedAt:Date.now(),hostDisconnectDeadline:null,freeParkingJackpotEnabled:false};
  rooms.set(room.code,room);
  let reply=await rpc(host,"game:pause-room",{code:"PAUS35"});
  assert.equal(reply.ok,false,"Online human opponent blocks pause");
  reply=await rpc(outsider,"game:pause-room",{code:"PAUS35"});
  assert.equal(reply.ok,false,"Non-participant cannot pause");
  players[1].isConnected=false;
  state.players[1].isConnected=false;
  // A malformed client omitting the Socket.IO acknowledgement must not start
  // an untracked state mutation or create an unhandled rejected promise.
  host.emit("game:pause-room",{code:"PAUS35"});
  host.emit("game:save-slot",{code:"PAUS35",slot:"slot-2"});
  await new Promise(resolve=>setTimeout(resolve,75));
  assert.equal(state.pauseState,undefined,"No-ACK pause cannot mutate a room");
  reply=await rpc(host,"game:pause-room",{code:"PAUS35"});
  assert.equal(reply.ok,true,reply.reason);
  assert.ok(state.pauseState);
  assert.equal(state.turnRollDeadline,null);
  const persisted=JSON.parse(await readFile(path.join(dir,"rooms.json"),"utf8"));
  assert.ok(persisted.rooms[0].gameState.pauseState,"Paused room is durable and crash recoverable");
  reply=await rpc(host,"game:roll",{code:"PAUS35"});
  assert.equal(reply.ok,false,"Inbound gameplay mutation blocked by socket middleware");
  assert.match(reply.reason,/paused/);
  reply=await rpc(guest,"game:buy",{code:"PAUS35"});
  assert.equal(reply.ok,false,"Other players are blocked even if they reconnect");
  reply=await rpc(outsider,"game:resume-room",{code:"PAUS35"});
  assert.equal(reply.ok,false,"Outsider cannot resume");
  reply=await rpc(host,"game:resume-room",{code:"PAUS35"});
  assert.equal(reply.ok,false,"All active human seats must reconnect before resume");
  players[1].isConnected=true;state.players[1].isConnected=true;
  reply=await rpc(host,"game:resume-room",{code:"PAUS35"});
  assert.equal(reply.ok,true,reply.reason);
  assert.equal(state.pauseState,null);
  assert.ok(state.turnRollDeadline>Date.now());
  const resumed=JSON.parse(await readFile(path.join(dir,"rooms.json"),"utf8"));
  assert.equal(resumed.rooms[0].gameState.pauseState,null,"Resume persisted to disk");
  room.ranked=true;
  players[1].isConnected=false;
  reply=await rpc(host,"game:pause-room",{code:"PAUS35"});
  assert.equal(reply.ok,false,"Ranked mode cannot be paused");
  console.log("PASS Part35 real Socket.IO pause/resume: host authorization, opponent presence, gameplay ACK blocking, persisted freeze and safe resumed timer");
} finally {
  host.disconnect();guest.disconnect();outsider.disconnect();rooms.clear();
  await new Promise(resolve=>io.close(resolve));
  await new Promise(resolve=>http.close(resolve));
  await rm(dir,{recursive:true,force:true});
}
