import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";

const dir = await mkdtemp(path.join(tmpdir(),"hgr-saves-socket-"));
process.env.ROOM_SAVE_PATH=path.join(dir,"rooms.json");
const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
const { registerMegaSavedGameHandlers } = await import("../server/src/games/mega-board/handlers/savedGameHandlers.ts");
const server=createServer();
const io=new Server(server,{cors:{origin:"*"}});
io.on("connection",socket=>registerMegaSavedGameHandlers(io,socket));
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const address=server.address();
const url="http://127.0.0.1:"+address.port;
const host=connect(url,{transports:["websocket"],forceNew:true});
const stranger=connect(url,{transports:["websocket"],forceNew:true});
const connected=socket => new Promise((resolve,reject)=>{
  if(socket.connected)return resolve();
  socket.once("connect",resolve);
  socket.once("connect_error",reject);
});
const request=(socket,name,payload)=>new Promise((resolve,reject)=>
  socket.timeout(5000).emit(name,payload,(error,reply)=>error?reject(error):resolve(reply)));
try {
  await Promise.all([connected(host),connected(stranger)]);
  const players=[
    {id:host.id,name:"Host",isHost:true,isConnected:true,isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"host-secret",disconnectedAt:null},
    {id:"guest-offline",name:"Guest",isHost:false,isConnected:false,isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"guest-secret",disconnectedAt:Date.now()},
  ];
  const state=createInitialGameState("SOCK34",players);
  state.phase="playing";
  state.turnPhase="roll";
  state.players[0].cash=777;
  const room={code:"SOCK34",ranked:false,blitz:false,hostId:host.id,players,started:true,gameState:state,
    createdAt:Date.now(),updatedAt:Date.now(),hostDisconnectDeadline:null,freeParkingJackpotEnabled:false};
  rooms.set(room.code,room);
  let result=await request(stranger,"game:saves-list",{code:"SOCK34"});
  assert.equal(result.ok,false,"Non-host cannot list private saved-game metadata");
  result=await request(stranger,"game:save-slot",{code:"SOCK34",slot:"slot-1"});
  assert.equal(result.ok,false,"Non-host cannot save another player's match");
  result=await request(stranger,"game:restore-slot",{code:"SOCK34",slot:"slot-1"});
  assert.equal(result.ok,false,"Non-host cannot restore");
  result=await request(host,"game:save-slot",{code:"SOCK34",slot:"../other"});
  assert.equal(result.ok,false,"File traversal outside validated slot names refused");
  result=await request(host,"game:save-slot",{code:"SOCK34",slot:"slot-1"});
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.saved.slot,"slot-1");
  assert.ok(!JSON.stringify(result).includes("host-secret"),"Private reconnect token never returned");
  result=await request(host,"game:saves-list",{code:"SOCK34"});
  assert.equal(result.ok,true);
  assert.equal(result.saves.length,1);
  assert.ok(!JSON.stringify(result).includes("guest-secret"));
  room.gameState.players[0].cash=111;
  room.players[1].isConnected=true;
  result=await request(host,"game:restore-slot",{code:"SOCK34",slot:"slot-1"});
  assert.equal(result.ok,false,"Restore rejects connected opponents");
  assert.equal(room.gameState.players[0].cash,111);
  room.players[1].isConnected=false;
  result=await request(host,"game:restore-slot",{code:"SOCK34",slot:"slot-1"});
  assert.equal(result.ok,true,result.reason);
  assert.equal(room.gameState.players[0].cash,777);
  assert.equal(room.gameState.turnRollDeadlinePlayerId,host.id);
  room.ranked=true;
  result=await request(host,"game:save-slot",{code:"SOCK34",slot:"slot-2"});
  assert.equal(result.ok,false,"Ranked save and rollback blocked");
  console.log("PASS real Socket.IO Mega Board save handlers: host gating, slot safety, metadata privacy, opponent denial, live restore, ranked denial");
} finally {
  host.disconnect();
  stranger.disconnect();
  rooms.clear();
  await new Promise(resolve=>io.close(resolve));
  await new Promise(resolve=>server.close(resolve));
  await rm(dir,{recursive:true,force:true});
}
