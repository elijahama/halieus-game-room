import type {
  GamePlayer,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";
import { recordCashFlow } from "./stats.js";

function normaliseAmount(
  amount: number,
): number {
  return Math.max(
    0,
    Math.floor(amount),
  );
}

export function addToFreeParkingPot(
  gameState: GameState,
  amount: number,
): number {
  if (
    !gameState.freeParkingJackpotEnabled
  ) {
    return 0;
  }

  const contribution =
    normaliseAmount(amount);

  gameState.freeParkingPot +=
    contribution;

  return contribution;
}

export function collectFreeParkingPot(
  gameState: GameState,
  player: GamePlayer,
): number {
  if (
    !gameState.freeParkingJackpotEnabled
  ) {
    return 0;
  }

  const prize = normaliseAmount(
    gameState.freeParkingPot,
  );

  if (prize <= 0) {
    return 0;
  }

  player.cash += prize;
  recordCashFlow(gameState, player, prize);
  gameState.freeParkingPot = 0;

  return prize;
}
