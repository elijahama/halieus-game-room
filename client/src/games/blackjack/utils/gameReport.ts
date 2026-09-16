import type { BlackjackPublicState } from "../../../../../shared/games/blackjack/types";
import { APP_VERSION } from "../../../version";

const RULE = "=".repeat(72);
const SUBRULE = "-".repeat(72);

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" });
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours ? `${hours}h ${minutes}m ${seconds}s` : minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function handValue(cards: Array<{ rank: string }>): number {
  let total = cards.reduce((sum, card) => sum + (card.rank === "A" ? 11 : ["J", "Q", "K"].includes(card.rank) ? 10 : Number(card.rank)), 0);
  let aces = cards.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

export function buildBlackjackGameReport(state: BlackjackPublicState): string {
  const now = Date.now();
  const host = state.players.find((player) => player.isHost);
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  return [
    RULE,
    "HALIEUS GAME ROOM — BLACKJACK GAME REPORT",
    RULE,
    `App version: ${APP_VERSION}`,
    `Exported: ${formatDateTime(now)}`,
    `Room: ${state.code}`,
    `Phase: ${state.phase}`,
    `Status: ${state.status}`,
    `Created: ${formatDateTime(state.createdAt)}`,
    `Game started: ${state.startedAt ? formatDateTime(state.startedAt) : "Not started"}`,
    `Duration: ${state.startedAt ? formatDuration(now - state.startedAt) : "0s"}`,
    `Round: ${state.roundNumber}`,
    `Host: ${host?.name ?? "Unknown"}`,
    `Viewer: ${viewer?.name ?? (state.isSpectator ? "Spectator" : "Unknown")}`,
    `Spectators: ${state.spectatorCount}`,
    "",
    SUBRULE,
    "TABLE RULES",
    SUBRULE,
    `Starting chips: ${state.startingChips.toLocaleString()}`,
    `Minimum bet: ${state.minimumBet.toLocaleString()}`,
    `Decks: ${state.rules.deckCount}`,
    `Dealer: ${state.rules.dealerHitsSoft17 ? "hits soft 17" : "stands soft 17"}`,
    `Blackjack payout: ${state.rules.blackjackPayout === 1.5 ? "3:2" : "6:5"}`,
    `Double any first two cards: ${state.rules.doubleAnyTwo ? "YES" : "NO"}`,
    `Dealer peek: ${state.rules.dealerPeeksForBlackjack ? "YES" : "NO"}`,
    "",
    SUBRULE,
    "DEALER",
    SUBRULE,
    `Visible hand value: ${handValue(state.dealerHand) || 0}${state.dealerHoleHidden ? "+ (hole card hidden)" : ""}`,
    `Visible cards: ${state.dealerHand.map((card) => `${card.rank} ${card.suit}`).join(", ") || "None"}`,
    "",
    SUBRULE,
    "PLAYERS",
    SUBRULE,
    ...state.players.slice().sort((a, b) => a.seat - b.seat).map((player) =>
      `Seat ${player.seat + 1}: ${player.name}${player.isHost ? " · HOST" : ""} · ${player.isAi ? `AI ${player.aiDifficulty ?? "normal"}` : "Human"} · ${player.isConnected || player.isAi ? "connected" : "disconnected/recoverable"} · ${player.chips.toLocaleString()} chips · bet ${player.bet.toLocaleString()} · hand ${player.hand.length ? handValue(player.hand) : "—"} · ${player.result ?? (player.busted ? "busted" : player.stood ? "stood" : "active")}`
    ),
    "",
    SUBRULE,
    "PRIVACY",
    SUBRULE,
    "Recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded.",
    RULE,
  ].join("\n");
}

export function downloadBlackjackGameReport(state: BlackjackPublicState): void {
  const blob = new Blob([buildBlackjackGameReport(state)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `halieus-blackjack-${state.code.toLowerCase()}-round-${state.roundNumber}-${Date.now()}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
