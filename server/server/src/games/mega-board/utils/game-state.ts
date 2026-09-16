import type { Server } from "socket.io";
import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";
import { OPTIONAL_ACTION_DURATION_MS } from "../../../../../shared/games/mega-board/game-rules.js";
import { rooms } from "../state/rooms.js";
import { queueRoomSave } from "./persistence.js";
import { syncSpeedDieRetirement } from "./speed-die-lifecycle.js";
import { pushGlobalNotice, recordActivity } from "./activity.js";
import { syncBlockingTurnPhase } from "./turn-engine.js";
import { finalizeRankedMatch } from "./rankings.js";

const optionalActionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function syncOptionalActionTimer(
  io: Server,
  code: string,
  gameState: GameState,
): void {
  const existing = optionalActionTimers.get(code);
  if (existing) {
    clearTimeout(existing);
    optionalActionTimers.delete(code);
  }

  if (gameState.turnPhase !== "optional-actions" || gameState.pendingTrade) {
    gameState.optionalActionDeadline = null;
    return;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const automatedOptionalAction = Boolean(
    currentPlayer &&
    !currentPlayer.isBankrupt &&
    (currentPlayer.isAi || currentPlayer.autopilotEnabled),
  );
  const optionalActionDuration = automatedOptionalAction
    ? Math.min(OPTIONAL_ACTION_DURATION_MS, 12000)
    : OPTIONAL_ACTION_DURATION_MS;

  if (!gameState.optionalActionDeadline || gameState.optionalActionDeadline <= Date.now()) {
    gameState.optionalActionDeadline = Date.now() + optionalActionDuration;
  } else if (automatedOptionalAction) {
    gameState.optionalActionDeadline = Math.min(
      gameState.optionalActionDeadline,
      Date.now() + optionalActionDuration,
    );
  }

  const deadline = gameState.optionalActionDeadline;
  const timer = setTimeout(() => {
    const room = rooms.get(code);
    const current = room?.gameState;

    if (
      !current ||
      current.turnPhase !== "optional-actions" ||
      current.pendingTrade ||
      current.optionalActionDeadline !== deadline
    ) {
      return;
    }

    if (Date.now() < deadline) {
      return;
    }

    current.optionalActionDeadline = null;
    advanceTurn(current);
    emitGameState(io, code, current);
  }, Math.max(0, deadline - Date.now()) + 25);

  optionalActionTimers.set(code, timer);
}

export function emitGameState(
  io: Server,
  code: string,
  gameState: GameState,
): void {
  const speedDieWasRetired = Boolean(gameState.speedDieRetired);
  syncSpeedDieRetirement(gameState);
  if (!speedDieWasRetired && gameState.speedDieRetired) {
    recordActivity(
      gameState,
      "Speed Die retired because every ownable asset is now owned.",
      "mega",
      undefined,
      { announce: false },
    );
    pushGlobalNotice(gameState, {
      kind: "speed-die",
      title: "🎲 Speed Die Retired",
      message: "Every ownable asset is now owned. Normal rolls use the two white dice only.",
      presentation: "major",
      durationMs: 3400,
    });
  }

  // Lifecycle changes such as Speed Die retirement are presentation/state
  // updates, never blockers. Re-derive the actionable phase before every
  // broadcast so a completed card/purchase cannot leave clients parked on a
  // stale "Resolving Card" (or similar) phase.
  syncBlockingTurnPhase(gameState);

  if (gameState.phase === "finished" && gameState.ranked) {
    finalizeRankedMatch(gameState);
  }

  const room = rooms.get(code);
  if (room) {
    room.updatedAt = Date.now();
  }

  syncOptionalActionTimer(io, code, gameState);
  queueRoomSave();

  io.to(code).emit("game:state", {
    state: gameState,
  });
}

export function advanceTurn(gameState: GameState): void {
  const playerCount = gameState.players.length;

  if (playerCount === 0) {
    return;
  }

  let nextIndex = gameState.currentPlayerIndex;

  for (
    let attempts = 0;
    attempts < playerCount;
    attempts += 1
  ) {
    nextIndex = (nextIndex + 1) % playerCount;

    if (!gameState.players[nextIndex]?.isBankrupt) {
      break;
    }
  }

  const wrapped =
    nextIndex <= gameState.currentPlayerIndex;

  gameState.currentPlayerIndex = nextIndex;

  if (wrapped) {
    gameState.turnNumber += 1;
  }

  gameState.consecutiveDoubles = 0;
  gameState.awaitingReroll = false;
  gameState.movedThisTurn = false;
  gameState.pendingSpeedDieAction = null;
  gameState.optionalActionDeadline = null;
  const nextPlayer =
    gameState.players[nextIndex];

  gameState.turnPhase =
    nextPlayer?.inJail
      ? "jail-decision"
      : "roll";
}

export function resolvePurchaseDecision(
  gameState: GameState,
): void {
  const shouldRollAgain =
    gameState.awaitingReroll;

  gameState.pendingPurchase = null;
  gameState.movedThisTurn = false;
  gameState.awaitingReroll = false;

  if (gameState.pendingSpeedDieAction) {
    gameState.awaitingReroll = false;
    gameState.turnPhase =
      "speed-die-choice";
    return;
  }

  gameState.turnPhase =
    shouldRollAgain
      ? "roll"
      : "optional-actions";
}
