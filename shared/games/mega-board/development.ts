import {
  getBoardSpace,
  getPropertyGroupSpaces,
  isPropertyBoardSpace,
  type PropertyBoardSpace,
} from "./board.js";
import type {
  BankInventory,
  BuildingLevel,
  GameState,
} from "./game-state.js";

export interface DevelopmentStep {
  spaceId: number;
  fromLevel: BuildingLevel;
  toLevel: BuildingLevel;
  cost: number;
}

export interface DevelopmentPlan {
  ok: boolean;
  reason?: string;
  totalCost: number;
  steps: DevelopmentStep[];
  endingInventory: BankInventory;
}

function cloneInventory(inventory: BankInventory): BankInventory {
  return { ...inventory };
}

function ownedGroup(
  gameState: GameState,
  playerId: string,
  property: PropertyBoardSpace,
): PropertyBoardSpace[] {
  return getPropertyGroupSpaces(property.group).filter(
    (candidate) => gameState.propertyOwners[candidate.id] === playerId,
  );
}

function baseDevelopmentError(
  gameState: GameState,
  playerId: string,
  property: PropertyBoardSpace,
): string | null {
  const group = getPropertyGroupSpaces(property.group);
  const owned = ownedGroup(gameState, playerId, property);

  if (gameState.propertyOwners[property.id] !== playerId) {
    return "You do not own this property.";
  }

  if (owned.length < group.length - 1) {
    return "Own all but one property in this colour group before developing it.";
  }

  if (owned.some((candidate) => gameState.mortgagedProperties[candidate.id])) {
    return "Unmortgage every property you own in this colour group before developing it.";
  }

  return null;
}

function reserveForNextLevel(
  inventory: BankInventory,
  currentLevel: BuildingLevel,
): string | null {
  if (currentLevel <= 3) {
    if (inventory.houses < 1) return "The Bank has no houses available.";
    inventory.houses -= 1;
    return null;
  }

  if (currentLevel === 4) {
    if (inventory.hotels < 1) return "The Bank has no hotels available.";
    inventory.hotels -= 1;
    inventory.houses += 4;
    return null;
  }

  if (currentLevel === 5) {
    if (inventory.skyscrapers < 1) return "The Bank has no skyscrapers available.";
    inventory.skyscrapers -= 1;
    inventory.hotels += 1;
    return null;
  }

  return "This property is already fully developed.";
}

export function getSingleDevelopmentEligibility(
  gameState: GameState,
  playerId: string,
  spaceId: number,
): { ok: boolean; reason?: string; cost: number; nextLevel?: BuildingLevel } {
  const space = getBoardSpace(spaceId);
  if (!isPropertyBoardSpace(space)) {
    return { ok: false, reason: "Buildings can only be placed on colour properties.", cost: 0 };
  }

  const baseError = baseDevelopmentError(gameState, playerId, space);
  if (baseError) return { ok: false, reason: baseError, cost: space.houseCost };

  const currentLevel = gameState.propertyDevelopments[space.id] ?? 0;
  if (currentLevel >= 6) {
    return { ok: false, reason: "This property already has a skyscraper.", cost: 0 };
  }

  const group = getPropertyGroupSpaces(space.group);
  const owned = ownedGroup(gameState, playerId, space);
  const lowest = Math.min(...owned.map((candidate) => gameState.propertyDevelopments[candidate.id] ?? 0));

  if (currentLevel !== lowest) {
    return {
      ok: false,
      reason: "Build on a less-developed owned property in this colour group first.",
      cost: space.houseCost,
    };
  }

  if (currentLevel === 5) {
    const complete = group.every((candidate) => gameState.propertyOwners[candidate.id] === playerId);
    const allHotels = group.every((candidate) => (gameState.propertyDevelopments[candidate.id] ?? 0) >= 5);
    if (!complete || !allHotels) {
      return {
        ok: false,
        reason: "Own the complete colour group and place a hotel on every property before building a skyscraper.",
        cost: space.houseCost,
      };
    }
  }

  const inventory = cloneInventory(gameState.bankInventory);
  const inventoryError = reserveForNextLevel(inventory, currentLevel);
  if (inventoryError) return { ok: false, reason: inventoryError, cost: space.houseCost };

  const player = gameState.players.find((candidate) => candidate.id === playerId);
  if (!player || player.cash < space.houseCost) {
    return {
      ok: false,
      reason: `You need £${space.houseCost.toLocaleString()} to develop ${space.name}.`,
      cost: space.houseCost,
    };
  }

  return {
    ok: true,
    cost: space.houseCost,
    nextLevel: (currentLevel + 1) as BuildingLevel,
  };
}

