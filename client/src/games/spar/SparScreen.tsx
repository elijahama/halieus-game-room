import { useMemo, useState, type ReactNode } from "react";
import { SPAR_MAX_PLAYERS } from "../../../../shared/games/spar/types";
import type { SparAiDifficulty, SparCard, SparPlayer, SparPublicState, SparSuit } from "../../../../shared/games/spar/types";
import { legalSparCards, sparRank, sparSuit } from "../../../../shared/games/spar/clientRules";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { ModalPortal } from "../../platform/components/ModalPortal";
import "./SparScreen.css";

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
function PlayerChip({ player, active, isViewer }: { player:SparPlayer; active:boolean; isViewer:boolean }) {
  return <article className={`spar-seat ${active?"is-active":""} ${isViewer?"is-you":""}`}>
    <div className="spar-seat-avatar" aria-hidden="true">{player.name.slice(0,1).toUpperCase()}</div>
    <div className="spar-seat-details">
      <strong>{player.name}{isViewer ? " · You" : ""}</strong>
      <small>{player.isAi ? `${player.aiDifficulty??"normal"} AI` : player.isConnected ? "Connected" : "Disconnected"} · {player.handCount} cards</small>
    </div>
    <span className="spar-seat-score" aria-label={`${player.stones} stones`}><b>{player.stones}</b><small>stones</small></span>
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
  onStart, onAddAi, onRemoveAi, onBra, onPlay,
  onForfeit, onEndGame, onLeave, roomActivity,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"forfeit"|"end"|null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<SparAiDifficulty>("normal");
  const expandedDeck = state.players.length === SPAR_MAX_PLAYERS;
  const duel = state.tableFormat === "duel";
  const ranked = state.matchMode === "ranked";
  const maximumPlayers = state.maximumPlayers;
  const viewer = state.players.find(p => p.id === state.viewerPlayerId);
  const isHost = Boolean(viewer?.isHost);
  const canAct = Boolean(viewer && !state.isSpectator && state.phase === "playing"
    && state.currentTurnPlayerId === viewer.id);
  const canCallBra = Boolean(viewer && !state.isSpectator && state.phase === "bra"
    && state.currentTurnPlayerId === viewer.id);
  const leading = state.plays.length ? sparSuit(state.plays[0].card) : null;
  const legal = useMemo(() => legalSparCards(state.hand, leading), [state.hand, leading]);
  const current = state.players.find(p => p.id === state.currentTurnPlayerId);
  const ranks = [...state.players].sort((a,b)=>b.stones-a.stones || a.seat-b.seat);
  const report = () => {
    const content = [
      `HALIEUS SPAR (CHA-CHA) · ${state.code}`,
      duel ? `1v1 duel · Traditional 35-card deck · ${ranked ? "Ranked" : "Casual"}` : expandedDeck ? "40-card eight-seat house variant · Casual" : "Ghanaian 35-card final-trick deck · Casual",
      state.status, `Hands played: ${state.handNumber}`,
      ...ranks.map((p,i)=>`${i+1}. ${p.name}: ${p.stones} stones`),
      ...state.events.map(e=>new Date(e.at).toLocaleTimeString("en-GB")+" · "+e.description),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], {type:"text/plain"}));
    const link = document.createElement("a");
    link.href=url;link.download=`spar-${state.code}-report.txt`;link.click();URL.revokeObjectURL(url);
  };
  return <main className="spar-page card-game-page page-enter"
    style={{ background:theme.pageBackground,color:theme.text,["--game-accent" as string]:GOLD }}>
    <header className="card-game-header card-game-header-polished spar-header">
      <div className="card-game-brand-lockup"><GameBrandIcon game="spar"/><div><p>GHANAIAN CARD TABLE</p><h1>Spar <small>Cha-Cha</small></h1></div></div>
      <div className="card-game-meta">
        <span>Room {state.code}</span><span>{ranked ? "1v1 · Ranked Beta" : duel ? "1v1 · Casual Beta" : "Multiplayer · Casual Beta"}</span>
        <span>{state.players.length}/{maximumPlayers} players</span>
        <span className={connectionStatus === "Connected" ? "is-online" : ""}>{connectionStatus}</span>
        {state.isSpectator&&<span>Spectating · Read only</span>}
      </div>
      <button type="button" className="button-outline spar-menu-toggle" onClick={()=>setMenuOpen(true)}>Game menu</button>
    </header>

    {state.phase === "lobby" ?
      <section className="card-game-lobby spar-lobby">
        <article className="card-game-lobby-card">
          <p className="modal-eyebrow">SPAR · CHA-CHA · GHANA</p>
          <h2>Take the last trick.</h2>
          <p className="card-game-intro-copy">Five cards each, dealt three then two. Follow suit whenever possible. The highest card of the lead suit wins each trick—but only the fifth trick awards stones.</p>
          <div className="spar-rule-summary">
            <span><b>{expandedDeck ? 40 : 35}</b> cards · {expandedDeck ? "all suits, 5–A" : "no A♠"}</span><span><b>5</b> tricks per hand</span>
            <span><b>6</b> = 3 stones</span><span><b>7</b> = 2 stones</span>
            <span><b>{expandedDeck ? "5, 8–A" : "8–A"}</b> = 1 stone</span><span><b>5</b> in pool</span>
          </div>
          <p className="spar-rule-note">{ranked ? "Ranked requires two authenticated human accounts. Traditional 35-card deck and five-stone pool. Forfeit concedes the match." : duel ? "A fixed two-seat duel against another player or one CPU. Traditional 35-card deck and five-stone pool." : "Casual Beta uses a five-stone pool. Five to eight seats are an HGR house extension. Two to seven use the 35-card deck; eight use 40 cards (all 5s and A♠ added). Fives score one stone on the last trick."} Bonus combinations are not enabled.</p>
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
        rows={ranks.map((p,i)=>({id:p.id,rank:i+1,name:p.name,detail:`${p.stones} stones`,winner:p.id===state.winnerPlayerId,status:p.result??"Finished",accent:GOLD,
          metrics:[{label:"Stones earned",value:String(p.stones)}]}))}
        stats={[{label:"Hands",value:String(state.handNumber)},{label:"Pool",value:String(state.stonesTotal)},{label:"Seats",value:String(state.players.length)}]}
        onDownloadReport={report} onBackToGameRoom={onLeave}
        onPlayAgain={isHost?onStart:undefined} playAgainLabel="Play another Spar match"/>
    : <section className="spar-match">
        <div className="spar-table-column">
          <header className="spar-match-status" aria-live="polite">
            <div><small>HAND {state.handNumber} · TRICK {state.trickNumber} / 5</small><strong>{state.status}</strong></div>
            <StonePool remaining={state.stonesRemaining} total={state.stonesTotal}/>
          </header>
          <div className={`spar-opponents ${state.players.length > 4 ? "is-expanded" : ""}`} aria-label="Player scores">
            {state.players.map(p=><PlayerChip key={p.id} player={p} active={p.id===state.currentTurnPlayerId} isViewer={p.id===viewer?.id}/>)}
          </div>
          <section className="spar-table" aria-label="Spar card table">
            <div className="spar-table-texture" aria-hidden="true"/>
            <div className="spar-table-heading"><span>SPAR</span><small>THE LAST TRICK COUNTS</small></div>
            <div className="spar-table-centre">
              {state.plays.length ?
                <div className={`spar-current-plays ${state.players.length > 4 ? "is-expanded" : ""}`}>{state.plays.map((p,i)=><div key={p.playerId} className="spar-play"><CardFace card={p.card}/><small>{p.playerName}{i===0?" · Lead":""}</small></div>)}</div>
                : <div className="spar-empty-centre"><span>♠ ♥ ♣ ♦</span><strong>{state.phase==="bra"?"Bra — begin the hand":"Waiting for the lead"}</strong><small>Cards are revealed here as players follow suit</small></div>}
            </div>
            {state.lastTrick&&<div className="spar-last-trick">Last trick: {state.players.find(p=>p.id===state.lastTrick?.winnerPlayerId)?.name??"Player"} · {state.lastTrick.winningCard} {state.lastTrick.number===5? `· ${state.lastTrick.points} points`:"· no points"}</div>}
          </section>
          {state.lastAward&&<div className="spar-award" role="status"><strong>{state.lastAward.playerName} claimed {state.lastAward.awarded} stones</strong><span>Hand {state.lastAward.hand} · Winning card {state.lastAward.winningCard}</span></div>}
          {state.phase==="bra" ?
            <div className="spar-bra-prompt">
              <strong>{canCallBra?"Your call":"Waiting for Bra"}</strong>
              <span>{canCallBra?"You are next after the dealer. Call Bra to begin.":`${current?.name??"Next player"} begins the hand.`}</span>
              {canCallBra&&<button type="button" className="button-primary" onClick={onBra}>Bra! · Begin hand</button>}
            </div>
          : <div className="spar-hand">
              <div className="spar-hand-header"><strong>{viewer?"Your hand":state.isSpectator?"Spectator view":"Players' hands"} · {state.hand.length} cards</strong>
                <span>{canAct?(leading?`Follow ${SUIT_NAME[leading]}`:"Lead any card"):(current?`${current.name}'s turn`:"Waiting")}</span></div>
              {viewer?<div className="spar-hand-cards" role="group" aria-label="Your five-card hand">
                {state.hand.map(card=><CardFace key={card} card={card} canPlay={canAct&&legal.includes(card)} disabled={!canAct} onPlay={onPlay}/>)}
              </div>:<p className="spar-spectator-note">Private hands remain concealed until each card is played.</p>}
            </div>}
          {message&&<p className="status-toast" role="status">{message}</p>}
        </div>
        {roomActivity&&<aside className="spar-room-stack">{roomActivity}</aside>}
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
