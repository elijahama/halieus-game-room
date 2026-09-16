import {
  BOARD_SPACE_COUNT,
  GO_POSITION,
  getBoardSpace,
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
  startAuction,
} from "./auction.js";

import {
  drawCard,
} from "./cards.js";

import {
  rollTwoDice,
  type DiceResult,
} from "./dice.js";

import {
  collectBusTicket,
  describeBusTicketCollection,
  discardHeldBusTicket,
  getBusTicketDestinations,
} from "./mega-rules.js";

import { recordBusTicketUsed, recordCashFlow } from "./stats.js";
import { pushGlobalNotice } from "./activity.js";

import {
  resolveLandedSpace,
} from "./space-resolution.js";

import {
  setTurnPhase,
} from "./turn-engine.js";

export interface MegaActionResult {
  error: string | null;
  message: string;
  auctionStarted?: boolean;
  utilityRoll?: DiceResult;
}

function activePlayer(
  gameState: GameState,
  playerId: string,
): GamePlayer | undefined {
  return gameState.players.find(
    (player) =>
      player.id === playerId &&
      !player.isBankrupt,
  );
}

function finishMegaSequence(
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
    setTurnPhase(gameState, "roll");
    return;
  }

  if (resumeAction === "roll") {
    gameState.awaitingReroll = false;
    setTurnPhase(gameState, "roll");
    return;
  }

  gameState.awaitingReroll = false;
  setTurnPhase(
    gameState,
    "optional-actions",
  );
}

function resolveMovementLanding(
  gameState: GameState,
  player: GamePlayer,
  diceTotal: number,
  resumeAction: DebtResumeAction,
): string {
  const resolution = resolveLandedSpace({
    gameState,
    player,
    diceTotal,
    resumeAction,
  });

  let message = resolution.message;

  if (resolution.nextCardDeck) {
    const card = drawCard(
      gameState,
      resolution.nextCardDeck,
      player.id,
      resumeAction,
    );

    message =
      `${player.name} drew ${card.title}.`;
  }

  if (resolution.turnAdvanced) {
    return message;
  }

  if (gameState.pendingPurchase) {
    setTurnPhase(gameState, "purchase");
  } else if (gameState.pendingCard) {
    setTurnPhase(gameState, "card");
  } else if (gameState.pendingDebt) {
    setTurnPhase(gameState, "debt");
  } else if (gameState.pendingMegaAction) {
    setTurnPhase(gameState, "mega-choice");
  } else {
    finishMegaSequence(
      gameState,
      resumeAction,
    );
  }

  return message;
}

export function startBusTicketUse(
  gameState: GameState,
  playerId: string,
): MegaActionResult {
  const player = activePlayer(
    gameState,
    playerId,
  );

  if (!player) {
    return {
      error:
        "The active player could not be found.",
      message: "",
    };
  }

  if (player.inJail) {
    return {
      error:
        "A Bus Ticket cannot be used while in Jail.",
      message: "",
    };
  }

  if (
    (player.busTicketIds?.length ?? 0) < 1
  ) {
    return {
      error:
        "You do not have a Bus Ticket.",
      message: "",
    };
  }

  const allowedPositions =
    getBusTicketDestinations(
      player.position,
    );

  if (allowedPositions.length === 0) {
    return {
      error:
        "No valid Bus Ticket destinations were found.",
      message: "",
    };
  }

  gameState.pendingMegaAction = {
    type: "bus-ticket",
    playerId,
    allowedPositions,
  };
  setTurnPhase(gameState, "mega-choice");

  return {
    error: null,
    message:
      `${player.name} is choosing a Bus Ticket destination.`,
  };
}

export function cancelBusTicketUse(
  gameState: GameState,
  playerId: string,
): MegaActionResult {
  const pending =
    gameState.pendingMegaAction;

  if (
    !pending ||
    pending.type !== "bus-ticket" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no Bus Ticket choice to cancel.",
      message: "",
    };
  }

  gameState.pendingMegaAction = null;
  setTurnPhase(gameState, "roll");

  return {
    error: null,
    message:
      "Bus Ticket use was cancelled.",
  };
}

