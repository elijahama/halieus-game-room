import {
  BOARD_SPACE_COUNT,
  getBoardSpace,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  GO_SALARY,
} from "../../../../../shared/games/mega-board/game-rules.js";

import type {
  DebtResumeAction,
  GamePlayer,
  GameState,
  PendingSpeedDieAction,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  drawCard,
} from "./cards.js";

import {
  collectBusTicket,
  describeBusTicketCollection,
} from "./mega-rules.js";

import {
  resolveLandedSpace,
} from "./space-resolution.js";

import { recordCashFlow } from "./stats.js";

import {
  setTurnPhase,
} from "./turn-engine.js";

export interface SpeedDieResolution {
  error: string | null;
  message: string;
}

function getActivePlayer(
  gameState: GameState,
  playerId: string,
): GamePlayer | undefined {
  return gameState.players.find(
    (player) =>
      player.id === playerId &&
      !player.isBankrupt,
  );
}

function finishSequence(
  gameState: GameState,
  resumeAction: DebtResumeAction,
): void {
  gameState.pendingSpeedDieAction = null;

  if (resumeAction === "reroll") {
    gameState.awaitingReroll = true;
    setTurnPhase(gameState, "roll");
    return;
  }

  gameState.awaitingReroll = false;
  setTurnPhase(
    gameState,
    "optional-actions",
  );
}

function moveForwardTo(
  player: GamePlayer,
  position: number,
): boolean {
  const passedGo =
    position < player.position;

  player.position = position;

  return passedGo;
}

function findNextPosition(
  startPosition: number,
  predicate: (position: number) => boolean,
): number | null {
  for (
    let offset = 1;
    offset <= BOARD_SPACE_COUNT;
    offset += 1
  ) {
    const position =
      (startPosition + offset) %
      BOARD_SPACE_COUNT;

    if (predicate(position)) {
      return position;
    }
  }

  return null;
}

function resolveSpeedDieLanding(
  gameState: GameState,
  player: GamePlayer,
  diceTotal: number,
  resumeAction: DebtResumeAction,
): string {
  const resolution =
    resolveLandedSpace({
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
    gameState.pendingSpeedDieAction =
      null;
    return message;
  }

  if (gameState.pendingPurchase) {
    setTurnPhase(
      gameState,
      "purchase",
    );
  } else if (gameState.pendingCard) {
    setTurnPhase(gameState, "card");
  } else if (gameState.pendingDebt) {
    setTurnPhase(gameState, "debt");
  } else if (gameState.pendingMegaAction) {
    setTurnPhase(
      gameState,
      "mega-choice",
    );
  } else {
    finishSequence(
      gameState,
      resumeAction,
    );
  }

  return message;
}

export function hasPendingSpeedDieAction(
  gameState: GameState,
): boolean {
  const pending =
    gameState.pendingSpeedDieAction;
  const currentPlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ];

  return Boolean(
    pending &&
      currentPlayer &&
      pending.playerId ===
        currentPlayer.id &&
      !currentPlayer.isBankrupt &&
      !currentPlayer.inJail,
  );
}

export function restoreAfterBlockingAction(
  gameState: GameState,
  resumeAction: DebtResumeAction,
): void {
  if (
    hasPendingSpeedDieAction(
      gameState,
    )
  ) {
    gameState.awaitingReroll = false;
    setTurnPhase(
      gameState,
      "speed-die-choice",
    );
    return;
  }

  finishSequence(
    gameState,
    resumeAction,
  );
}

export function resolveTripleMove(
  gameState: GameState,
  playerId: string,
  position: number,
): SpeedDieResolution {
  const pending =
    gameState.pendingSpeedDieAction;

  if (
    !pending ||
    pending.type !== "triple" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no triple movement awaiting your choice.",
      message: "",
    };
  }

  const player = getActivePlayer(
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
    !Number.isInteger(position) ||
    position < 0 ||
    position >= BOARD_SPACE_COUNT
  ) {
    return {
      error:
        `Choose a board position between 0 and ${BOARD_SPACE_COUNT - 1}.`,
      message: "",
    };
  }

  if (position === player.position) {
    return {
      error:
        "Choose a different destination for the triple move.",
      message: "",
    };
  }

  gameState.pendingSpeedDieAction = null;
  gameState.consecutiveDoubles = 0;
  gameState.awaitingReroll = false;

  if (
    moveForwardTo(
      player,
      position,
    )
  ) {
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
  }

  const landingMessage =
    resolveSpeedDieLanding(
      gameState,
      player,
      pending.whiteDiceTotal +
        pending.tripleValue,
      "advance-turn",
    );

  return {
    error: null,
    message:
      `${player.name} used triple ${pending.tripleValue}s to move to ${getBoardSpace(position)?.name ?? `space ${position}`}. ${landingMessage}`,
  };
}

