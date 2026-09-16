import {
  BOARD_SPACES,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";
import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";

/**
 * Keep the red Speed Die in sync with ownership availability. It retires while
 * every ownable board asset is owned and returns as soon as any asset goes
 * back to the Bank (for example after a forfeit/bankruptcy).
 */
export function syncSpeedDieRetirement(gameState: GameState): boolean {
  const shouldRetire = BOARD_SPACES
    .filter(isOwnableBoardSpace)
    .every((space) => Boolean(gameState.propertyOwners[space.id]));

  const changed = Boolean(gameState.speedDieRetired) !== shouldRetire;
  gameState.speedDieRetired = shouldRetire;
  return changed;
}

export function retireSpeedDieIfReady(gameState: GameState): boolean {
  const wasRetired = Boolean(gameState.speedDieRetired);
  syncSpeedDieRetirement(gameState);
  return !wasRetired && gameState.speedDieRetired;
}

export function isSpeedDieActive(gameState: GameState): boolean {
  syncSpeedDieRetirement(gameState);
  return !gameState.speedDieRetired;
}
