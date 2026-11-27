import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SparAiDifficulty, SparCard, SparPlayer, SparPublicState, SparSuit } from "../../../../shared/games/spar/types";
import { legalSparCards, sparRank, sparSuit } from "../../../../shared/games/spar/clientRules";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { ModalPortal } from "../../platform/components/ModalPortal";
import "./SparScreen.css";
import "../../platform/components/card-room-layout.css";

const GOLD = "#E6BA60";
const SUIT: Record<SparSuit, string> = { C:"♣", D:"♦", H:"♥", S:"♠" };
const SUIT_NAME: Record<SparSuit, string> = { C:"clubs", D:"diamonds", H:"hearts", S:"spades" };
type ThemeLike = {
  pageBackground: string; secondaryBackground: string; cardBackground: string;
  text: string; mutedText: string; border: string;
};
interface Props {
  state: SparPublicState;
  connectionStatus: string;
  message: string;
  darkMode: boolean;
  theme: ThemeLike;
  soundEnabled: boolean;
  onToggleFullscreen: () => void;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onStart: () => void;
  onAddAi: (difficulty: SparAiDifficulty) => void;
  onRemoveAi: (id: string) => void;
  onBra: () => void;
  onExchange: (exchange:boolean) => void;
  onShowBottom: () => void;
  onPlay: (card: SparCard) => void;
  onForfeit: () => void;
  onEndGame: () => void;
  onLeave: () => void;
  roomActivity?: ReactNode;
}
function CardFace({ card, canPlay = false, disabled = false, onPlay }: {
  card: SparCard; canPlay?: boolean; disabled?: boolean; onPlay?: (card:SparCard) => void;
}) {
  const rank = sparRank(card);
  const suit = sparSuit(card);
  const red = suit === "H" || suit === "D";
  const content = <>
    <span className="spar-card-corner"><strong>{rank}</strong><span>{SUIT[suit]}</span></span>
    <span className="spar-card-centre" aria-hidden="true">{SUIT[suit]}</span>
    <span className="spar-card-corner is-bottom" aria-hidden="true"><strong>{rank}</strong><span>{SUIT[suit]}</span></span>
  </>;
  if (!onPlay) return <span className={`spar-playing-card ${red?"is-red":""}`} title={`${rank} of ${SUIT_NAME[suit]}`}>{content}</span>;
  return <button type="button" className={`spar-playing-card is-hand ${red?"is-red":""} ${canPlay?"is-legal":""}`}
    disabled={!canPlay || disabled} onClick={() => onPlay(card)}
    aria-label={`Play ${rank} of ${SUIT_NAME[suit]}`}
    aria-disabled={!canPlay||disabled} title={!canPlay ? "You must follow suit" : `Play ${rank} of ${SUIT_NAME[suit]}`}>
    {content}
  </button>;
}
function PlayerChip({ player, active, isViewer, scoreUnit }: { player:SparPlayer; active:boolean; isViewer:boolean; scoreUnit:string }) {
  return <article className={`spar-seat ${active?"is-active":""} ${isViewer?"is-you":""}`}>
    <div className="spar-seat-avatar" aria-hidden="true">{player.name.slice(0,1).toUpperCase()}</div>
    <div className="spar-seat-details">
      <strong>{player.name}{isViewer ? " · You" : ""}</strong>
      <small>{player.isAi ? `${player.aiDifficulty??"normal"} AI` : player.isConnected ? "Connected" : "Disconnected"} · {player.handCount} cards</small>
    </div>
    <span className="spar-seat-score" aria-label={`${player.stones} ${scoreUnit}`}><b>{player.stones}</b><small>{scoreUnit}</small></span>
  </article>;
}
function StonePool({ remaining, total }: {remaining:number;total:number}) {
  return <div className="spar-pool" aria-label={`${remaining} of ${total} shared stones remaining`}>
    <span>STONE POOL</span>
    <div className="spar-pool-stones" aria-hidden="true">
      {Array.from({length:Math.min(total,12)},(_,i)=><i key={i} className={i<remaining?"is-available":""}/>)}
    </div>
    <strong>{remaining} left</strong>
  </div>;
}

