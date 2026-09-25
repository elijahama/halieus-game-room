import { ModalPortal } from "../../platform/components/ModalPortal";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { LudoAiDifficulty, LudoColour, LudoPiece, LudoPublicPlayer, LudoPublicState } from "../../../../shared/games/ludo/types";
import { GameChrome } from "../../platform/components/GameChrome";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { GAME_BY_ID } from "../../platform/games/catalog";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { InviteLobbyBar } from "../../platform/components/InviteLobbyBar";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { RecoveryKeyPanel } from "../../platform/components/RecoveryKeyPanel";
import { RoomTimeMeta } from "../../platform/components/RoomTimeMeta";
import { AutopilotControl } from "../../platform/components/AutopilotControl";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { downloadLudoGameReport } from "./utils/gameReport";

interface ThemeLike { pageBackground: string; cardBackground: string; secondaryBackground: string; inputBackground: string; text: string; mutedText: string; border: string; }
interface Props {
  state: LudoPublicState; connectionStatus: string; message: string; darkMode: boolean; theme: ThemeLike; soundEnabled: boolean; recoveryKey: string | null;
  onToggleFullscreen: () => void; onToggleDarkMode: () => void; onToggleSound: () => void; onStart: () => void; onAddAi: (difficulty: LudoAiDifficulty) => void; onRemoveAi: (playerId: string) => void;
  onRoll: () => void; onMove: (pieceId: string) => void; onAutopilotChange: (enabled: boolean) => void; onEndGame: () => void; onForfeit: () => void; onLeave: () => void; roomActivity?: ReactNode;
}

const LUDO_ACCENT = GAME_BY_ID["ludo"].accent;
const COLOUR_HEX: Record<LudoColour,string> = { red: "#ef4444", green: "#22c55e", yellow: "#eab308", blue: "#3b82f6" };
const START_INDEX: Record<LudoColour, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
const TRACK: Array<[number,number]> = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const HOME_LANES: Record<LudoColour, Array<[number,number]>> = {
  red: [[7,1],[7,2],[7,3],[7,4],[7,5]], green: [[1,7],[2,7],[3,7],[4,7],[5,7]], yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]], blue: [[13,7],[12,7],[11,7],[10,7],[9,7]],
};
const YARDS: Record<LudoColour, Array<[number,number]>> = {
  red: [[2,2],[2,4],[4,2],[4,4]], green: [[2,10],[2,12],[4,10],[4,12]], yellow: [[10,10],[10,12],[12,10],[12,12]], blue: [[10,2],[10,4],[12,2],[12,4]],
};
const SAFE = new Set([0,8,13,21,26,34,39,47]);
const FINISH_CELLS: Record<LudoColour,[number,number]> = { red:[7,6], green:[6,7], yellow:[7,8], blue:[8,7] };