export function moveWithBusTicket(
  gameState: GameState,
  playerId: string,
  position: number,
): MegaActionResult {
  const pending =
    gameState.pendingMegaAction;

  if (
    !pending ||
    pending.type !== "bus-ticket" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no Bus Ticket move awaiting your choice.",
      message: "",
    };
  }

  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position >= BOARD_SPACE_COUNT ||
    !pending.allowedPositions.includes(position)
  ) {
    return {
      error:
        "Choose a destination on one of the street sides connected to your current space.",
      message: "",
    };
  }

  const player = activePlayer(
    gameState,
    playerId,
  );

  if (
    !player ||
    (player.busTicketIds?.length ?? 0) < 1
  ) {
    return {
      error:
        "The player or Bus Ticket could not be found.",
      message: "",
    };
  }

  const previousPosition = player.position;
  const destinationSpace =
    getBoardSpace(position);

  const usedTicketId =
    discardHeldBusTicket(
      gameState,
      player,
    );

  if (!usedTicketId) {
    return {
      error:
        "The held Bus Ticket could not be found.",
      message: "",
    };
  }

  recordBusTicketUsed(gameState, player);
  pushGlobalNotice(gameState, {
    kind: "movement",
    title: "🚌 Bus Ticket Used",
    message: `${player.name} used a Bus Ticket to travel to ${destinationSpace?.name ?? `space ${position}`}.`,
    playerId: player.id,
    presentation: "standard",
    durationMs: 2300,
  });
  player.position = position;

  gameState.pendingMegaAction = null;
  gameState.awaitingReroll = false;
  gameState.consecutiveDoubles = 0;
  setTurnPhase(gameState, "resolve-space");

  if (position === GO_POSITION) {
    // Reaching GO by Bus Ticket counts as the standard £200 GO salary.
    // resolveLandedSpace adds the additional exact-landing £200 bonus.
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
  }

  let diceTotal = 0;
  let utilityRoll:
    | DiceResult
    | undefined;

  if (
    destinationSpace?.type === "utility"
  ) {
    const ownerId =
      gameState.propertyOwners[
        destinationSpace.id
      ];

    if (
      ownerId &&
      ownerId !== player.id &&
      !gameState.mortgagedProperties[
        destinationSpace.id
      ]
    ) {
      utilityRoll = rollTwoDice();
      diceTotal = utilityRoll.total;
    }
  }

  const landingMessage =
    resolveMovementLanding(
      gameState,
      player,
      diceTotal,
      "advance-turn",
    );

  return {
    error: null,
    message:
      `${player.name} used a Bus Ticket to move to ${destinationSpace?.name ?? `space ${position}`}. ${landingMessage}`,
    utilityRoll,
  };
}

export function chooseBirthdayGift(
  gameState: GameState,
  playerId: string,
  choice: "cash" | "ticket",
): MegaActionResult {
  const pending =
    gameState.pendingMegaAction;

  if (
    !pending ||
    pending.type !== "birthday-gift" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no Birthday Gift awaiting your choice.",
      message: "",
    };
  }

  const player = activePlayer(
    gameState,
    playerId,
  );

  if (!player) {
    return {
      error:
        "The active player could not be found.",
      message: "",
    };
  }

  if (
    choice === "ticket" &&
    gameState.busTicketDeck.length < 1
  ) {
    return {
      error:
        "There are no Bus Tickets left. Choose £100 instead.",
      message: "",
    };
  }

  gameState.pendingMegaAction = null;

  let ticketMessage = "";

  if (choice === "cash") {
    player.cash += 100;
    recordCashFlow(gameState, player, 100);
  } else {
    const ticketResult =
      collectBusTicket(
        gameState,
        player,
      );

    ticketMessage =
      describeBusTicketCollection(
        player.name,
        ticketResult,
      );
  }

  finishMegaSequence(
    gameState,
    pending.resumeAction,
  );

  return {
    error: null,
    message:
      choice === "cash"
        ? `${player.name} collected £100 for Birthday Gift.`
        : ticketMessage,
  };
}

export function chooseAuctionSpaceAsset(
  gameState: GameState,
  playerId: string,
  spaceId: number,
): MegaActionResult {
  const pending =
    gameState.pendingMegaAction;

  if (
    !pending ||
    pending.type !== "auction-space" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no Auction-space choice awaiting this player.",
      message: "",
    };
  }

  if (
    !pending.eligibleSpaceIds.includes(
      spaceId,
    ) ||
    gameState.propertyOwners[spaceId]
  ) {
    return {
      error:
        "Choose an unowned asset from the list.",
      message: "",
    };
  }

  const player = activePlayer(
    gameState,
    playerId,
  );

  if (!player) {
    return {
      error:
        "The active player could not be found.",
      message: "",
    };
  }

  gameState.pendingMegaAction = null;
  gameState.awaitingReroll =
    pending.resumeAction === "reroll";

  const error = startAuction(
    gameState,
    spaceId,
    playerId,
  );

  if (error) {
    gameState.pendingMegaAction = pending;
    setTurnPhase(gameState, "mega-choice");

    return {
      error,
      message: "",
    };
  }

  return {
    error: null,
    message:
      `${player.name} selected ${getBoardSpace(spaceId)?.name ?? "an asset"} for auction.`,
    auctionStarted: true,
  };
}
