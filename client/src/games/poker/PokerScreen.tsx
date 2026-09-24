import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PokerAutopilotMode, PokerCard, PokerPublicState } from "./types";
import { GameChrome } from "../../platform/components/GameChrome";
import { ConfirmDialog } from "../../platform/components/ConfirmDialog";
import { GameBrandIcon } from "../../platform/components/GameBrandIcon";
import { GAME_BY_ID } from "../../platform/games/catalog";
import { GameResultsScreen } from "../../platform/components/GameResultsScreen";
import { DisplaySettingsPanel } from "../../platform/components/DisplaySettingsPanel";
import { InviteLobbyPanel } from "../../platform/components/InviteLobbyPanel";
import { InviteLobbyBar } from "../../platform/components/InviteLobbyBar";
import { FeedbackForm } from "../../platform/components/FeedbackForm";
import { RecoveryKeyPanel } from "../../platform/components/RecoveryKeyPanel";
import { RoomTimeMeta } from "../../platform/components/RoomTimeMeta";
import { downloadPokerGameReport } from "./utils/gameReport";

const POKER_ACCENT = GAME_BY_ID["poker"].accent;

interface PokerScreenProps {
  state: PokerPublicState;
  connectionStatus: string;
  message: string;
  darkMode: boolean;
  theme: {
    pageBackground: string;
    cardBackground: string;
    secondaryBackground: string;
    inputBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  soundEnabled: boolean;
  recoveryKey: string | null;
  isUpdatingAutopilot: boolean;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onAutopilotChange: (mode: PokerAutopilotMode) => void;
  onStart: () => void;
  onAiDifficultyChange: (difficulty: "easy" | "normal" | "hard") => void;
  onAddAi: () => void;
  onRemoveAi: (playerId: string) => void;
  onAction: (action: "fold" | "check" | "call" | "raise" | "all-in", amount?: number) => void;
  onNextHand: () => void;
  onForfeit: () => void;
  onEndTable: () => void;
  onLeave: () => void;
  onOpenLeaderboard: () => void;
  roomActivity?: ReactNode;
}

type AutoMode = "off" | "check" | "check-fold" | "call";
type PokerMenuView = "menu" | "feedback";
// AutopilotControl compatibility: Poker now renders explicit Semi/Full Auto controls for the same-seat delegation contract.

// Card labels stay local to Poker so shared Halieus UI never needs to understand card-game rules.
function rankLabel(rank: number): string {
  if (rank === 14) return "A";
  if (rank === 13) return "K";
  if (rank === 12) return "Q";
  if (rank === 11) return "J";
  return String(rank);
}

function suitLabel(suit: PokerCard["suit"]): string {
  return suit === "S" ? "♠" : suit === "H" ? "♥" : suit === "D" ? "♦" : "♣";
}


// Pot layers are derived from each player's committed chips so the table can
// label main/side pots without exposing any hidden card information.
function derivePotLayers(players: PokerPublicState["players"]): Array<{ label: string; amount: number }> {
  const levels = Array.from(
    new Set(players.map((player) => player.totalCommitted).filter((amount) => amount > 0)),
  ).sort((a, b) => a - b);

  const layers: Array<{ label: string; amount: number }> = [];
  let previousLevel = 0;

  for (const level of levels) {
    const contributors = players.filter((player) => player.totalCommitted >= level);
    const amount = (level - previousLevel) * contributors.length;
    if (amount > 0) {
      layers.push({
        label: layers.length === 0 ? "Main pot" : `Side pot ${layers.length}`,
        amount,
      });
    }
    previousLevel = level;
  }

  return layers;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

// A face card receives a flip/deal animation when it replaces the hidden-card state.
function Card({ card, hidden = false, motionDelayMs = 0 }: { card?: PokerCard; hidden?: boolean; motionDelayMs?: number }) {
  if (hidden || !card) {
    return <span className="poker-card poker-card-back" style={{ animationDelay: `${motionDelayMs}ms` }} aria-label="Hidden card">P</span>;
  }
  const red = card.suit === "H" || card.suit === "D";
  return (
    <span className={`poker-card poker-card-face ${red ? "is-red" : ""}`} style={{ animationDelay: `${motionDelayMs}ms` }} aria-label={`${rankLabel(card.rank)} ${suitLabel(card.suit)}`}>
      <strong>{rankLabel(card.rank)}</strong>
      <em>{suitLabel(card.suit)}</em>
    </span>
  );
}

export function PokerScreen({
  state,
  connectionStatus,
  message,
  darkMode,
  theme,
  soundEnabled,
  recoveryKey,
  isUpdatingAutopilot,
  onToggleDarkMode,
  onToggleSound,
  onToggleFullscreen,
  onAutopilotChange,
  onStart,
  onAiDifficultyChange,
  onAddAi,
  onRemoveAi,
  onAction,
  onNextHand,
  onForfeit,
  onEndTable,
  onLeave,
  onOpenLeaderboard,
  roomActivity,
}: PokerScreenProps) {
  // Local interaction state controls betting convenience and one-shot auto actions.
  const [raiseTo, setRaiseTo] = useState(state.legalActions?.minimumRaiseTo ?? state.bigBlind);
  const [autoMode, setAutoMode] = useState<AutoMode>("off");
  const [autoCallMax, setAutoCallMax] = useState(Math.max(state.bigBlind, state.legalActions?.callAmount ?? 0));
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"forfeit" | "end" | null>(null);
  const [menuView, setMenuView] = useState<PokerMenuView>("menu");
  const [inviteOpen, setInviteOpen] = useState(false);
  const autoActionSignatureRef = useRef("");

  // Player-derived presentation values are recalculated from each authoritative server state.
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const host = state.players.find((player) => player.isHost);
  const isHost = Boolean(viewer?.isHost);
  const autopilotMode: PokerAutopilotMode = viewer && !viewer.isAi ? (viewer.autopilotMode ?? (viewer.autopilotEnabled ? "semi" : "off")) : "off";
  const autopilotActive = autopilotMode !== "off";
  const currentTurn = state.players.find((player) => player.id === state.hand.currentTurnPlayerId);
  const activePlayers = state.players.filter((player) => !player.eliminated);
  const canDealNext = isHost && ["showdown", "finished"].includes(state.hand.phase);
  const tableFinished = state.hand.phase === "finished" && activePlayers.length < 2;
  const pokerResults = useMemo(() => {
    const sorted = state.players.slice().sort((a, b) => b.chips - a.chips || a.seat - b.seat);
    const actionCounts = new Map<string, number>();
    const raises = new Map<string, number>();
    const allIns = new Map<string, number>();
    const folds = new Map<string, number>();
    const currentStacks = new Map(state.players.map((player) => [player.id, state.startingChips]));
    const graphValues = new Map(state.players.map((player) => [player.id, [state.startingChips]]));
    const add = (map: Map<string, number>, playerId: string | null, value = 1) => { if (playerId) map.set(playerId, (map.get(playerId) ?? 0) + value); };

    for (const entry of state.actionLog) {
      if (entry.playerId) {
        add(actionCounts, entry.playerId);
        if (entry.action === "raise") add(raises, entry.playerId);
        if (entry.action === "all-in") add(allIns, entry.playerId);
        if (entry.action === "fold") add(folds, entry.playerId);
        if (entry.chipsAfter != null) currentStacks.set(entry.playerId, entry.chipsAfter);
      }
      for (const player of state.players) graphValues.get(player.id)?.push(currentStacks.get(player.id) ?? state.startingChips);
    }
    for (const player of state.players) graphValues.get(player.id)?.push(player.chips);

    const award = (title: string, map: Map<string, number>, unit: string, icon: string) => {
      const best = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!best || best[1] <= 0) return null;
      const player = state.players.find((item) => item.id === best[0]);
      return player ? { title, winner: player.name, detail: `${best[1]} ${unit}`, icon } : null;
    };
    const chipLeader = sorted[0];
    const finalWinner = state.hand.winners[0];
    const awards = [
      chipLeader ? { title: "Chip Leader", winner: chipLeader.name, detail: `${chipLeader.chips.toLocaleString()} chips`, icon: "♛" } : null,
      award("Most Aggressive", raises, "raises", "🔥"),
      award("All-In Artist", allIns, "all-ins", "🎯"),
      award("Table Regular", actionCounts, "recorded actions", "🃏"),
      finalWinner && finalWinner.name !== chipLeader?.name ? { title: "Final Hand", winner: finalWinner.name, detail: `${finalWinner.amount.toLocaleString()} chips · ${finalWinner.handName}`, icon: "🏅" } : null,
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      rows: sorted.map((player, index) => ({
        id: player.id,
        rank: index + 1,
        name: player.name,
        detail: `${player.chips.toLocaleString()} chips${player.eliminated ? " · eliminated" : ""}`,
        status: index === 0 ? "Table winner" : player.eliminated ? "Eliminated" : "Finished",
        winner: index === 0,
        accent: POKER_ACCENT,
        metrics: [
          { label: "Final chips", value: player.chips.toLocaleString() },
          { label: "Net result", value: `${player.chips - state.startingChips >= 0 ? "+" : "−"}${Math.abs(player.chips - state.startingChips).toLocaleString()}`, tone: player.chips - state.startingChips >= 0 ? "positive" as const : "negative" as const },
          { label: "Actions", value: String(actionCounts.get(player.id) ?? 0) },
          { label: "Raises", value: String(raises.get(player.id) ?? 0) },
          { label: "All-ins", value: String(allIns.get(player.id) ?? 0) },
          { label: "Folds", value: String(folds.get(player.id) ?? 0) },
        ],
        actions: state.actionLog.filter((entry) => entry.playerId === player.id).map((entry) => ({ at: entry.at, label: entry.action === "hand" ? `Hand ${entry.handNumber}` : entry.action.replace("-", " ").replace(/^./, (letter) => letter.toUpperCase()), detail: entry.detail })),
      })),
      stats: [
        { label: "Hands", value: String(state.hand.handNumber) },
        { label: "Starting stack", value: state.startingChips.toLocaleString() },
        { label: "Blinds", value: `${state.smallBlind}/${state.bigBlind}` },
        { label: "Players", value: String(state.players.length) },
        { label: "Recorded actions", value: String(state.actionLog.length) },
        { label: "Match mode", value: state.matchMode === "ranked" ? "Ranked" : "Casual" },
      ],
      awards,
      graph: {
        title: "Chip stacks through the match",
        subtitle: "Stacks are sampled from recorded table actions and locked to the authoritative final totals.",
        xLabels: ["Start", ...state.actionLog.map((entry) => `H${Math.max(1, entry.handNumber)}`), "Final"],
        series: state.players.map((player) => ({ id: player.id, name: player.name, values: graphValues.get(player.id) ?? [state.startingChips, player.chips] })),
      },
    };
  }, [state.actionLog, state.hand.handNumber, state.hand.winners, state.matchMode, state.players, state.startingChips, state.smallBlind, state.bigBlind]);
  const potLayers = useMemo(() => derivePotLayers(state.players), [state.players]);

  // Reset raise inputs to legal server boundaries whenever the betting state changes.
  useEffect(() => {
    if (!state.legalActions) return;
    setRaiseTo(state.legalActions.minimumRaiseTo);
    setAutoCallMax((current) => Math.max(current, state.legalActions?.callAmount ?? 0));
    autoActionSignatureRef.current = "";
  }, [
    state.hand.currentBet,
    state.hand.currentTurnPlayerId,
    state.hand.phase,
    state.legalActions?.minimumRaiseTo,
    state.legalActions?.maximumRaiseTo,
    state.legalActions?.callAmount,
  ]);

  // Auto actions execute once when the viewer's turn becomes actionable; they never bypass legal server validation.
  useEffect(() => {
    const legal = state.legalActions;
    if (!legal || autoMode === "off" || state.isSpectator || !viewer || state.hand.currentTurnPlayerId !== viewer.id) return;

    const signature = `${state.hand.handNumber}:${state.hand.phase}:${state.hand.currentBet}:${viewer.currentBet}:${legal.callAmount}:${autoMode}`;
    if (autoActionSignatureRef.current === signature) return;

    let action: "check" | "fold" | "call" | null = null;
    if (autoMode === "check" && legal.canCheck) action = "check";
    if (autoMode === "check-fold") action = legal.canCheck ? "check" : legal.canFold ? "fold" : null;
    if (autoMode === "call") {
      if (legal.canCheck) action = "check";
      else if (legal.canCall && legal.callAmount <= autoCallMax) action = "call";
    }

    if (!action) return;
    autoActionSignatureRef.current = signature;
    setAutoMode("off");
    onAction(action);
  }, [autoCallMax, autoMode, onAction, state.hand.currentBet, state.hand.currentTurnPlayerId, state.hand.handNumber, state.hand.phase, state.isSpectator, state.legalActions, viewer]);

  // Keep the local player's seat visually anchored at the near-centre rail.
  // Physical server seat numbers remain authoritative; only presentation is rotated.
  const seats = useMemo(() => {
    const map = new Map<number, typeof state.players[number]>();
    const anchorSeat = !state.isSpectator && viewer ? viewer.seat : 0;
    for (const player of state.players) {
      const visualSeat = state.isSpectator ? player.seat : (player.seat - anchorSeat + 8) % 8;
      map.set(visualSeat, player);
    }
    return Array.from({ length: 8 }, (_, seat) => map.get(seat) ?? null);
  }, [state.isSpectator, state.players, viewer]);

  function setRaiseWithinBounds(next: number): void {
    if (!state.legalActions) return;
    const clamped = Math.max(state.legalActions.minimumRaiseTo, Math.min(state.legalActions.maximumRaiseTo, Math.floor(next)));
    setRaiseTo(clamped);
  }

  function setPotFraction(fraction: number): void {
    if (!state.legalActions) return;
    const target = state.hand.currentBet + Math.max(state.bigBlind, Math.floor(Math.max(state.hand.pot, state.bigBlind) * fraction));
    setRaiseWithinBounds(target);
  }

  return (
    <main
      className="poker-page page-enter"
      style={{
        background: theme.pageBackground,
        color: theme.text,
        ["--game-accent" as string]: POKER_ACCENT,
      }}
    >
      <GameChrome
        className="poker-game-chrome"
        accent={POKER_ACCENT}
        onBackToGameRoom={onLeave}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {/* Poker mirrors Mega Board's report/feedback tools inside the shared game menu. */}
      {menuOpen && (
        <div className="modal-backdrop game-menu-top-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setMenuOpen(false); setMenuView("menu"); } }}>
          <section className="game-menu-modal poker-game-menu" role="dialog" aria-modal="true" aria-labelledby="poker-game-menu-title">
            <div className="modal-handle" />
            {menuView === "menu" ? (
              <>
                <header className="modal-heading-row">
                  <div>
                    <p className="modal-eyebrow">Poker · Room {state.code}</p>
                    <h2 id="poker-game-menu-title">Game menu</h2>
                  </div>
                  <button type="button" className="icon-button" aria-label="Close Poker menu" onClick={() => { setMenuOpen(false); setMenuView("menu"); }}>×</button>
                </header>
                <button type="button" className="menu-action menu-action-primary" onClick={() => setMenuOpen(false)}>
                  <span>▶</span><span><strong>Resume game</strong><small>Return to the table</small></span>
                </button>
                <DisplaySettingsPanel
                  darkMode={darkMode}
                  soundEnabled={soundEnabled}
                  onToggleDarkMode={onToggleDarkMode}
                  onToggleSound={onToggleSound}
                  onToggleFullscreen={onToggleFullscreen}
                />
                <button type="button" className="menu-action poker-menu-report" onClick={() => downloadPokerGameReport(state)}>
                  <span>📄</span><span><strong>Download Game Report</strong><small>Export a privacy-safe Poker table and hand diagnostic report</small></span>
                </button>
                <button type="button" className="menu-action menu-action-feedback poker-menu-feedback" onClick={() => setMenuView("feedback")}>
                  <span>💬</span><span><strong>Send feedback</strong><small>Report a Poker bug, layout issue or suggestion</small></span>
                </button>
                <RecoveryKeyPanel recoveryKey={recoveryKey} />
                <button type="button" className="menu-action poker-menu-back" onClick={() => { setMenuOpen(false); setMenuView("menu"); onLeave(); }}>
                  <span>←</span><span><strong>Back to Game Room</strong><small>Keep this seat recoverable</small></span>
                </button>
                {viewer && !state.isSpectator && (
                  <button type="button" className="menu-action menu-action-danger poker-menu-forfeit" onClick={() => { setMenuOpen(false); setConfirmAction("forfeit"); }}>
                    <span>⚑</span><span><strong>Forfeit seat</strong><small>Leave this Poker table permanently</small></span>
                  </button>
                )}
                {isHost && (
                  <button type="button" className="menu-action menu-action-danger poker-menu-end" onClick={() => { setMenuOpen(false); setConfirmAction("end"); }}>
                    <span>■</span><span><strong>End Poker table</strong><small>Finalise and archive the table for everyone</small></span>
                  </button>
                )}
              </>
            ) : (
              <FeedbackForm
                gameName="Poker"
                gameId="poker"
                roomCode={state.code}
                playerName={viewer?.name ?? (state.isSpectator ? "Spectator" : "Unknown player")}
                onBack={() => setMenuView("menu")}
              />
            )}
          </section>
        </div>
      )}

      {inviteOpen && !state.started && (
        <div className="modal-backdrop poker-invite-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
          <section className="poker-invite-modal" role="dialog" aria-modal="true" aria-label="Invite players to Poker">
            <button type="button" className="icon-button poker-invite-close" aria-label="Close invite panel" onClick={() => setInviteOpen(false)}>×</button>
            <InviteLobbyPanel
              roomCode={state.code}
              darkMode={darkMode}
              gameTitle="Poker"
              invitePathPrefix="/poker"
              accent={POKER_ACCENT}
              eyebrow="Poker invite"
              title="Invite players"
              description="Share this table directly. Friends opening the link land in Poker with this room code already selected."
              theme={theme}
            />
          </section>
        </div>
      )}

      {/* Shared game-room header keeps only the table identity and essential match metadata. */}
      <header className="poker-header">
        <div className="poker-brand-lockup">
          <GameBrandIcon game="poker" className="poker-logo-token" />
          <div>
            <p>Halieus Game Room</p>
            <h1>Poker</h1>
          </div>
        </div>
        <div className="poker-room-meta">
          <span>Room <strong>{state.code}</strong></span>
          <span className={state.matchMode === "ranked" ? "poker-ranked-meta" : ""}>{state.matchMode === "ranked" ? "🏆 Ranked" : "Casual"}</span>
          <span>Texas Hold’em</span>
          <span>{state.smallBlind}/{state.bigBlind} blinds</span>
          <span>{state.players.length}/8 players</span>
          <RoomTimeMeta createdAt={state.createdAt} startedAt={state.startedAt} started={state.started} />
          <span className={connectionStatus === "Connected" ? "is-online" : ""}><i aria-hidden="true" />{connectionStatus}</span>
        </div>
      </header>

      {!state.started ? (
        <section className="poker-lobby-shell">
          {/* Waiting-room summary uses the same conceptual order Halieus will reuse for future games. */}
          <article className="poker-lobby-card glass-card" style={{ background: theme.cardBackground, borderColor: theme.border }}>
            <div>
              <p className="poker-eyebrow">Private table</p>
              <h2>{state.variant === "texas-holdem" ? "Texas Hold’em" : "Poker"}</h2>
              <p className="poker-lobby-copy">
                Virtual chips only. Invite friends with room code <strong>{state.code}</strong> or fill empty seats with randomised AI players.
              </p>
            </div>
            <dl className="poker-settings-summary">
              <div><dt>Match</dt><dd>{state.matchMode === "ranked" ? "🏆 Ranked" : "Casual"}</dd></div>
              <div><dt>Variant</dt><dd>Texas Hold’em</dd></div>
              <div><dt>Starting stack</dt><dd>{state.startingChips.toLocaleString()}</dd></div>
              <div><dt>Blinds</dt><dd>{state.smallBlind}/{state.bigBlind}</dd></div>
              <div><dt>Host</dt><dd>{host?.name ?? "—"}</dd></div>
              <div><dt>Spectators</dt><dd>{state.spectatorCount}</dd></div>
            </dl>

            <section className="poker-variant-roadmap" aria-label="Poker variants">
              <div className="poker-variant-roadmap-heading"><span>Poker variants</span><small>Hold’em stays stable while the shared table engine is prepared for additional formats.</small></div>
              <div className="poker-variant-roadmap-grid">
                <span className="is-live"><strong>Texas Hold’em</strong><small>Live</small></span>
                <span><strong>Omaha</strong><small>Next variant</small></span>
                <span><strong>Five-Card Draw</strong><small>Planned</small></span>
                <span><strong>Seven-Card Stud</strong><small>Planned</small></span>
              </div>
            </section>

            <InviteLobbyBar
              accent={POKER_ACCENT}
              title="Bring friends straight to this table"
              onOpen={() => setInviteOpen(true)}
            />
            <RecoveryKeyPanel recoveryKey={recoveryKey} />

            {state.matchMode === "ranked" && (
              <div className="poker-ranked-lobby-tools">
                <div>
                  <span>Ranked Poker</span>
                  <strong>Leaderboard</strong>
                  <small>Poker standings stay separate from Mega Board rankings.</small>
                </div>
                <button type="button" className="button-outline" onClick={onOpenLeaderboard}>🏆 View leaderboard</button>
              </div>
            )}

            {isHost && (
              <div className="poker-lobby-actions poker-lobby-actions-v2">
                <label className="poker-global-ai-control">
                  <span>AI difficulty <small>Applies to all AI players</small></span>
                  <select
                    value={state.aiDifficulty}
                    onChange={(event) => onAiDifficultyChange(event.target.value as "easy" | "normal" | "hard")}
                    aria-label="AI difficulty for all Poker AI players"
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <button type="button" className="button-outline" disabled={state.players.length >= 8} onClick={onAddAi}>＋ Add AI player</button>
                <button type="button" className="button-primary" disabled={state.players.length < 2} onClick={onStart}>Deal first hand</button>
              </div>
            )}
          </article>

          {/* Player roster keeps seat state, host state, connectivity and AI difficulty immediately readable. */}
          <section className="poker-player-list" aria-label="Poker players">
            {state.players.map((player) => (
              <article key={player.id} className="poker-player-list-card">
                <span className="poker-avatar">{player.isAi ? player.name.slice(0, 1).toUpperCase() : player.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{player.name}</strong>
                  <small>{player.isHost ? "Host" : player.isAi ? "AI player" : player.isConnected ? "Connected" : "Disconnected · recoverable"}</small>
                </div>
                <b>{player.chips.toLocaleString()} chips</b>
                {isHost && player.isAi && (
                  <button type="button" className="poker-remove-ai" onClick={() => onRemoveAi(player.id)} aria-label={`Remove ${player.name}`}>×</button>
                )}
              </article>
            ))}
          </section>
          {message && <p className="status-toast poker-status-toast">{message}</p>}
        </section>
      ) : tableFinished ? (
        <GameResultsScreen accent={POKER_ACCENT} gameTitle="Poker" roomCode={state.code} headline={`${pokerResults.rows[0]?.name ?? "Table"} finishes on top`} subtitle={`${state.hand.handNumber} hands · ${state.matchMode === "ranked" ? "Ranked" : "Casual"} · Texas Hold’em`} rows={pokerResults.rows} stats={pokerResults.stats} awards={pokerResults.awards} graph={pokerResults.graph} finalEventTitle="Final table result" finalEventSteps={[`${pokerResults.rows[0]?.name ?? "Winner"} takes the table.`, `${state.hand.handNumber} hands are complete.`, "Final chip stacks and awards are locked."]} onDownloadReport={() => downloadPokerGameReport(state)} onBackToGameRoom={onLeave} onPlayAgain={isHost ? onNextHand : undefined} playAgainLabel="Start another table" />
      ) : (
        <section className="poker-game-shell">
          {/* The table is deliberately game-specific while the surrounding metadata/control system remains Halieus-wide. */}
          <div className="poker-table-wrap">
            <div className="poker-table">
              <div className="poker-ambient-light poker-ambient-light-one" aria-hidden="true" />
              <div className="poker-ambient-light poker-ambient-light-two" aria-hidden="true" />
              <div className="poker-table-center">
                <p className="poker-hand-label">Hand {state.hand.handNumber} · {state.hand.phase}</p>
                <div className="poker-board-cards">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Card key={`${index}-${state.hand.board[index]?.rank ?? "x"}-${state.hand.board[index]?.suit ?? "x"}`} card={state.hand.board[index]} hidden={!state.hand.board[index]} motionDelayMs={index < 3 ? index * 120 : 120} />
                  ))}
                </div>
                <strong key={state.hand.pot} className="poker-pot poker-pot-motion">Pot {state.hand.pot.toLocaleString()}</strong>
                {/* Side-pot labels stay visible whenever unequal all-ins create more than one payout layer. */}
                {potLayers.length > 1 && (
                  <div className="poker-pot-layers" aria-label="Poker pot breakdown">
                    {potLayers.map((layer) => (
                      <span key={`${layer.label}-${layer.amount}`}><b>{layer.label}</b>{layer.amount.toLocaleString()}</span>
                    ))}
                  </div>
                )}
                <span className="poker-hand-status">{state.hand.status}</span>
              </div>

              {seats.map((player, seat) => player ? (
                <article
                  key={player.id}
                  className={`poker-seat poker-seat-${seat} ${state.hand.currentTurnPlayerId === player.id ? "is-turn" : ""} ${player.folded ? "is-folded" : ""} ${player.eliminated ? "is-out" : ""} ${!player.isConnected && !player.isAi ? "is-disconnected" : ""}`}
                >
                  <div className="poker-seat-head">
                    <span className="poker-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{player.name}</strong><small>{player.chips.toLocaleString()} chips</small></div>
                  </div>
                  <div className="poker-seat-badges">
                    {state.hand.dealerPlayerId === player.id && <i key={`d-${state.hand.handNumber}-${player.id}`} className="poker-position-marker is-dealer">D</i>}
                    {state.hand.smallBlindPlayerId === player.id && <i key={`sb-${state.hand.handNumber}-${player.id}`} className="poker-position-marker poker-blind-chip is-small-blind"><span>SB</span></i>}
                    {state.hand.bigBlindPlayerId === player.id && <i key={`bb-${state.hand.handNumber}-${player.id}`} className="poker-position-marker poker-blind-chip is-big-blind"><span>BB</span></i>}
                    {player.allIn && <i>ALL IN</i>}
                    {player.autopilotEnabled && !player.isAi && <i>AUTO</i>}
                    {!player.isConnected && !player.isAi && <i>REJOIN</i>}
                  </div>
                  <div className="poker-seat-cards">
                    <Card key={`seat-${player.id}-0-${player.holeCards?.[0]?.rank ?? "hidden"}-${player.holeCards?.[0]?.suit ?? "hidden"}`} card={player.holeCards?.[0]} hidden={!player.holeCards} motionDelayMs={40} />
                    <Card key={`seat-${player.id}-1-${player.holeCards?.[1]?.rank ?? "hidden"}-${player.holeCards?.[1]?.suit ?? "hidden"}`} card={player.holeCards?.[1]} hidden={!player.holeCards} motionDelayMs={150} />
                  </div>
                  {player.currentBet > 0 && <b key={player.currentBet} className="poker-bet-chip poker-bet-chip-motion">{player.currentBet}</b>}
                </article>
              ) : null)}
            </div>
          </div>

          <aside className="poker-control-panel glass-card" style={{ background: theme.cardBackground, borderColor: theme.border }}>
            <div className="poker-control-heading">
              <div>
                <p className="poker-eyebrow">Your hand</p>
                <h2>{state.isSpectator ? "Spectating" : viewer?.name ?? "Poker"}</h2>
              </div>
              {currentTurn && (
                <span className={`poker-turn-pill ${!currentTurn.isConnected && !currentTurn.isAi ? "is-waiting" : ""}`}>
                  {!currentTurn.isConnected && !currentTurn.isAi ? `${currentTurn.name} reconnecting` : `${currentTurn.name}'s turn`}
                </span>
              )}
            </div>

            {!state.isSpectator && viewer && (
              <div className="poker-private-hand">
                <Card key={`viewer-0-${viewer.holeCards?.[0]?.rank ?? "hidden"}-${viewer.holeCards?.[0]?.suit ?? "hidden"}`} card={viewer.holeCards?.[0]} hidden={!viewer.holeCards} motionDelayMs={40} />
                <Card key={`viewer-1-${viewer.holeCards?.[1]?.rank ?? "hidden"}-${viewer.holeCards?.[1]?.suit ?? "hidden"}`} card={viewer.holeCards?.[1]} hidden={!viewer.holeCards} motionDelayMs={150} />
                <div><small>Stack</small><strong>{viewer.chips.toLocaleString()}</strong></div>
              </div>
            )}

            {/* Poker exposes the two automation levels explicitly instead of hiding Full Auto behind one toggle. */}
            {!state.isSpectator && viewer && !viewer.isAi && !viewer.eliminated && (
              <section className="poker-autopilot-panel" aria-label="Poker Autopilot modes">
                <div className="poker-autopilot-heading">
                  <div><span>🤖</span><span><strong>Autopilot</strong><small>{autopilotMode === "full" ? "Full Auto continues across hands" : autopilotMode === "semi" ? "Semi Auto stops after this hand" : "Let Poker AI temporarily play your seat"}</small></span></div>
                  {autopilotActive && <button type="button" disabled={isUpdatingAutopilot} onClick={() => onAutopilotChange("off")}>Take Control</button>}
                </div>
                {!autopilotActive && (
                  <div className="poker-autopilot-mode-grid">
                    <button type="button" disabled={isUpdatingAutopilot} onClick={() => onAutopilotChange("semi")}><strong>Semi Auto</strong><small>Play this hand, then stop</small></button>
                    <button type="button" disabled={isUpdatingAutopilot} onClick={() => onAutopilotChange("full")}><strong>Full Auto</strong><small>Continue across hands until Take Control</small></button>
                  </div>
                )}
              </section>
            )}

            {state.hand.winners.length > 0 && (
              <div className="poker-winner-panel">
                {state.hand.winners.map((winner) => (
                  <p key={winner.playerId}><strong>{winner.name}</strong> +{winner.amount.toLocaleString()} · {winner.handName}</p>
                ))}
              </div>
            )}

            {/* Manual betting is grouped by decision first, amount second, then commit action to reduce visual noise. */}
            {state.legalActions && (
              <div className="poker-actions">
                <div className="poker-action-row">
                  <button type="button" className="poker-action danger" disabled={!state.legalActions.canFold} onClick={() => onAction("fold")}>Fold</button>
                  <button type="button" className="poker-action" disabled={!state.legalActions.canCheck} onClick={() => onAction("check")}>Check</button>
                  <button type="button" className="poker-action" disabled={!state.legalActions.canCall} onClick={() => onAction("call")}>Call {state.legalActions.callAmount || ""}</button>
                </div>

                <section className="poker-bet-editor" aria-label="Raise amount">
                  <div className="poker-bet-editor-heading">
                    <span>Raise to</span>
                    <strong>{raiseTo.toLocaleString()}</strong>
                  </div>
                  <div className="poker-raise-step-row" aria-label="Quick raise adjustment">
                    <button type="button" onClick={() => setRaiseWithinBounds(raiseTo - 10)}>−10</button>
                    <button type="button" onClick={() => setRaiseWithinBounds(raiseTo - 5)}>−5</button>
                    <input
                      aria-label="Raise amount"
                      type="number"
                      value={raiseTo}
                      min={state.legalActions.minimumRaiseTo}
                      max={state.legalActions.maximumRaiseTo}
                      step={1}
                      onChange={(event) => setRaiseWithinBounds(Number(event.target.value))}
                    />
                    <button type="button" onClick={() => setRaiseWithinBounds(raiseTo + 5)}>+5</button>
                    <button type="button" onClick={() => setRaiseWithinBounds(raiseTo + 10)}>+10</button>
                  </div>
                  <div className="poker-pot-shortcuts">
                    <button type="button" onClick={() => setPotFraction(0.5)}>½ pot</button>
                    <button type="button" onClick={() => setPotFraction(0.75)}>¾ pot</button>
                    <button type="button" onClick={() => setPotFraction(1)}>Pot</button>
                  </div>
                  <div className="poker-bet-commit-row">
                    <button type="button" className="poker-raise-submit" disabled={!state.legalActions.canRaise} onClick={() => onAction("raise", raiseTo)}>Raise to {raiseTo.toLocaleString()}</button>
                    <button type="button" className="poker-all-in" disabled={!state.legalActions.canAllIn} onClick={() => onAction("all-in")}>All-in</button>
                  </div>
                </section>
              </div>
            )}

            {autopilotActive && (
              <p className="poker-autopilot-status">{autopilotMode === "full" ? "Full Auto is playing this seat and will continue across hands." : "Semi Auto is playing this seat for the current hand."} Use Take Control above to resume manual play.</p>
            )}

            {/* Auto is a one-shot convenience layer: it waits for a legal state, acts once, then switches itself off. */}
            {!state.isSpectator && viewer && !autopilotActive && (
              <section className="poker-auto-panel" aria-label="Poker auto actions">
                <div className="poker-auto-heading">
                  <div><span>Auto</span><small>One-shot action when your turn arrives</small></div>
                  {autoMode !== "off" && <button type="button" onClick={() => setAutoMode("off")}>Cancel</button>}
                </div>
                <div className="poker-auto-grid">
                  <button type="button" className={autoMode === "check" ? "active" : ""} onClick={() => setAutoMode(autoMode === "check" ? "off" : "check")}>Auto Check</button>
                  <button type="button" className={autoMode === "check-fold" ? "active" : ""} onClick={() => setAutoMode(autoMode === "check-fold" ? "off" : "check-fold")}>Check / Fold</button>
                  <button type="button" className={autoMode === "call" ? "active" : ""} onClick={() => setAutoMode(autoMode === "call" ? "off" : "call")}>Auto Call</button>
                </div>
                <label className="poker-auto-call-cap">
                  Auto-call maximum
                  <input type="number" min={0} step={5} value={autoCallMax} onChange={(event) => setAutoCallMax(Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
                </label>
              </section>
            )}

            {canDealNext && (
              <button type="button" className="button-primary full-button" onClick={onNextHand}>
                {state.hand.phase === "finished" ? "Start another table" : "Deal next hand"}
              </button>
            )}

            <div className="poker-room-panel-slot">{roomActivity}</div>
            {message && <p className="status-toast poker-status-toast">{message}</p>}
          </aside>
        </section>
      )}
    <ConfirmDialog open={confirmAction !== null} title={confirmAction === "end" ? "End Poker table?" : "Forfeit your Poker seat?"} message={confirmAction === "end" ? "This will finalise the Poker table for everyone and archive the session." : "Your seat will close permanently and the table will continue without you."} confirmLabel={confirmAction === "end" ? "End table" : "Forfeit"} destructive onCancel={() => setConfirmAction(null)} onConfirm={() => { const action=confirmAction; setConfirmAction(null); if(action === "end") onEndTable(); else if(action === "forfeit") onForfeit(); }} />
      </main>
  );
}