function pieceCoordinate(player: LudoPublicPlayer, piece: LudoPiece, index: number): [number,number] {
  if (piece.steps === -1) return YARDS[player.colour][index] ?? YARDS[player.colour][0];
  if (piece.steps <= 51) return TRACK[(START_INDEX[player.colour] + piece.steps) % 52] ?? [7,7];
  if (piece.steps <= 56) return HOME_LANES[player.colour][piece.steps - 52] ?? [7,7];
  return FINISH_CELLS[player.colour];
}
function cellStyle(row: number, col: number): CSSProperties { return { gridRow: row + 1, gridColumn: col + 1 }; }
function LudoBoard({ state, viewer, onMove }: { state: LudoPublicState; viewer: LudoPublicPlayer | undefined; onMove: (pieceId: string) => void }) {
  const pieces = state.players.flatMap((player) => player.pieces.map((piece, index) => ({ player, piece, index, coordinate: pieceCoordinate(player, piece, index) })));
  const pieceNodes = useRef(new Map<string, HTMLButtonElement>());
  const previousRects = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    for (const [key, node] of pieceNodes.current) {
      const next = node.getBoundingClientRect();
      nextRects.set(key, next);
      const previous = previousRects.current.get(key);
      if (!previous) continue;
      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;
      node.animate(
        [{ translate: `${deltaX}px ${deltaY}px`, scale: .94 }, { translate: "0 0", scale: 1 }],
        { duration: 420, easing: "cubic-bezier(.2,.82,.2,1)" },
      );
    }
    previousRects.current = nextRects;
  }, [state.actionLog.length, state.players]);
  return <div className="ludo-board" aria-label="Ludo board">
    <div className="ludo-base base-red"/><div className="ludo-base base-green"/><div className="ludo-base base-yellow"/><div className="ludo-base base-blue"/>
    {TRACK.map(([row,col], index) => <span key={`track-${index}`} style={cellStyle(row,col)} className={`ludo-track-cell ${SAFE.has(index) ? "is-safe" : ""} ${Object.values(START_INDEX).includes(index) ? `is-start start-${(Object.entries(START_INDEX).find(([,value]) => value === index)?.[0] ?? "")}` : ""}`}>{SAFE.has(index) ? "★" : ""}</span>)}
    {Object.entries(HOME_LANES).flatMap(([colour, cells]) => cells.map(([row,col], index) => <span key={`${colour}-home-${index}`} style={cellStyle(row,col)} className={`ludo-home-cell home-${colour}`}/>))}
    <div className="ludo-home-centre"><i className="red"/><i className="green"/><i className="yellow"/><i className="blue"/></div>
    {pieces.map(({ player, piece, index, coordinate }) => {
      const legal = viewer?.id === player.id && state.legalPieceIds.includes(piece.id);
      const pieceKey = `${player.id}-${piece.id}`;
      return <button key={pieceKey} ref={(node) => { if (node) pieceNodes.current.set(pieceKey, node); else pieceNodes.current.delete(pieceKey); }} type="button" style={{ ...cellStyle(coordinate[0], coordinate[1]), ["--piece-colour" as string]: COLOUR_HEX[player.colour], ["--piece-offset-x" as string]: `${(index % 2) * 7 - 3}px`, ["--piece-offset-y" as string]: `${Math.floor(index / 2) * 7 - 3}px` }} className={`ludo-piece ${legal ? "is-legal" : ""} ${piece.steps === 57 ? "is-home" : ""}`} disabled={!legal} onClick={() => legal && onMove(piece.id)} aria-label={`${player.name} ${player.colour} piece ${index + 1}${legal ? ", legal move" : ""}`}><span>{index + 1}</span></button>;
    })}
  </div>;
}