export function planDevelopmentToLevel(
  gameState: GameState,
  playerId: string,
  targetSpaceId: number,
  targetLevel: 5 | 6,
): DevelopmentPlan {
  const target = getBoardSpace(targetSpaceId);
  const originalInventory = cloneInventory(gameState.bankInventory);
  const empty = (reason: string): DevelopmentPlan => ({
    ok: false,
    reason,
    totalCost: 0,
    steps: [],
    endingInventory: cloneInventory(gameState.bankInventory),
  });

  if (!isPropertyBoardSpace(target)) {
    return empty("Buildings can only be placed on colour properties.");
  }

  const baseError = baseDevelopmentError(gameState, playerId, target);
  if (baseError) return empty(baseError);

  const currentLevel = gameState.propertyDevelopments[target.id] ?? 0;
  if (currentLevel >= targetLevel) {
    return empty(
      targetLevel === 5
        ? "This property already has a hotel or skyscraper."
        : "This property already has a skyscraper.",
    );
  }

  const group = getPropertyGroupSpaces(target.group);
  const owned = ownedGroup(gameState, playerId, target);
  if (
    targetLevel === 6 &&
    !group.every((candidate) => gameState.propertyOwners[candidate.id] === playerId)
  ) {
    return empty("Own the complete colour group before building a skyscraper.");
  }

  /*
   * Direct Hotel/Skyscraper development is only a Bank-inventory shortage
   * escape route. Simulate the ordinary one-level-at-a-time sequence on the
   * target property and require every virtual step to remain legal under the
   * colour-group even-building rule. Missing intermediate houses/hotels may be
   * skipped, but the final Hotel/Skyscraper piece must physically exist.
   */
  let simulatedLevel = currentLevel;
  let availableHouses = originalInventory.houses;
  let availableHotels = originalInventory.hotels;
  let shortageEncountered = false;

  while (simulatedLevel < targetLevel) {
    const simulatedLevels = owned.map((candidate) =>
      candidate.id === target.id
        ? simulatedLevel
        : (gameState.propertyDevelopments[candidate.id] ?? 0),
    );
    const lowest = Math.min(...simulatedLevels);
    if (simulatedLevel !== lowest) {
      return empty("Direct development would break the even-building rule for this colour group.");
    }

    if (simulatedLevel === 5) {
      const allHotels = group.every((candidate) => {
        if (candidate.id === target.id) return simulatedLevel >= 5;
        return (gameState.propertyDevelopments[candidate.id] ?? 0) >= 5;
      });
      if (!allHotels) {
        return empty("Every property in the complete colour group must have a hotel before a skyscraper can be built.");
      }
    }

    const nextLevel = (simulatedLevel + 1) as BuildingLevel;
    const isFinalStep = nextLevel === targetLevel;

    if (simulatedLevel <= 3) {
      if (availableHouses > 0) {
        availableHouses -= 1;
      } else {
        shortageEncountered = true;
      }
    } else if (simulatedLevel === 4) {
      if (isFinalStep && targetLevel === 5) {
        if (originalInventory.hotels < 1) {
          return empty("The Bank has no Hotel available for the final development.");
        }
      } else if (availableHotels > 0) {
        availableHotels -= 1;
      } else {
        shortageEncountered = true;
      }
    } else if (simulatedLevel === 5) {
      if (originalInventory.skyscrapers < 1) {
        return empty("The Bank has no Skyscraper available for the final development.");
      }
    }

    simulatedLevel = nextLevel;
  }

  if (!shortageEncountered) {
    return empty(
      targetLevel === 5
        ? "Direct Hotel is only available when the Bank has too few houses to complete an otherwise legal build sequence."
        : "Direct Skyscraper is only available when a shortage of required intermediate houses or Hotels blocks an otherwise legal build sequence.",
    );
  }

  const levelsToBuy = targetLevel - currentLevel;
  const totalCost = levelsToBuy * target.houseCost;
  const player = gameState.players.find((candidate) => candidate.id === playerId);
  if (!player) return empty("The player could not be found.");
  if (player.cash < totalCost) {
    return empty(
      `You need £${totalCost.toLocaleString()} to develop ${target.name} directly to ${targetLevel === 5 ? "a Hotel" : "a Skyscraper"}.`,
    );
  }

  const endingInventory = cloneInventory(originalInventory);
  if (targetLevel === 5) {
    endingInventory.hotels -= 1;
    if (currentLevel >= 1 && currentLevel <= 4) {
      endingInventory.houses += currentLevel;
    }
  } else {
    endingInventory.skyscrapers -= 1;
    if (currentLevel >= 1 && currentLevel <= 4) {
      endingInventory.houses += currentLevel;
    } else if (currentLevel === 5) {
      endingInventory.hotels += 1;
    }
  }

  return {
    ok: true,
    totalCost,
    steps: [{
      spaceId: target.id,
      fromLevel: currentLevel,
      toLevel: targetLevel,
      cost: totalCost,
    }],
    endingInventory,
  };
}

