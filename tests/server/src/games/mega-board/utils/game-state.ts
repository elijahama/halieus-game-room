import type { Server } from "socket.io";
import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";
import { OPTIONAL_ACTION_DURATION_MS, TURN_ROLL_AUTOPILOT_DURATION_MS } from "../../../../../shared/games/mega-board/game-rules.js";
import { rooms } from "../state/rooms.js";
import { queueRoomSave } from "./persistence.js";
import { syncSpeedDieRetirement } from "./speed-die-lifecycle.js";
import { pushGlobalNotice, recordActivity } from "./activity.js";
import { syncBlockingTurnPhase } from "./turn-engine.js";
import { finalizeRankedMatch } from "./rankings.js";
import { getMatchAwards } from "../../../../../shared/games/mega-board/ranked.js";
import { finalizeSession, recordWorkingSession } from "../../../platform/sessionArchive.js";

const optionalActionTimers = new Map<
  string,
  { deadline: number; timer: ReturnType<typeof setTimeout> }
>();
const globalFinishNoticeKeys = new Map<string, string>();

export function syncTurnRollDeadline(gameState: GameState): boolean {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const shouldCountDown = Boolean(
    gameState.phase === "playing" &&
    gameState.turnPhase === "roll" &&
    currentPlayer &&
    !currentPlayer.isAi &&
    !currentPlayer.isBankrupt &&
    !currentPlayer.autopilotEnabled,
  );

  if (!shouldCountDown || !currentPlayer) {
    const changed = gameState.turnRollDeadline !== null || gameState.turnRollDeadlinePlayerId !== null;
    gameState.turnRollDeadline = null;
    gameState.turnRollDeadlinePlayerId = null;
    return changed;
  }

  if (
    !gameState.turnRollDeadline ||
    gameState.turnRollDeadlinePlayerId !== currentPlayer.id
  ) {
    gameState.turnRollDeadline = Date.now() + TURN_ROLL_AUTOPILOT_DURATION_MS;
    gameState.turnRollDeadlinePlayerId = currentPlayer.id;
    return true;
  }

  return false;
}

function clearOptionalActionTimer(code: string): void {
  const existing = optionalActionTimers.get(code);
  if (!existing) return;
  clearTimeout(existing.timer);
  optionalActionTimers.delete(code);
}

function expireOptionalActionTurn(
  io: Server,
  code: string,
  deadline: number,
): void {
  const room = rooms.get(code);
  const current = room?.gameState;

  if (
    !current ||
    current.turnPhase !== "optional-actions" ||
    current.optionalActionDeadline !== deadline
  ) {
    return;
  }

  // If the runtime fired a little early, keep the same authoritative deadline.
  // Never create a fresh 2:30 window for an already-started turn.
  const remaining = deadline - Date.now();
  if (remaining > 0) {
    const timer = setTimeout(
      () => expireOptionalActionTurn(io, code, deadline),
      remaining + 25,
    );
    optionalActionTimers.set(code, { deadline, timer });
    return;
  }

  // A trade is part of the current player's turn, not a pause state.
  // When the turn expires, terminate the unresolved proposal first.
  if (current.pendingTrade) {
    const trade = current.pendingTrade;
    const proposer = current.players.find((player) => player.id === trade.proposerId);
    const message = `${proposer?.name ?? "The current player"}'s trade offer expired when the turn timer ran out.`;
    trade.status = "cancelled";
    current.lastTradeResult = {
      id: trade.id,
      proposerId: trade.proposerId,
      recipientId: trade.recipientId,
      participantIds: trade.participantIds ? [...trade.participantIds] : undefined,
      status: "cancelled",
      message,
      resolvedAt: Date.now(),
    };
    current.pendingTrade = null;
    recordActivity(current, message, "trade", trade.proposerId);
    pushGlobalNotice(current, {
      kind: "trade-complete",
      title: "🤝 Trade offer expired",
      message,
      playerId: trade.proposerId,
      presentation: "standard",
      durationMs: 2400,
    });
  }

  current.optionalActionDeadline = null;
  clearOptionalActionTimer(code);
  advanceTurn(current);
  emitGameState(io, code, current);
}

