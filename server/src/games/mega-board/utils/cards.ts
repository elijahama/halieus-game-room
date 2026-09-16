import { pushGlobalNotice, recordActivity } from "./activity.js";
import {
  BUS_TICKET_CARDS,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  getGameCard,
  type CardDeckType,
  type GameCard,
} from "../../../../../shared/games/mega-board/cards.js";

import {
  BOARD_SPACE_COUNT,
  JAIL_POSITION,
  getBoardSpace,
  type RailroadBoardSpace,
  type UtilityBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

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

import {
  advanceTurn,
} from "./game-state.js";

import {
  setTurnPhase,
} from "./turn-engine.js";

import {
  addToFreeParkingPot,
} from "./free-parking.js";

import {
  rollTwoDice,
} from "./dice.js";

import {
  getLastDiceTotal,
  resolveLandedSpace,
} from "./space-resolution.js";

import {
  recordCardDraw,
  recordCashFlow,
  recordRentStats,
} from "./stats.js";


function shuffledIds(
  cards: Array<{ id: string }>,
): string[] {
  const ids = cards.map(
    (card) => card.id,
  );

  for (
    let index = ids.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() * (index + 1),
      );

    [
      ids[index],
      ids[randomIndex],
    ] = [
      ids[randomIndex],
      ids[index],
    ];
  }

  return ids;
}

export function initialiseCardDecks(
  gameState: GameState,
): void {
  gameState.chanceDeck =
    shuffledIds(CHANCE_CARDS);

  gameState.communityChestDeck =
    shuffledIds(
      COMMUNITY_CHEST_CARDS,
    );

  gameState.busTicketDeck =
    shuffledIds(BUS_TICKET_CARDS);
  gameState.busTicketsDiscarded = [];
  gameState.busTicketsRemaining =
    gameState.busTicketDeck.length;

  for (const player of gameState.players) {
    player.busTicketIds = [];
    player.busTickets = 0;
  }
}

function getDeck(
  gameState: GameState,
  deckType: CardDeckType,
): string[] {
  return deckType === "chance"
    ? gameState.chanceDeck
    : gameState.communityChestDeck;
}

export function drawCard(
  gameState: GameState,
  deckType: CardDeckType,
  playerId: string,
  resumeAction: DebtResumeAction,
): GameCard {
  const deck = getDeck(
    gameState,
    deckType,
  );

  if (deck.length === 0) {
    const freshDeck =
      deckType === "chance"
        ? shuffledIds(CHANCE_CARDS)
        : shuffledIds(
            COMMUNITY_CHEST_CARDS,
          );

    deck.push(...freshDeck);
  }

  const cardId = deck.shift();

  if (!cardId) {
    throw new Error(
      `The ${deckType} deck is empty.`,
    );
  }

  const card = getGameCard(cardId);

  if (!card) {
    throw new Error(
      `Card ${cardId} could not be found.`,
    );
  }

  if (
    card.effect.type !==
    "get-out-of-jail"
  ) {
    deck.push(card.id);
  }

  gameState.pendingCard = {
    cardId: card.id,
    deck: deckType,
    playerId,
    resumeAction,
  };
  gameState.lastCardDraw = {
    cardId: card.id,
    playerId,
    drawnAt: Date.now(),
  };
  setTurnPhase(gameState, "card");

  const player = gameState.players.find((candidate) => candidate.id === playerId);
  if (player) {
    recordCardDraw(gameState, player);
  }
  const deckName = deckType === "chance" ? "Chance" : "Community Chest";
  const drawMessage = `${player?.name ?? "A player"} drew ${deckName}: ${card.title}.`;

  // Every card draw has its own event. The drawing client can suppress this
  // compact notice while showing the full card reveal, while every other
  // player/spectator still sees what was drawn.
  pushGlobalNotice(gameState, {
    kind: "card-event",
    title: deckType === "chance" ? "❓ Chance" : "🎁 Community Chest",
    message: drawMessage,
    playerId,
    presentation: "standard",
    durationMs: 2400,
  });
  recordActivity(gameState, drawMessage, "card", playerId, { announce: false });

  return card;
}

function activeOpponents(
  gameState: GameState,
  playerId: string,
): GamePlayer[] {
  return gameState.players.filter(
    (player) =>
      player.id !== playerId &&
      !player.isBankrupt,
  );
}

