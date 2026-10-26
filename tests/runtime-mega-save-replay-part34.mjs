import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dir = await mkdtemp(path.join(os.tmpdir(), "hgr-save-replay-"));
process.env.ROOM_SAVE_PATH = path.join(dir, "rooms.json");
const { createInitialGameState } = await import("../shared/games/mega-board/game-state.ts");
const { captureMegaReplayFrame } = await import("../server/src/games/mega-board/utils/replay.ts");
const { createSaveSlot, listSaveSlots, restoreSaveSlot, canSaveRoom } =
  await import("../server/src/games/mega-board/utils/saved-games.ts");

const state = createInitialGameState("TEST34", [{id:"host-old",name:"Host"},{id:"guest-old",name:"Guest"}]);
state.phase = "playing"; state.turnPhase = "roll";
state.players[0].cash=900; state.players[0].position=3;
const players = [
  {id:"host-old",name:"Host",isHost:true,isConnected:true,isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"host-secret",disconnectedAt:null},
  {id:"guest-old",name:"Guest",isHost:false,isConnected:false,isAi:false,aiDifficulty:null,hasLeft:false,reconnectToken:"guest-secret",disconnectedAt:Date.now()},
];
const room = {code:"TEST34",ranked:false,blitz:false,hostId:"host-old",players,started:true,gameState:state,createdAt:Date.now(),updatedAt:Date.now(),hostDisconnectDeadline:null,freeParkingJackpotEnabled:false};
try {
  captureMegaReplayFrame(state, 1000);
  assert.equal(state.replayFrames.length,1);
  captureMegaReplayFrame(state, 2000);
  assert.equal(state.replayFrames.length,1,"Duplicate server emissions do not create fake actions");
  state.players[0].position=7;state.players[0].cash=875;
  captureMegaReplayFrame(state, 3000);
  assert.equal(state.replayFrames.length,2);
  assert.equal(state.replayFrames[0].players[0].cash,900);
  assert.equal(state.replayFrames[1].players[0].position,7);
  assert.ok(!JSON.stringify(state.replayFrames).includes("host-secret"));
  assert.ok(!JSON.stringify(state.replayFrames).includes("chanceDeck"));
  for(let i=0;i<245;i++){state.players[0].cash--;captureMegaReplayFrame(state,4000+i);}
  assert.equal(state.replayFrames.length,240,"Replay history is bounded");

  state.players[0].cash=700;
  await createSaveSlot(room,"slot-1");
  const listed=await listSaveSlots(room);
  assert.equal(listed.length,1);
  const reusedRoom = {
    ...room,
    gameState: {...room.gameState, gameStartedAt: room.gameState.gameStartedAt + 86400000 },
  };
  assert.equal((await listSaveSlots(reusedRoom)).length,0,"A reused code does not expose earlier match slots");
  await assert.rejects(()=>restoreSaveSlot(reusedRoom,"slot-1"),/No saved game exists/);
  const replacedSeats = {...room,players:room.players.map(p => ({...p,reconnectToken:"new-"+p.reconnectToken}))};
  assert.equal((await listSaveSlots(replacedSeats)).length,0,"Save slots belong to original private seats");
  assert.equal(listed[0].turn,1);
  assert.equal(canSaveRoom({...room,ranked:true})!==null,true);
  room.gameState.players[0].cash=100;
  room.gameState.turnRollDeadline=Date.now()+10000;
  await assert.rejects(()=>restoreSaveSlot({...room,players:players.map(p=>({...p,isAi:p.id==="guest-old"}))},"slot-1"),/CPU/);
  room.players[1].isConnected=true;
  await assert.rejects(()=>restoreSaveSlot(room,"slot-1"),/still online/);
  room.players[1].isConnected=false;
  room.players[1].hasLeft=true;
  await assert.rejects(()=>restoreSaveSlot(room,"slot-1"),/Seats were eliminated/);
  room.players[1].hasLeft=false;
  room.gameState.players[1].isBankrupt=true;
  await assert.rejects(()=>restoreSaveSlot(room,"slot-1"),/Seats were eliminated/);
  room.gameState.players[1].isBankrupt=false;
  await restoreSaveSlot(room,"slot-1");
  assert.equal(room.gameState.players[0].cash,700);
  assert.equal(room.gameState.turnRollDeadline,null);
  assert.equal(room.gameState.replayFrames.length,240);
  room.gameState.turnPhase="debt";
  await assert.rejects(()=>createSaveSlot(room,"slot-2"),/between decisions/);
  assert.equal((await listSaveSlots(room)).length,1);
  console.log("PASS isolated Mega Board save/restore + 240 replay checkpoints, dedup, privacy, ranked/AI/opponent guards");
} finally {
  await rm(dir,{recursive:true,force:true});
}
