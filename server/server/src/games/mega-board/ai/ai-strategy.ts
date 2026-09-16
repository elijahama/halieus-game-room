import {
  getBoardSpace,
  getPropertyGroupSpaces,
  isOwnableBoardSpace,
  type BoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import type {
  AiDifficulty,
  GamePlayer,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";


export function getAutomationDifficulty(
  player: GamePlayer,
): AiDifficulty {
  if (player.isAi) {
    return player.aiDifficulty ?? "normal";
  }

  return player.autopilotDifficulty ?? "normal";
}

export function isAutomatedPlayer(
  player: GamePlayer | undefined,
): player is GamePlayer {
  return Boolean(
    player &&
      !player.isBankrupt &&
      (
        player.isAi ||
        player.autopilotEnabled
      ),
  );
}

export interface AiProfile {
  reserveCash: number;
  purchaseChance: number;
  auctionMultiplier: number;
  tradeThreshold: number;
  optionalActionLimit: number;
  busTicketChance: number;
}

export function getAiProfile(
  difficulty: AiDifficulty | null,
): AiProfile {
  if (difficulty === "easy") {
    return {
      reserveCash: 850,
      purchaseChance: 0.48,
      auctionMultiplier: 0.85,
      tradeThreshold: 1.25,
      optionalActionLimit: 1,
      busTicketChance: 0.08,
    };
  }

  if (difficulty === "hard") {
    return {
      reserveCash: 350,
      purchaseChance: 0.92,
      auctionMultiplier: 1.35,
      tradeThreshold: 0.96,
      optionalActionLimit: 4,
      busTicketChance: 0.24,
    };
  }

  return {
    reserveCash: 600,
    purchaseChance: 0.72,
    auctionMultiplier: 1.08,
    tradeThreshold: 1.08,
    optionalActionLimit: 2,
    busTicketChance: 0.15,
  };
}

function groupOwnershipScore(
  gameState: GameState,
  player: GamePlayer,
  spaceId: number,
): number {
  const space = getBoardSpace(spaceId);

  if (space?.type !== "property") {
    return 0;
  }

  const group = getPropertyGroupSpaces(
    space.group,
  );

  const owned = group.filter(
    (property) =>
      gameState.propertyOwners[
        property.id
      ] === player.id,
  ).length;

  if (owned === group.length - 1) {
    return 450;
  }

  if (owned >= 1) {
    return 120 * owned;
  }

  return 0;
}

export function estimateAssetValue(
  gameState: GameState,
  player: GamePlayer,
  spaceId: number,
): number {
  const space = getBoardSpace(spaceId);

  if (!isOwnableBoardSpace(space)) {
    return 0;
  }

  let value = space.price;

  if (space.type === "property") {
    value += groupOwnershipScore(
      gameState,
      player,
      space.id,
    );
  } else if (space.type === "railroad") {
    const ownedRailroads =
      player.properties.filter(
        (propertyId) =>
          getBoardSpace(propertyId)
            ?.type === "railroad",
      ).length;

    value += ownedRailroads * 90;
  } else {
    const ownedUtilities =
      player.properties.filter(
        (propertyId) =>
          getBoardSpace(propertyId)
            ?.type === "utility",
      ).length;

    value += ownedUtilities * 75;
  }

  if (
    gameState.mortgagedProperties[
      space.id
    ]
  ) {
    value -= Math.ceil(
      space.mortgage * 1.1,
    );
  }

  return Math.max(0, value);
}

export function shouldPurchaseAsset(
  gameState: GameState,
  player: GamePlayer,
  spaceId: number,
): boolean {
  const space = getBoardSpace(spaceId);

  if (!isOwnableBoardSpace(space)) {
    return false;
  }

  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  const strategicValue =
    estimateAssetValue(
      gameState,
      player,
      space.id,
    );

  const completesUsefulSet =
    strategicValue >=
    space.price + 300;

  if (
    player.cash - space.price <
      profile.reserveCash &&
    !completesUsefulSet
  ) {
    return false;
  }

  const valueBoost = Math.min(
    0.2,
    Math.max(
      0,
      (strategicValue -
        space.price) /
        2000,
    ),
  );

  return (
    completesUsefulSet ||
    Math.random() <
      profile.purchaseChance +
        valueBoost
  );
}

export function getAuctionLimit(
  gameState: GameState,
  player: GamePlayer,
  spaceId: number,
): number {
  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  const available = Math.max(
    0,
    player.cash - profile.reserveCash,
  );

  const value = estimateAssetValue(
    gameState,
    player,
    spaceId,
  );

  return Math.max(
    0,
    Math.min(
      available,
      Math.floor(
        value *
          profile.auctionMultiplier,
      ),
    ),
  );
}

export function scoreDestination(
  gameState: GameState,
  player: GamePlayer,
  space: BoardSpace,
): number {
  if (isOwnableBoardSpace(space)) {
    const ownerId =
      gameState.propertyOwners[
        space.id
      ];

    if (!ownerId) {
      return 500 +
        estimateAssetValue(
          gameState,
          player,
          space.id,
        );
    }

    if (ownerId === player.id) {
      return 160;
    }

    if (
      gameState.mortgagedProperties[
        space.id
      ]
    ) {
      return 100;
    }

    return -Math.max(
      80,
      Math.floor(space.price / 2),
    );
  }

  if (space.type === "tax") {
    return -space.amount;
  }

  if (space.name === "Go To Jail") {
    return -900;
  }

  if (space.name === "Bank Deposit") {
    return -100;
  }

  if (space.name === "Birthday Gift") {
    return 280;
  }

  if (space.name === "Bus Ticket") {
    return 220;
  }

  if (
    space.type === "chance" ||
    space.type ===
      "community-chest"
  ) {
    return 130;
  }

  if (space.name === "Free Parking") {
    return gameState
      .freeParkingJackpotEnabled
      ? gameState.freeParkingPot
      : 80;
  }

  if (space.name === "GO") {
    return 250;
  }

  return 50;
}
