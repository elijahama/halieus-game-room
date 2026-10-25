import React from "react";
import { createRoot } from "react-dom/client";
import { PlayersDrawer } from "../../client/src/games/mega-board/components/PlayersDrawer";
import { PlayerRail } from "../../client/src/games/mega-board/components/PlayerRail";

const names=["Milo","Nova","Echo","Atlas","Pixel","Lagz","Rook","Sage"];
const players=names.map((name,i)=>({
  id:"player-"+i,name,colour:"#2684db",tokenId:"car",
  position:i,properties:i<3?[10,11]:[],busTickets:i===4?1:0,getOutOfJailCards:0,
  isBankrupt:false,isAi:i!==5,aiDifficulty:"normal",isConnected:true,
  cash:2500,inJail:false,autopilotEnabled:false,
}));
const state={
  players,currentPlayerIndex:4,mortgagedProperties:{},propertyDevelopments:{},
  railroadDepots:{},
};
const theme={
  cardBackground:"#101d2b",secondaryBackground:"#0a1422",text:"#ffffff",
  mutedText:"#a4b0c1",border:"#3a536a",
};
function Fixture(){
  return <>
    <main className="game-page mega-live-page" style={{height:"100dvh",transform:"translateZ(0)"}}>
      <header>Game room</header>
      <div className="global-game-notice is-single-line"><span>Pixel purchased a property</span></div>
      <aside className="room-chat-shell is-floating">
        <button type="button" className="room-chat-trigger" aria-label="Room chat">Chat</button>
      </aside>
      <div style={{height:900}} aria-hidden="true">Board background</div>
    </main>
    <PlayersDrawer lobby={{playerId:"player-5"} as any} gameState={state as any}
      spectators={[{id:"observer",name:"Observer"}]} theme={theme}
      onPlayerSelect={id=>{window.hgrSelected=id;}} onClose={()=>{window.hgrClosed=true;}} />
  </>;
}
declare global{interface Window{hgrClosed?:boolean;hgrSelected?:string;}}
createRoot(document.getElementById("fixture")!).render(<Fixture/>);
