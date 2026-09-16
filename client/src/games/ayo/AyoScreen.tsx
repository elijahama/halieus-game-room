import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AyoAiDifficulty, AyoPlayer, AyoPublicState } from "../../../../shared/games/ayo/types";
import { GameChrome } from "../../platform/components/GameChrome";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";

const ACCENT = "#b87938";
interface ThemeLike { pageBackground:string; cardBackground:string; secondaryBackground:string; inputBackground:string; text:string; mutedText:string; border:string; }
interface Props { state:AyoPublicState; connectionStatus:string; message:string; darkMode:boolean; theme:ThemeLike; soundEnabled:boolean; onToggleFullscreen:()=>void; onToggleDarkMode:()=>void; onToggleSound:()=>void; onStart:()=>void; onAddAi:(d:AyoAiDifficulty)=>void; onRemoveAi:(id:string)=>void; onSow:(pit:number)=>void; onEndGame:()=>void; onForfeit:()=>void; onLeave:()=>void; roomActivity?:ReactNode; }
interface AyoAnimationFrame { pits:number[]; activePit:number|null; kind:"drop"|"pickup"|"capture"; }

function owns(seat:0|1, pit:number) { return seat === 0 ? pit >= 0 && pit < 6 : pit >= 6 && pit < 12; }
function opposite(pit:number) { return 11 - pit; }

// Client-only animation mirror. The server remains authoritative; this simply visualises
// the traditional relay sowing path while the authoritative move is being processed.
function buildSowFrames(source:number[], seat:0|1, start:number):AyoAnimationFrame[] {
  const pits = [...source];
  if (!owns(seat, start) || pits[start] <= 0) return [];
  const frames:AyoAnimationFrame[] = [];
  const original = start;
  let hand = pits[start];
  pits[start] = 0;
  frames.push({ pits:[...pits], activePit:start, kind:"pickup" });
  let cursor = start;
  let guard = 0;
  while (hand > 0 && guard++ < 500) {
    cursor = (cursor + 1) % 12;
    if (cursor === original) continue;
    pits[cursor]++;
    hand--;
    frames.push({ pits:[...pits], activePit:cursor, kind:"drop" });
    if (hand === 0) {
      if (pits[cursor] > 1) {
        hand = pits[cursor];
        pits[cursor] = 0;
        frames.push({ pits:[...pits], activePit:cursor, kind:"pickup" });
        continue;
      }
      break;
    }
  }
  if (guard < 500 && owns(seat, cursor) && pits[cursor] === 1) {
    const facing = opposite(cursor);
    if (pits[facing] > 0) {
      pits[facing] = 0;
      pits[cursor] = 0;
      frames.push({ pits:[...pits], activePit:facing, kind:"capture" });
    }
  }
  return frames.slice(0, 70);
}

function PlayerMarker({ player, current, viewer }: { player:AyoPlayer | undefined; current:boolean; viewer:boolean }) {
  if (!player) return <div className="ayo-player-marker is-empty" aria-hidden="true" />;
  return <article className={`ayo-player-marker ${current ? "is-turn" : ""} ${viewer ? "is-viewer" : ""}`}>
    <span className="ayo-player-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
    <div className="ayo-player-copy">
      <div className="ayo-player-name-line"><strong>{player.name}</strong>{viewer && <em>YOU</em>}{current && <b>TURN</b>}</div>
      <small>Seat {player.seat + 1}{player.isHost ? " · Host" : ""}{player.isAi ? ` · ${player.aiDifficulty ?? "normal"} AI` : ""}</small>
    </div>
    <div className="ayo-capture-score"><strong>{player.captured}</strong><span>captured</span></div>
  </article>;
}

