import type { PokerCard, PokerPublicState } from "../types";
import { APP_VERSION } from "../../../version";

const RULE = "=".repeat(72);
const SUBRULE = "-".repeat(72);

function formatCard(card: PokerCard): string {
  const rank = card.rank === 14 ? "A" : card.rank === 13 ? "K" : card.rank === 12 ? "Q" : card.rank === 11 ? "J" : String(card.rank);
  const suit = card.suit === "S" ? "♠" : card.suit === "H" ? "♥" : card.suit === "D" ? "♦" : "♣";
  return `${rank}${suit}`;
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function buildPokerGameReport(state: PokerPublicState): string {
  const now = Date.now();
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const host = state.players.find((player) => player.isHost);
  const board = state.hand.board.length ? state.hand.board.map(formatCard).join(" ") : "No community cards yet";

  const lines = [
    RULE,
    "HALIEUS GAME ROOM — POKER MATCH REPORT",
    RULE,
    `App version: ${APP_VERSION}`,
    `Exported: ${formatDateTime(now)}`,
    `Room: ${state.code}`,
    `Match: ${state.matchMode === "ranked" ? "Ranked" : "Casual"}`,
    `Variant: ${state.variant === "texas-holdem" ? "Texas Hold’em" : state.variant}`,
    `Table status: ${state.started ? state.hand.phase : "waiting room"}`,
    `Created: ${formatDateTime(state.createdAt)}`,
    `Game started: ${state.startedAt ? formatDateTime(state.startedAt) : "Not started"}`,
    `Duration: ${state.startedAt ? formatDuration(now - state.startedAt) : "0s"}`,
    `Starting stack: ${state.startingChips.toLocaleString()}`,
    `Blinds: ${state.smallBlind}/${state.bigBlind}`,
    `AI difficulty: ${state.aiDifficulty}`,
    `Spectators: ${state.spectatorCount}`,
    `Host: ${host?.name ?? "Unknown"}`,
    `Viewer: ${viewer?.name ?? (state.isSpectator ? "Spectator" : "Unknown")}`,
    "",
    SUBRULE,
    `HAND ${state.hand.handNumber}`,
    SUBRULE,
    `Phase: ${state.hand.phase}`,
    `Status: ${state.hand.status}`,
    `Board: ${board}`,
    `Pot: ${state.hand.pot.toLocaleString()}`,
    `Current bet: ${state.hand.currentBet.toLocaleString()}`,
    `Minimum raise: ${state.hand.minimumRaise.toLocaleString()}`,
    `Dealer: ${state.players.find((player) => player.id === state.hand.dealerPlayerId)?.name ?? "None"}`,
    `Small blind: ${state.players.find((player) => player.id === state.hand.smallBlindPlayerId)?.name ?? "None"}`,
    `Big blind: ${state.players.find((player) => player.id === state.hand.bigBlindPlayerId)?.name ?? "None"}`,
    `Current turn: ${state.players.find((player) => player.id === state.hand.currentTurnPlayerId)?.name ?? "None"}`,
    "",
    SUBRULE,
    "PLAYERS",
    SUBRULE,
    ...state.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .map((player) => {
        const role = player.isAi ? `AI` : player.autopilotEnabled ? `Human · Autopilot ${player.autopilotMode === "full" ? "Full Auto" : "Semi Auto"}` : "Human";
        const stateLabel = player.eliminated ? "eliminated" : player.folded ? "folded" : player.allIn ? "all-in" : "active";
        const connection = player.isAi ? "AI seat" : player.isConnected ? "connected" : "disconnected/recoverable";
        const visibleCards = player.holeCards?.length ? ` · visible cards ${player.holeCards.map(formatCard).join(" ")}` : "";
        return `Seat ${player.seat + 1}: ${player.name}${player.isHost ? " · HOST" : ""} · ${role} · ${player.chips.toLocaleString()} chips · ${stateLabel} · ${connection} · committed ${player.totalCommitted.toLocaleString()}${visibleCards}`;
      }),
    "",
    SUBRULE,
    "CURRENT HAND WINNERS",
    SUBRULE,
    ...(state.hand.winners.length
      ? state.hand.winners.map((winner) => `${winner.name} · +${winner.amount.toLocaleString()} · ${winner.handName}${winner.cards.length ? ` · ${winner.cards.map(formatCard).join(" ")}` : ""}`)
      : ["No winner recorded for the current hand yet."]),
    "",
    SUBRULE,
    "POKER ACTION LOG",
    SUBRULE,
    ...(state.actionLog.length
      ? state.actionLog.map((entry) => `${formatDateTime(entry.at)} · H${entry.handNumber} · ${entry.playerName ?? "Table"} · ${entry.action}${entry.amount != null ? ` · ${entry.amount.toLocaleString()} chips` : ""}${entry.chipsAfter != null ? ` · ${entry.chipsAfter.toLocaleString()} remaining` : ""} · ${entry.detail}`)
      : ["No Poker actions were recorded for this match."]),
    "",
    SUBRULE,
    "DIAGNOSTIC NOTES",
    SUBRULE,
    "This report contains only the Poker state already visible to this client.",
    "Recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded.",
    "Poker rating/leaderboard calculations remain separate from Mega Board scoring.",
    RULE,
  ];

  return lines.join("\n");
}

export function downloadPokerGameReport(state: PokerPublicState): void {
  const report = buildPokerGameReport(state);
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `halieus-poker-${state.code.toLowerCase()}-hand-${state.hand.handNumber}-${Date.now()}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