export function resolveBusMove(
  gameState: GameState,
  playerId: string,
  spaces: number,
): SpeedDieResolution {
  const pending = gameState.pendingSpeedDieAction;

  if (
    !pending ||
    pending.type !== "bus" ||
    pending.playerId !== playerId
  ) {
    return {
      error: "There is no Bus result awaiting your choice.",
      message: "",
    };
  }

  const allowedMoves = [
    pending.white1,
    pending.white2,
    pending.whiteDiceTotal,
  ].filter((value, index, values) =>
    Number.isInteger(value) && value > 0 && values.indexOf(value) === index,
  );

  if (!allowedMoves.includes(spaces)) {
    return {
      error: `Choose one of the Bus movement values: ${allowedMoves.join(", ")}.`,
      message: "",
    };
  }

  const player = getActivePlayer(gameState, playerId);
  if (!player) {
    return {
      error: "The active player could not be found.",
      message: "",
    };
  }

  const previousPosition = player.position;
  const rawPosition = previousPosition + spaces;
  const destination = rawPosition % BOARD_SPACE_COUNT;

  gameState.pendingSpeedDieAction = null;
  gameState.awaitingReroll = false;

  if (rawPosition >= BOARD_SPACE_COUNT) {
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
  }

  player.position = destination;

  const landingMessage = resolveSpeedDieLanding(
    gameState,
    player,
    spaces,
    pending.resumeAction,
  );

  return {
    error: null,
    message: `${player.name} used the Bus result to move ${spaces} space${spaces === 1 ? "" : "s"}. ${landingMessage}`,
  };
}

export function resolveBusTicketChoice(
  gameState: GameState,
  playerId: string,
): SpeedDieResolution {
  const pending = gameState.pendingSpeedDieAction;
  if (!pending || pending.type !== "bus" || pending.playerId !== playerId) {
    return { error: "There is no Bus result awaiting your choice.", message: "" };
  }
  return {
    error: "Bus Tickets are awarded automatically on a BUS result. Choose one of the movement values to continue.",
    message: "",
  };
}

export function resolveBusCardMove(
  gameState: GameState,
  playerId: string,
): SpeedDieResolution {
  const pending =
    gameState.pendingSpeedDieAction;

  if (
    !pending ||
    pending.type !== "bus" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no Bus result awaiting your choice.",
      message: "",
    };
  }

  const player = getActivePlayer(
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

  const destination =
    findNextPosition(
      player.position,
      (position) => {
        const space =
          getBoardSpace(position);

        return (
          space?.type === "chance" ||
          space?.type ===
            "community-chest"
        );
      },
    );

  if (destination === null) {
    finishSequence(
      gameState,
      pending.resumeAction,
    );

    return {
      error: null,
      message:
        "No Chance or Community Chest space could be found.",
    };
  }

  gameState.pendingSpeedDieAction = null;

  if (
    moveForwardTo(
      player,
      destination,
    )
  ) {
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
  }

  const landingMessage =
    resolveSpeedDieLanding(
      gameState,
      player,
      pending.whiteDiceTotal,
      pending.resumeAction,
    );

  return {
    error: null,
    message:
      `${player.name} used the Bus result to move to the nearest card space. ${landingMessage}`,
  };
}

export function resolveMrMonopolyMove(
  gameState: GameState,
  playerId: string,
): SpeedDieResolution {
  const pending =
    gameState.pendingSpeedDieAction;

  if (
    !pending ||
    pending.type !==
      "mr-monopoly" ||
    pending.playerId !== playerId
  ) {
    return {
      error:
        "There is no Mr. Monopoly move awaiting completion.",
      message: "",
    };
  }

  const player = getActivePlayer(
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

  const hasUnownedAsset =
    Array.from(
      { length: BOARD_SPACE_COUNT },
      (_, position) =>
        getBoardSpace(position),
    ).some(
      (space) =>
        isOwnableBoardSpace(space) &&
        !gameState.propertyOwners[
          space.id
        ],
    );

  const destination =
    findNextPosition(
      player.position,
      (position) => {
        const space =
          getBoardSpace(position);

        if (
          !isOwnableBoardSpace(space)
        ) {
          return false;
        }

        const ownerId =
          gameState.propertyOwners[
            space.id
          ];

        if (hasUnownedAsset) {
          return !ownerId;
        }

        return Boolean(
          ownerId &&
            ownerId !== player.id &&
            !gameState
              .mortgagedProperties[
              space.id
            ],
        );
      },
    );

  if (destination === null) {
    finishSequence(
      gameState,
      pending.resumeAction,
    );

    return {
      error: null,
      message:
        `${player.name} had no eligible Mr. Monopoly bonus destination.`,
    };
  }

  gameState.pendingSpeedDieAction = null;

  if (
    moveForwardTo(
      player,
      destination,
    )
  ) {
    player.cash += GO_SALARY;
    recordCashFlow(gameState, player, GO_SALARY);
  }

  const landingMessage =
    resolveSpeedDieLanding(
      gameState,
      player,
      pending.whiteDiceTotal,
      pending.resumeAction,
    );

  return {
    error: null,
    message:
      `${player.name} completed the Mr. Monopoly bonus move. ${landingMessage}`,
  };
}

export function speedDieFaceLabel(
  action: PendingSpeedDieAction,
): string {
  if (action.type === "triple") {
    return `Triple ${action.tripleValue}s`;
  }

  return action.type === "bus"
    ? "Bus"
    : "Mr. Monopoly";
}
