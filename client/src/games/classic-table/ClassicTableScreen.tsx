import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ClassicAiDifficulty, ClassicPublicState, DominoTile } from "../../../../shared/games/classic-table/types";
import { GameChrome } from "../../platform/components/GameChrome";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { RecoveryKeyPanel } from "../../platform/components/RecoveryKeyPanel";
import { InviteLobbyBar } from "../../platform/components/InviteLobbyBar";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { GAME_BY_ID } from "../../platform/games/catalog";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";

interface ThemeLike { pageBackground: string; cardBackground: string; secondaryBackground: string; inputBackground: string; text: string; mutedText: string; border: string; }
interface Props {
  state: ClassicPublicState;
  connectionStatus: string;
  message: string;
  darkMode: boolean;
  theme: ThemeLike;
  soundEnabled: boolean;
  recoveryKey: string | null;
  onToggleFullscreen: () => void;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onStart: () => void;
  onAddAi: (difficulty: ClassicAiDifficulty) => void;
  onRemoveAi: (playerId: string) => void;
  onCheatPlay: (cardIds: string[]) => void;
  onCheatAccept: () => void;
  onCheatCall: () => void;
  onDominoPlay: (tileId: string, side: "left" | "right") => void;
  onDominoDraw: () => void;
  onDominoPass: () => void;
  onEndGame: () => void;
  onForfeit: () => void;
  onLeave: () => void;
  roomActivity?: ReactNode;
}

function Domino({ tile, selected, playable, onClick }: { tile: DominoTile; selected?: boolean; playable?: boolean; onClick?: () => void }) {
  return <button type="button" className={`classic-domino ${selected ? "is-selected" : ""} ${playable ? "is-playable" : ""}`} onClick={onClick} disabled={!onClick} aria-label={`Domino ${tile.a}-${tile.b}`}><span>{tile.a}</span><i/><span>{tile.b}</span></button>;
}

