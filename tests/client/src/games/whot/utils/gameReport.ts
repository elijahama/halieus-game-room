import type { WhotActionLogEntry, WhotPublicState } from "../../../../../shared/games/whot/types";
import { APP_VERSION } from "../../../version";

const RULE = "=".repeat(72);
const SUBRULE = "-".repeat(72);

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" });
}

function formatClock(value: number): string {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours ? `${hours}h ${minutes}m ${seconds}s` : minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatAction(entry: WhotActionLogEntry): string {
  const actor = entry.playerName ?? "Table";
  const card = entry.card ? ` · card ${entry.card.number} ${entry.card.shape}` : "";
  const draw = entry.action === "draw" ? ` · drew ${entry.count}` : "";
  const hand = entry.handCountBefore === null || entry.handCountAfter === null ? "" : ` · hand ${entry.handCountBefore}→${entry.handCountAfter}`;
  const requested = entry.requestedShape ? ` · called ${entry.requestedShape}` : "";
  const pending = entry.pendingDraw > 0 ? ` · pending draw ${entry.pendingDraw}` : "";
  const ai = entry.aiReason ? ` · AI reason: ${entry.aiReason}` : "";
  return `${String(entry.sequence).padStart(3, "0")} ${formatClock(entry.at)} · ${actor} · ${entry.action.toUpperCase()}${card}${draw}${hand}${requested}${pending} · ${entry.detail}${ai}`;
}

export function buildWhotGameReport(state: WhotPublicState): string {
  const now = Date.now();
  const host = state.players.find((player) => player.isHost);
  const winner = state.players.find((player) => player.id === state.winnerPlayerId);
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  return [
    RULE,
    "HALIEUS GAME ROOM — WHOT GAME REPORT",
    RULE,
    `App version: ${APP_VERSION}`,
    `Exported: ${formatDateTime(now)}`,
    `Room: ${state.code}`,
    `Match: ${state.matchMode === "ranked" ? "Ranked" : "Casual"}`,
    `Phase: ${state.phase}`,
    `Status: ${state.status}`,
    `Created: ${formatDateTime(state.createdAt)}`,
    `Game started: ${state.startedAt ? formatDateTime(state.startedAt) : "Not started"}`,
    `Duration: ${state.startedAt ? formatDuration(now - state.startedAt) : "0s"}`,
    `Round: ${state.roundNumber}`,
    `Host: ${host?.name ?? "Unknown"}`,
    `Viewer: ${viewer?.name ?? (state.isSpectator ? "Spectator" : "Unknown")}`,
    `Winner: ${winner?.name ?? "None yet"}`,
    `Spectators: ${state.spectatorCount}`,
    "",
    SUBRULE,
    "ACTIVE RULES",
    SUBRULE,
    `Starting hand: ${state.rules.startingHandSize}`,
    `Pick Two stacking: ${state.rules.stackPickTwo ? "ON" : "OFF"}`,
    `Pick Three stacking: ${state.rules.stackPickThree ? "ON" : "OFF"}`,
    `WHOT cancels penalty: ${state.rules.whotCancelsPenalty ? "ON" : "OFF"}`,
    `Star scoring: ${state.rules.starScoresDouble ? "double" : "face value"}`,
    `Last-card call penalty: ${state.rules.lastCardCallPenalty ? "ON" : "OFF"}`,
    "",
    SUBRULE,
    "TABLE STATE",
    SUBRULE,
    `Top card: ${state.topCard ? `${state.topCard.number} ${state.topCard.shape}` : "None"}`,
    `Draw pile: ${state.drawPileCount}`,
    `Pending draw: ${state.pendingDraw || 0}`,
    `Requested shape: ${state.requestedShape ?? "None"}`,
    `Current turn: ${state.players.find((player) => player.id === state.currentTurnPlayerId)?.name ?? "None"}`,
    "",
    SUBRULE,
    "PLAYERS",
    SUBRULE,
    ...state.players.slice().sort((a, b) => a.seat - b.seat).map((player) =>
      `Seat ${player.seat + 1}: ${player.name}${player.isHost ? " · HOST" : ""} · ${player.isAi ? `AI ${player.aiDifficulty ?? "normal"}` : "Human"} · ${player.isConnected || player.isAi ? "connected" : "disconnected/recoverable"} · ${player.cardCount} cards · score ${player.score} · ${player.result ?? "active"}`
    ),
    "",
    SUBRULE,
    "ACTION & AI EVIDENCE",
    SUBRULE,
    ...(state.actionLog.length ? state.actionLog.map(formatAction) : ["No action telemetry captured for this room."]),
    "",
    SUBRULE,
    "TELEMETRY NOTES",
    SUBRULE,
    "Played cards are recorded because they are public table information.",
    "Market draws record count and hand-count movement, but not hidden card identities.",
    "AI reason text describes the rule-based choice used by the current AI and does not use hidden opponent information.",
    "",
    SUBRULE,
    "PRIVACY",
    SUBRULE,
    "Recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded.",
    RULE,
  ].join("\n");
}

export function downloadWhotGameReport(state: WhotPublicState): void {
  const blob = new Blob([buildWhotGameReport(state)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `halieus-whot-${state.code.toLowerCase()}-${state.matchMode}-round-${state.roundNumber}-${Date.now()}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
