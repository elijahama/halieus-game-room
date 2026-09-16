import { randomInt } from "node:crypto";

import {
  BOARD_SPACES,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";
import type {
  GameState,
  PlayerId,
} from "../../../../../shared/games/mega-board/game-state.js";
import { captureStats } from "./stats.js";

export interface BlitzAllocationResult {
  totalAssets: number;
  assignedByPlayerId: Record<PlayerId, number>;
}

type PickIndex = (upperExclusive: number) => number;

function shuffleInPlace<T>(items: T[], pickIndex: PickIndex): void {
  for (let current = items.length - 1; current > 0; current -= 1) {
    const upperExclusive = current + 1;
    const swapIndex = pickIndex(upperExclusive);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex >= upperExclusive) {
      throw new RangeError(
        `Blitz shuffle index ${swapIndex} is outside 0-${upperExclusive - 1}.`,
      );
    }
    [items[current], items[swapIndex]] = [items[swapIndex], items[current]];
  }
}

/**
 * Blitz shuffles the complete ownable-asset pool, randomises which eligible
 * player receives the first card in the deal, then deals round-robin.
 *
 * This keeps the *identity* of each player's portfolio fully random while
 * ensuring starting asset counts are as even as mathematically possible.
 * With N assets and P players, no two eligible players can differ by more
 * than one starting asset. There is deliberately no balancing by price,
 * colour group, rent potential, station/utility type, or strategic value.
 */
export function allocateBlitzProperties(
  gameState: GameState,
  pickIndex: PickIndex = (upperExclusive) => randomInt(upperExclusive),
): BlitzAllocationResult {
  if (!gameState.blitz) {
    return { totalAssets: 0, assignedByPlayerId: {} };
  }

  const eligiblePlayers = gameState.players.filter(
    (player) => !player.isBankrupt,
  );

  if (eligiblePlayers.length === 0) {
    return { totalAssets: 0, assignedByPlayerId: {} };
  }

  // This function is called on fresh game state, but clearing ownership makes
  // it safe and deterministic if setup is retried before play begins.
  gameState.propertyOwners = {};
  gameState.propertyDevelopments = {};
  gameState.railroadDepots = {};
  gameState.mortgagedProperties = {};
  for (const player of gameState.players) {
    player.properties = [];
  }

  const assignedByPlayerId: Record<PlayerId, number> = Object.fromEntries(
    eligiblePlayers.map((player) => [player.id, 0]),
  );

  const assets = BOARD_SPACES.filter(isOwnableBoardSpace);
  const dealOrder = [...eligiblePlayers];

  // Shuffle both sides of the deal. Shuffling the asset pool makes each
  // portfolio indiscriminate; shuffling the player order randomises who gets
  // one of the remainder assets when the total is not divisible by players.
  shuffleInPlace(assets, pickIndex);
  shuffleInPlace(dealOrder, pickIndex);

  assets.forEach((space, index) => {
    const owner = dealOrder[index % dealOrder.length];
    gameState.propertyOwners[space.id] = owner.id;
    owner.properties.push(space.id);
    assignedByPlayerId[owner.id] += 1;
  });

  // Presentation order remains deterministic. Sorting only changes how a
  // portfolio is displayed/reported; it does not alter who received an asset.
  for (const player of gameState.players) {
    player.properties.sort((left, right) => left - right);
  }

  captureStats(gameState);

  return {
    totalAssets: assets.length,
    assignedByPlayerId,
  };
}
