import { useMemo, useState, type ReactNode } from "react";
import type { WordBoardAiDifficulty, WordBoardPlacement, WordBoardPublicState } from "../../../../shared/games/word-board/types";
import { GameChrome } from "../../platform/components/GameChrome";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";

const ACCENT = "#5b79a6";
interface ThemeLike { pageBackground:string; cardBackground:string; secondaryBackground:string; inputBackground:string; text:string; mutedText:string; border:string; }
interface Props { state:WordBoardPublicState; connectionStatus:string; message:string; darkMode:boolean; theme:ThemeLike; soundEnabled:boolean; onToggleFullscreen:()=>void; onToggleDarkMode:()=>void; onToggleSound:()=>void; onStart:()=>void; onAddAi:(d:WordBoardAiDifficulty)=>void; onRemoveAi:(id:string)=>void; onPlay:(placements:WordBoardPlacement[])=>void; onPass:()=>void; onExchange:(ids:string[])=>void; onChallenge:()=>void; onEndGame:()=>void; onForfeit:()=>void; onLeave:()=>void; roomActivity?:ReactNode; }

export function WordBoardScreen({ state, connectionStatus, message, darkMode, theme, soundEnabled, onToggleFullscreen, onToggleDarkMode, onToggleSound, onStart, onAddAi, onRemoveAi, onPlay, onPass, onExchange, onChallenge, onEndGame, onForfeit, onLeave, roomActivity }:Props) {
  const [menuOpen,setMenuOpen] = useState(false);
  const [inviteOpen,setInviteOpen] = useState(false);
  const [aiDifficulty,setAiDifficulty] = useState<WordBoardAiDifficulty>("normal");
  const [confirm,setConfirm] = useState<"forfeit"|"end"|null>(null);
  const [selectedTile,setSelectedTile] = useState<string|null>(null);
  const [placements,setPlacements] = useState<WordBoardPlacement[]>([]);
  const [exchangeIds,setExchangeIds] = useState<string[]>([]);
  const [exchangeMode,setExchangeMode] = useState(false);

  const viewer = state.players.find(p=>p.id===state.viewerPlayerId);
  const isHost = Boolean(viewer?.isHost);
  const canAct = Boolean(viewer&&!state.isSpectator&&state.phase==="playing"&&state.currentPlayerId===viewer.id);
  const boardEmpty = !state.board.some(cell=>cell.tile);
  const placementMap = useMemo(()=>new Map(placements.map(p=>[p.row*15+p.col,p])),[placements]);
  const rackTileById = useMemo(()=>new Map(state.rack.map(t=>[t.id,t])),[state.rack]);

  function place(row:number,col:number) {
    if (!canAct || state.board[row*15+col].tile) return;
    const existing = placementMap.get(row*15+col);
    if (existing) { setPlacements(current=>current.filter(p=>p!==existing)); return; }
    if (!selectedTile) return;
    const tile = rackTileById.get(selectedTile);
    if (!tile) return;
    let letter:string|undefined;
    if (tile.blank) {
      const entered = window.prompt("Choose the letter for this blank tile","")?.trim().toUpperCase();
      if (!entered || !/^[A-Z]$/.test(entered)) return;
      letter = entered;
    }
    setPlacements(current=>[...current.filter(p=>p.tileId!==selectedTile),{row,col,tileId:selectedTile,letter}]);
    setSelectedTile(null);
  }

  const resultRows = state.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>({ id:p.id, rank:i+1, name:p.name, detail:`${p.score} points`, winner:p.id===state.winnerPlayerId, status:p.result??"Player" }));
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

  return <main className="word-board-page page-enter" style={style}>
    <GameChrome accent={ACCENT} onBackToGameRoom={onLeave} onOpenMenu={()=>setMenuOpen(true)}/>
    <header className="card-game-header card-game-header-polished">
      <div className="card-game-brand-lockup"><GameBrandIcon game="word-board"/><div><p>HALIEUS WORD TABLE</p><h1>Word Board</h1></div></div>
      <div className="card-game-meta"><span>Room {state.code}</span><span>{state.dictionaryMode==="challenge"?"Challenge dictionary":state.dictionaryMode==="open"?"Open / slang dictionary":"Standard dictionary"}</span><span>Bag {state.bagCount}</span><span className={connectionStatus==="Connected"?"is-online":""}>{connectionStatus}</span></div>
    </header>

    {state.phase === "lobby" ? <section className="card-game-lobby word-board-lobby">
      <article className="card-game-lobby-card"><p className="modal-eyebrow">HGR CROSSWORD TABLE</p><h2>Build words across the room.</h2><p className="card-game-intro-copy">Classic crossword-tile rules: the opening word crosses the centre star, every later play connects to the board, premium squares score once, and using all seven rack tiles earns a 50-point bonus.</p>{isHost&&<div className="card-game-host-actions"><label className="card-game-ai-control">AI player<select value={aiDifficulty} onChange={e=>setAiDifficulty(e.target.value as WordBoardAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><button type="button" className="button-outline" disabled={state.players.length>=4} onClick={()=>onAddAi(aiDifficulty)}>Add AI</button><button type="button" className="button-primary" disabled={state.players.length<2} onClick={onStart}>Start Word Board</button></div>}<button type="button" className="button-muted" onClick={()=>setInviteOpen(true)}>Invite player</button></article>
      <section className="card-game-roster"><header><div><p className="modal-eyebrow">SEATS</p><h2>Players</h2></div><span>{state.players.length}/4</span></header>{state.players.map(p=><article key={p.id} className="card-game-player-row"><span className="word-board-avatar">{p.name.slice(0,1)}</span><div><strong>{p.name}</strong><small>{p.isHost?"Host":p.isAi?`${p.aiDifficulty} AI`:"Player"}</small></div>{isHost&&p.isAi&&<button type="button" onClick={()=>onRemoveAi(p.id)}>×</button>}</article>)}</section>
    </section>
    : state.phase === "finished" ? <GameResultsScreen accent={ACCENT} gameTitle="Word Board" roomCode={state.code} headline={state.winnerPlayerId?`${state.players.find(p=>p.id===state.winnerPlayerId)?.name??"Winner"} wins Word Board`:"Word Board finished"} subtitle={state.status} rows={resultRows} stats={[{label:"Board",value:"15 × 15"},{label:"Bag",value:String(state.bagCount)},{label:"Mode",value:state.matchMode}]} onDownloadReport={()=>{const text=[`HALIEUS WORD BOARD · ${state.code}`,state.status,...resultRows.map(row=>`${row.rank}. ${row.name} · ${row.detail}`),`Tiles remaining: ${state.bagCount}`].join("\n");const url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));const a=document.createElement("a");a.href=url;a.download=`word-board-${state.code}-report.txt`;a.click();URL.revokeObjectURL(url);}} onBackToGameRoom={onLeave} onPlayAgain={isHost?onStart:undefined}/>
    : <section className="word-board-live-shell">
      <div className="word-board-stage">
        <header className="word-board-scorebar">{state.players.map((p,index)=><article key={p.id} className={`word-board-player-card player-${index%4} ${state.currentPlayerId===p.id?"is-turn":""} ${viewer?.id===p.id?"is-viewer":""}`}><span className="word-board-seat-marker">{index+1}</span><div><span className="word-board-player-name">{p.name}{viewer?.id===p.id&&<em>YOU</em>}{state.currentPlayerId===p.id&&<b>TURN</b>}</span><small>{p.isHost?"Host · ":""}{p.isAi?`${p.aiDifficulty ?? "normal"} AI · `:""}{p.rackCount} tiles</small></div><strong>{p.score}</strong><i>pts</i></article>)}</header>
        <div className="word-board-rule-strip"><span className={boardEmpty?"is-emphasis":""}>★ Opening word crosses centre</span><span>Every play must connect</span><span>Premium squares score once</span><span>7 tiles = +50</span></div>
        <div className="word-board-table-meta"><span><b>Bag</b> {state.bagCount}</span><span><b>Scoreless turns</b> {state.consecutivePasses}/6</span><span className="word-board-current-turn"><b>Now playing</b> {state.players.find(p=>p.id===state.currentPlayerId)?.name??"—"}</span></div>
        <div className="word-board-play-area">
          <div className={`word-board-grid ${boardEmpty?"is-opening-board":""}`} role="grid" aria-label="15 by 15 crossword board">
            {state.board.map((cell,index)=>{
              const row=Math.floor(index/15), col=index%15, placement=placementMap.get(index), rackTile=placement?rackTileById.get(placement.tileId):null, tile=cell.tile??(rackTile?{...rackTile,letter:placement?.letter??rackTile.letter}:null);
              const isCenter = row===7&&col===7;
              return <button type="button" key={index} className={`word-board-cell bonus-${cell.bonus} ${placement?"is-preview":""} ${isCenter?"is-center-square":""}`} disabled={!canAct||Boolean(cell.tile)} onClick={()=>place(row,col)} aria-label={isCenter&&!tile?"Centre start square":undefined}>{tile?<><b>{tile.letter}</b><sup>{tile.value}</sup></>:cell.bonus!=="normal"?<small>{cell.bonus==="center"?<><span className="word-board-star">★</span><em>START</em></>:cell.bonus.toUpperCase()}</small>:null}</button>;
            })}
          </div>
          <aside className="word-board-control-deck">
            <div><p className="modal-eyebrow">YOUR RACK</p><div className="word-board-rack" aria-label="Your rack">{state.rack.map(tile=>{const placed=placements.some(p=>p.tileId===tile.id);return <button type="button" key={tile.id} disabled={!canAct||placed} className={`${selectedTile===tile.id?"is-selected":""} ${exchangeIds.includes(tile.id)?"is-exchange":""}`} onClick={()=>{if(exchangeMode){setExchangeIds(current=>current.includes(tile.id)?current.filter(id=>id!==tile.id):[...current,tile.id]);return;}setSelectedTile(current=>current===tile.id?null:tile.id)}}><b>{tile.blank?"□":tile.letter}</b><sup>{tile.value}</sup></button>})}</div></div>
            <div className="word-board-actions"><button type="button" className={`button-outline ${exchangeMode?"is-active":""}`} disabled={!canAct||placements.length>0} onClick={()=>{setExchangeMode(v=>!v);setSelectedTile(null);setExchangeIds([])}}>{exchangeMode?"Cancel exchange":"Exchange tiles"}</button><button type="button" className="button-primary" disabled={!canAct||!placements.length} onClick={()=>{onPlay(placements);setPlacements([])}}>Submit word</button><button type="button" className="button-outline" disabled={!placements.length} onClick={()=>setPlacements([])}>Clear placement</button><button type="button" className="button-outline" disabled={!canAct||exchangeMode} onClick={onPass}>Pass turn</button><button type="button" className="button-outline" disabled={!canAct||!exchangeMode||!exchangeIds.length} onClick={()=>{onExchange(exchangeIds);setExchangeIds([]);setExchangeMode(false)}}>Confirm exchange {exchangeIds.length||""}</button>{state.dictionaryMode==="challenge"&&<button type="button" className="button-outline" disabled={!canAct||exchangeMode} onClick={onChallenge}>Challenge last move</button>}</div>
            <p className="word-board-status" aria-live="polite">{state.status}</p>{message&&<p className="status-toast">{message}</p>}
          </aside>
        </div>
      </div>
      {roomActivity&&<aside className="word-board-room-stack">{roomActivity}</aside>}
    </section>}

    {inviteOpen&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setInviteOpen(false)}><section className="card-game-invite-modal"><button type="button" className="icon-button invite-modal-close" onClick={()=>setInviteOpen(false)}>×</button><InviteLobbyPanel roomCode={state.code} darkMode={darkMode} gameTitle="Word Board" invitePathPrefix="/word-board" accent={ACCENT} theme={theme}/></section></div>}
    {menuOpen&&<div className="modal-backdrop game-menu-top-layer" onMouseDown={e=>e.target===e.currentTarget&&setMenuOpen(false)}><section className="game-menu-modal card-game-menu-modal"><header className="modal-heading-row"><div><p className="modal-eyebrow">Word Board · Room {state.code}</p><h2>Game menu</h2></div><button className="icon-button" onClick={()=>setMenuOpen(false)}>×</button></header><DisplaySettingsPanel darkMode={darkMode} soundEnabled={soundEnabled} onToggleDarkMode={onToggleDarkMode} onToggleSound={onToggleSound} onToggleFullscreen={onToggleFullscreen}/><button className="menu-action" onClick={onLeave}>← Back to Game Room</button>{viewer&&!state.isSpectator&&<button className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("forfeit")}}>⚑ Forfeit</button>}{isHost&&<button className="menu-action menu-action-danger" onClick={()=>{setMenuOpen(false);setConfirm("end")}}>■ End game</button>}</section></div>}
    <ConfirmDialog open={confirm!==null} title={confirm==="end"?"End Word Board?":"Forfeit Word Board?"} message={confirm==="end"?"This ends and archives the table for everyone.":"Your seat will be removed from this match."} confirmLabel={confirm==="end"?"End game":"Forfeit"} destructive onCancel={()=>setConfirm(null)} onConfirm={()=>{const a=confirm;setConfirm(null);a==="end"?onEndGame():onForfeit();}}/>
  </main>;
}
