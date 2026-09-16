import type { LudoActionLogEntry, LudoPublicState } from "../../../../../shared/games/ludo/types";
import { APP_VERSION } from "../../../version";

const RULE = "=".repeat(72);
const SUBRULE = "-".repeat(72);
function formatDateTime(value: number): string { return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" }); }
function formatClock(value: number): string { return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function formatDuration(milliseconds: number): string { const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000)); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`; }
function actionLine(entry: LudoActionLogEntry): string {
  const actor = entry.playerName ?? "Table";
  const roll = entry.roll ? ` · roll ${entry.roll}` : "";
  const piece = entry.pieceId ? ` · ${entry.pieceId}` : "";
  const move = entry.fromSteps === null || entry.toSteps === null ? "" : ` · ${entry.fromSteps}→${entry.toSteps}`;
  const capture = entry.capturedPlayerIds.length ? ` · captured ${entry.capturedPlayerIds.length}` : "";
  const ai = entry.aiReason ? ` · AI reason: ${entry.aiReason}` : "";
  return `${String(entry.sequence).padStart(3, "0")} ${formatClock(entry.at)} · ${actor} · ${entry.action.toUpperCase()}${roll}${piece}${move}${capture} · ${entry.detail}${ai}`;
}
export function buildLudoGameReport(state: LudoPublicState): string {
  const now = Date.now(); const host = state.players.find((player) => player.isHost); const winner = state.players.find((player) => player.id === state.winnerPlayerId); const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  return [
    RULE, "HALIEUS GAME ROOM — LUDO GAME REPORT", RULE,
    `App version: ${APP_VERSION}`, `Exported: ${formatDateTime(now)}`, `Room: ${state.code}`, `Mode: ${state.matchMode === "ranked" ? "Ranked" : "Casual"}`, `Preset: ${state.rulesPreset}`, `Phase: ${state.phase}`, `Status: ${state.status}`, `Created: ${formatDateTime(state.createdAt)}`, `Game started: ${state.startedAt ? formatDateTime(state.startedAt) : "Not started"}`, `Duration: ${state.startedAt ? formatDuration(now - state.startedAt) : "0s"}`, `Turns: ${state.turnNumber}`, `Host: ${host?.name ?? "Unknown"}`, `Viewer: ${viewer?.name ?? (state.isSpectator ? "Spectator" : "Unknown")}`, `Winner: ${winner?.name ?? "None yet"}`, `Spectators: ${state.spectatorCount}`, "",
    SUBRULE, "ACTIVE RULES", SUBRULE,
    `Pieces per player: ${state.rules.piecesPerPlayer}`, `Roll to enter: ${state.rules.rollToEnter}`, `Extra turn on six: ${state.rules.extraTurnOnSix ? "ON" : "OFF"}`, `Extra turn on capture: ${state.rules.extraTurnOnCapture ? "ON" : "OFF"}`, `Exact roll to finish: ${state.rules.exactRollToFinish ? "ON" : "OFF"}`, `Safe start squares: ${state.rules.safeStartSquares ? "ON" : "OFF"}`, `Safe star squares: ${state.rules.safeStarSquares ? "ON" : "OFF"}`, `Blockades: ${state.rules.blockadesEnabled ? "ON" : "OFF"}`, "",
    SUBRULE, "PLAYERS", SUBRULE,
    ...state.players.slice().sort((a,b) => a.seat-b.seat).map((player) => `Seat ${player.seat + 1}: ${player.name}${player.isHost ? " · HOST" : ""} · ${player.colour} · ${player.isAi ? `AI ${player.aiDifficulty ?? "normal"}` : "Human"} · ${player.finishedCount}/4 home · ${player.result ?? "active"}`), "",
    SUBRULE, "ACTION & AI EVIDENCE", SUBRULE,
    ...(state.actionLog.length ? state.actionLog.map(actionLine) : ["No action telemetry captured for this room."]), "",
    SUBRULE, "PRIVACY", SUBRULE,
    "Recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded.", RULE,
  ].join("\n");
}
export function downloadLudoGameReport(state: LudoPublicState): void {
  const blob = new Blob([buildLudoGameReport(state)], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `halieus-ludo-${state.code.toLowerCase()}-${Date.now()}.txt`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