export function SparScreen({
  state, connectionStatus, message, darkMode, theme, soundEnabled,
  onToggleFullscreen, onToggleDarkMode, onToggleSound,
  onStart, onAddAi, onRemoveAi, onBra, onPlay, onExchange, onShowBottom,
  onForfeit, onEndGame, onLeave, roomActivity,
}: Props) {
  const [seconds,setSeconds]=useState<number|null>(null);
  useEffect(()=>{
    const deadline=state.decisionDeadline;
    if(deadline==null){setSeconds(null);return;}
    const offset=typeof state.serverNow==="number"?state.serverNow-Date.now():0;
    const tick=()=>setSeconds(Math.min(20,Math.max(0,Math.ceil((deadline-Date.now()-offset)/1000))));
    tick();const timer=window.setInterval(tick,200);return ()=>window.clearInterval(timer);
  },[state.decisionDeadline,state.serverNow]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"forfeit"|"end"|null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<SparAiDifficulty>("normal");
  const [sideTab, setSideTab] = useState<"actions" | "players" | "chat">(() => state.isSpectator ? "players" : "actions");
  const visibleTab = state.isSpectator && sideTab === "actions" ? "players" : sideTab;
  const expandedDeck = state.deckSize === 40;
  const custom = state.matchMode === "custom";
  const scoreUnit = state.scoring === "stones" ? "stones" : "points";
  const revokePenalty=state.revokePenalty??(state.matchMode==="ranked"?2:state.customSettings?.revokePenalty??0);
  const duel = state.tableFormat === "duel";
  const ranked = state.matchMode === "ranked";
  const maximumPlayers = state.maximumPlayers;
  const viewer = state.players.find(p => p.id === state.viewerPlayerId);
  const isHost = Boolean(viewer?.isHost);
  const canAct = Boolean(viewer && !state.isSpectator && state.phase === "playing"
    && state.currentTurnPlayerId === viewer.id);
  const canCallBra = Boolean(viewer && !state.isSpectator && state.phase === "bra"
    && state.currentTurnPlayerId === viewer.id && !state.exchangePending);
  const leading = state.plays.length ? sparSuit(state.plays[0].card) : null;
  const legal = useMemo(() => legalSparCards(state.hand, leading), [state.hand, leading]);
  const current = state.players.find(p => p.id === state.currentTurnPlayerId);
  const next = state.phase === "playing" && !state.exchangePending ? state.players.find(p=>p.id===state.nextTurnPlayerId) : undefined;
  const ranks = [...state.players].sort((a,b)=>b.stones-a.stones || a.seat-b.seat);
  // Stable clockwise order, anchored at the viewer (or first registered seat).
  // Never rotate for a change of turn or sort by score.
  const seatOrder = [...state.players].sort((a,b)=>a.seat-b.seat);
  const viewerIndex = viewer ? seatOrder.findIndex(p=>p.id===viewer.id) : 0;
  const anchor = Math.max(0,viewerIndex);
  const orderedSeats = [...seatOrder.slice(anchor),...seatOrder.slice(0,anchor)];
  const ringSlots = ["bottom","bottom-left","left","top-left","top","top-right","right","bottom-right"] as const;
  const renderTableSeat = (p:SparPlayer,i:number) => {
    const active = p.id===state.currentTurnPlayerId;
    const upNext = p.id===next?.id && !active;
    return <article key={p.id} className={`spar-table-seat ${active?"is-active":""} ${upNext?"is-next":""} ${p.id===viewer?.id?"is-you":""}`} data-turn-order={active?"current":upNext?"next":undefined} data-ring-slot={ringSlots[Math.round(i*8/orderedSeats.length)%8]} data-seat-order={i} aria-current={active?"true":undefined}>
      <span className="spar-table-seat-avatar" aria-hidden="true">{p.name.slice(0,1).toUpperCase()}</span>
      <div className="spar-table-seat-copy"><strong title={p.name}>{p.name}{p.id===viewer?.id?" · You":""}</strong><small>{p.stones} {scoreUnit}{p.id===state.dealerPlayerId?" · D":""}{active?" · Turn":upNext?" · Next":""}{active&&!state.exchangePending&&seconds!==null?" · "+seconds+"s":""}</small></div>
      <span className="spar-card-count" aria-label={`${p.handCount} cards remaining`} title={`${p.handCount} cards remaining`}><i aria-hidden="true"/><b>{p.handCount}</b></span>
    </article>;
  };
  const report = () => {
    const content = [
      `HALIEUS SPAR (CHA-CHA) · ${state.code}`,
      custom ? `Custom · ${state.deckSize} cards · ${state.handSize} tricks · ${state.scoring}` : duel ? `1v1 duel · Traditional 35-card deck · ${ranked ? "Ranked" : "Casual"}` : expandedDeck ? "40-card eight-seat house variant · Casual" : "Ghanaian 35-card final-trick deck · Casual",
      state.status, `Hands played: ${state.handNumber}`,
      ...ranks.map((p,i)=>`${i+1}. ${p.name}: ${p.stones} ${scoreUnit}`),
      ...state.events.map(e=>new Date(e.at).toLocaleTimeString("en-GB")+" · "+e.description),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], {type:"text/plain"}));
    const link = document.createElement("a");
    link.href=url;link.download=`spar-${state.code}-report.txt`;link.click();URL.revokeObjectURL(url);
  };
  return <main className={`spar-page card-game-page page-enter${state.phase==="playing"||state.phase==="bra"?" hgr-card-room-page":""}`}
    style={{ background:theme.pageBackground,color:theme.text,["--game-accent" as string]:GOLD }}>
    <header className="card-game-header card-game-header-polished spar-header">
      <div className="card-game-brand-lockup"><GameBrandIcon game="spar"/><div><p>GHANAIAN CARD TABLE</p><h1>Spar <small>Cha-Cha</small></h1></div></div>
      <div className="card-game-meta">
        <span>Room {state.code}</span><span>{custom ? "Custom · Beta" : ranked ? "1v1 · Ranked Beta" : duel ? "1v1 · Casual Beta" : "Multiplayer · Casual Beta"}</span>
        <span>{state.players.length}/{maximumPlayers} players</span>
        <span className={connectionStatus === "Connected" ? "is-online" : ""}>{connectionStatus}</span>
      </div>
      <button type="button" className="button-outline spar-menu-toggle" onClick={()=>setMenuOpen(true)}>Game menu</button>
    </header>
    {state.isSpectator && <div className="mega-spectator-banner" role="status" aria-label="Spectating live Spar"><strong>Spectating</strong><span>Live Spar · Room {state.code} · Read-only view</span><button type="button" className="button-outline" onClick={onLeave}>Leave spectator view</button></div>}

    {state.phase === "lobby" ?
      <section className="card-game-lobby spar-lobby">
        <article className="card-game-lobby-card">
          <p className="modal-eyebrow">SPAR · CHA-CHA · GHANA</p>
          <h2>Take the last trick.</h2>
          <p className="card-game-intro-copy">{state.handSize} cards each. Follow suit whenever possible; an incorrect suit while holding the lead suit restarts the round{revokePenalty?` and deducts ${revokePenalty} ${scoreUnit}`:""}. The highest card of the lead suit wins each trick. {state.customSettings?.doubleFinish ? "Double Finish may score both final tricks." : "Only the last trick scores."}</p>
          <div className="spar-rule-summary">
            <span><b>{state.deckSize}</b> cards</span><span><b>{state.handSize}</b> tricks per hand</span>
            <span><b>6</b> = 3 {scoreUnit}</span><span><b>7</b> = 2 {scoreUnit}</span>
            <span><b>Other</b> = 1 {state.scoring === "stones" ? "stone" : "point"}</span><span>{state.scoring==="free" ? "Free play" : <><b>{state.stonesTotal}</b> {state.scoring==="stones"?"in pool":"target"}</>}</span>
          </div>
          <p className="spar-rule-note">{custom ? `Under-Ten ${state.customSettings?.underTen?"on":"off"} · Bottom Card ${state.customSettings?.showBottom?"on":"off"} · Double Finish ${state.customSettings?.doubleFinish?"on":"off"}.` : ranked ? "Ranked requires two authenticated human accounts. Traditional 35-card deck and five-stone pool. Forfeit concedes the match." : duel ? "A fixed two-seat duel against another player or one CPU. Traditional 35-card deck and five-stone pool." : "Casual Beta uses a five-stone pool. Five to eight seats are an HGR house extension. Two to seven use the 35-card deck; eight use 40 cards (all 5s and A♠ added). Fives score one stone on the last trick."} {!custom && "Bonus combinations are not enabled."}</p>
          {isHost&&<div className="card-game-host-actions">
            {!ranked && <><label className="card-game-ai-control">CPU difficulty
              <select value={aiDifficulty} onChange={e=>setAiDifficulty(e.target.value as SparAiDifficulty)}>
                <option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option>
              </select>
            </label>
            <button type="button" className="button-outline" onClick={()=>onAddAi(aiDifficulty)} disabled={state.players.length>=maximumPlayers}>Add CPU</button></>}
            <button type="button" className="button-primary" onClick={onStart} disabled={state.players.length<2}>Deal cards · Start</button>
          </div>}
          <button type="button" className="button-muted" onClick={()=>setInviteOpen(true)}>Invite players</button>
          {message&&<p className="status-toast" role="status">{message}</p>}
          {state.isSpectator && roomActivity}
        </article>
        <section className="card-game-roster"><header><div><p className="modal-eyebrow">SEATS</p><h2>Players</h2></div><span>{state.players.length}/{maximumPlayers}</span></header>
          {state.players.map(p=><article key={p.id} className="card-game-player-row">
            <span className="spar-avatar">{p.name.slice(0,1).toUpperCase()}</span>
            <div><strong>{p.name}</strong><small>{p.isHost?"Host":p.isAi?`${p.aiDifficulty} CPU`:`Seat ${p.seat+1}`}</small></div>
            {isHost&&p.isAi&&<button type="button" onClick={()=>onRemoveAi(p.id)} aria-label={`Remove ${p.name}`}>×</button>}
          </article>)}
        </section>
      </section>
    : state.phase === "finished" ?
      <GameResultsScreen accent={GOLD} gameTitle="Spar (Cha-Cha)" roomCode={state.code}
        headline={state.winnerPlayerId?`${state.players.find(p=>p.id===state.winnerPlayerId)?.name??"Winner"} wins Spar`:"Spar match finished"}
        subtitle={state.status}
        rows={ranks.map((p,i)=>({id:p.id,rank:i+1,name:p.name,detail:`${p.stones} ${scoreUnit}${p.penaltyStones?` · −${p.penaltyStones} penalty`:""}`,winner:p.id===state.winnerPlayerId,status:p.result??"Finished",accent:GOLD,
          metrics:[{label:state.scoring==="stones"?"Net stones":"Net points",value:String(p.stones)}]}))}
        stats={[{label:"Hands",value:String(state.handNumber)},{label:state.scoring==="stones"?"Pool":state.scoring==="target"?"Target":"Scoring",value:state.scoring==="free"?"Free play":String(state.stonesTotal)},{label:"Seats",value:String(state.players.length)}]}
        onDownloadReport={report} onBackToGameRoom={onLeave}
        onPlayAgain={isHost?onStart:undefined} playAgainLabel="Play another Spar match"/>
    : <section className="spar-match hgr-card-room">
        <div className="spar-table-column hgr-card-room-table">
          <header className="spar-match-status" aria-live="polite">
            <div><small>HAND {state.handNumber} · TRICK {state.trickNumber} / {state.handSize} <span className="spar-play-direction" aria-label="Clockwise play direction">· ↻ CLOCKWISE</span></small><strong>{state.status}</strong>{(seconds!==null||state.decisionPaused)&&<span className={"spar-decision-clock"+(seconds!==null&&seconds<=5?" is-urgent":"")} role="timer" aria-label="Decision time remaining">{state.decisionPaused?"Paused · waiting for players":(state.exchangePending?"Exchange":"Decision")+" · "+seconds+"s"}</span>}</div>
            {state.scoring==="stones"?<StonePool remaining={state.stonesRemaining} total={state.stonesTotal}/>:<strong>{state.scoring==="target"?`Target: ${state.stonesTotal} points`:"Free play · Cumulative points"}</strong>}
          </header>
          <section className="spar-table" aria-label="Spar card table">
            <div className="spar-table-texture" aria-hidden="true"/>
            <div className="spar-table-heading"><span>SPAR</span><small>THE LAST TRICK COUNTS</small></div>
            <div className="spar-table-seats spar-seat-ring" aria-label="Clockwise player seats">
            {orderedSeats.map(renderTableSeat)}
            <div className="spar-table-centre">
              {state.plays.length ?
                <div className={`spar-current-plays ${state.players.length > 4 ? "is-expanded" : ""}`}>{state.plays.map((p,i)=><div key={p.playerId} className="spar-play"><CardFace card={p.card}/><small>{p.playerName}{i===0?" · Lead":""}</small></div>)}</div>
                : <div className="spar-empty-centre"><span>♠ ♥ ♣ ♦</span><strong>{state.phase==="bra"?"Bra — begin the hand":"Waiting for the lead"}</strong><small>Cards are revealed here as players follow suit</small></div>}
            </div>
            </div>
            {state.lastTrick&&<div className="spar-last-trick">Last trick: {state.players.find(p=>p.id===state.lastTrick?.winnerPlayerId)?.name??"Player"} · {state.lastTrick.winningCard} {state.lastTrick.number===state.handSize? `· ${state.lastTrick.points} points`:"· no points"}</div>}
          </section>
        </div>
        <aside className="spar-room-stack spar-control-panel hgr-card-room-dock" aria-label="Spar room controls">
          <header className="spar-control-heading"><div><small>{state.isSpectator?"LIVE TABLE":"YOUR SEAT"}</small><h2>{state.isSpectator?"Spectating":viewer?.name??"Spar"}</h2></div><span className={canAct||canCallBra||state.canExchange?"spar-turn-pill is-you":"spar-turn-pill"}>{canAct||canCallBra||state.canExchange?"Your decision":current?current.name+(current.isAi?" · CPU turn":"'s turn"):"Waiting"}</span></header>
          <nav className="spar-side-tabs" aria-label="Spar side panel">
            <button type="button" disabled={state.isSpectator} className={visibleTab==="actions"?"is-active":""} aria-pressed={visibleTab==="actions"} onClick={()=>setSideTab("actions")}>Actions{(canAct||canCallBra||state.canExchange)&&<i aria-label="Decision required"/>}</button>
            <button type="button" className={visibleTab==="players"?"is-active":""} aria-pressed={visibleTab==="players"} onClick={()=>setSideTab("players")}>Players <span>{state.players.length}</span></button>
            <button type="button" className={visibleTab==="chat"?"is-active":""} aria-pressed={visibleTab==="chat"} onClick={()=>setSideTab("chat")}>Chat</button>
          </nav>
          <div className="spar-side-tab-panel hgr-card-room-workspace" data-tab={visibleTab}>
            {visibleTab==="actions"&&!state.isSpectator&&<div className="spar-actions-workspace">
          {state.bottomCard && <div className="spar-last-trick">Bottom card: {state.bottomCard}</div>}
          {state.canShowBottom && <button type="button" className="button-outline" onClick={onShowBottom}>Show bottom card</button>}
          {state.lastAward&&<div className="spar-award" role="status"><strong>{state.lastAward.playerName} claimed {state.lastAward.awarded} {scoreUnit}</strong><span>Hand {state.lastAward.hand} · Winning card {state.lastAward.winningCard}</span></div>}
          {state.phase==="bra" ?
            <div className="spar-bra-prompt">
              <strong>{state.exchangePending?"Opening hand exchange":canCallBra?"Your call":"Waiting for Bra"}</strong>
              {viewer && <div className={`spar-hand-cards${state.hand.length>5?" is-seven":""}`} role="group" aria-label="Opening hand">{state.hand.map(card=><CardFace key={card} card={card}/>)}</div>}
              {state.canExchange && <div className="card-game-host-actions"><button type="button" className="button-outline" onClick={()=>onExchange(false)}>Keep hand</button><button type="button" className="button-primary" onClick={()=>onExchange(true)}>Exchange hand</button></div>}
              <span>{state.exchangePending?"Waiting for eligible players to decide.":canCallBra?"You are next after the dealer. Call Bra to begin.":`${current?.name??"Next player"} begins the hand.`}</span>
              {canCallBra&&<button type="button" className="button-primary" onClick={onBra}>Bra! · Begin hand</button>}
            </div>
          : <div className="spar-hand">
              <div className="spar-hand-header"><strong>{viewer?"Your hand":state.isSpectator?"Spectator view":"Players' hands"} · {state.hand.length} cards</strong>
                <span>{canAct?(leading?`Follow ${SUIT_NAME[leading]}`:"Lead any card"):(current?`${current.name}'s turn`:"Waiting")}</span></div>
              {viewer?<div className={`spar-hand-cards${state.hand.length>5?" is-seven":""}`} role="group" aria-label="Your hand">
                {state.hand.map(card=><CardFace key={card} card={card} canPlay={canAct&&legal.includes(card)} disabled={!canAct} onPlay={onPlay}/>)}
              </div>:<p className="spar-spectator-note">Private hands remain concealed until each card is played.</p>}
            </div>}

            </div>}
            {visibleTab==="players"&&<section className="spar-side-players" aria-label="Spar players"><header><strong>{state.isSpectator&&state.spectatorHands?"Player hands":"Table players"}</strong><small>{state.players.length}/{maximumPlayers} seats · {state.spectatorCount} spectators</small></header><div className={`spar-opponents ${state.players.length>4?"is-expanded":""}`} aria-label="Player scores">{state.players.map(p=><div key={p.id} className="spar-roster-entry"><PlayerChip player={p} active={p.id===state.currentTurnPlayerId} isViewer={p.id===viewer?.id} scoreUnit={scoreUnit}/>{state.isSpectator&&state.spectatorHands?.[p.id]&&<div className="spar-spectator-hand" role="group" aria-label={p.name+"'s remaining cards"}>{state.spectatorHands[p.id].map(card=><CardFace key={card} card={card}/>)}</div>}</div>)}</div></section>}
            {visibleTab==="chat"&&<div className="spar-chat-slot">{roomActivity??<p>Room chat is unavailable.</p>}</div>}
          </div>
          {message&&<p className="status-toast" role="status">{message}</p>}
        </aside>
      </section>}

    {inviteOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&setInviteOpen(false)}>
      <section className="card-game-invite-modal"><button type="button" className="icon-button invite-modal-close" onClick={()=>setInviteOpen(false)}>×</button>
        <InviteLobbyPanel roomCode={state.code} darkMode={darkMode} gameTitle="Spar (Cha-Cha)" invitePathPrefix="/spar" accent={GOLD} theme={theme}/>
      </section></div>}
    {menuOpen&&<ModalPortal onClose={()=>setMenuOpen(false)}><div className="modal-backdrop game-menu-top-layer" onMouseDown={e=>e.target===e.currentTarget&&setMenuOpen(false)}>
      <section className="game-menu-modal card-game-menu-modal"><header className="modal-heading-row"><div><p className="modal-eyebrow">Spar · Room {state.code}</p><h2>Game menu</h2></div><button type="button" className="icon-button" onClick={()=>setMenuOpen(false)}>×</button></header>
        <DisplaySettingsPanel darkMode={darkMode} soundEnabled={soundEnabled} onToggleDarkMode={onToggleDarkMode} onToggleSound={onToggleSound} onToggleFullscreen={onToggleFullscreen}/>
        <button type="button" className="menu-action" onClick={onLeave}>← Back to Game Room</button>
        {viewer&&!state.isSpectator&&state.phase!=="finished"&&<button type="button" className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("forfeit")}}>Forfeit Spar</button>}
        {isHost&&(!ranked||state.phase==="lobby"||state.phase==="finished")&&<button type="button" className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("end")}}>End table</button>}
      </section>
    </div></ModalPortal>}
    <ConfirmDialog open={confirm!==null} title={confirm==="forfeit"?"Forfeit Spar?":"End Spar table?"}
      message={confirm==="forfeit"?"This ends your participation and the current casual match.":"This ends the room for everyone."}
      confirmLabel={confirm==="forfeit"?"Forfeit":"End table"} destructive
      onCancel={()=>setConfirm(null)}
      onConfirm={()=>{const action=confirm;setConfirm(null);action==="forfeit"?onForfeit():onEndGame();}}/>
  </main>;
}
