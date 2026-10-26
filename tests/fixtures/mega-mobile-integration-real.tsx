import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {PlayerRail} from "../../client/src/games/mega-board/components/PlayerRail";
import {GameBoard} from "../../client/src/games/mega-board/components/GameBoard";
import {createInitialGameState} from "../../shared/games/mega-board/game-state";
import {LobbyScreen} from "../../client/src/games/mega-board/components/LobbyScreen";
import {PlayersDrawer} from "../../client/src/games/mega-board/components/PlayersDrawer";
import {GameSidebar} from "../../client/src/games/mega-board/components/GameSidebar";
import {RoomChatPanel} from "../../client/src/platform/components/RoomChatPanel";
import {emptyTradeDraft} from "../../client/src/games/mega-board/types/trade";
import {BOARD_SPACES,isOwnableBoardSpace} from "../../shared/games/mega-board/board";
const assets=BOARD_SPACES.filter(isOwnableBoardSpace).map(s=>s.id);
const params=new URLSearchParams(location.search);
const compact=params.get("compact");
const spectator=compact==="spectator";
const players=Array.from({length:Number(params.get("players")||8)},(_,i)=>({id:"player-"+i,name:compact ? "Alexandria Longpropertyname Seat "+(i+1) : "Seat "+(i+1),colour:"#2684db",tokenId:"car",position:i,properties:i===0?assets.slice(0,12):[],busTickets:0,busTicketIds:[],getOutOfJailCards:0,getOutOfJailCardIds:[],isBankrupt:false,isAi:i!==0,aiDifficulty:"normal",isConnected:true,isHost:i===0,hasLeft:false,cash:2500,inJail:false,autopilotEnabled:false}));
const lobby={code:"QAONLY",playerId:"player-0",players,turnTimerSeconds:45,boardStyle:"classic-board",hostDisconnectDeadline:null};
const state={...createInitialGameState("QAONLY",players as any),players,currentPlayerIndex:0,mortgagedProperties:{},propertyDevelopments:{},propertyOwners:Object.fromEntries(assets.slice(0,12).map(id=>[id,"player-0"])),railroadDepots:{},phase:"playing",turnPhase:"roll",turnNumber:1,activityLog:[],bankInventory:{houses:32,hotels:12,skyscrapers:8,depots:4}};
if(params.has("auction")){state.pendingAuction={id:"geometry-auction",spaceId:7,currentBid:150,minimumIncrement:10,highestBidderId:"player-2",activeBidderIds:players.map(p=>p.id),bidsByPlayerId:{"player-2":150},endsAt:Date.now()+90000} as any;state.turnPhase="auction";}
if(params.has("debt")){state.pendingDebt={debtorId:"player-0",creditorId:null,amount:100,reason:"Fixture debt",resumeAction:"roll"} as any;state.turnPhase="debt";}
const theme={pageBackground:"#081522",cardBackground:"#101d2b",secondaryBackground:"#0a1422",text:"#fff",mutedText:"#a4b0c1",border:"#3a536a"};
const noop=()=>{};
function Fixture(){
 const [live,setLive]=useState(!!compact),[drawer,setDrawer]=useState(false),[panel,setPanel]=useState<"trade"|"properties"|null>(null),[signal,setSignal]=useState(0),[tools,setTools]=useState(false),[draft,setDraft]=useState(emptyTradeDraft());
 const open=(p:"trade"|"properties")=>{setPanel(p);setSignal(x=>x+1);setDrawer(false);};
 return <div id="fullscreen-root">
 {!live?<><LobbyScreen {...{lobby,theme} as any} connectionStatus="Connected" ranked={false} blitz={false} message="" recoveryKey={null} darkMode={true} onToggleDarkMode={noop} onStartGame={()=>setLive(true)} onLeaveLobby={()=>{window.hgrEnded=true;}} onBackToGameRoom={noop} onAddAi={noop} onRemoveAi={noop} onTurnTimerChange={noop} isUpdatingTurnTimer={false} /></>:
 <main className={`game-page mega-live-page ${compact ? spectator ? "mega-spectator-mode" : "mega-mobile-participant-mode" : ""}`}>
 <nav><button onClick={()=>setDrawer(true)}>Open Players</button><button onClick={()=>open("properties")}>Open Properties</button><button onClick={()=>open("trade")}>Open Trade</button><button onClick={()=>document.getElementById("fullscreen-root")!.requestFullscreen()}>Enter fullscreen</button></nav>
 <div className="global-game-notice is-single-line">Seat 2 purchased a property</div>
 <div className={compact ? `game-layout mega-live-layout-v3 ${spectator ? "mega-spectator-layout" : "mega-mobile-participant-layout"}` : undefined}>
 <GameBoard isSpectator={spectator} {...{roomCode:"QAONLY",playerId:"player-0",gameState:state,theme} as any} darkMode={true} message="" isResolvingPurchase={false} isSubmittingRoll={false} isResolvingCard={false} isResolvingAuction={false} isResolvingJail={false} isResolvingSpeedDie={false} isResolvingMega={false} onRollDice={()=>{window.hgrRolled=true;}} onEndTurn={noop} onPurchase={noop} onDeclinePurchase={noop} onCardContinue={noop} onAuctionBid={noop} onAuctionWithdraw={noop} onJailRoll={noop} onJailPayFine={noop} onJailUseCard={noop} onSpeedDieTripleMove={noop} onSpeedDieBusMove={noop} onSpeedDieMrMonopoly={noop} onStartBusTicket={noop} onBusTicketMove={noop} onBusTicketCancel={noop} onBirthdayCash={noop} onBirthdayTicket={noop} onAuctionSpaceSelect={noop} onOpenBank={noop} onOpenActionPanel={p=>{if(p!=="history")open(p);}} />
 {compact && <PlayerRail {...{lobby,gameState:state,theme} as any} isSpectator={spectator} className={spectator ? "mega-live-player-rail mega-spectator-player-rail" : "mega-live-player-rail mega-mobile-participant-player-rail"} onPlayerSelect={id=>{window.hgrSelected=id;}} />}
 <div className="right-game-stack"><GameSidebar {...{lobby,gameState:state,theme} as any} connectionStatus="Connected" isBuilding={false} isManagingAsset={false} isSubmittingTrade={false} isResolvingDebt={false} tradeDraft={draft} onTradeDraftChange={setDraft} onTradePropose={()=>{window.hgrTrade=true;}} onBuild={()=>{window.hgrBuilt=true;}} onBuildTo={noop} onBuildGroupTo={noop} onMortgage={()=>{window.hgrMortgage=true;}} onUnmortgage={noop} onSellBuilding={noop} onBuildDepot={noop} onSellDepot={noop} onTradeAccept={noop} onTradeDecline={noop} onRejectAllTrades={noop} onPayDebt={()=>{window.hgrDebtPaid=true;}} onAutoLiquidateDebt={noop} onDeclareBankruptcy={noop} openPanel={panel} openSignal={signal} onOpenChange={setTools}/></div></div>
 {drawer&&<PlayersDrawer {...{lobby,gameState:state,theme} as any} spectators={[{id:"observer",name:"Observer"}]} onClose={()=>setDrawer(false)} onPlayerSelect={id=>{window.hgrSelected=id;setDrawer(false);}} />}
 <RoomChatPanel game="mega-board" code="QAONLY" accent="#2684db" obscured={tools||drawer}/>
 </main>}
 {!live&&<RoomChatPanel game="mega-board" code="QAONLY" accent="#2684db"/>}
 </div>;
}
declare global {interface Window {hgrBuilt?:boolean;hgrDebtPaid?:boolean;hgrRolled?:boolean;hgrEnded?:boolean;hgrTrade?:boolean;hgrMortgage?:boolean;hgrSelected?:string;}}
createRoot(document.getElementById("fixture")!).render(<Fixture/>);
