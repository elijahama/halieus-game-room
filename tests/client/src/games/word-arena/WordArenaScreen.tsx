import { useEffect, useMemo, useState } from "react";
import type { WordArenaGameId, WordArenaPublicState } from "../../../../shared/games/word-arena/types";
import type { WordGameLeaderboardSnapshot } from "../../../../shared/platform/accounts";
import { accountApi } from "../../platform/accounts/api";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { GameChrome } from "../../platform/components/GameChrome";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { GAME_BY_ID } from "../../platform/games/catalog";

interface ThemeLike { pageBackground:string;cardBackground:string;secondaryBackground:string;inputBackground:string;text:string;mutedText:string;border:string; }
interface Props {
  state: WordArenaPublicState; connectionStatus:string; message:string; darkMode:boolean; theme:ThemeLike; soundEnabled:boolean;
  onToggleFullscreen:()=>void; onToggleDarkMode:()=>void; onToggleSound:()=>void; onStart:()=>void; onNextRound:()=>void;
  onSubmit:(value:string)=>void; onClue:(value:string)=>void; onEndGame:()=>void; onForfeit:()=>void; onLeave:()=>void;
  roomActivity?: React.ReactNode;
}

type LeaderboardTab = "today" | "friends" | "all-time";

const COPY: Record<WordArenaGameId,{eyebrow:string;intro:string;rule:string;button:string}> = {
  "word-game": { eyebrow:"HALIEUS WORD PUZZLE", intro:"Six guesses. Five letters. One daily challenge.", rule:"Daily mode gives every Halieus player the same puzzle. Practice stays unranked. Green is exact, amber is present, grey is absent.", button:"Start puzzle" },
  password: { eyebrow:"HALIEUS CLUE GAME", intro:"One word clue. One hidden password. Read your team.", rule:"The clue giver sees the password, gives one legal word, and everyone else races to guess it. First to 5 points wins.", button:"Start Password" },
  "anagrams-race": { eyebrow:"HALIEUS WORD RACE", intro:"The letters are scrambled. The room is not.", rule:"Solve the shared anagram before everyone else. First correct answer takes the point; first to 5 wins.", button:"Start race" },
};

function durationLabel(ms:number|null|undefined){
  if(ms===null||ms===undefined||!Number.isFinite(ms)) return "—";
  const total=Math.max(0,Math.round(ms/1000));
  const minutes=Math.floor(total/60); const seconds=total%60;
  return minutes ? `${minutes}:${String(seconds).padStart(2,"0")}` : `${seconds}s`;
}

