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
import { humanStyleForSeat, type HumanStyleId } from "./human-play-calibration.js";


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
  style: HumanStyleId;
  tradeAggression: number;
  buildAggression: number;
  leverageAggression: number;
  mobilityAggression: number;
}

export function getAiProfile(
  difficulty: AiDifficulty | null,
  player?: Pick<GamePlayer, "id" | "name">,
): AiProfile {
  const base = difficulty === "easy"
    ? { reserveCash: 850, purchaseChance: 0.48, auctionMultiplier: 0.85, tradeThreshold: 1.25, optionalActionLimit: 1, busTicketChance: 0.08 }
    : difficulty === "hard"
      ? { reserveCash: 350, purchaseChance: 0.92, auctionMultiplier: 1.35, tradeThreshold: 0.96, optionalActionLimit: 4, busTicketChance: 0.24 }
      : { reserveCash: 600, purchaseChance: 0.72, auctionMultiplier: 1.08, tradeThreshold: 1.08, optionalActionLimit: 2, busTicketChance: 0.15 };

  const style = humanStyleForSeat(player?.id ?? "generic", player?.name ?? "Halieus AI");
  const difficultySkill = difficulty === "hard" ? 1 : difficulty === "easy" ? 0.46 : 0.72;
  const reserveFloor = difficulty === "hard" ? 260 : difficulty === "easy" ? 720 : 480;

  return {
    ...base,
    style: style.id,
    reserveCash: Math.max(reserveFloor, Math.round(base.reserveCash * style.reserve)),
    auctionMultiplier: base.auctionMultiplier * (1 + (style.auction - 1) * difficultySkill),
    tradeThreshold: base.tradeThreshold / (1 + (style.trade - 1) * difficultySkill * 0.35),
    optionalActionLimit: Math.max(1, base.optionalActionLimit + (difficulty === "hard" && (style.build > 1.2 || style.trade > 1.2) ? 1 : 0)),
    busTicketChance: Math.min(0.48, base.busTicketChance * (1 + (style.mobility - 1) * difficultySkill)),
    tradeAggression: 1 + (style.trade - 1) * difficultySkill,
    buildAggression: 1 + (style.build - 1) * difficultySkill,
    leverageAggression: 1 + (style.leverage - 1) * difficultySkill,
    mobilityAggression: 1 + (style.mobility - 1) * difficultySkill,
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
    player,
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
    player,
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

    const owner = gameState.players.find((candidate) => candidate.id === ownerId);
    let expectedPain = Math.max(80, Math.floor(space.price / 2));
    if (space.type === "property") {
      const level = gameState.propertyDevelopments[space.id] ?? 0;
      const group = getPropertyGroupSpaces(space.group);
      const complete = group.every((property) => gameState.propertyOwners[property.id] === ownerId);
      const rentIndex = level > 0 ? Math.min(7, level + 1) : complete ? 1 : 0;
      expectedPain = Math.max(expectedPain, space.rents[rentIndex] ?? space.rents[0]);
    } else if (space.type === "railroad") {
      const count = owner?.properties.filter((id) => getBoardSpace(id)?.type === "railroad").length ?? 1;
      expectedPain = Math.max(expectedPain, space.rents[Math.max(0, Math.min(3, count - 1))] ?? space.rents[0]);
      if (gameState.railroadDepots[space.id]) expectedPain *= 2;
    } else if (space.type === "utility") {
      const count = owner?.properties.filter((id) => getBoardSpace(id)?.type === "utility").length ?? 1;
      const multiplier = space.rentMultipliers[Math.max(0, Math.min(2, count - 1))] ?? space.rentMultipliers[0];
      expectedPain = Math.max(expectedPain, multiplier * 9);
    }
    const liquidityPenalty = expectedPain > player.cash * 0.45 ? 1.55 : expectedPain > player.cash * 0.25 ? 1.25 : 1;
    return -Math.round(expectedPain * liquidityPenalty);
  }

  if (space.type === "tax") {
    return -space.amount;
  }

  if (space.name === "Go To Jail") {
    const ownedAssets = Object.keys(gameState.propertyOwners).length;
    const lateGame = ownedAssets >= 40;
    const developedOpponentAssets = gameState.players
      .filter((candidate) => candidate.id !== player.id && !candidate.isBankrupt)
      .flatMap((candidate) => candidate.properties)
      .filter((id) => (gameState.propertyDevelopments[id] ?? 0) >= 3).length;
    // Human games showed intentional Bus Ticket moves to Go To Jail as a defensive shelter.
    // It is only attractive when the board has become dangerous; otherwise jail remains costly.
    if (lateGame && developedOpponentAssets >= 4 && player.cash < 1500) return 260;
    return -900;
  }

  if (space.name === "Bank Deposit") {
    return -100;
  }

  if (space.name === "Birthday Gift") {
    return 360 + (player.busTicketIds.length === 0 ? 70 : 0);
  }

  if (space.name === "Bus Ticket") {
    return 300 + Math.max(0, 2 - player.busTicketIds.length) * 55;
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
    return 430;
  }

  return 50;
}
