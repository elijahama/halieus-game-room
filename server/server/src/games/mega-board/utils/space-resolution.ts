import {
  AUCTION_POSITION,
  BANK_DEPOSIT_POSITION,
  BIRTHDAY_GIFT_POSITION,
  BUS_TICKET_POSITION,
  FREE_PARKING_POSITION,
  GO_POSITION,
  GO_TO_JAIL_POSITION,
  JAIL_POSITION,
  BOARD_SPACE_COUNT,
  getBoardSpace,
  isOwnableBoardSpace,
  type PropertyBoardSpace,
  type RailroadBoardSpace,
  type UtilityBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import type {
  CardDeckType,
} from "../../../../../shared/games/mega-board/cards.js";

import {
  GO_SALARY,
} from "../../../../../shared/games/mega-board/game-rules.js";

import type {
  DebtResumeAction,
  GamePlayer,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  createDebt,
} from "./debt.js";

import { pushGlobalNotice } from "./activity.js";
import { recordCashFlow, recordRentStats } from "./stats.js";

import {
  addToFreeParkingPot,
  collectFreeParkingPot,
} from "./free-parking.js";

import {
  advanceTurn,
} from "./game-state.js";

import {
  collectBusTicket,
  describeBusTicketCollection,
  getUnownedOwnableSpaceIds,
} from "./mega-rules.js";

export interface LandingResolution {
  message: string;
  nextCardDeck: CardDeckType | null;
  turnAdvanced: boolean;
}

interface ResolveLandedSpaceOptions {
  gameState: GameState;
  player: GamePlayer;
  diceTotal: number;
  resumeAction: DebtResumeAction;
}

function countOwnedSpacesByType(
  gameState: GameState,
  ownerId: string,
  type: "railroad" | "utility",
): number {
  return Object.entries(
    gameState.propertyOwners,
  ).filter(
    ([spaceId, currentOwnerId]) => {
      const space = getBoardSpace(
        Number(spaceId),
      );

      return (
        space?.type === type &&
        currentOwnerId === ownerId
      );
    },
  ).length;
}

function propertyGroupOwnershipLevel(
  gameState: GameState,
  ownerId: string,
  landedSpace: PropertyBoardSpace,
): "none" | "majority" | "complete" {
  const groupSpaces = Array.from(
    { length: 52 },
    (_, position) => getBoardSpace(position),
  ).filter(
    (space): space is PropertyBoardSpace =>
      space?.type === "property" &&
      space.group === landedSpace.group,
  );

  const ownedCount = groupSpaces.filter(
    (space) => gameState.propertyOwners[space.id] === ownerId,
  ).length;

  if (ownedCount === groupSpaces.length) return "complete";
  if (groupSpaces.length > 1 && ownedCount >= groupSpaces.length - 1) return "majority";
  return "none";
}

function calculatePropertyRent(
  gameState: GameState,
  ownerId: string,
  space: PropertyBoardSpace,
): number {
  const developmentLevel =
    gameState.propertyDevelopments[
      space.id
    ] ?? 0;

  if (developmentLevel > 0) {
    const rentIndex = Math.min(
      developmentLevel + 1,
      space.rents.length - 1,
    );

    return space.rents[rentIndex];
  }

  const ownershipLevel = propertyGroupOwnershipLevel(gameState, ownerId, space);
  if (ownershipLevel === "complete") {
    // Mega Monopoly complete colour groups charge triple unimproved rent.
    // The board's complete-group rent table entry is already 3× base rent.
    return space.rents[1];
  }
  if (ownershipLevel === "majority") {
    return space.rents[0] * 2;
  }
  return space.rents[0];
}

function calculateRailroadRent(
  gameState: GameState,
  ownerId: string,
  space: RailroadBoardSpace,
): number {
  const ownedRailroads =
    countOwnedSpacesByType(
      gameState,
      ownerId,
      "railroad",
    );

  const rentIndex = Math.max(
    0,
    Math.min(
      ownedRailroads - 1,
      space.rents.length - 1,
    ),
  );

  const baseRent =
    space.rents[rentIndex];

  return gameState.railroadDepots[
    space.id
  ]
    ? baseRent * 2
    : baseRent;
}

function calculateUtilityRent(
  gameState: GameState,
  ownerId: string,
  space: UtilityBoardSpace,
  diceTotal: number,
): number {
  const ownedUtilities =
    countOwnedSpacesByType(
      gameState,
      ownerId,
      "utility",
    );

  const multiplierIndex = Math.max(
    0,
    Math.min(
      ownedUtilities - 1,
      space.rentMultipliers.length - 1,
    ),
  );

  return (
    Math.max(0, Math.floor(diceTotal)) *
    space.rentMultipliers[
      multiplierIndex
    ]
  );
}

function calculateRent(
  gameState: GameState,
  ownerId: string,
  space:
    | PropertyBoardSpace
    | RailroadBoardSpace
    | UtilityBoardSpace,
  diceTotal: number,
): number {
  if (space.type === "property") {
    return calculatePropertyRent(
      gameState,
      ownerId,
      space,
    );
  }

  if (space.type === "railroad") {
    return calculateRailroadRent(
      gameState,
      ownerId,
      space,
    );
  }

  return calculateUtilityRent(
    gameState,
    ownerId,
    space,
    diceTotal,
  );
}


function forwardDistance(
  fromPosition: number,
  toPosition: number,
): number {
  const distance =
    (
      toPosition -
      fromPosition +
      BOARD_SPACE_COUNT
    ) % BOARD_SPACE_COUNT;

  return distance === 0
    ? BOARD_SPACE_COUNT
    : distance;
}

function findHighestRentDestination(
  gameState: GameState,
  player: GamePlayer,
  diceTotal: number,
): number | null {
  const candidates = Array.from(
    { length: BOARD_SPACE_COUNT },
    (_, position) => getBoardSpace(position),
  )
    .filter(isOwnableBoardSpace)
    .map((space) => {
      const ownerId =
        gameState.propertyOwners[space.id];

      if (
        !ownerId ||
        ownerId === player.id ||
        gameState.mortgagedProperties[space.id]
      ) {
        return null;
      }

      const owner = gameState.players.find(
        (candidate) =>
          candidate.id === ownerId &&
          !candidate.isBankrupt,
      );

      if (!owner) {
        return null;
      }

      return {
        position: space.position,
        rent: calculateRent(
          gameState,
          ownerId,
          space,
          diceTotal,
        ),
        distance: forwardDistance(
          player.position,
          space.position,
        ),
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        position: number;
        rent: number;
        distance: number;
      } => Boolean(candidate),
    )
    .sort(
      (first, second) =>
        second.rent - first.rent ||
        first.distance - second.distance,
    );

  return candidates[0]?.position ?? null;
}

function sendPlayerToJail(
  gameState: GameState,
  player: GamePlayer,
): void {
  player.position = JAIL_POSITION;
  player.inJail = true;
  player.jailTurns = 0;

  gameState.consecutiveDoubles = 0;
  gameState.awaitingReroll = false;

  advanceTurn(gameState);
}

export function getLastDiceTotal(
  gameState: GameState,
): number {
  const roll = gameState.lastDiceRoll;

  return roll
    ? roll.movementTotal
    : 0;
}

export function resolveLandedSpace({
  gameState,
  player,
  diceTotal,
  resumeAction,
}: ResolveLandedSpaceOptions): LandingResolution {
  const landedSpace = getBoardSpace(
    player.position,
  );

  if (!landedSpace) {
    return {
      message:
        `${player.name} moved to an unknown board position.`,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (landedSpace.position === GO_POSITION) {
    // Passing GO is handled by the movement routine. Landing exactly on
    // GO earns an additional £200, making the exact-landing total £400.
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
    pushGlobalNotice(gameState, {
      kind: "go",
      title: "🎉 DOUBLE GO!",
      message: `${player.name} landed exactly on GO and collected £400 in total.`,
      playerId: player.id,
      presentation: "major",
      steps: [
        `${player.name} landed exactly on GO.`,
        `£${GO_SALARY.toLocaleString()} was collected for passing/reaching GO.`,
        `Exact landing bonus: another £${GO_SALARY.toLocaleString()}. Total £${(GO_SALARY * 2).toLocaleString()}.`,
      ],
      durationMs: 4800,
    });

    return {
      message: `${player.name} landed exactly on GO and collected £400 in total.`,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (
    landedSpace.position ===
      GO_TO_JAIL_POSITION
  ) {
    sendPlayerToJail(
      gameState,
      player,
    );
    pushGlobalNotice(gameState, {
      kind: "jail-event",
      title: "🚔 GO TO JAIL",
      message: `${player.name} landed on Go To Jail and was sent to Jail.`,
      playerId: player.id,
      presentation: "major",
      steps: [
        `${player.name} landed on Go To Jail.`,
        "Do not pass GO. Do not collect £200.",
        `${player.name} is now in Jail.`,
      ],
      durationMs: 4600,
    });

    return {
      message:
        `${player.name} landed on Go To Jail and was sent to Jail.`,
      nextCardDeck: null,
      turnAdvanced: true,
    };
  }

  if (
    landedSpace.type === "chance" ||
    landedSpace.type ===
      "community-chest"
  ) {
    return {
      message:
        `${player.name} landed on ${landedSpace.name}.`,
      nextCardDeck:
        landedSpace.type === "chance"
          ? "chance"
          : "community-chest",
      turnAdvanced: false,
    };
  }


  if (
    landedSpace.type === "special" &&
    landedSpace.position === AUCTION_POSITION
  ) {
    const unownedSpaceIds =
      getUnownedOwnableSpaceIds(gameState);

    if (unownedSpaceIds.length > 0) {
      gameState.pendingMegaAction = {
        type: "auction-space",
        playerId: player.id,
        resumeAction,
        eligibleSpaceIds: unownedSpaceIds,
      };
      gameState.awaitingReroll =
        resumeAction === "reroll";
      gameState.turnPhase = "mega-choice";

      return {
        message:
          `${player.name} landed on Auction and must choose an unowned asset.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    const destination =
      findHighestRentDestination(
        gameState,
        player,
        diceTotal,
      );

    if (destination === null) {
      return {
        message:
          `${player.name} landed on Auction, but there is no eligible rent destination.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    const previousPosition = player.position;
    player.position = destination;

    if (destination < previousPosition) {
      player.cash += GO_SALARY;
      recordCashFlow(gameState, player, GO_SALARY);
    }

    const followUp = resolveLandedSpace({
      gameState,
      player,
      diceTotal,
      resumeAction,
    });

    return {
      ...followUp,
      message:
        `${player.name} moved from Auction to the highest-rent destination. ${followUp.message}`,
    };
  }

  if (
    landedSpace.type === "special" &&
    landedSpace.position ===
      BIRTHDAY_GIFT_POSITION
  ) {
    gameState.pendingMegaAction = {
      type: "birthday-gift",
      playerId: player.id,
      resumeAction,
    };
    gameState.awaitingReroll =
      resumeAction === "reroll";
    gameState.turnPhase = "mega-choice";

    return {
      message:
        `${player.name} landed on Birthday Gift and must choose £100 or a Bus Ticket.`,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (
    landedSpace.type === "special" &&
    landedSpace.position ===
      BUS_TICKET_POSITION
  ) {
    const ticketResult =
      collectBusTicket(
        gameState,
        player,
      );

    return {
      message:
        describeBusTicketCollection(
          player.name,
          ticketResult,
        ),
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (landedSpace.type === "tax") {
    const taxAmount = Math.max(
      0,
      Math.floor(
        landedSpace.amount,
      ),
    );

    if (player.cash >= taxAmount) {
      player.cash -= taxAmount;
      recordCashFlow(gameState, player, -taxAmount);

      const contribution =
        addToFreeParkingPot(
          gameState,
          taxAmount,
        );

      return {
        message:
          contribution > 0
            ? `${player.name} paid £${taxAmount} ${landedSpace.name}. The Free Parking pot is now £${gameState.freeParkingPot}.`
            : `${player.name} paid £${taxAmount} ${landedSpace.name}.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    createDebt(gameState, {
      debtorId: player.id,
      creditorId: null,
      amount: taxAmount,
      reason: landedSpace.name,
      resumeAction,
      freeParkingContribution:
        taxAmount,
    });

    return {
      message:
        `${player.name} owes the Bank £${taxAmount} for ${landedSpace.name}.`,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (
    landedSpace.type === "special" &&
    landedSpace.position ===
      BANK_DEPOSIT_POSITION
  ) {
    const depositAmount = Math.max(
      0,
      Math.floor(
        landedSpace.amount ?? 100,
      ),
    );

    if (player.cash >= depositAmount) {
      player.cash -= depositAmount;
      recordCashFlow(gameState, player, -depositAmount);

      return {
        message:
          `${player.name} paid £${depositAmount} into Bank Deposit.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    createDebt(gameState, {
      debtorId: player.id,
      creditorId: null,
      amount: depositAmount,
      reason: "Bank Deposit",
      resumeAction,
    });

    return {
      message:
        `${player.name} owes the Bank £${depositAmount} for Bank Deposit.`,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (
    landedSpace.type === "special" &&
    landedSpace.position ===
      FREE_PARKING_POSITION
  ) {
    const prize = collectFreeParkingPot(
      gameState,
      player,
    );

    const freeParkingMessage = !gameState.freeParkingJackpotEnabled
      ? `${player.name} landed on Free Parking. Jackpot mode is off; no action is required.`
      : prize > 0
        ? `${player.name} collected £${prize} from Free Parking.`
        : `${player.name} landed on Free Parking, but the pot is empty.`;

    pushGlobalNotice(gameState, {
      kind: "free-parking",
      title: prize > 0 ? "🅿️ FREE PARKING JACKPOT" : "🅿️ Free Parking",
      message: freeParkingMessage,
      playerId: player.id,
      presentation: prize > 0 ? "major" : "standard",
      steps: prize > 0
        ? [
            `${player.name} landed on Free Parking.`,
            `Jackpot collected: £${prize.toLocaleString()}.`,
            `The Free Parking pot is now £0.`,
          ]
        : undefined,
      durationMs: prize > 0 ? 4800 : 3000,
    });

    return {
      message: freeParkingMessage,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  if (isOwnableBoardSpace(landedSpace)) {
    const ownerId =
      gameState.propertyOwners[
        landedSpace.id
      ];

    if (!ownerId) {
      gameState.pendingPurchase = {
        playerId: player.id,
        spaceId: landedSpace.id,
        price: landedSpace.price,
      };

      gameState.awaitingReroll =
        resumeAction === "reroll";

      return {
        message:
          `${player.name} landed on ${landedSpace.name}. Purchase decision required.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    if (ownerId === player.id) {
      return {
        message:
          `${player.name} landed on their own property, ${landedSpace.name}.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    if (
      gameState.mortgagedProperties[
        landedSpace.id
      ]
    ) {
      return {
        message:
          `${player.name} landed on mortgaged ${landedSpace.name}. No rent is due.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    const owner = gameState.players.find(
      (candidate) =>
        candidate.id === ownerId &&
        !candidate.isBankrupt,
    );

    if (!owner) {
      return {
        message:
          `${player.name} landed on ${landedSpace.name}, but its owner could not be found.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    const rent = calculateRent(
      gameState,
      ownerId,
      landedSpace,
      diceTotal,
    );

    if (player.cash >= rent) {
      player.cash -= rent;
      owner.cash += rent;
      recordRentStats(gameState, player, owner, rent);
      const ownershipLevel = landedSpace.type === "property" &&
        (gameState.propertyDevelopments[landedSpace.id] ?? 0) === 0
          ? propertyGroupOwnershipLevel(gameState, owner.id, landedSpace)
          : "none";
      const rentTitle =
        landedSpace.type === "railroad" && gameState.railroadDepots[landedSpace.id]
          ? "🚉 Double Depot Rent"
          : ownershipLevel === "complete"
            ? "🎨 Triple Full-Group Rent"
            : ownershipLevel === "majority"
              ? "🎨 Double Majority Rent"
            : "💷 Rent Paid";
      const rentDetail =
        landedSpace.type === "railroad" && gameState.railroadDepots[landedSpace.id]
          ? " The Train Depot doubled the station rent."
          : ownershipLevel === "complete"
            ? " Complete ownership triples the unimproved rent."
            : ownershipLevel === "majority"
              ? " Majority ownership doubles the unimproved rent."
              : "";
      pushGlobalNotice(gameState, {
        kind: "rent-payment",
        title: rentTitle,
        message: `${player.name} paid ${owner.name} £${rent.toLocaleString()} for ${landedSpace.name}.${rentDetail}`,
        playerId: player.id,
        presentation: rentDetail ? "major" : "standard",
        ...(rentDetail
          ? {
              steps: [
                `${player.name} landed on ${landedSpace.name}.`,
                rentDetail.trim(),
                `£${rent.toLocaleString()} rent goes to ${owner.name}.`,
              ],
              durationMs: 4200,
            }
          : {}),
      });

      return {
        message:
          `${player.name} paid £${rent} rent to ${owner.name} for ${landedSpace.name}.`,
        nextCardDeck: null,
        turnAdvanced: false,
      };
    }

    createDebt(gameState, {
      debtorId: player.id,
      creditorId: owner.id,
      amount: rent,
      reason:
        `Rent for ${landedSpace.name}`,
      resumeAction,
    });

    return {
      message:
        `${player.name} owes ${owner.name} £${rent} rent for ${landedSpace.name}.`,
      nextCardDeck: null,
      turnAdvanced: false,
    };
  }

  return {
    message:
      `${player.name} landed on ${landedSpace.name}.`,
    nextCardDeck: null,
    turnAdvanced: false,
  };
}