export function WordArenaScreen({state,connectionStatus,message,darkMode,theme,soundEnabled,onToggleFullscreen,onToggleDarkMode,onToggleSound,onStart,onNextRound,onSubmit,onClue,onEndGame,onForfeit,onLeave,roomActivity}:Props){
  const [entry,setEntry]=useState("");
  const [menuOpen,setMenuOpen]=useState(false);
  const [inviteOpen,setInviteOpen]=useState(false);
  const [confirm,setConfirm]=useState<"forfeit"|"end"|null>(null);
  const [leaderboardTab,setLeaderboardTab]=useState<LeaderboardTab>("today");
  const [leaderboard,setLeaderboard]=useState<WordGameLeaderboardSnapshot|null>(null);
  const [leaderboardError,setLeaderboardError]=useState("");
  const [socialOpen,setSocialOpen]=useState(true);
  const viewer=state.players.find(p=>p.id===state.viewerPlayerId);
  const isHost=Boolean(viewer?.isHost);
  const isClueGiver=state.game==="password"&&viewer?.id===state.clueGiverPlayerId;
  const game=GAME_BY_ID[state.game];
  const copy=COPY[state.game];
  const sortedPlayers=useMemo(()=>[...state.players].sort((a,b)=>b.score-a.score||a.seat-b.seat),[state.players]);

  useEffect(()=>{
    if(state.game!=="word-game") return;
    let cancelled=false;
    let timer:number|undefined;
    const load=()=>accountApi<{ok:true;leaderboard:WordGameLeaderboardSnapshot}>("/accounts/word-game/leaderboard")
      .then(result=>{if(!cancelled){setLeaderboard(result.leaderboard);setLeaderboardError("");}})
      .catch(error=>{if(!cancelled)setLeaderboardError(error instanceof Error?error.message:"Leaderboard unavailable.");});
    void load();
    if(state.phase==="finished") timer=window.setTimeout(()=>void load(),650);
    return()=>{cancelled=true;if(timer)window.clearTimeout(timer);};
  },[state.game,state.phase,state.updatedAt]);

  function send(){const value=entry.trim();if(!value)return;if(isClueGiver&&!state.clue)onClue(value);else onSubmit(value);setEntry("");}
  const wordRows=leaderboardTab==="today"?leaderboard?.today:leaderboardTab==="friends"?leaderboard?.friends:null;
  const solvedThisRoom=state.game==="word-game"&&Boolean(state.winnerPlayerId===state.viewerPlayerId);
  const liveGuesses=state.game==="word-game"?state.viewerAttempts.length:null;
  const liveSolveTime=solvedThisRoom&&state.startedAt?Math.max(0,state.updatedAt-state.startedAt):null;
  const wordModeLabel=state.wordGameMode==="practice"?"Practice Puzzle":"Daily Puzzle";

  return <main className={`word-arena-page word-arena-${state.game} page-enter`} style={{background:theme.pageBackground,color:theme.text,["--game-accent" as string]:game.accent}}>
    <GameChrome accent={game.accent} onBackToGameRoom={onLeave} onOpenMenu={()=>setMenuOpen(true)}/>
    <header className="word-arena-header">
      <div className="word-arena-brand"><GameBrandIcon game={state.game}/><div><p>{copy.eyebrow}</p><h1>{state.gameTitle}</h1></div></div>
      <div className="word-arena-meta"><span>Room {state.code}</span>{state.game==="word-game"?<span>{wordModeLabel}</span>:<span>{state.matchMode==="ranked"?"🏆 Ranked":"Casual"}</span>}{state.aiCount>0&&<span>{state.aiCount} AI · {state.aiDifficulty}</span>}<span className={connectionStatus==="Connected"?"is-online":""}>{connectionStatus}</span></div>
    </header>

    {state.phase==="lobby" ? <section className={`word-arena-lobby ${state.game==="word-game"?"is-word-game-lobby":""}`}>
      <article className="word-arena-intro"><p className="modal-eyebrow">{state.game==="word-game"?wordModeLabel.toUpperCase():"READY ROOM"}</p><h2>{copy.intro}</h2><p>{state.game==="word-game"&&state.wordGameMode==="daily"?"Your first completed Daily Puzzle attempt is the one that counts for today’s leaderboard and streak. Practice never changes your rank.":copy.rule}</p><div className="word-arena-lobby-actions">{isHost&&<button type="button" className="button-primary" onClick={onStart}>{copy.button}</button>}{state.game!=="word-game"&&<button type="button" className="button-outline" onClick={()=>setInviteOpen(true)}>Invite players</button>}</div></article>
      {state.game==="word-game"?<section className="word-game-lobby-stats"><p className="modal-eyebrow">YOUR DAILY FORM</p><div className="word-game-stat-grid"><span><b>{leaderboard?.stats.currentStreak??0}</b><small>Current streak</small></span><span><b>{leaderboard?.stats.bestStreak??0}</b><small>Best streak</small></span><span><b>{leaderboard?.stats.averageGuesses??"—"}</b><small>Avg guesses</small></span><span><b>{durationLabel(leaderboard?.stats.fastestSolveMs)}</b><small>Fastest solve</small></span></div>{leaderboardError&&<small className="word-game-leaderboard-note">Sign in with a Halieus account to keep daily stats.</small>}</section>:<section className="word-arena-roster"><header><div><p className="modal-eyebrow">ROOM</p><h2>Players</h2></div><span>{state.players.length}/8</span></header>{state.players.map(p=><article key={p.id}><span>{p.name.slice(0,2).toUpperCase()}</span><div><strong>{p.name}</strong><small>{p.isHost?"Host":p.isAi?`AI · ${p.aiDifficulty??state.aiDifficulty}`:"Player"}{p.id===state.viewerPlayerId?" · You":""}</small></div><i className={p.isConnected?"is-online":""}>{p.isConnected?"Online":"Recoverable"}</i></article>)}</section>}
    </section> : <section className={`word-arena-live ${state.game==="word-game"?"is-word-game":""} ${state.game==="word-game"&&!socialOpen?"is-social-closed":""}`}>
      {state.game==="word-game"?<aside className="word-game-leaderboard-panel">
        <header><div><p className="modal-eyebrow">DAILY LEADERBOARD</p><strong>{leaderboard?.puzzleKey??state.wordPuzzleKey??"Today"}</strong></div>{roomActivity&&<button type="button" className="word-game-social-toggle" onClick={()=>setSocialOpen(v=>!v)}>{socialOpen?"Hide social":"Show social"}</button>}</header>
        <div className="word-game-stats-strip"><span><b>{leaderboard?.stats.currentStreak??0}</b><small>Streak</small></span><span><b>{leaderboard?.stats.bestStreak??0}</b><small>Best</small></span><span><b>{leaderboard?.stats.averageGuesses??"—"}</b><small>Avg</small></span></div>
        <div className="word-game-leaderboard-tabs" role="tablist"><button type="button" className={leaderboardTab==="today"?"is-active":""} onClick={()=>setLeaderboardTab("today")}>Today</button><button type="button" className={leaderboardTab==="friends"?"is-active":""} onClick={()=>setLeaderboardTab("friends")}>Friends</button><button type="button" className={leaderboardTab==="all-time"?"is-active":""} onClick={()=>setLeaderboardTab("all-time")}>All Time</button></div>
        <div className="word-game-leaderboard-list">
          {leaderboardTab!=="all-time"&&wordRows?.map(row=><article key={row.accountId}><b>#{row.rank}</b><span className="word-game-avatar" style={{["--player-accent" as string]:row.playerColor}}>{row.avatar}</span><div><strong>{row.displayName}</strong><small>{row.guesses}/6 guesses · {durationLabel(row.solveTimeMs)}</small></div></article>)}
          {leaderboardTab==="all-time"&&leaderboard?.allTime.map(row=><article key={row.accountId}><b>#{row.rank}</b><span className="word-game-avatar" style={{["--player-accent" as string]:row.playerColor}}>{row.avatar}</span><div><strong>{row.displayName}</strong><small>{row.dailySolved} solves · {row.bestStreak} best streak · {row.averageGuesses??"—"} avg</small></div></article>)}
          {leaderboard&&!leaderboardError&&((leaderboardTab!=="all-time"&&!wordRows?.length)||(leaderboardTab==="all-time"&&!leaderboard.allTime.length))&&<p className="word-game-leaderboard-empty">No ranked results here yet.</p>}
          {leaderboardError&&<p className="word-game-leaderboard-empty">{leaderboardError}</p>}
        </div>
        <footer><span>Today</span><strong>{leaderboard?.stats.today?.solved?`${leaderboard.stats.today.guesses}/6 · ${durationLabel(leaderboard.stats.today.solveTimeMs)}`:leaderboard?.stats.today?"Attempt complete":"Not played"}</strong>{leaderboard?.stats.today?.rank&&<small>Rank #{leaderboard.stats.today.rank}</small>}</footer>
      </aside>:<aside className="word-arena-scoreboard"><header><p className="modal-eyebrow">SCOREBOARD</p><strong>First to {state.targetScore}</strong></header>{sortedPlayers.map(p=><article key={p.id} className={p.id===state.viewerPlayerId?"is-you":""}><span>{p.name.slice(0,1).toUpperCase()}</span><div><strong>{p.name}</strong><small>{p.result??(p.id===state.clueGiverPlayerId?`${p.isAi?"AI · ":""}Clue giver`:p.isAi?`AI · ${p.aiDifficulty??state.aiDifficulty}`:p.isConnected?"Playing":"Away")}</small></div><b>{p.score}</b></article>)}</aside>}

      <section className="word-arena-stage"><div className="word-arena-round-kicker"><span>{state.game==="word-game"?wordModeLabel:`Round ${state.roundNumber}`}</span><b>{state.status}</b></div>
        {state.game==="word-game"&&<div className="wordle-board">{Array.from({length:6},(_,row)=>{const attempt=state.viewerAttempts[row];return <div className="wordle-row" key={row}>{Array.from({length:5},(_,col)=>{const letter=attempt?.guess[col]??"";const mark=attempt?.marks[col]??"";return <span key={col} className={mark?`is-${mark}`:""}>{letter}</span>})}</div>})}</div>}
        {state.game==="password"&&<div className="password-stage"><p className="modal-eyebrow">{isClueGiver&&!state.clue?"YOUR PASSWORD":state.clue?"LIVE CLUE":"PASSWORD"}</p><strong className={isClueGiver&&!state.clue?"is-secret":""}>{isClueGiver&&!state.clue?(state.viewerSecret??"—"):state.clue??"Waiting for the clue giver…"}</strong>{isClueGiver&&!state.clue&&<small>Give one word. Do not use the password itself.</small>}{state.clue&&<small>{state.players.find(p=>p.id===state.clueGiverPlayerId)?.name??"Clue giver"} gave this clue.</small>}</div>}
        {state.game==="anagrams-race"&&<div className="anagram-stage"><p className="modal-eyebrow">UNSCRAMBLE</p><strong>{state.scramble??state.viewerSecret??"—"}</strong><small>{state.phase==="round-over"&&state.viewerSecret?`Answer: ${state.viewerSecret}`:"Type the original word before the room does."}</small></div>}
        {state.phase==="playing"&&!state.isSpectator&&!(state.game==="password"&&isClueGiver&&Boolean(state.clue))&&<form className="word-arena-entry" onSubmit={e=>{e.preventDefault();send();}}><input value={entry} onChange={e=>setEntry(e.target.value)} maxLength={18} autoComplete="off" autoCapitalize="characters" placeholder={isClueGiver&&!state.clue?"One-word clue":state.game==="word-game"?"Five-letter guess":"Your answer"}/><button type="submit" className="button-primary">{isClueGiver&&!state.clue?"Give clue":"Submit"}</button></form>}
        {state.game==="word-game"&&state.phase==="playing"&&!state.isSpectator&&<small className="word-arena-attempts">{state.attemptsRemaining} guess{state.attemptsRemaining===1?"":"es"} remaining</small>}
        {state.phase==="round-over"&&<div className="word-arena-round-over"><strong>{state.roundWinnerPlayerId?`${state.players.find(p=>p.id===state.roundWinnerPlayerId)?.name??"Winner"} takes the round.`:"No winner this round."}</strong>{state.viewerSecret&&<span>The answer was {state.viewerSecret}.</span>}{isHost&&<button type="button" className="button-primary" onClick={onNextRound}>Next round</button>}</div>}
        {state.phase==="finished"&&<div className="word-arena-finish"><p className="modal-eyebrow">{state.game==="word-game"?wordModeLabel.toUpperCase():"GAME COMPLETE"}</p><h2>{state.game==="word-game"?(solvedThisRoom?`Solved in ${liveGuesses}/6`:"Puzzle complete"):state.winnerPlayerId?`${state.players.find(p=>p.id===state.winnerPlayerId)?.name??"Winner"} wins`:`${state.gameTitle} complete`}</h2><span>{state.game==="word-game"&&solvedThisRoom?`${durationLabel(liveSolveTime)} · ${state.wordGameMode==="daily"?leaderboard?.stats.today?.rank?`Daily rank #${leaderboard.stats.today.rank}`:"Daily result recorded":"Practice result — leaderboard unchanged"}`:state.status}</span></div>}
        {message&&<p className="status-toast">{message}</p>}
      </section>
      {roomActivity&&state.game!=="word-game"&&<aside className="word-arena-room-activity">{roomActivity}</aside>}
      {roomActivity&&state.game==="word-game"&&socialOpen&&<aside className="word-arena-room-activity word-game-social-panel">{roomActivity}</aside>}
    </section>}

    {inviteOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&setInviteOpen(false)}><section className="card-game-invite-modal"><button type="button" className="icon-button invite-modal-close" onClick={()=>setInviteOpen(false)}>×</button><InviteLobbyPanel roomCode={state.code} darkMode={darkMode} gameTitle={state.gameTitle} invitePathPrefix={`/${state.game}`} accent={game.accent} theme={theme}/></section></div>}
    {menuOpen&&<div className="modal-backdrop game-menu-top-layer" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&setMenuOpen(false)}><section className="game-menu-modal card-game-menu-modal"><div className="modal-handle"/><header className="modal-heading-row"><div><p className="modal-eyebrow">{state.gameTitle} · Room {state.code}</p><h2>Game menu</h2></div><button type="button" className="icon-button" onClick={()=>setMenuOpen(false)}>×</button></header><button type="button" className="menu-action menu-action-primary" onClick={()=>setMenuOpen(false)}><span>▶</span><span><strong>Resume</strong><small>Return to the room</small></span></button><DisplaySettingsPanel darkMode={darkMode} soundEnabled={soundEnabled} onToggleDarkMode={onToggleDarkMode} onToggleSound={onToggleSound} onToggleFullscreen={onToggleFullscreen}/><button type="button" className="menu-action" onClick={onLeave}><span>←</span><span><strong>Back to Game Room</strong><small>Keep your seat recoverable</small></span></button>{viewer&&!state.isSpectator&&<button type="button" className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("forfeit")}}><span>⚑</span><span><strong>Leave game</strong><small>Forfeit your current seat</small></span></button>}{isHost&&<button type="button" className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("end")}}><span>■</span><span><strong>End game</strong><small>Archive this session</small></span></button>}</section></div>}
    <ConfirmDialog open={confirm!==null} title={confirm==="end"?`End ${state.gameTitle}?`:`Leave ${state.gameTitle}?`} message={confirm==="end"?"This ends the room for everyone and archives the result.":"Your seat will forfeit the active game, but the room can continue."} destructive confirmLabel={confirm==="end"?"End game":"Leave game"} onCancel={()=>setConfirm(null)} onConfirm={()=>{const action=confirm;setConfirm(null);action==="end"?onEndGame():onForfeit();}}/>
  </main>;
}