function streetStripPositions(
  currentPosition: number,
): Set<number> {
  // Mega Monopoly Street Repairs applies only to the current street strip
  // (one side of the board), not to developments everywhere the player owns.
  // The three Community Chest spaces sit unambiguously within one of these
  // four strips: 0-13, 13-26, 26-39 and 39-51/0.
  const strips: number[][] = [
    Array.from({ length: 14 }, (_, index) => index),
    Array.from({ length: 14 }, (_, index) => 13 + index),
    Array.from({ length: 14 }, (_, index) => 26 + index),
    [
      ...Array.from({ length: 13 }, (_, index) => 39 + index),
      0,
    ],
  ];

  const strip = strips.find((candidate) => candidate.includes(currentPosition));
  return new Set(strip ?? []);
}

function developmentRepairCost(
  gameState: GameState,
  player: GamePlayer,
  repairType: "general" | "street",
  perHouse: number,
  perHotel: number,
  perSkyscraper: number,
  perDepot: number,
): number {
  let total = 0;
  const streetStrip =
    repairType === "street"
      ? streetStripPositions(player.position)
      : null;

  for (
    const propertyId
    of player.properties
  ) {
    if (streetStrip && !streetStrip.has(propertyId)) {
      continue;
    }
    const level =
      gameState
        .propertyDevelopments[
        propertyId
      ] ?? 0;

    if (level >= 1 && level <= 4) {
      total +=
        level * perHouse;
    } else if (level === 5) {
      total += perHotel;
    } else if (level === 6) {
      total += perSkyscraper;
    }

    if (
      gameState.railroadDepots[
        propertyId
      ]
    ) {
      total += perDepot;
    }
  }

  return total;
}

function finishCardTurn(
  gameState: GameState,
  resumeAction: DebtResumeAction,
): void {
  if (gameState.pendingSpeedDieAction) {
    gameState.awaitingReroll = false;

    setTurnPhase(
      gameState,
      "speed-die-choice",
    );
    return;
  }

  if (resumeAction === "reroll") {
    gameState.awaitingReroll = true;

    setTurnPhase(
      gameState,
      "roll",
    );
  } else {
    gameState.awaitingReroll = false;

    setTurnPhase(
      gameState,
      "optional-actions",
    );
  }
}


function resolveCardMovementLanding(
  gameState: GameState,
  player: GamePlayer,
  resumeAction: DebtResumeAction,
): void {
  const resolution =
    resolveLandedSpace({
      gameState,
      player,
      diceTotal:
        getLastDiceTotal(gameState),
      resumeAction,
    });

  if (resolution.nextCardDeck) {
    drawCard(
      gameState,
      resolution.nextCardDeck,
      player.id,
      resumeAction,
    );

    setTurnPhase(
      gameState,
      "card",
    );

    return;
  }

  if (
    resolution.turnAdvanced ||
    gameState.pendingPurchase ||
    gameState.pendingDebt ||
    gameState.pendingCard ||
    gameState.pendingMegaAction
  ) {
    return;
  }

  finishCardTurn(
    gameState,
    resumeAction,
  );
}

export function useGetOutOfJailCard(
  gameState: GameState,
  player: GamePlayer,
): string | null {
  const cardId =
    player.getOutOfJailCardIds.shift();

  if (!cardId) {
    return "You do not have a Get Out of Jail Free card.";
  }

  const card = getGameCard(cardId);

  if (
    !card ||
    card.effect.type !==
      "get-out-of-jail"
  ) {
    player.getOutOfJailCardIds.unshift(
      cardId,
    );

    return "The held Jail card could not be validated.";
  }

  getDeck(
    gameState,
    card.deck,
  ).push(card.id);

  player.getOutOfJailCards =
    player.getOutOfJailCardIds.length;

  return null;
}


function countOwnedByType(
  gameState: GameState,
  ownerId: string,
  type: "railroad" | "utility",
): number {
  return Object.entries(
    gameState.propertyOwners,
  ).filter(
    ([spaceId, currentOwnerId]) =>
      currentOwnerId === ownerId &&
      getBoardSpace(Number(spaceId))
        ?.type === type,
  ).length;
}

function findNextOwnableOfType(
  position: number,
  type: "railroad" | "utility",
): RailroadBoardSpace | UtilityBoardSpace {
  for (
    let distance = 1;
    distance <= BOARD_SPACE_COUNT;
    distance += 1
  ) {
    const nextPosition =
      (position + distance) %
      BOARD_SPACE_COUNT;

    const space =
      getBoardSpace(nextPosition);

    if (
      space?.type === type
    ) {
      return space;
    }
  }

  throw new Error(
    `No ${type} space exists on the board.`,
  );
}