export function ClassicTableScreen(props: Props) {
  const { state, connectionStatus, message, darkMode, theme, soundEnabled, recoveryKey, onToggleFullscreen, onToggleDarkMode, onToggleSound, onStart, onAddAi, onRemoveAi, onCheatPlay, onCheatAccept, onCheatCall, onDominoPlay, onDominoDraw, onDominoPass, onEndGame, onForfeit, onLeave, roomActivity } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"forfeit" | "end" | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<ClassicAiDifficulty>("normal");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  useEffect(() => { setSelectedCards([]); setSelectedTile(null); setConfirmAction(null); }, [state.matchId]);
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const isHost = Boolean(viewer?.isHost);
  const isTurn = Boolean(viewer && state.currentTurnPlayerId === viewer.id);
  const accent = GAME_BY_ID[state.game].accent;
  const active = state.players.find((player) => player.id === state.currentTurnPlayerId);
  const sortedPlayers = useMemo(() => state.players.slice().sort((a,b) => a.seat-b.seat), [state.players]);

  const toggleCard = (id: string) => setSelectedCards((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length >= 4 ? current : [...current, id]);
  const selectedDomino = state.game === "dominoes" ? state.viewerTiles.find((tile) => tile.id === selectedTile) ?? null : null;
  const canSelectedLeft = state.game === "dominoes" && selectedDomino ? state.leftEnd == null || selectedDomino.a === state.leftEnd || selectedDomino.b === state.leftEnd : false;
  const canSelectedRight = state.game === "dominoes" && selectedDomino ? state.rightEnd == null || selectedDomino.a === state.rightEnd || selectedDomino.b === state.rightEnd : false;
  const resultRows = sortedPlayers.map((player, index) => ({
    id: player.id,
    rank: player.id === state.winnerPlayerId ? 1 : index + 2,
    name: player.name,
    detail: state.game === "cheat" ? `${player.cardCount ?? 0} cards remaining` : `${player.tileCount ?? 0} tiles remaining`,
    winner: player.id === state.winnerPlayerId,
    status: player.result ?? (player.isAi ? "AI" : "Player"),
  })).sort((a,b) => Number(b.winner) - Number(a.winner) || a.rank - b.rank).map((row,index)=>({ ...row, rank:index+1 }));

  return <main className={`classic-table-page classic-${state.game}-page page-enter`} style={{ background: theme.pageBackground, color: theme.text, ["--game-accent" as string]: accent, ["--classic-surface" as string]: theme.cardBackground, ["--classic-secondary" as string]: theme.secondaryBackground, ["--classic-input" as string]: theme.inputBackground, ["--classic-border" as string]: theme.border, ["--classic-muted" as string]: theme.mutedText }}>
    <GameChrome accent={accent} onBackToGameRoom={onLeave} onOpenMenu={() => setMenuOpen(true)} />
    <header className="classic-table-header"><div className="classic-brand"><GameBrandIcon game={state.game} className="card-game-letter-token"/><div><p>Halieus Game Room</p><h1>{state.gameTitle}</h1></div></div><div className="classic-meta"><span><small>Room</small><strong>{state.code}</strong></span><span><small>Mode</small><strong>{state.matchMode === "ranked" ? "🏆 Ranked" : "Casual"}</strong></span><span><small>Players</small><strong>{state.players.length}</strong></span><span className={connectionStatus === "Connected" ? "is-online" : ""}><small>Status</small><strong>{connectionStatus}</strong></span></div></header>

    {state.phase === "lobby" ? <section className="classic-lobby-layout">
      <article className="classic-lobby-main"><p className="modal-eyebrow">{state.game === "cheat" ? "BLUFFING CARD GAME" : "DOUBLE-SIX DOMINOES"}</p><h2>{state.game === "cheat" ? "Tell the truth. Or sell the lie." : "Match the ends and empty your hand."}</h2><p>{state.game === "cheat" ? "Every turn has a required rank. Put cards face down, make the claim, and hope the next player does not call Cheat." : "Play a matching tile on either open end. If you are blocked, draw from the boneyard until you can move."}</p><div className="classic-rule-strip"><span><b>{state.game === "cheat" ? "2–6" : "2–4"}</b> players</span><span><b>AI</b> supported</span><span><b>{state.matchMode === "ranked" ? "Ranked" : "Casual"}</b> room</span></div><InviteLobbyBar accent={accent} onOpen={() => setInviteOpen(true)} title={`Invite players to this ${state.gameTitle} room`}/><RecoveryKeyPanel recoveryKey={recoveryKey}/>{isHost && <div className="classic-host-actions"><label>AI difficulty<select value={aiDifficulty} onChange={(event) => setAiDifficulty(event.target.value as ClassicAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><button type="button" className="button-outline" onClick={() => onAddAi(aiDifficulty)} disabled={state.players.length >= (state.game === "cheat" ? 6 : 4)}>＋ Add AI</button><button type="button" className="button-primary" onClick={onStart} disabled={state.players.length < 2}>Start {state.gameTitle}</button></div>}</article>
      <aside className="classic-roster"><header><div><p className="modal-eyebrow">ROOM</p><h2>Players</h2></div><b>{state.players.length}/{state.game === "cheat" ? 6 : 4}</b></header>{sortedPlayers.map((player) => <article key={player.id}><span>{player.name.slice(0,2).toUpperCase()}</span><div><strong>{player.name}</strong><small>{player.isHost ? "Host" : player.isAi ? `${player.aiDifficulty ?? "normal"} AI` : player.isConnected ? "Player" : "Recoverable"}</small></div>{isHost && player.isAi && <button type="button" onClick={() => onRemoveAi(player.id)}>×</button>}</article>)}</aside>
    </section> : state.outcome?.kind === "cancelled" ? <section className="classic-lobby-main"><h2>Room closed</h2><p>{state.status}</p><button type="button" className="button-primary" onClick={onLeave}>Back to Game Room</button></section> : state.phase === "finished" ? <GameResultsScreen accent={accent} gameTitle={state.gameTitle} roomCode={state.code} headline={state.winnerPlayerId ? `${state.players.find((player) => player.id === state.winnerPlayerId)?.name ?? "Winner"} wins ${state.gameTitle}` : `${state.gameTitle} finished`} subtitle={state.status} rows={resultRows} stats={[{ label: "Players", value: String(state.players.length) }, { label: state.game === "cheat" ? "Pile" : "Chain", value: state.game === "cheat" ? String(state.pileCount) : String(state.chain.length) }, { label: "Mode", value: state.matchMode }]} onDownloadReport={() => { const text=[`HALIEUS ${state.gameTitle.toUpperCase()} · ${state.code}`,state.status,...resultRows.map((row)=>`${row.rank}. ${row.name} · ${row.detail}`)].join("\n"); const url=URL.createObjectURL(new Blob([text],{type:"text/plain"})); const a=document.createElement("a"); a.href=url; a.download=`${state.game}-${state.code}-report.txt`; a.click(); URL.revokeObjectURL(url); }} onBackToGameRoom={onLeave} onPlayAgain={isHost ? onStart : undefined} playAgainLabel={`Play ${state.gameTitle} again`} /> : <section className="classic-live-layout">
      <aside className="classic-player-rail"><header><p>TABLE</p><h2>Players</h2></header>{sortedPlayers.map((player) => <article key={player.id} className={`${player.id === state.currentTurnPlayerId ? "is-turn" : ""} ${player.id === state.viewerPlayerId ? "is-you" : ""}`}><span>{player.name.slice(0,2).toUpperCase()}</span><div><strong>{player.name}</strong><small>{state.game === "cheat" ? `${player.cardCount ?? 0} cards` : `${player.tileCount ?? 0} tiles`}</small></div>{player.result && <b>{player.result}</b>}</article>)}</aside>

      <section className="classic-table-surface">
        <div className="classic-turn-banner"><small>{active ? `${active.name.toUpperCase()}'S TURN` : "TABLE"}</small><strong>{state.status}</strong></div>
        {state.game === "cheat" ? <>
          <div className="cheat-table-center"><div className="cheat-pile"><span>♠</span><span>♥</span><span>♦</span><span>♣</span><b>{state.pileCount}</b><small>cards in pile</small></div><div className="cheat-required"><small>REQUIRED CLAIM</small><strong>{state.requiredRank}</strong></div>{state.pendingClaim && <div className="cheat-claim"><small>LAST CLAIM</small><strong>{state.pendingClaim.playerName}</strong><span>{state.pendingClaim.count} × {state.pendingClaim.claimedRank}</span></div>}</div>
          {!state.isSpectator && state.phase === "playing" && <div className="cheat-action-panel">{state.pendingClaim && isTurn ? <div className="cheat-challenge-actions"><button type="button" className="button-danger" onClick={onCheatCall}>Call Cheat</button><button type="button" className="button-outline" onClick={onCheatAccept}>Accept claim</button></div> : <><div className="cheat-hand">{state.viewerHand.map((card) => <button type="button" key={card.id} className={`cheat-card ${selectedCards.includes(card.id) ? "is-selected" : ""} ${card.suit === "♥" || card.suit === "♦" ? "is-red" : ""}`} onClick={() => toggleCard(card.id)}><b>{card.rank}</b><span>{card.suit}</span></button>)}</div><button type="button" className="button-primary" disabled={!state.canPlay || !selectedCards.length} onClick={() => { onCheatPlay(selectedCards); setSelectedCards([]); }}>Play {selectedCards.length || ""} as {state.requiredRank}{selectedCards.length === 1 ? "" : "s"}</button></>}</div>}
        </> : <>
          <div className="domino-board"><div className="domino-end"><small>LEFT</small><strong>{state.leftEnd ?? "—"}</strong></div><div className="domino-chain">{state.chain.length ? state.chain.map((tile) => <Domino key={tile.id} tile={tile}/>) : <span className="domino-empty">Waiting for the opening tile</span>}</div><div className="domino-end"><small>RIGHT</small><strong>{state.rightEnd ?? "—"}</strong></div></div>
          {!state.isSpectator && state.phase === "playing" && <div className="domino-action-panel"><div className="domino-hand">{state.viewerTiles.map((tile) => <Domino key={tile.id} tile={tile} selected={selectedTile === tile.id} playable={state.playableTileIds.includes(tile.id)} onClick={() => setSelectedTile((current) => current === tile.id ? null : tile.id)}/>)}</div><div className="domino-controls"><button type="button" className="button-outline" disabled={!isTurn || !selectedDomino || !canSelectedLeft} onClick={() => selectedDomino && onDominoPlay(selectedDomino.id, "left")}>Play left</button><button type="button" className="button-primary" disabled={!isTurn || !selectedDomino || !canSelectedRight} onClick={() => selectedDomino && onDominoPlay(selectedDomino.id, "right")}>Play right</button><button type="button" className="button-outline" disabled={!state.canDraw} onClick={onDominoDraw}>Draw ({state.boneyardCount})</button><button type="button" className="button-muted" disabled={!state.canPass} onClick={onDominoPass}>Pass</button></div></div>}
        </>}
        {message && <p className="status-toast">{message}</p>}
      </section>

      <aside className="classic-social-rail"><div className="classic-log"><header><p>GAME LOG</p><h2>Latest actions</h2></header>{state.actionLog.slice(-8).reverse().map((entry) => <span key={entry.sequence}>{entry.detail}</span>)}</div>{roomActivity}</aside>
    </section>}

    {inviteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setInviteOpen(false)}><section className="card-game-invite-modal"><button type="button" className="icon-button invite-modal-close" onClick={() => setInviteOpen(false)}>×</button><InviteLobbyPanel roomCode={state.code} darkMode={darkMode} gameTitle={state.gameTitle} invitePathPrefix={`/${state.game}`} accent={accent} theme={theme}/></section></div>}
    {menuOpen && <div className="modal-backdrop game-menu-top-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}><section className="game-menu-modal"><div className="modal-handle"/><header className="modal-heading-row"><div><p className="modal-eyebrow">{state.gameTitle} · Room {state.code}</p><h2>Game menu</h2></div><button type="button" className="icon-button" onClick={() => setMenuOpen(false)}>×</button></header><button type="button" className="menu-action menu-action-primary" onClick={() => setMenuOpen(false)}><span>▶</span><span><strong>Resume game</strong><small>Return to the table</small></span></button><DisplaySettingsPanel darkMode={darkMode} soundEnabled={soundEnabled} onToggleDarkMode={onToggleDarkMode} onToggleSound={onToggleSound} onToggleFullscreen={onToggleFullscreen}/><RecoveryKeyPanel recoveryKey={recoveryKey}/><button type="button" className="menu-action" onClick={onLeave}><span>←</span><span><strong>Back to Game Room</strong><small>Keep the seat recoverable</small></span></button>{viewer && !state.isSpectator && state.phase === "playing" && <button type="button" className="menu-action menu-action-danger" onClick={() => { setMenuOpen(false); setConfirmAction("forfeit"); }}><span>⚑</span><span><strong>Forfeit</strong><small>Leave this match permanently</small></span></button>}{isHost && <button type="button" className="menu-action menu-action-danger" onClick={() => { setMenuOpen(false); setConfirmAction("end"); }}><span>■</span><span><strong>End {state.gameTitle}</strong><small>Close this room without awarding a winner</small></span></button>}</section></div>}
    <ConfirmDialog open={confirmAction !== null} title={confirmAction === "end" ? `End ${state.gameTitle}?` : `Forfeit ${state.gameTitle}?`} message={confirmAction === "end" ? "This will close the room for every player. No winner or completed-match result will be awarded." : "Your seat will close permanently and the match will continue if possible."} confirmLabel={confirmAction === "end" ? "End game" : "Forfeit"} destructive onCancel={() => setConfirmAction(null)} onConfirm={() => { const action = confirmAction; setConfirmAction(null); if (action === "end") onEndGame(); else if (action === "forfeit") onForfeit(); }}/>
  </main>;
}
