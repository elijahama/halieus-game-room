import type { GameRoom } from "../types/game.js";
import { canSaveRoom } from "./saved-games.js";

/**
 * Small safe suspend pilot: no AI, no ranked game and no opponents online at
 * pause time. The server persists the pause and exclusively owns timestamps.
 */
export function pauseMegaRoom(room: GameRoom, now = Date.now()): void {
  if (room.gameState?.pauseState) throw new Error("This match is already paused.");
  const reason = canSaveRoom(room);
  if (reason) throw new Error(reason);
  if (room.players.some(player => player.isAi) ||
      room.gameState?.players.some(player => player.isAi || player.autopilotEnabled)) {
    throw new Error("Turn automation must be disabled; pausing games with CPU/autopilot players is not supported yet.");
  }
  if (room.players.some(player => !player.isHost && !player.hasLeft && player.isConnected)) {
    throw new Error("Other players are still online. Wait until their seats disconnect before pausing.");
  }
  const state = room.gameState!;
  state.pauseState = {
    pausedAt: now,
    turn: state.turnNumber,
    turnPhase: state.turnPhase,
    remainingRollMs: state.turnPhase === "roll" && state.turnRollDeadline != null
      ? Math.max(0, state.turnRollDeadline - now) : null,
    remainingOptionalMs: state.turnPhase === "optional-actions" && state.optionalActionDeadline != null
      ? Math.max(0, state.optionalActionDeadline - now) : null,
  };
  state.turnRollDeadline = null;
  state.turnRollDeadlinePlayerId = null;
  state.optionalActionDeadline = null;
  room.updatedAt = now;
}

export function resumeMegaRoom(room: GameRoom, now = Date.now()): void {
  const state = room.gameState;
  const paused = state?.pauseState;
  if (!state || !paused) throw new Error("This match is not paused.");
  if (!room.started || state.phase !== "playing" || state.turnNumber !== paused.turn ||
      state.turnPhase !== paused.turnPhase || room.ranked || state.ranked) {
    throw new Error("The paused match changed and cannot resume safely.");
  }
  if (room.players.some(player => player.isAi || player.hasLeft) ||
      state.players.some(player => player.isAi || player.autopilotEnabled)) {
    throw new Error("The player roster changed while paused. Manual recovery is required.");
  }
  if (room.players.some(player => !player.isConnected)) {
    throw new Error("All players must reconnect before resuming.");
  }
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (state.turnPhase === "roll" && (!currentPlayer || currentPlayer.isAi || currentPlayer.isBankrupt)) {
    throw new Error("The active player changed.");
  }
  state.pauseState = null;
  if (state.turnPhase === "roll" && paused.remainingRollMs != null) {
    state.turnRollDeadline = now + paused.remainingRollMs;
    state.turnRollDeadlinePlayerId = currentPlayer.id;
  } else if (state.turnPhase === "optional-actions" && paused.remainingOptionalMs != null) {
    state.optionalActionDeadline = now + paused.remainingOptionalMs;
  }
  room.updatedAt = now;
}

/** Restrict mutating Mega Board messages while paused. Reconnect/status/leave
 * are explicitly allowed; all other room actions are rejected with an ACK. */
const PAUSE_ALLOWED = new Set([
  "game:resume-room", "game:pause-room", "game:saves-list",
  "game:reconnect", "game:join", "game:get-room", "game:get-state",
  "game:watch", "game:unwatch", "game:end-room",
]);
export function isBlockedWhilePaused(event: string): boolean {
  return event.startsWith("game:") && !PAUSE_ALLOWED.has(event);
}