export function AyoScreen({ state, connectionStatus, message, darkMode, theme, soundEnabled, onToggleFullscreen, onToggleDarkMode, onToggleSound, onStart, onAddAi, onRemoveAi, onSow, onEndGame, onForfeit, onLeave, roomActivity }:Props) {
  const [menuOpen,setMenuOpen] = useState(false);
  const [inviteOpen,setInviteOpen] = useState(false);
  const [aiDifficulty,setAiDifficulty] = useState<AyoAiDifficulty>("normal");
  const [confirm,setConfirm] = useState<"forfeit"|"end"|null>(null);
  const [visualPits,setVisualPits] = useState<number[]>(state.pits);
  const [activePit,setActivePit] = useState<number|null>(null);
  const [animationKind,setAnimationKind] = useState<AyoAnimationFrame["kind"]|null>(null);
  const [changedPits,setChangedPits] = useState<Set<number>>(new Set());
  const animatingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const latestPitsRef = useRef(state.pits);
  const previousServerPitsRef = useRef(state.pits);

  const viewer = state.players.find(p=>p.id===state.viewerPlayerId);
  const isHost = Boolean(viewer?.isHost);
  const canAct = Boolean(viewer && !state.isSpectator && state.phase === "playing" && state.currentPlayerId === viewer.id && !animatingRef.current);
  const top = useMemo(()=>[11,10,9,8,7,6],[]);
  const bottom = useMemo(()=>[0,1,2,3,4,5],[]);
  const seatTop = state.players.find(p=>p.seat===1);
  const seatBottom = state.players.find(p=>p.seat===0);
  const rows = state.players.slice().sort((a,b)=>b.captured-a.captured).map((p,i)=>({ id:p.id, rank:i+1, name:p.name, detail:`${p.captured} captured`, winner:p.id===state.winnerPlayerId, status:p.result??"Player" }));

  useEffect(()=>{
    latestPitsRef.current = state.pits;
    const changed = new Set<number>();
    state.pits.forEach((count,index)=>{ if (previousServerPitsRef.current[index] !== count) changed.add(index); });
    previousServerPitsRef.current = state.pits;
    if (!animatingRef.current) setVisualPits(state.pits);
    if (changed.size) {
      setChangedPits(changed);
      const id = window.setTimeout(()=>setChangedPits(new Set()), 520);
      return ()=>window.clearTimeout(id);
    }
  },[state.pits]);

  useEffect(()=>()=>{ for (const id of timersRef.current) window.clearTimeout(id); },[]);

  function animateSow(pit:number) {
    if (!viewer || !canAct) return;
    const frames = buildSowFrames(state.pits, viewer.seat, pit);
    onSow(pit);
    if (!frames.length) return;
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    animatingRef.current = true;
    frames.forEach((frame,index)=>{
      const id = window.setTimeout(()=>{
        setVisualPits(frame.pits);
        setActivePit(frame.activePit);
        setAnimationKind(frame.kind);
      }, Math.min(index * 72, 2500));
      timersRef.current.push(id);
    });
    const finishDelay = Math.min(frames.length * 72 + 120, 2750);
    const finalId = window.setTimeout(()=>{
      animatingRef.current = false;
      setVisualPits([...latestPitsRef.current]);
      setActivePit(null);
      setAnimationKind(null);
    }, finishDelay);
    timersRef.current.push(finalId);
  }

  const style = {
    background:theme.pageBackground,
    color:theme.text,
    ["--game-accent" as string]:ACCENT,
    ["--game-card" as string]:theme.cardBackground,
    ["--game-surface" as string]:theme.secondaryBackground,
    ["--game-input" as string]:theme.inputBackground,
    ["--game-text" as string]:theme.text,
    ["--game-muted" as string]:theme.mutedText,
    ["--game-border" as string]:theme.border,
  };

  return <main className="ayo-page page-enter" style={style}>
    <GameChrome accent={ACCENT} onBackToGameRoom={onLeave} onOpenMenu={()=>setMenuOpen(true)}/>
    <header className="card-game-header card-game-header-polished">
      <div className="card-game-brand-lockup"><GameBrandIcon game="ayo"/><div><p>YORUBA TABLE</p><h1>Ayo</h1></div></div>
      <div className="card-game-meta"><span>Room {state.code}</span><span>Traditional rules</span><span className={connectionStatus==="Connected"?"is-online":""}>{connectionStatus}</span></div>
    </header>

    {state.phase === "lobby" ? <section className="card-game-lobby ayo-lobby">
      <article className="card-game-lobby-card"><p className="modal-eyebrow">TRADITIONAL YORUBA AYO</p><h2>Sow the board. Read the rhythm.</h2><p className="card-game-intro-copy">Two players, twelve houses and forty-eight seeds. Relay sowing and captures are resolved by the server so every player sees the same board.</p>{isHost&&<div className="card-game-host-actions"><label className="card-game-ai-control">AI player<select value={aiDifficulty} onChange={e=>setAiDifficulty(e.target.value as AyoAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><button type="button" className="button-outline" disabled={state.players.length>=2} onClick={()=>onAddAi(aiDifficulty)}>Add AI</button><button type="button" className="button-primary" disabled={state.players.length!==2} onClick={onStart}>Start Ayo</button></div>}<button type="button" className="button-muted" onClick={()=>setInviteOpen(true)}>Invite player</button></article>
      <section className="card-game-roster"><header><div><p className="modal-eyebrow">SEATS</p><h2>Players</h2></div><span>{state.players.length}/2</span></header>{state.players.map(p=><article key={p.id} className="card-game-player-row"><span className="ayo-avatar">{p.name.slice(0,1)}</span><div><strong>{p.name}</strong><small>{p.isHost?"Host":p.isAi?`${p.aiDifficulty} AI`:"Player"}</small></div>{isHost&&p.isAi&&<button type="button" onClick={()=>onRemoveAi(p.id)}>×</button>}</article>)}</section>
    </section>
    : state.phase === "finished" ? <GameResultsScreen accent={ACCENT} gameTitle="Ayo" roomCode={state.code} headline={state.winnerPlayerId?`${state.players.find(p=>p.id===state.winnerPlayerId)?.name??"Winner"} wins Ayo`:"Ayo finished"} subtitle={state.status} rows={rows} stats={[{label:"Seeds",value:"48"},{label:"Houses",value:"12"},{label:"Mode",value:state.matchMode}]} onDownloadReport={()=>{const text=[`HALIEUS AYO · ${state.code}`,state.status,...rows.map(row=>`${row.rank}. ${row.name} · ${row.detail}`)].join("\n");const url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));const a=document.createElement("a");a.href=url;a.download=`ayo-${state.code}-report.txt`;a.click();URL.revokeObjectURL(url);}} onBackToGameRoom={onLeave} onPlayAgain={isHost?onStart:undefined}/>
    : <section className="ayo-live-shell">
      <div className="ayo-stage">
        <div className="ayo-table-panel">
          <PlayerMarker player={seatTop} current={state.currentPlayerId===seatTop?.id} viewer={viewer?.id===seatTop?.id}/>
          <div className="ayo-turn-banner" aria-live="polite"><span className="ayo-turn-dot"/><strong>{state.status}</strong></div>
          <div className="ayo-board-wrap">
            <div className="ayo-board" role="grid" aria-label="Traditional Ayo board">
              <div className="ayo-row ayo-row-top">{top.map(pit=><button type="button" key={pit} className={`${activePit===pit?`is-active is-${animationKind}`:""} ${changedPits.has(pit)?"is-changed":""}`} disabled={!canAct||viewer?.seat!==1||visualPits[pit]===0} onClick={()=>animateSow(pit)} aria-label={`House ${pit-5}, ${visualPits[pit]} seeds`}><span>{Array.from({length:Math.min(visualPits[pit],16)},(_,i)=><i key={`${pit}-${i}`} style={{animationDelay:`${Math.min(i*14,120)}ms`}}/>)}</span><b>{visualPits[pit]}</b></button>)}</div>
              <div className="ayo-board-ridge"><span>AYO</span><i aria-hidden="true"/></div>
              <div className="ayo-row ayo-row-bottom">{bottom.map(pit=><button type="button" key={pit} className={`${activePit===pit?`is-active is-${animationKind}`:""} ${changedPits.has(pit)?"is-changed":""}`} disabled={!canAct||viewer?.seat!==0||visualPits[pit]===0} onClick={()=>animateSow(pit)} aria-label={`House ${pit+1}, ${visualPits[pit]} seeds`}><span>{Array.from({length:Math.min(visualPits[pit],16)},(_,i)=><i key={`${pit}-${i}`} style={{animationDelay:`${Math.min(i*14,120)}ms`}}/>)}</span><b>{visualPits[pit]}</b></button>)}</div>
            </div>
          </div>
          <PlayerMarker player={seatBottom} current={state.currentPlayerId===seatBottom?.id} viewer={viewer?.id===seatBottom?.id}/>
          <div className="ayo-legend"><span><i className="ayo-legend-seed"/> Tap one of your houses to sow</span><span>Relay sowing continues automatically</span><span>Capture count is shown beside each player</span></div>
          {message&&<p className="status-toast">{message}</p>}
        </div>
      </div>
      {roomActivity&&<aside className="ayo-room-stack">{roomActivity}</aside>}
    </section>}

    {inviteOpen&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setInviteOpen(false)}><section className="card-game-invite-modal"><button type="button" className="icon-button invite-modal-close" onClick={()=>setInviteOpen(false)}>×</button><InviteLobbyPanel roomCode={state.code} darkMode={darkMode} gameTitle="Ayo" invitePathPrefix="/ayo" accent={ACCENT} theme={theme}/></section></div>}
    {menuOpen&&<div className="modal-backdrop game-menu-top-layer" onMouseDown={e=>e.target===e.currentTarget&&setMenuOpen(false)}><section className="game-menu-modal card-game-menu-modal"><header className="modal-heading-row"><div><p className="modal-eyebrow">Ayo · Room {state.code}</p><h2>Game menu</h2></div><button className="icon-button" onClick={()=>setMenuOpen(false)}>×</button></header><DisplaySettingsPanel darkMode={darkMode} soundEnabled={soundEnabled} onToggleDarkMode={onToggleDarkMode} onToggleSound={onToggleSound} onToggleFullscreen={onToggleFullscreen}/><button className="menu-action" onClick={onLeave}>← Back to Game Room</button>{viewer&&!state.isSpectator&&<button className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("forfeit")}}>⚑ Forfeit</button>}{isHost&&<button className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("end")}}>■ End game</button>}</section></div>}
    <ConfirmDialog open={confirm!==null} title={confirm==="end"?"End Ayo?":"Forfeit Ayo?"} message={confirm==="end"?"This ends and archives the Ayo room for everyone.":"Your opponent will win this game."} confirmLabel={confirm==="end"?"End game":"Forfeit"} destructive onCancel={()=>setConfirm(null)} onConfirm={()=>{const a=confirm;setConfirm(null);a==="end"?onEndGame():onForfeit();}}/>
  </main>;
}