export function LudoScreen({ state, connectionStatus, message, darkMode, theme, soundEnabled, recoveryKey, onToggleFullscreen, onToggleDarkMode, onToggleSound, onStart, onAddAi, onRemoveAi, onRoll, onMove, onAutopilotChange, onEndGame, onForfeit, onLeave, roomActivity }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [confirmAction, setConfirmAction] = useState<"forfeit" | "end" | null>(null); const [aiDifficulty, setAiDifficulty] = useState<LudoAiDifficulty>("normal");
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId); const isHost = Boolean(viewer?.isHost); const current = state.players.find((player) => player.id === state.currentTurnPlayerId); const ordering = state.phase === "ordering"; const autopilotActive = Boolean(viewer?.autopilotEnabled); const recent = state.actionLog.slice(-7).reverse();
  const rulesSummary = useMemo(() => `Roll ${state.rules.rollToEnter} to enter · exact finish ${state.rules.exactRollToFinish ? "on" : "off"} · extra roll on six ${state.rules.extraTurnOnSix ? "on" : "off"} · capture bonus ${state.rules.extraTurnOnCapture ? "on" : "off"}`, [state.rules]);
  const ludoResults = useMemo(() => {
    const sorted = state.players.slice().sort((a,b) => (a.id === state.winnerPlayerId ? -1 : b.id === state.winnerPlayerId ? 1 : b.finishedCount - a.finishedCount || a.seat - b.seat));
    const captures = new Map<string, number>();
    const sixes = new Map<string, number>();
    const moves = new Map<string, number>();
    const rolls = new Map<string, number>();
    const finishes = new Map<string, number>();
    const currentMoves = new Map(state.players.map((player) => [player.id, 0]));
    const graphValues = new Map(state.players.map((player) => [player.id, [0]]));
    const add = (map: Map<string, number>, playerId: string | null, value = 1) => { if (playerId) map.set(playerId, (map.get(playerId) ?? 0) + value); };
    for (const entry of state.actionLog) {
      if (entry.action === "roll") { add(rolls, entry.playerId); if (entry.roll === 6) add(sixes, entry.playerId); }
      if (entry.action === "capture") add(captures, entry.playerId, Math.max(1, entry.capturedPlayerIds.length));
      if (["move","enter","capture","finish"].includes(entry.action)) { add(moves, entry.playerId); if (entry.playerId) currentMoves.set(entry.playerId, (currentMoves.get(entry.playerId) ?? 0) + 1); }
      if (entry.action === "finish") add(finishes, entry.playerId);
      for (const player of state.players) graphValues.get(player.id)?.push(currentMoves.get(player.id) ?? 0);
    }
    for (const player of state.players) graphValues.get(player.id)?.push(moves.get(player.id) ?? 0);
    const award = (title: string, map: Map<string, number>, unit: string, icon: string) => {
      const best = [...map.entries()].sort((a,b) => b[1] - a[1])[0];
      if (!best || best[1] <= 0) return null;
      const player = state.players.find((item) => item.id === best[0]);
      return player ? { title, winner: player.name, detail: `${best[1]} ${unit}`, icon } : null;
    };
    return {
      rows: sorted.map((player,index) => ({
        id: player.id,
        rank:index + 1,
        name:player.name,
        detail:`${player.finishedCount}/4 home · ${player.colour}`,
        status: player.id === state.winnerPlayerId ? "Winner" : player.result ?? "Finished",
        winner:player.id === state.winnerPlayerId,
        accent: COLOUR_HEX[player.colour],
        metrics: [
          { label: "Pieces home", value: `${player.finishedCount}/4` },
          { label: "Rolls", value: String(rolls.get(player.id) ?? 0) },
          { label: "Sixes", value: String(sixes.get(player.id) ?? 0) },
          { label: "Captures", value: String(captures.get(player.id) ?? 0) },
          { label: "Piece moves", value: String(moves.get(player.id) ?? 0) },
          { label: "Finishes", value: String(finishes.get(player.id) ?? player.finishedCount) },
        ],
        actions: state.actionLog.filter((entry) => entry.playerId === player.id).map((entry) => ({ at: entry.at, label: entry.action.replace("-", " ").replace(/^./, (letter) => letter.toUpperCase()), detail: entry.detail })),
      })),
      stats: [
        { label: "Turns", value: String(state.turnNumber) },
        { label: "Captures", value: String([...captures.values()].reduce((a,b) => a + b, 0)) },
        { label: "Sixes rolled", value: String([...sixes.values()].reduce((a,b) => a + b, 0)) },
        { label: "Pieces home", value: String(state.players.reduce((sum, player) => sum + player.finishedCount, 0)) },
        { label: "Recorded actions", value: String(state.actionLog.length) },
        { label: "Match mode", value: state.matchMode === "ranked" ? "Ranked" : "Casual" },
      ],
      awards: [award("Capture Leader", captures, "captures", "💥"), award("Six Shooter", sixes, "sixes rolled", "🎲"), award("Board Traveller", moves, "piece moves", "🏁"), award("Home Runner", finishes, "pieces brought home", "🏠")].filter((item): item is NonNullable<typeof item> => Boolean(item)),
      graph: {
        title: "Piece moves through the match",
        subtitle: "Cumulative legal piece movements from the authoritative action log.",
        xLabels: ["Start", ...state.actionLog.map((entry) => `#${entry.sequence}`), "Final"],
        series: state.players.map((player) => ({ id: player.id, name: player.name, values: graphValues.get(player.id) ?? [0, moves.get(player.id) ?? 0], accent: COLOUR_HEX[player.colour] })),
      },
    };
  }, [state.actionLog, state.matchMode, state.players, state.turnNumber, state.winnerPlayerId]);
  return <main className="card-game-page ludo-page page-enter" style={{ background: theme.pageBackground, color: theme.text, ["--game-accent" as string]: LUDO_ACCENT }}>
    <GameChrome accent={LUDO_ACCENT} onBackToGameRoom={onLeave} onOpenMenu={() => setMenuOpen(true)} />
    <header className="card-game-header card-game-header-polished"><div className="card-game-brand-lockup"><GameBrandIcon game="ludo" className="card-game-letter-token" /><div><p>Halieus Game Room</p><h1>Ludo</h1></div></div><div className="card-game-meta"><span>Room <strong>{state.code}</strong></span><span className="ludo-mode-chip">{state.matchMode === "ranked" ? "🏆 Ranked" : "Casual"}</span><span>{state.players.length} players</span><RoomTimeMeta createdAt={state.createdAt} startedAt={state.startedAt} started={state.started} /><span className={connectionStatus === "Connected" ? "is-online" : ""}>{connectionStatus}</span></div></header>
    {!state.started || state.phase === "lobby" ? <section className="card-game-lobby ludo-lobby">
      <section className="card-game-lobby-card glass-card"><p className="modal-eyebrow">{state.matchMode === "ranked" ? "Ranked" : "Casual"} · Halieus Classic preset</p><h2>Ludo waiting room</h2><p className="card-game-intro-copy">A classic 2–4 player race. House-rule-sensitive behaviour is explicit instead of hidden.</p><div className="rules-contract"><strong>Active rules</strong><span>{rulesSummary}</span><small>Four pieces each · safe starts/stars · blockades currently off in this first preset.</small></div><InviteLobbyBar accent={LUDO_ACCENT} onOpen={() => setInviteOpen(true)} title="Bring friends straight to this Ludo room"/><RecoveryKeyPanel recoveryKey={recoveryKey}/>{isHost && <div className="card-game-host-actions"><label className="ai-inline-control card-game-ai-control"><span>AI difficulty<small>Applies to new AI seats</small></span><select value={aiDifficulty} onChange={(event) => setAiDifficulty(event.target.value as LudoAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><button type="button" className="button-outline" onClick={() => onAddAi(aiDifficulty)}>＋ Add AI player</button><button type="button" className="button-primary" disabled={state.players.length < 2} onClick={onStart}>Start Ludo</button></div>}</section>
      <section className="card-game-roster glass-card"><header><div><p className="modal-eyebrow">Room</p><h2>Players</h2></div><span>{state.players.length}/4</span></header><div className="card-game-player-list">{state.players.map((player) => <article key={player.id} className="card-game-player-row"><span className="card-game-avatar ludo-avatar" style={{ background: COLOUR_HEX[player.colour] }}>{player.name.slice(0,2).toUpperCase()}</span><div><strong>{player.name}</strong><small>{player.isHost ? "Host" : player.isAi ? `AI · ${player.aiDifficulty ?? "normal"}` : player.isConnected ? "Connected" : "Recoverable"}</small></div><b>{player.colour}</b>{isHost && player.isAi && <button type="button" className="icon-button compact-icon" onClick={() => onRemoveAi(player.id)}>×</button>}</article>)}</div></section>
    </section> : state.phase === "finished" ? <GameResultsScreen accent={LUDO_ACCENT} gameTitle="Ludo" roomCode={state.code} headline={state.winnerPlayerId ? `${state.players.find((player) => player.id === state.winnerPlayerId)?.name ?? "Winner"} wins Ludo` : "Ludo finished"} subtitle={`${state.turnNumber} turns · ${state.matchMode === "ranked" ? "Ranked" : "Casual"} · Halieus Classic`} rows={ludoResults.rows} stats={ludoResults.stats} awards={ludoResults.awards} graph={ludoResults.graph} finalEventTitle="Final piece home" finalEventSteps={[`${ludoResults.rows[0]?.name ?? "Winner"} completes the race.`, `${state.turnNumber} turns are complete.`, "Race order, movement history and awards are locked."]} onDownloadReport={() => downloadLudoGameReport(state)} onBackToGameRoom={onLeave} onPlayAgain={isHost ? onStart : undefined} /> : <section className="ludo-live-shell">
      <section className="ludo-table-wrap"><div className="ludo-table-glow"/><LudoBoard state={state} viewer={viewer} onMove={onMove}/><div className="ludo-turn-console"><div><p className="modal-eyebrow">{ordering ? `Roll for order · round ${state.orderRound}` : `Turn ${state.turnNumber}`}</p><strong>{current ? (ordering ? `${current.name} rolls for order` : `${current.name}'s turn`) : state.status}</strong><small>{state.status}</small></div><div className="ludo-dice-panel"><div key={`${state.turnNumber}-${state.lastRoll ?? 0}`} className={`ludo-die ${state.lastRoll ? "has-roll" : ""}`}><span>{state.lastRoll ?? "?"}</span></div>{viewer && !state.isSpectator && <button type="button" className="button-primary" disabled={!state.canRoll || autopilotActive} onClick={onRoll}>{ordering ? "Roll for order" : "Roll dice"}</button>}</div>{viewer && !state.isSpectator && <AutopilotControl compact active={autopilotActive} disabled={state.phase !== "playing" && state.phase !== "ordering"} onChange={onAutopilotChange}/>}</div></section>
      <aside className="ludo-side-stack"><section className="card-game-control-panel glass-card ludo-status-panel"><div className="card-game-control-heading"><div><p className="modal-eyebrow">Halieus Classic</p><h2>Race status</h2></div><span>{state.phase}</span></div><div className="ludo-progress-list">{state.players.map((player) => <article key={player.id} className={player.id === state.currentTurnPlayerId ? "is-turn" : ""}><i style={{ background: COLOUR_HEX[player.colour] }}/><div><strong>{player.name}</strong><small>{ordering ? (player.orderRoll == null ? "Waiting to roll" : `Order roll: ${player.orderRoll}`) : `${player.finishedCount}/4 home · ${player.isAi ? `AI ${player.aiDifficulty}` : player.autopilotEnabled ? "Autopilot" : "Player"}`}</small></div></article>)}</div>{message && <p className="status-toast">{message}</p>}</section>{roomActivity}</aside>
    </section>}
    {inviteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setInviteOpen(false)}><section className="card-game-invite-modal"><button type="button" className="icon-button invite-modal-close" onClick={() => setInviteOpen(false)}>×</button><InviteLobbyPanel roomCode={state.code} darkMode={darkMode} gameTitle="Ludo" invitePathPrefix="/ludo" accent={LUDO_ACCENT} theme={theme}/></section></div>}
    {menuOpen && <ModalPortal onClose={() => setMenuOpen(false)}><div className="modal-backdrop game-menu-top-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}><section className="game-menu-modal card-game-menu-modal"><div className="modal-handle"/><header className="modal-heading-row"><div><p className="modal-eyebrow">Ludo · Room {state.code}</p><h2>Game menu</h2></div><button type="button" className="icon-button" onClick={() => setMenuOpen(false)}>×</button></header><button type="button" className="menu-action menu-action-primary" onClick={() => setMenuOpen(false)}><span>▶</span><span><strong>Resume game</strong><small>Return to the board</small></span></button><DisplaySettingsPanel darkMode={darkMode} soundEnabled={soundEnabled} onToggleDarkMode={onToggleDarkMode} onToggleSound={onToggleSound} onToggleFullscreen={onToggleFullscreen}/><button type="button" className="menu-action" onClick={() => downloadLudoGameReport(state)}><span>📄</span><span><strong>Download Game Report</strong><small>Export rolls, moves, captures and AI evidence</small></span></button><RecoveryKeyPanel recoveryKey={recoveryKey}/><button type="button" className="menu-action" onClick={onLeave}><span>←</span><span><strong>Back to Game Room</strong><small>Keep your seat recoverable</small></span></button>{viewer && !state.isSpectator && <button type="button" className="menu-action menu-action-danger" onClick={() => { setMenuOpen(false); setConfirmAction("forfeit"); }}><span>⚑</span><span><strong>Forfeit seat</strong><small>Leave this game permanently</small></span></button>}{isHost && <button type="button" className="menu-action menu-action-danger" onClick={() => { setMenuOpen(false); setConfirmAction("end"); }}><span>■</span><span><strong>End Ludo game</strong><small>Finalise and archive this session</small></span></button>}</section></div></ModalPortal>}
    <ConfirmDialog open={confirmAction !== null} title={confirmAction === "end" ? "End Ludo game?" : "Forfeit your Ludo seat?"} message={confirmAction === "end" ? "This will finalise the Ludo room for everyone and archive the session." : "Your seat will close permanently and the game will continue without you."} confirmLabel={confirmAction === "end" ? "End game" : "Forfeit"} destructive onCancel={() => setConfirmAction(null)} onConfirm={() => { const action=confirmAction; setConfirmAction(null); if(action === "end") onEndGame(); else if(action === "forfeit") onForfeit(); }} />
  </main>;
}