/**
 * Plans a convenience build that raises every currently owned property in a
 * colour group to at least Hotel (5) or Skyscraper (6) level in one atomic
 * transaction.
 *
 * The price is exactly the same as buying every intermediate level one at a
 * time. Bank shortages of intermediate houses/Hotels do not make skipped
 * levels free; they only allow the physical pieces to be bypassed while the
 * final Hotel/Skyscraper piece must still exist in the Bank.
 */
export function planGroupDevelopmentToLevel(
  gameState: GameState,
  playerId: string,
  anchorSpaceId: number,
  targetLevel: 5 | 6,
): DevelopmentPlan {
  const anchor = getBoardSpace(anchorSpaceId);
  const originalInventory = cloneInventory(gameState.bankInventory);
  const result = (
    ok: boolean,
    reason: string | undefined,
    totalCost: number,
    steps: DevelopmentStep[] = [],
    endingInventory: BankInventory = cloneInventory(gameState.bankInventory),
  ): DevelopmentPlan => ({ ok, reason, totalCost, steps, endingInventory });

  if (!isPropertyBoardSpace(anchor)) {
    return result(false, "Group development is only available for colour properties.", 0);
  }

  const baseError = baseDevelopmentError(gameState, playerId, anchor);
  if (baseError) return result(false, baseError, 0);

  const group = getPropertyGroupSpaces(anchor.group);
  const owned = ownedGroup(gameState, playerId, anchor).sort((a, b) => a.position - b.position);

  if (
    targetLevel === 6 &&
    !group.every((candidate) => gameState.propertyOwners[candidate.id] === playerId)
  ) {
    return result(false, "Own the complete colour group before building the group to Skyscrapers.", 0);
  }

  if (owned.some((candidate) => gameState.mortgagedProperties[candidate.id])) {
    return result(false, "Unmortgage every property you own in this colour group before developing it.", 0);
  }

  const candidates = owned.filter(
    (candidate) => (gameState.propertyDevelopments[candidate.id] ?? 0) < targetLevel,
  );
  if (candidates.length === 0) {
    return result(
      false,
      targetLevel === 5
        ? "Every owned property in this colour group already has a Hotel or Skyscraper."
        : "Every property in this colour group already has a Skyscraper.",
      0,
    );
  }

  // Prove that the target can be reached without ever violating even-building.
  // Always advance one of the currently least-developed owned properties.
  const simulatedLevels = new Map<number, BuildingLevel>(
    owned.map((candidate) => [candidate.id, gameState.propertyDevelopments[candidate.id] ?? 0]),
  );
  let guard = 0;
  while ([...simulatedLevels.values()].some((level) => level < targetLevel)) {
    if (guard++ > 64) {
      return result(false, "The group development plan could not be resolved safely.", 0);
    }

    const belowTarget = owned.filter(
      (candidate) => (simulatedLevels.get(candidate.id) ?? 0) < targetLevel,
    );
    const lowest = Math.min(...owned.map((candidate) => simulatedLevels.get(candidate.id) ?? 0));
    const next = belowTarget.find(
      (candidate) => (simulatedLevels.get(candidate.id) ?? 0) === lowest,
    );

    if (!next) {
      return result(false, "The current development levels cannot be advanced evenly to that target.", 0);
    }

    const current = simulatedLevels.get(next.id) ?? 0;
    if (current === 5 && targetLevel === 6) {
      const allAtLeastHotels = group.every((candidate) =>
        gameState.propertyOwners[candidate.id] === playerId &&
        (simulatedLevels.get(candidate.id) ?? 0) >= 5,
      );
      if (!allAtLeastHotels) {
        return result(false, "Every property in the complete colour group must reach Hotel level before any Skyscraper is built.", 0);
      }
    }

    simulatedLevels.set(next.id, (current + 1) as BuildingLevel);
  }

  const steps: DevelopmentStep[] = candidates.map((candidate) => {
    const fromLevel = gameState.propertyDevelopments[candidate.id] ?? 0;
    const levelsToBuy = targetLevel - fromLevel;
    return {
      spaceId: candidate.id,
      fromLevel,
      toLevel: targetLevel,
      cost: levelsToBuy * candidate.houseCost,
    };
  });
  const totalCost = steps.reduce((sum, step) => sum + step.cost, 0);

  const player = gameState.players.find((candidate) => candidate.id === playerId);
  if (!player) return result(false, "The player could not be found.", totalCost);

  const finalPiecesNeeded = candidates.length;
  if (targetLevel === 5 && originalInventory.hotels < finalPiecesNeeded) {
    return result(
      false,
      `The Bank needs ${finalPiecesNeeded} Hotel${finalPiecesNeeded === 1 ? "" : "s"} for this group target but only has ${originalInventory.hotels}.`,
      totalCost,
      steps,
    );
  }
  if (targetLevel === 6 && originalInventory.skyscrapers < finalPiecesNeeded) {
    return result(
      false,
      `The Bank needs ${finalPiecesNeeded} Skyscraper${finalPiecesNeeded === 1 ? "" : "s"} for this group target but only has ${originalInventory.skyscrapers}.`,
      totalCost,
      steps,
    );
  }

  if (player.cash < totalCost) {
    return result(
      false,
      `You need £${totalCost.toLocaleString()} to build this colour group to ${targetLevel === 5 ? "Hotels" : "Skyscrapers"}.`,
      totalCost,
      steps,
    );
  }

  const endingInventory = cloneInventory(originalInventory);
  for (const step of steps) {
    if (targetLevel === 5) {
      endingInventory.hotels -= 1;
      if (step.fromLevel >= 1 && step.fromLevel <= 4) {
        endingInventory.houses += step.fromLevel;
      }
    } else {
      endingInventory.skyscrapers -= 1;
      if (step.fromLevel >= 1 && step.fromLevel <= 4) {
        endingInventory.houses += step.fromLevel;
      } else if (step.fromLevel === 5) {
        endingInventory.hotels += 1;
      }
    }
  }

  return result(true, undefined, totalCost, steps, endingInventory);
}
