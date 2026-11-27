import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { HomeScreen, type GameSelection } from "../../client/src/platform/components/HomeScreen";
import type { ComponentProps } from "react";
type Props = ComponentProps<typeof HomeScreen>;
const theme={pageBackground:"#081522",cardBackground:"#101d2b",secondaryBackground:"#0a1422",inputBackground:"#101d2b",text:"#fff",mutedText:"#a4b0c1",border:"#3a536a"};
const noop=()=>{};
const sessionDefaults=Object.fromEntries(["savedSession","pokerSavedSession","blackjackSavedSession","whotSavedSession","ludoSavedSession","connectFourSavedSession","ayoSavedSession","sparSavedSession","wordBoardSavedSession","hiddenDictatorSavedSession"].map(key=>[key,null]));
const recoveryDefaults=Object.fromEntries(["recoveryCode","pokerRecoveryCode","blackjackRecoveryCode","whotRecoveryCode","ludoRecoveryCode","connectFourRecoveryCode","ayoRecoveryCode","sparRecoveryCode","wordBoardRecoveryCode","hiddenDictatorRecoveryCode"].map(key=>[key,""]));
function Fixture(){
 const [game,setGame]=useState<GameSelection>("mega-board"),[mode,setMode]=useState<"casual"|"ranked"|"blitz">("casual"),[beta,setBeta]=useState(new URLSearchParams(location.search).has("beta")),[jackpot,setJackpot]=useState(false);
 const [name,setName]=useState("Fixture Player"),[code,setCode]=useState("QAONLY");
 const [modes,setModes]=useState<Record<string,"casual"|"ranked">>({});
 const choose=(key:string,value:"casual"|"ranked")=>setModes(previous=>({...previous,[key]:value}));
 const selected=(key:string)=>modes[key]??"casual";
 const props={...sessionDefaults,...recoveryDefaults,connectionStatus:"Connected",selectedGame:game,playerName:name,roomCode:code,ranked:!beta&&mode==="ranked",blitz:mode==="blitz",freeParkingJackpotEnabled:jackpot,message:"",
 pokerStartingChips:5000,pokerSmallBlind:25,pokerBigBlind:50,pokerVariant:"texas-holdem",pokerMatchMode:selected("poker"),whotMatchMode:selected("whot"),ludoMatchMode:selected("ludo"),blackjackMatchMode:selected("blackjack"),connectFourMatchMode:selected("connect-four"),connectFourBestOf:3,ayoMatchMode:selected("ayo"),hiddenDictatorMatchMode:selected("hidden-dictator"),
 isCreating:false,isJoining:false,isRecovering:false,darkMode:true,account:null,betaMode:beta,theme,themeMode:"dark",themeProfileId:"default",
 classicRecoveryCodes:{cheat:"",dominoes:""},classicSavedSessions:{cheat:null,dominoes:null},classicMatchModes:{cheat:selected("cheat"),dominoes:selected("dominoes")},wordArenaSavedSessions:{"word-game":null,password:null,"anagrams-race":null},wordArenaRecoveryCodes:{"word-game":"",password:"","anagrams-race":""},
 onGameSelect:setGame,onPlayerNameChange:setName,onRoomCodeChange:setCode,onGenerateRoomCode:()=>setCode("QAONLY"),onMatchModeChange:(value:typeof mode)=>{if(beta&&value==="ranked")return;setMode(value);if(value==="ranked")setJackpot(false);},onExitBetaMode:()=>setBeta(false),onFreeParkingJackpotChange:setJackpot,
 onPokerMatchModeChange:(v:"casual"|"ranked")=>choose("poker",v),onWhotMatchModeChange:(v:"casual"|"ranked")=>choose("whot",v),onLudoMatchModeChange:(v:"casual"|"ranked")=>choose("ludo",v),onBlackjackMatchModeChange:(v:"casual"|"ranked")=>choose("blackjack",v),onConnectFourMatchModeChange:(v:"casual"|"ranked")=>choose("connect-four",v),onAyoMatchModeChange:(v:"casual"|"ranked")=>choose("ayo",v),onHiddenDictatorMatchModeChange:(v:"casual"|"ranked")=>choose("hidden-dictator",v),onClassicMatchModeChange:choose,
 onCreateSpar:(e:React.FormEvent,format:string,mode:string,custom:unknown)=>{e.preventDefault();document.documentElement.dataset.sparCreated=JSON.stringify({format,mode,custom});},
 onCreateGame:(e:React.FormEvent)=>{e.preventDefault();document.documentElement.dataset.createdMode=beta&&mode==="ranked"?"casual":mode;},
 };
 // The isolated UI fixture provides no account credentials and no production socket.
 // Unrelated actions are explicit no-ops; real HomeScreen owns its modal and controls.
 const supplied=new Proxy(props,{get(target,key){if(typeof key==="string"&&key.startsWith("on")&&!(key in target))return noop;return Reflect.get(target,key);}}) as unknown as Props;
 // React spreading reads own properties, so fill remaining callback props before render.
 const callbacks=["onToggleDarkMode","onOpenAccount","onOpenLeaderboard","onOpenPokerLeaderboard","onCreatePoker","onCreateBlackjack","onCreateWhot","onCreateLudo","onCreateConnectFour","onCreateAyo","onCreateSpar","onCreateWordBoard","onCreateHiddenDictator","onCreateClassic","onCreateWordArena","onConnectFourBestOfChange"];
 return <HomeScreen {...Object.fromEntries(callbacks.map(k=>[k,noop])) as Props} {...supplied}/>;
}
createRoot(document.getElementById("fixture")!).render(<Fixture/>);
