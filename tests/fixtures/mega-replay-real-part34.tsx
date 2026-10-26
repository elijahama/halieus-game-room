import React from "react";
import { createRoot } from "react-dom/client";
import type { MegaReplayFrame } from "../../shared/games/mega-board/replay";
import type { GameActivityEntry } from "../../shared/games/mega-board/game-state";
import { MegaReplayViewer } from "../../client/src/games/mega-board/components/MegaReplayViewer";

const activities: GameActivityEntry[] = [
  {id:"a1", at:1760000000000,turnNumber:1,kind:"roll",message:"Ava rolled 2 + 3",playerId:"host"},
  {id:"a2", at:1760000001000,turnNumber:1,kind:"purchase",message:"Ava bought The Angel, Islington",playerId:"host"},
  {id:"a3", at:1760000002000,turnNumber:2,kind:"trade",message:"Sam proposed a deal",playerId:"guest"},
];
const initial: MegaReplayFrame = {
  sequence:1,at:1760000000000,turn:1,phase:"roll",activePlayerId:"host",
  label:"Ava rolled 2 + 3",lastActivityId:"a1",
  players:[
    {id:"host",name:"Ava",tokenId:"car",colour:"red",position:3,cash:900,bankrupt:false,owned:[]},
    {id:"guest",name:"Sam",tokenId:"cat",colour:"blue",position:0,cash:1500,bankrupt:false,owned:[]},
  ],
  propertyOwners:{},developments:{},mortgages:{},pot:0,dice:null,winnerId:null,
};
const frames: MegaReplayFrame[] = [
  initial,
  { ...initial,sequence:2,at:1760000001000,phase:"optional-actions",label:"Ava bought The Angel, Islington",
    lastActivityId:"a2",players:initial.players.map(player => player.id==="host" ? {...player,position:7,cash:800,owned:[7]} : {...player}),
    propertyOwners:{7:"host"} },
];
const root = document.createElement("div");
root.id="replay-test-root";
root.className="game-menu-modal";
root.innerHTML = '<div class="mega-replay-view"><div id="mount"></div></div>';
document.body.appendChild(root);
createRoot(root.querySelector("#mount")!).render(<MegaReplayViewer frames={frames} activity={activities} roomCode="TEST34"/>);
