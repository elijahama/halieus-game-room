import {
  BOARD_SPACE_COUNT,
} from "../../../../../shared/games/mega-board/board.js";

import type {
  GamePlayer,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  drawCard,
} from "./cards.js";

import {
  resolveLandedSpace,
} from "./space-resolution.js";

import {
  setTurnPhase,
} from "./turn-engine.js";

export interface JailMoveResult {
  ok: boolean;
  message: string;
}

export function moveAfterJailRoll(
  gameState: GameState,
  player: GamePlayer,
  diceTotal: number,
): JailMoveResult {
  const safeDiceTotal = Math.max(
    0,
    Math.floor(diceTotal),
  );

  player.position =
    (
      player.position + safeDiceTotal
    ) % BOARD_SPACE_COUNT;

  const resolution =
    resolveLandedSpace({
      gameState,
      player,
      diceTotal: safeDiceTotal,
      resumeAction: "advance-turn",
    });

  let message = resolution.message;

  if (resolution.nextCardDeck) {
    const card = drawCard(
      gameState,
      resolution.nextCardDeck,
      player.id,
      "advance-turn",
    );

    message =
      `${player.name} escaped Jail and drew ${card.title}.`;
  }

  if (resolution.turnAdvanced) {
    return {
      ok: true,
      message,
    };
  }

  if (gameState.pendingPurchase) {
    setTurnPhase(
      gameState,
      "purchase",
    );
  } else if (gameState.pendingCard) {
    setTurnPhase(
      gameState,
      "card",
    );
  } else if (gameState.pendingDebt) {
    setTurnPhase(
      gameState,
      "debt",
    );
  } else {
    setTurnPhase(
      gameState,
      "optional-actions",
    );
  }

  return {
    ok: true,
    message,
  };
}

export function resumePendingJailMove(
  gameState: GameState,
): JailMoveResult | null {
  const pending =
    gameState.pendingJailMove;

  if (!pending) {
    return null;
  }

  const player =
    gameState.players.find(
      (candidate) =>
        candidate.id ===
        pending.playerId,
    );

  gameState.pendingJailMove = null;

  if (!player || player.isBankrupt) {
    return {
      ok: false,
      message:
        "The pending Jail movement could not be completed.",
    };
  }

  return moveAfterJailRoll(
    gameState,
    player,
    pending.diceTotal,
  );
}