function resolveNearestOwnableCard(
  gameState: GameState,
  player: GamePlayer,
  card: GameCard,
  resumeAction: DebtResumeAction,
): void {
  if (
    card.effect.type !==
      "move-nearest"
  ) {
    return;
  }

  const previousPosition =
    player.position;

  const destination =
    findNextOwnableOfType(
      previousPosition,
      card.effect.target,
    );

  if (
    destination.position <
      previousPosition
  ) {
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
    pushGlobalNotice(gameState, {
      kind: "go",
      title: "🏁 Passed GO",
      message: `${player.name} passed GO on the way to ${destination.name} and collected £${GO_SALARY.toLocaleString()}.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 2400,
    });
  }

  player.position =
    destination.position;

  const ownerId =
    gameState.propertyOwners[
      destination.id
    ];

  if (!ownerId) {
    gameState.pendingPurchase = {
      playerId: player.id,
      spaceId: destination.id,
      price: destination.price,
    };
    gameState.awaitingReroll =
      resumeAction === "reroll";
    setTurnPhase(
      gameState,
      "purchase",
    );
    return;
  }

  if (
    ownerId === player.id ||
    gameState.mortgagedProperties[
      destination.id
    ]
  ) {
    finishCardTurn(
      gameState,
      resumeAction,
    );
    return;
  }

  const owner =
    gameState.players.find(
      (candidate) =>
        candidate.id === ownerId &&
        !candidate.isBankrupt,
    );

  if (!owner) {
    finishCardTurn(
      gameState,
      resumeAction,
    );
    return;
  }

  let amount = 0;

  if (
    destination.type ===
      "railroad"
  ) {
    const ownedRailroads =
      countOwnedByType(
        gameState,
        owner.id,
        "railroad",
      );

    const rentIndex = Math.max(
      0,
      Math.min(
        ownedRailroads - 1,
        destination.rents.length - 1,
      ),
    );

    const depotMultiplier =
      gameState.railroadDepots[
        destination.id
      ]
        ? 2
        : 1;

    amount =
      destination.rents[rentIndex] *
      depotMultiplier *
      (card.effect
        .railroadRentMultiplier ?? 2);
  } else {
    const roll = rollTwoDice();

    gameState.lastDiceRoll = {
      white1: roll.white1,
      white2: roll.white2,
      speed: null,
      movementTotal: roll.total,
    };
    gameState.rollSequence = (gameState.rollSequence ?? 0) + 1;

    amount =
      roll.total *
      (card.effect
        .utilityDiceMultiplier ?? 10);
  }

  if (player.cash >= amount) {
    player.cash -= amount;
    owner.cash += amount;
    recordRentStats(gameState, player, owner, amount);

    finishCardTurn(
      gameState,
      resumeAction,
    );
    return;
  }

  createDebt(gameState, {
    debtorId: player.id,
    creditorId: owner.id,
    amount,
    reason: card.title,
    resumeAction,
  });
}

export function resolvePendingCard(
  gameState: GameState,
  playerId: string,
): string | null {
  const pending =
    gameState.pendingCard;

  if (
    !pending ||
    pending.playerId !== playerId
  ) {
    return "There is no matching card to resolve.";
  }

  const player =
    gameState.players.find(
      (candidate) =>
        candidate.id === playerId,
    );

  const card =
    getGameCard(
      pending.cardId,
    );

  if (!player || !card) {
    return "The player or card could not be found.";
  }

  const resumeAction =
    pending.resumeAction;

  gameState.pendingCard = null;

  const createBankDebt = (
    amount: number,
    reason: string,
  ) => {
    createDebt(gameState, {
      debtorId: player.id,
      creditorId: null,
      amount,
      reason,
      resumeAction,
      freeParkingContribution:
        amount,
    });
  };

  switch (card.effect.type) {
    case "collect": {
      player.cash +=
        card.effect.amount;
      recordCashFlow(gameState, player, card.effect.amount);

      finishCardTurn(
        gameState,
        resumeAction,
      );

      return null;
    }

    case "pay-bank": {
      if (
        player.cash >=
        card.effect.amount
      ) {
        player.cash -=
          card.effect.amount;
        recordCashFlow(gameState, player, -card.effect.amount);

        addToFreeParkingPot(
          gameState,
          card.effect.amount,
        );

        finishCardTurn(
          gameState,
          resumeAction,
        );
      } else {
        createBankDebt(
          card.effect.amount,
          card.title,
        );
      }

      return null;
    }

    case "move-to": {
      const previousPosition =
        player.position;

      if (
        card.effect.collectGo &&
        (
          card.effect.position === 0 ||
          card.effect.position <
            previousPosition
        )
      ) {
        // House rule: reaching GO exactly, including an Advance to GO card,
        // pays £400 total. Merely crossing GO on the way elsewhere pays £200.
        const goAward = card.effect.position === 0
          ? GO_SALARY * 2
          : GO_SALARY;
        player.cash += goAward;
        recordCashFlow(gameState, player, goAward);
        if (card.effect.position === 0) {
          pushGlobalNotice(gameState, {
            kind: "go",
            title: "🎉 DOUBLE GO!",
            message: `${player.name} advanced exactly to GO and collected £${goAward.toLocaleString()} in total.`,
            playerId: player.id,
            presentation: "major",
            steps: [
              `${player.name} was instructed to advance to GO.`,
              `GO award: £${goAward.toLocaleString()} total.`,
            ],
            durationMs: 4200,
          });
        } else {
          pushGlobalNotice(gameState, {
            kind: "go",
            title: "🏁 Passed GO",
            message: `${player.name} passed GO while following ${card.title} and collected £${GO_SALARY.toLocaleString()}.`,
            playerId: player.id,
            presentation: "standard",
            durationMs: 2400,
          });
        }
      }

      player.position =
        card.effect.position;

      // Advance-to-GO cards already applied the exact-GO £400 house-rule award
      // above. Do not run the landing bonus again.
      if (card.effect.position === 0) {
        finishCardTurn(gameState, resumeAction);
      } else {
        resolveCardMovementLanding(
          gameState,
          player,
          resumeAction,
        );
      }

      return null;
    }

    case "move-nearest": {
      resolveNearestOwnableCard(
        gameState,
        player,
        card,
        resumeAction,
      );

      return null;
    }

    case "move-back": {
      player.position =
        (
          player.position -
          card.effect.spaces +
          BOARD_SPACE_COUNT
        ) % BOARD_SPACE_COUNT;

      resolveCardMovementLanding(
        gameState,
        player,
        resumeAction,
      );

      return null;
    }

    case "go-to-jail": {
      player.position = JAIL_POSITION;
      player.inJail = true;
      player.jailTurns = 0;

      gameState.consecutiveDoubles = 0;
      gameState.awaitingReroll = false;

      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: "🚔 GO DIRECTLY TO JAIL",
        message: `${player.name} was sent directly to Jail by ${card.title}.`,
        playerId: player.id,
        presentation: "major",
        steps: [
          `${player.name} drew: ${card.title}.`,
          "Do not pass GO. Do not collect £200.",
          `${player.name} is now in Jail.`,
        ],
        durationMs: 4800,
      });

      advanceTurn(gameState);

      return null;
    }

    case "get-out-of-jail": {
      player.getOutOfJailCardIds.push(
        card.id,
      );
      player.getOutOfJailCards =
        player.getOutOfJailCardIds.length;

      finishCardTurn(
        gameState,
        resumeAction,
      );

      return null;
    }

    case "pay-each-player": {
      const opponents =
        activeOpponents(
          gameState,
          player.id,
        );

      const total =
        opponents.length *
        card.effect.amount;

      if (player.cash < total) {
        createDebt(gameState, {
          debtorId: player.id,
          creditorId: null,
          amount: total,
          reason: card.title,
          resumeAction,
        });

        return null;
      }

      player.cash -= total;
      recordCashFlow(gameState, player, -total);

      for (const opponent of opponents) {
        opponent.cash +=
          card.effect.amount;
        recordCashFlow(gameState, opponent, card.effect.amount);
      }

      finishCardTurn(
        gameState,
        resumeAction,
      );

      return null;
    }

    case "collect-from-each-player": {
      for (
        const opponent
        of activeOpponents(
          gameState,
          player.id,
        )
      ) {
        const amount =
          Math.min(
            opponent.cash,
            card.effect.amount,
          );

        opponent.cash -= amount;
        player.cash += amount;
        recordCashFlow(gameState, opponent, -amount);
        recordCashFlow(gameState, player, amount);
      }

      finishCardTurn(
        gameState,
        resumeAction,
      );

      return null;
    }

    case "repairs": {
      const amount =
        developmentRepairCost(
          gameState,
          player,
          card.effect.repairType,
          card.effect.perHouse,
          card.effect.perHotel,
          card.effect
            .perSkyscraper,
          card.effect.perDepot,
        );

      if (player.cash >= amount) {
        player.cash -= amount;
        recordCashFlow(gameState, player, -amount);

        addToFreeParkingPot(
          gameState,
          amount,
        );

        finishCardTurn(
          gameState,
          resumeAction,
        );
      } else {
        createBankDebt(
          amount,
          card.title,
        );
      }

      return null;
    }
  }
}