export function syncOptionalActionTimer(
  io: Server,
  code: string,
  gameState: GameState,
): void {
  if (gameState.turnPhase !== "optional-actions") {
    clearOptionalActionTimer(code);
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

  // Create the deadline once when optional actions begin. Critically, an
  // expired deadline is NOT replaced with a new 2:30 window: expiry must win.
  if (!gameState.optionalActionDeadline) {
    gameState.optionalActionDeadline = Date.now() + optionalActionDuration;
  } else if (automatedOptionalAction) {
    gameState.optionalActionDeadline = Math.min(
      gameState.optionalActionDeadline,
      Date.now() + optionalActionDuration,
    );
  }

  const deadline = gameState.optionalActionDeadline;
  const existing = optionalActionTimers.get(code);

  // Repeated state broadcasts (including trade updates) must not continually
  // tear down/restart the same timer. Keep one scheduler for one deadline.
  if (existing?.deadline === deadline) {
    return;
  }

  clearOptionalActionTimer(code);
  const timer = setTimeout(
    () => expireOptionalActionTurn(io, code, deadline),
    Math.max(0, deadline - Date.now()) + 25,
  );
  optionalActionTimers.set(code, { deadline, timer });
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
    recordWorkingSession("mega-board", room.code, room.createdAt, {
      room: { ...room, players: room.players.map(({ reconnectToken: _token, ...player }) => player) },
      gameState,
    });
    if (gameState.phase === "finished") {
      const surviving = gameState.players.filter((player) => !player.isBankrupt);
      const winner = surviving.length === 1 ? surviving[0]?.name ?? null : null;
      void finalizeSession("mega-board", room.code, room.createdAt, "completed", { room, gameState }, {
        winner,
        players: gameState.players.length,
        ranked: room.ranked,
        blitz: room.blitz,
        durationMs: gameState.gameStartedAt ? Date.now() - gameState.gameStartedAt : Date.now() - room.createdAt,
      });
      const key = `${winner ?? "none"}|${gameState.turnNumber}`;
      if (globalFinishNoticeKeys.get(code) !== key) {
        globalFinishNoticeKeys.set(code, key);
        const finalRows = gameState.players
          .map((player) => {
            const stats = gameState.playerStats?.[player.id];
            const finalCash = player.isBankrupt && stats?.finalCash != null ? stats.finalCash : player.cash;
            const finalProperties = player.isBankrupt && stats?.finalProperties != null ? stats.finalProperties : player.properties.length;
            return {
              player,
              finishPosition: player.id === gameState.winnerId ? 1 : (stats?.finishPosition ?? Number.MAX_SAFE_INTEGER),
              detail: `${finalCash < 0 ? "−" : ""}£${Math.abs(finalCash).toLocaleString("en-GB")} · ${finalProperties} ${finalProperties === 1 ? "property" : "properties"}${player.isBankrupt ? " · bankrupt" : ""}`,
            };
          })
          .sort((a, b) => a.finishPosition - b.finishPosition || Number(a.player.isBankrupt) - Number(b.player.isBankrupt) || b.player.cash - a.player.cash)
          .map((entry, index) => ({ rank: index + 1, name: entry.player.name, detail: entry.detail, winner: entry.player.id === gameState.winnerId }));
        const finalAwards = getMatchAwards(gameState)
          .filter((award) => award.winnerIds.length > 0)
          .map((award) => ({
            title: award.title,
            winner: award.winnerIds.map((id) => gameState.players.find((player) => player.id === id)?.name ?? "Player").join(" & "),
            detail: `${award.detail} · ${award.value.toLocaleString("en-GB")}`,
          }));
        const durationMs = gameState.gameStartedAt ? Math.max(0, Date.now() - gameState.gameStartedAt) : 0;
        io.emit("platform:game-finished", {
          id: `mega-board-${code}-${gameState.turnNumber}`,
          game: "mega-board",
          gameTitle: "Mega Board",
          code,
          status: "game-finished",
          winner,
          message: winner ? `${winner} has won the game!` : "Mega Board game finished.",
          at: Date.now(),
          result: {
            headline: winner ? `${winner} wins Mega Board` : "Mega Board finished",
            subtitle: `${gameState.turnNumber} turns · ${gameState.blitz ? "Blitz" : gameState.ranked ? "Ranked" : "Casual"}`,
            durationMs,
            rows: finalRows,
            stats: [
              { label: "Turns", value: String(gameState.turnNumber) },
              { label: "Players", value: String(gameState.players.length) },
              { label: "Properties owned", value: String(gameState.players.reduce((sum, player) => sum + player.properties.length, 0)) },
            ],
            awards: finalAwards,
          },
        });
      }
    } else {
      globalFinishNoticeKeys.delete(code);
    }
  }

  syncTurnRollDeadline(gameState);
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
  gameState.turnRollDeadline = null;
  gameState.turnRollDeadlinePlayerId = null;
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
