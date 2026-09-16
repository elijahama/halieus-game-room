import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import type { Server } from "socket.io";

import {
  BOARD_SPACE_COUNT,
  JAIL_POSITION,
  getBoardSpace,
  getPropertyGroupSpaces,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  JAIL_FINE,
  GO_SALARY,
} from "../../../../../shared/games/mega-board/game-rules.js";

import {
  planDevelopmentToLevel,
} from "../../../../../shared/games/mega-board/development.js";

import {
  compareOrderRolls,
  findOrderRollTies,
  type BuildingLevel,
  type GameActivityKind,
  type GamePlayer,
  type GameState,
  type TradeOffer,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";

import {
  executeMultiPartyTrade,
  validateMultiPartyTradeStillValid,
} from "../handlers/tradeHandlers.js";

import {
  placeAuctionBid,
  startAuction,
  withdrawAuctionBidder,
} from "../utils/auction.js";

import {
  syncAuctionTimer,
} from "../utils/auction-timer.js";

import {
  drawCard,
  resolvePendingCard,
  useGetOutOfJailCard,
} from "../utils/cards.js";

import {
  createDebt,
  declareBankruptcy,
  settleDebtIfAffordable,
} from "../utils/debt.js";

import {
  rollGameDice,
  rollTwoDice,
} from "../utils/dice.js";

import {
  isSpeedDieActive,
} from "../utils/speed-die-lifecycle.js";

import {
  addToFreeParkingPot,
} from "../utils/free-parking.js";

import {
  advanceTurn,
  emitGameState,
  resolvePurchaseDecision,
} from "../utils/game-state.js";

import {
  moveAfterJailRoll,
  resumePendingJailMove,
} from "../utils/jail.js";

import {
  chooseAuctionSpaceAsset,
  chooseBirthdayGift,
  moveWithBusTicket,
  startBusTicketUse,
} from "../utils/mega-actions.js";

import {
  collectAutomaticBusResultTicket,
} from "../utils/mega-rules.js";

import { recordCashFlow, recordDiceRoll } from "../utils/stats.js";

import {
  isAutomatedTradeCoolingDown,
  rememberRejectedAutomatedTrade,
} from "../utils/automated-trade-memory.js";

import {
  resolveLandedSpace,
} from "../utils/space-resolution.js";

import {
  resolveBusMove,
  resolveMrMonopolyMove,
  resolveTripleMove,
} from "../utils/speed-die.js";

import {
  setTurnPhase,
  syncBlockingTurnPhase,
} from "../utils/turn-engine.js";

import {
  estimateAssetValue,
  getAiProfile,
  getAuctionLimit,
  getAutomationDifficulty,
  isAutomatedPlayer,
  scoreDestination,
  shouldPurchaseAsset,
} from "./ai-strategy.js";

const AI_TICK_MS = 650;
const HUMAN_AUTOPILOT_TICK_MS = 2600;
const nextActionAt =
  new Map<string, number>();
const optionalActionsTaken =
  new Map<string, number>();
const automatedTradeAttempts = new Set<string>();
const auctionDecisionKeys =
  new Set<string>();

interface AutomatedBlockWatch {
  signature: string;
  since: number;
}

const automatedBlockWatches = new Map<string, AutomatedBlockWatch>();
const AUTOMATED_BLOCK_WATCHDOG_MS = 9000;
const AUTOMATED_TRADE_RESPONSE_TIMEOUT_MS = 15000;

function actionKey(
  code: string,
  player: GamePlayer,
  gameState: GameState,
): string {
  return `${code}:${player.id}:${gameState.turnNumber}:${gameState.currentPlayerIndex}`;
}

function scheduleDelay(
  code: string,
  delay = AI_TICK_MS,
): void {
  nextActionAt.set(
    code,
    Date.now() + delay,
  );
}

function restoreAutomatedContinuation(
  gameState: GameState,
  resumeAction: "advance-turn" | "reroll" | "roll" | "jail-move",
): void {
  if (gameState.pendingSpeedDieAction) {
    gameState.awaitingReroll = false;
    setTurnPhase(gameState, "speed-die-choice");
    return;
  }

  if (
    gameState.pendingPurchase ||
    gameState.pendingAuction ||
    gameState.pendingDebt ||
    gameState.pendingMegaAction ||
    gameState.pendingJailMove
  ) {
    syncBlockingTurnPhase(gameState);
    return;
  }

  if (resumeAction === "reroll" || resumeAction === "roll") {
    gameState.awaitingReroll = resumeAction === "reroll";
    setTurnPhase(gameState, "roll");
  } else if (resumeAction === "jail-move" && gameState.pendingJailMove) {
    setTurnPhase(gameState, "resolve-space");
  } else {
    gameState.awaitingReroll = false;
    setTurnPhase(gameState, "optional-actions");
  }

  syncBlockingTurnPhase(gameState);
}

function automatedBlockSignature(gameState: GameState): string {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  return [
    gameState.turnNumber,
    gameState.currentPlayerIndex,
    currentPlayer?.id ?? "none",
    gameState.turnPhase,
    gameState.pendingCard?.cardId ?? "",
    gameState.pendingPurchase?.spaceId ?? "",
    gameState.pendingAuction?.id ?? "",
    gameState.pendingDebt?.debtorId ?? "",
    gameState.pendingMegaAction?.type ?? "",
    gameState.pendingSpeedDieAction?.type ?? "",
    gameState.pendingJailMove?.playerId ?? "",
  ].join(":");
}

function automatedBlockingOwner(gameState: GameState): GamePlayer | undefined {
  const ownerId =
    gameState.pendingCard?.playerId ??
    gameState.pendingPurchase?.playerId ??
    gameState.pendingDebt?.debtorId ??
    gameState.pendingMegaAction?.playerId ??
    gameState.pendingSpeedDieAction?.playerId ??
    gameState.pendingJailMove?.playerId ??
    gameState.players[gameState.currentPlayerIndex]?.id;

  const owner = gameState.players.find((candidate) => candidate.id === ownerId);
  return owner && isAutomatedPlayer(owner) ? owner : undefined;
}

function checkAutomatedBlockWatchdog(
  code: string,
  gameState: GameState,
): boolean {
  const blocking = [
    "purchase",
    "card",
    "debt",
    "mega-choice",
    "speed-die-choice",
    "resolve-space",
  ].includes(gameState.turnPhase) || (
    gameState.turnPhase === "optional-actions" &&
    !gameState.pendingTrade
  );

  const owner = blocking ? automatedBlockingOwner(gameState) : undefined;
  if (!owner) {
    automatedBlockWatches.delete(code);
    return false;
  }

  const signature = automatedBlockSignature(gameState);
  const now = Date.now();
  const watch = automatedBlockWatches.get(code);
  if (!watch || watch.signature !== signature) {
    automatedBlockWatches.set(code, { signature, since: now });
    return false;
  }

  if (now - watch.since < AUTOMATED_BLOCK_WATCHDOG_MS) {
    return false;
  }

  automatedBlockWatches.set(code, { signature, since: now });

  // First try the non-destructive reconciliation used by recovery/loading.
  const phaseBefore = gameState.turnPhase;
  syncBlockingTurnPhase(gameState);
  if (gameState.turnPhase !== phaseBefore) {
    pushGlobalNotice(gameState, {
      kind: "player-action",
      title: "🔧 Turn recovered",
      message: `${owner.name}'s stalled turn was safely resumed.`,
      playerId: owner.id,
      durationMs: 1800,
    });
    return true;
  }

  // If an automated blocker has survived repeated coordinator attempts, use a
  // conservative escape hatch. The authoritative state is preserved wherever
  // possible; only the unresolved decision itself is abandoned so one AI can
  // never hold the entire room forever.
  if (gameState.turnPhase === "card" && gameState.pendingCard?.playerId === owner.id) {
    const resumeAction = gameState.pendingCard.resumeAction;
    gameState.pendingCard = null;
    restoreAutomatedContinuation(gameState, resumeAction);
    pushGlobalNotice(gameState, {
      kind: "card-event",
      title: "🃏 Card resolution recovered",
      message: `${owner.name}'s card resolution was recovered so the match could continue.`,
      playerId: owner.id,
      presentation: "standard",
      durationMs: 2000,
    });
    return true;
  }

  if (
    gameState.turnPhase === "speed-die-choice" &&
    gameState.pendingSpeedDieAction?.playerId === owner.id
  ) {
    const resumeAction = gameState.pendingSpeedDieAction.resumeAction;
    gameState.pendingSpeedDieAction = null;
    restoreAutomatedContinuation(gameState, resumeAction);
    pushGlobalNotice(gameState, {
      kind: "speed-die",
      title: "🎲 Speed Die resolution recovered",
      message: `${owner.name}'s stalled Speed Die action was safely skipped so the match could continue.`,
      playerId: owner.id,
      presentation: "standard",
      durationMs: 2000,
    });
    return true;
  }

  if (
    gameState.turnPhase === "mega-choice" &&
    gameState.pendingMegaAction?.playerId === owner.id
  ) {
    const pending = gameState.pendingMegaAction;
    gameState.pendingMegaAction = null;
    if (pending.type === "bus-ticket") {
      gameState.awaitingReroll = false;
      setTurnPhase(gameState, "roll");
      syncBlockingTurnPhase(gameState);
    } else {
      restoreAutomatedContinuation(gameState, pending.resumeAction);
    }
    pushGlobalNotice(gameState, {
      kind: "player-action",
      title: "🔧 Mega action recovered",
      message: `${owner.name}'s stalled Mega action was safely resumed.`,
      playerId: owner.id,
      durationMs: 1800,
    });
    return true;
  }

  if (
    gameState.turnPhase === "purchase" &&
    gameState.pendingPurchase?.playerId === owner.id
  ) {
    gameState.pendingPurchase = null;
    restoreAutomatedContinuation(
      gameState,
      gameState.awaitingReroll ? "reroll" : "advance-turn",
    );
    pushGlobalNotice(gameState, {
      kind: "purchase-complete",
      title: "🔧 Purchase decision recovered",
      message: `${owner.name}'s stalled purchase decision was cleared so the match could continue.`,
      playerId: owner.id,
      durationMs: 1800,
    });
    return true;
  }

  if (
    gameState.turnPhase === "resolve-space" &&
    gameState.pendingJailMove?.playerId === owner.id
  ) {
    const result = resumePendingJailMove(gameState);
    syncBlockingTurnPhase(gameState);
    if (!result?.ok) {
      gameState.pendingJailMove = null;
      setTurnPhase(gameState, "optional-actions");
    }
    pushGlobalNotice(gameState, {
      kind: "player-action",
      title: "🔧 Movement recovered",
      message: `${owner.name}'s stalled movement was safely resumed.`,
      playerId: owner.id,
      durationMs: 1800,
    });
    return true;
  }

  if (
    gameState.turnPhase === "optional-actions" &&
    gameState.players[gameState.currentPlayerIndex]?.id === owner.id &&
    !gameState.pendingTrade
  ) {
    optionalActionsTaken.delete(actionKey(code, owner, gameState));
    advanceTurn(gameState);
    pushGlobalNotice(gameState, {
      kind: "player-action",
      title: "🔧 AI turn recovered",
      message: `${owner.name}'s stalled optional-actions phase was ended so the match could continue.`,
      playerId: owner.id,
      durationMs: 1800,
    });
    return true;
  }

  return false;
}

export function deferAutomation(
  code: string,
  delay = HUMAN_AUTOPILOT_TICK_MS,
): void {
  scheduleDelay(code, delay);
}

function logAutomation(
  player: GamePlayer,
  message: string,
): void {
  const controller =
    player.isAi
      ? "AI"
      : "Autopilot";

  console.log(
    `[${controller} ${player.name}] ${message}`,
  );
}

function activeAutomatedPlayer(
  gameState: GameState,
): GamePlayer | undefined {
  const player =
    gameState.players[
      gameState.currentPlayerIndex
    ];

  return isAutomatedPlayer(player)
    ? player
    : undefined;
}

function finishRollResolution(
  gameState: GameState,
  playerGetsAnotherTurn: boolean,
  turnAlreadyAdvanced: boolean,
): void {
  gameState.movedThisTurn = true;

  if (!turnAlreadyAdvanced) {
    if (gameState.pendingPurchase) {
      gameState.awaitingReroll =
        playerGetsAnotherTurn;
      setTurnPhase(
        gameState,
        "purchase",
      );
    } else if (gameState.pendingCard) {
      setTurnPhase(
        gameState,
        "card",
      );
    } else if (gameState.pendingDebt) {
      setTurnPhase(
        gameState,
        "debt",
      );
    } else if (
      gameState.pendingMegaAction
    ) {
      setTurnPhase(
        gameState,
        "mega-choice",
      );
    } else if (
      gameState.pendingSpeedDieAction
    ) {
      gameState.awaitingReroll =
        false;
      setTurnPhase(
        gameState,
        "speed-die-choice",
      );
    } else if (
      playerGetsAnotherTurn
    ) {
      gameState.awaitingReroll =
        true;
      setTurnPhase(
        gameState,
        "roll",
      );
    } else {
      setTurnPhase(
        gameState,
        "optional-actions",
      );
    }
  }

  syncBlockingTurnPhase(gameState);
  gameState.movedThisTurn = false;
}

function performAiOrderRoll(
  gameState: GameState,
  player: GamePlayer,
): void {
  const roll = rollTwoDice();
  player.orderRolls.push(roll.total);
  gameState.orderRollCompletedPlayerIds.push(
    player.id,
  );
  gameState.lastDiceRoll = {
    white1: roll.white1,
    white2: roll.white2,
    speed: null,
    movementTotal: roll.total,
  };

  const everyoneRolled =
    gameState.orderRollEligiblePlayerIds.every(
      (playerId) =>
        gameState.orderRollCompletedPlayerIds.includes(
          playerId,
        ),
    );

  if (everyoneRolled) {
    const tiedIds = findOrderRollTies(
      gameState.players,
    ).flatMap((group) =>
      group.map((candidate) =>
        candidate.id,
      ),
    );

    if (tiedIds.length > 0) {
      gameState.orderingRound += 1;
      gameState.orderRollEligiblePlayerIds =
        tiedIds;
      gameState.orderRollCompletedPlayerIds =
        [];
    } else {
      gameState.players.sort(
        compareOrderRolls,
      );
      gameState.phase = "playing";
      gameState.turnPhase = "roll";
      gameState.currentPlayerIndex = 0;
      gameState.turnNumber = 1;
      gameState.orderRollEligiblePlayerIds =
        [];
      gameState.orderRollCompletedPlayerIds =
        [];
      gameState.lastDiceRoll = null;
    }
  }

  logAutomation(
    player,
    `rolled ${roll.total} for turn order.`,
  );
}

function chooseBusTicketDestination(
  gameState: GameState,
  player: GamePlayer,
  positions: number[],
): number {
  const scored = positions
    .map((position) => ({
      position,
      score: scoreDestination(
        gameState,
        player,
        getBoardSpace(position)!,
      ),
    }))
    .sort(
      (first, second) =>
        second.score - first.score,
    );

  if (
    getAutomationDifficulty(player) === "easy" &&
    scored.length > 1
  ) {
    return scored[
      Math.floor(
        Math.random() *
          Math.min(4, scored.length),
      )
    ].position;
  }

  return scored[0]?.position ??
    positions[0];
}

function chooseTripleDestination(
  gameState: GameState,
  player: GamePlayer,
): number {
  const candidates = Array.from(
    { length: BOARD_SPACE_COUNT },
    (_, position) => position,
  ).filter(
    (position) =>
      position !== player.position,
  );

  const ranked = candidates
    .map((position) => ({
      position,
      score: scoreDestination(
        gameState,
        player,
        getBoardSpace(position)!,
      ),
    }))
    .sort(
      (first, second) =>
        second.score - first.score,
    );

  const choicePool =
    getAutomationDifficulty(player) === "easy"
      ? ranked.slice(0, 8)
      : getAutomationDifficulty(player) === "normal"
        ? ranked.slice(0, 3)
        : ranked.slice(0, 1);

  return choicePool[
    Math.floor(
      Math.random() *
        choicePool.length,
    )
  ]?.position ?? ranked[0].position;
}

function performAiRoll(
  gameState: GameState,
  player: GamePlayer,
): string {
  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  if (
    player.busTicketIds.length > 0 &&
    Math.random() <
      profile.busTicketChance
  ) {
    const startResult =
      startBusTicketUse(
        gameState,
        player.id,
      );

    if (!startResult.error) {
      return startResult.message;
    }
  }

  gameState.awaitingReroll = false;
  setTurnPhase(
    gameState,
    "resolve-space",
  );

  const speedDieActive = isSpeedDieActive(gameState);
  const roll = rollGameDice(speedDieActive);
  recordDiceRoll(gameState, player);
  const {
    white1,
    white2,
    speed,
    whiteTotal,
    movementTotal,
  } = roll;

  const rolledDoubles =
    white1 === white2;
  const rolledTriples =
    typeof speed === "number" &&
    white1 === white2 &&
    white1 === speed;

  gameState.lastDiceRoll = {
    white1,
    white2,
    speed,
    movementTotal,
  };
  gameState.rollSequence = (gameState.rollSequence ?? 0) + 1;

  if (rolledTriples) {
    gameState.consecutiveDoubles = 0;
    gameState.awaitingReroll = false;
    gameState.pendingSpeedDieAction = {
      type: "triple",
      playerId: player.id,
      resumeAction: "advance-turn",
      whiteDiceTotal: whiteTotal,
      tripleValue: speed,
    };
    setTurnPhase(
      gameState,
      "speed-die-choice",
    );

    return `${player.name} rolled triple ${speed}s.`;
  }

  let anotherTurn = false;
  let turnAdvanced = false;

  if (rolledDoubles) {
    gameState.consecutiveDoubles += 1;

    if (
      gameState.consecutiveDoubles >= 3
    ) {
      player.position = JAIL_POSITION;
      player.inJail = true;
      player.jailTurns = 0;
      gameState.consecutiveDoubles = 0;
      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: "🚔 Sent to Jail",
        message: `${player.name} rolled three consecutive doubles and was sent to Jail.`,
        playerId: player.id,
        presentation: "major",
        durationMs: 4400,
      });
      advanceTurn(gameState);
      turnAdvanced = true;
    } else {
      anotherTurn = true;
    }
  } else {
    gameState.consecutiveDoubles = 0;
  }

  let message = speed === null
    ? `${player.name} rolled ${white1} and ${white2}.`
    : `${player.name} rolled ${white1}, ${white2} and ${String(speed)}.`;

  if (!turnAdvanced) {
    const resumeAction =
      anotherTurn
        ? "reroll"
        : "advance-turn";

    if (speed === "bus") {
      collectAutomaticBusResultTicket(gameState, player);
      gameState.pendingSpeedDieAction = {
        type: "bus",
        playerId: player.id,
        resumeAction,
        whiteDiceTotal: whiteTotal,
        white1,
        white2,
      };
      setTurnPhase(gameState, "speed-die-choice");
      return `${player.name} rolled Bus, received any available Bus Ticket automatically, and is choosing a movement value.`;
    }

    if (speed === "mr-monopoly") {
      gameState.pendingSpeedDieAction = {
        type: "mr-monopoly",
        playerId: player.id,
        resumeAction,
        whiteDiceTotal: whiteTotal,
      };
    }

    const previousPosition =
      player.position;
    const nextPosition =
      (
        previousPosition +
        movementTotal
      ) % BOARD_SPACE_COUNT;

    if (
      previousPosition +
        movementTotal >=
      BOARD_SPACE_COUNT
    ) {
      player.cash += GO_SALARY;
      recordCashFlow(gameState, player, GO_SALARY);
      pushGlobalNotice(gameState, {
        kind: "go",
        title: "🏁 Passed GO",
        message: `${player.name} passed GO and collected £${GO_SALARY.toLocaleString()}.`,
        playerId: player.id,
        presentation: "standard",
        durationMs: 2800,
      });
    }

    player.position = nextPosition;

    const resolution =
      resolveLandedSpace({
        gameState,
        player,
        diceTotal: movementTotal,
        resumeAction,
      });

    message = resolution.message;

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
      anotherTurn = false;
      turnAdvanced = true;
    }
  }

  finishRollResolution(
    gameState,
    anotherTurn,
    turnAdvanced,
  );

  return message;
}


function performAiPurchase(
  io: Server,
  code: string,
  gameState: GameState,
  player: GamePlayer,
): string {
  const pending =
    gameState.pendingPurchase;
  const space = pending
    ? getBoardSpace(pending.spaceId)
    : undefined;

  if (
    !pending ||
    pending.playerId !== player.id ||
    !isOwnableBoardSpace(space)
  ) {
    gameState.pendingPurchase = null;
    setTurnPhase(
      gameState,
      "optional-actions",
    );
    return "Purchase state was cleared.";
  }

  if (
    player.cash >= space.price &&
    shouldPurchaseAsset(
      gameState,
      player,
      space.id,
    )
  ) {
    player.cash -= space.price;
    recordCashFlow(gameState, player, -space.price);
    player.properties.push(space.id);
    player.properties.sort((a, b) => a - b);
    gameState.propertyOwners[space.id] =
      player.id;
    resolvePurchaseDecision(gameState);
    pushGlobalNotice(gameState, {
      kind: "purchase-complete",
      title: "🏠 Property Purchased",
      message: `${player.name} purchased ${space.name} for £${space.price.toLocaleString()}.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 2600,
    });
    return `${player.name} bought ${space.name} for £${space.price}.`;
  }

  const auctionError = startAuction(
    gameState,
    space.id,
    player.id,
  );

  if (!auctionError) {
    syncAuctionTimer(io, code);
    return `${player.name} passed on ${space.name}.`;
  }

  resolvePurchaseDecision(gameState);
  return auctionError;
}

function performAiJailAction(
  gameState: GameState,
  player: GamePlayer,
): string {
  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  if (
    player.getOutOfJailCardIds.length > 0
  ) {
    const error = useGetOutOfJailCard(
      gameState,
      player,
    );

    if (!error) {
      player.inJail = false;
      player.jailTurns = 0;
      setTurnPhase(gameState, "roll");
      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: "🔓 Left Jail",
        message: `${player.name} used a Get Out of Jail Free card and left Jail.`,
        playerId: player.id,
        presentation: "standard",
        durationMs: 2400,
      });
      return `${player.name} used a Get Out of Jail Free card.`;
    }
  }

  const shouldPay =
    player.cash - JAIL_FINE >=
      profile.reserveCash &&
    (
      getAutomationDifficulty(player) === "hard" ||
      player.jailTurns >= 1
    );

  if (shouldPay) {
    player.inJail = false;
    player.jailTurns = 0;

    if (player.cash >= JAIL_FINE) {
      player.cash -= JAIL_FINE;
      recordCashFlow(gameState, player, -JAIL_FINE);
      addToFreeParkingPot(
        gameState,
        JAIL_FINE,
      );
      setTurnPhase(gameState, "roll");
      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: "🔓 Left Jail",
        message: `${player.name} paid the £${JAIL_FINE.toLocaleString()} Jail fine and was released.`,
        playerId: player.id,
        presentation: "standard",
        durationMs: 2400,
      });
      return `${player.name} paid the Jail fine.`;
    }

    createDebt(gameState, {
      debtorId: player.id,
      creditorId: null,
      amount: JAIL_FINE,
      reason: "Jail fine",
      resumeAction: "roll",
      freeParkingContribution:
        JAIL_FINE,
    });
    setTurnPhase(gameState, "debt");
    return `${player.name} must raise the Jail fine.`;
  }

  const roll = rollTwoDice();
  recordDiceRoll(gameState, player);
  const doubles =
    roll.white1 === roll.white2;

  gameState.lastDiceRoll = {
    white1: roll.white1,
    white2: roll.white2,
    speed: null,
    movementTotal: roll.total,
  };
  gameState.rollSequence = (gameState.rollSequence ?? 0) + 1;
  gameState.consecutiveDoubles = 0;
  gameState.awaitingReroll = false;

  if (doubles) {
    player.inJail = false;
    player.jailTurns = 0;
    pushGlobalNotice(gameState, {
      kind: "jail-event",
      title: "🎲 Doubles: Left Jail",
      message: `${player.name} rolled doubles and left Jail.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 2400,
    });
    moveAfterJailRoll(
      gameState,
      player,
      roll.total,
    );
    return `${player.name} rolled doubles and left Jail.`;
  }

  const failed = player.jailTurns + 1;

  if (failed < 3) {
    player.jailTurns = failed;
    advanceTurn(gameState);
    return `${player.name} remains in Jail.`;
  }

  player.inJail = false;
  player.jailTurns = 0;

  if (player.cash >= JAIL_FINE) {
    player.cash -= JAIL_FINE;
    recordCashFlow(gameState, player, -JAIL_FINE);
    addToFreeParkingPot(
      gameState,
      JAIL_FINE,
    );
    pushGlobalNotice(gameState, {
      kind: "jail-event",
      title: "🔓 Compulsory Jail Release",
      message: `${player.name} paid the compulsory £${JAIL_FINE.toLocaleString()} fine after the third failed Jail roll.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 2600,
    });
    moveAfterJailRoll(
      gameState,
      player,
      roll.total,
    );
    return `${player.name} paid after the third failed Jail roll.`;
  }

  gameState.pendingJailMove = {
    playerId: player.id,
    diceTotal: roll.total,
  };
  createDebt(gameState, {
    debtorId: player.id,
    creditorId: null,
    amount: JAIL_FINE,
    reason:
      "Jail fine after the third failed attempt",
    resumeAction: "jail-move",
    freeParkingContribution:
      JAIL_FINE,
  });
  setTurnPhase(gameState, "debt");
  return `${player.name} must raise the compulsory Jail fine.`;
}

function performAiSpeedChoice(
  gameState: GameState,
  player: GamePlayer,
): string {
  const pending =
    gameState.pendingSpeedDieAction;

  if (!pending) {
    setTurnPhase(
      gameState,
      "optional-actions",
    );
    return "Speed Die state cleared.";
  }

  let result;

  if (pending.type === "triple") {
    const destination =
      chooseTripleDestination(
        gameState,
        player,
      );
    result = resolveTripleMove(
      gameState,
      player.id,
      destination,
    );
  } else if (pending.type === "bus") {
    const choices = [pending.white1, pending.white2, pending.whiteDiceTotal]
      .filter((value, index, values) => values.indexOf(value) === index);

    const spaces = choices.reduce((best, candidate) => {
      const bestPosition = (player.position + best) % BOARD_SPACE_COUNT;
      const candidatePosition = (player.position + candidate) % BOARD_SPACE_COUNT;
      const bestSpace = getBoardSpace(bestPosition);
      const candidateSpace = getBoardSpace(candidatePosition);
      if (!bestSpace || !candidateSpace) return best;
      return scoreDestination(gameState, player, candidateSpace) >
        scoreDestination(gameState, player, bestSpace)
        ? candidate
        : best;
    }, choices[0] ?? pending.whiteDiceTotal);

    result = resolveBusMove(gameState, player.id, spaces);
  } else {
    result = resolveMrMonopolyMove(
      gameState,
      player.id,
    );
  }

  if (result.error) {
    // Do not let a malformed/restored Speed Die decision become an infinite AI
    // loop. The original turn continuation is still known on the pending action.
    gameState.pendingSpeedDieAction = null;
    restoreAutomatedContinuation(gameState, pending.resumeAction);
    return `${player.name}'s Speed Die choice recovered: ${result.error}`;
  }

  return result.message;
}

function performAiMegaChoice(
  io: Server,
  code: string,
  gameState: GameState,
  player: GamePlayer,
): string {
  const pending =
    gameState.pendingMegaAction;

  if (!pending) {
    setTurnPhase(
      gameState,
      "optional-actions",
    );
    return "Mega choice state cleared.";
  }

  if (pending.type === "birthday-gift") {
    const choice =
      player.cash < 1000 ||
      gameState.busTicketDeck.length < 1
        ? "cash"
        : "ticket";

    return chooseBirthdayGift(
      gameState,
      player.id,
      choice,
    ).message;
  }

  if (pending.type === "bus-ticket") {
    const destination =
      chooseBusTicketDestination(
        gameState,
        player,
        pending.allowedPositions,
      );

    return moveWithBusTicket(
      gameState,
      player.id,
      destination,
    ).message;
  }

  const ranked =
    pending.eligibleSpaceIds
      .map((spaceId) => ({
        spaceId,
        value: estimateAssetValue(
          gameState,
          player,
          spaceId,
        ),
      }))
      .sort(
        (first, second) =>
          second.value - first.value,
      );

  const result =
    chooseAuctionSpaceAsset(
      gameState,
      player.id,
      ranked[0]?.spaceId ??
        pending.eligibleSpaceIds[0],
    );

  if (result.auctionStarted) {
    syncAuctionTimer(io, code);
  }

  return result.message ||
    result.error ||
    "Auction choice completed.";
}

function groupHasBuildings(
  gameState: GameState,
  propertyId: number,
): boolean {
  const space = getBoardSpace(
    propertyId,
  );

  if (!isPropertyBoardSpace(space)) {
    return false;
  }

  return getPropertyGroupSpaces(
    space.group,
  ).some(
    (property) =>
      (gameState.propertyDevelopments[
        property.id
      ] ?? 0) > 0,
  );
}

function sellOneDevelopment(
  gameState: GameState,
  player: GamePlayer,
): boolean {
  const candidates = player.properties
    .map((spaceId) => ({
      space: getBoardSpace(spaceId),
      level:
        gameState.propertyDevelopments[
          spaceId
        ] ?? 0,
    }))
    .filter(
      (entry) =>
        entry.space?.type ===
          "property" &&
        entry.level > 0,
    )
    .sort(
      (first, second) =>
        second.level - first.level,
    );

  for (const candidate of candidates) {
    const space = candidate.space;

    if (!isPropertyBoardSpace(space)) {
      continue;
    }

    const group = getPropertyGroupSpaces(
      space.group,
    );
    const highest = Math.max(
      ...group.map(
        (property) =>
          gameState.propertyDevelopments[
            property.id
          ] ?? 0,
      ),
    );

    if (candidate.level !== highest) {
      continue;
    }

    if (
      candidate.level >= 1 &&
      candidate.level <= 4
    ) {
      gameState.bankInventory.houses += 1;
    } else if (candidate.level === 5) {
      if (
        gameState.bankInventory.houses < 4
      ) {
        continue;
      }
      gameState.bankInventory.hotels += 1;
      gameState.bankInventory.houses -= 4;
    } else if (candidate.level === 6) {
      if (
        gameState.bankInventory.hotels < 1
      ) {
        continue;
      }
      gameState.bankInventory.skyscrapers += 1;
      gameState.bankInventory.hotels -= 1;
    }

    gameState.propertyDevelopments[
      space.id
    ] =
      (candidate.level - 1) as BuildingLevel;
    const refund = Math.floor(
      space.houseCost / 2,
    );
    player.cash += refund;
    recordCashFlow(gameState, player, refund);
    return true;
  }

  return false;
}

function sellOneDepot(
  gameState: GameState,
  player: GamePlayer,
): boolean {
  const railroadId =
    player.properties.find(
      (spaceId) =>
        gameState.railroadDepots[
          spaceId
        ],
    );

  const railroad =
    railroadId === undefined
      ? undefined
      : getBoardSpace(railroadId);

  if (!isRailroadBoardSpace(railroad)) {
    return false;
  }

  gameState.railroadDepots[
    railroad.id
  ] = false;
  gameState.bankInventory.depots += 1;
  const refund = Math.floor(
    railroad.depotCost / 2,
  );
  player.cash += refund;
  recordCashFlow(gameState, player, refund);
  return true;
}

function mortgageOneAsset(
  gameState: GameState,
  player: GamePlayer,
): boolean {
  const candidate = player.properties
    .map((spaceId) =>
      getBoardSpace(spaceId),
    )
    .filter(isOwnableBoardSpace)
    .filter(
      (space) =>
        !gameState.mortgagedProperties[
          space.id
        ],
    )
    .filter(
      (space) =>
        space.type !== "railroad" ||
        !gameState.railroadDepots[
          space.id
        ],
    )
    .filter(
      (space) =>
        space.type !== "property" ||
        !getPropertyGroupSpaces(space.group).some(
          (candidate) =>
            gameState.propertyOwners[candidate.id] === player.id &&
            (gameState.propertyDevelopments[candidate.id] ?? 0) > 0,
        ),
    )
    .sort(
      (first, second) =>
        first.mortgage -
        second.mortgage,
    )[0];

  if (!candidate) {
    return false;
  }

  gameState.mortgagedProperties[
    candidate.id
  ] = true;
  player.cash += candidate.mortgage;
  recordCashFlow(gameState, player, candidate.mortgage);
  return true;
}

function performAiDebt(
  gameState: GameState,
  player: GamePlayer,
): string {
  const debt = gameState.pendingDebt;

  if (
    !debt ||
    debt.debtorId !== player.id
  ) {
    return "No AI debt action was required.";
  }

  if (settleDebtIfAffordable(gameState)) {
    resumePendingJailMove(gameState);
    return `${player.name} paid £${debt.amount}.`;
  }

  if (sellOneDepot(gameState, player)) {
    return `${player.name} sold a Train Depot to raise cash.`;
  }

  if (
    sellOneDevelopment(
      gameState,
      player,
    )
  ) {
    return `${player.name} sold a building to raise cash.`;
  }

  if (mortgageOneAsset(gameState, player)) {
    return `${player.name} mortgaged an asset to raise cash.`;
  }

  const error = declareBankruptcy(
    gameState,
    player.id,
  );

  return error ??
    `${player.name} declared bankruptcy.`;
}

function reserveBuilding(
  gameState: GameState,
  level: BuildingLevel,
): boolean {
  if (level <= 3) {
    if (gameState.bankInventory.houses < 1) {
      return false;
    }
    gameState.bankInventory.houses -= 1;
    return true;
  }

  if (level === 4) {
    if (gameState.bankInventory.hotels < 1) {
      return false;
    }
    gameState.bankInventory.hotels -= 1;
    gameState.bankInventory.houses += 4;
    return true;
  }

  if (level === 5) {
    if (
      gameState.bankInventory.skyscrapers < 1
    ) {
      return false;
    }
    gameState.bankInventory.skyscrapers -= 1;
    gameState.bankInventory.hotels += 1;
    return true;
  }

  return false;
}

function tryBuild(
  gameState: GameState,
  player: GamePlayer,
): string | null {
  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  const candidates = player.properties
    .map((spaceId) =>
      getBoardSpace(spaceId),
    )
    .filter(isPropertyBoardSpace)
    .sort(
      (first, second) =>
        estimateAssetValue(
          gameState,
          player,
          second.id,
        ) -
        estimateAssetValue(
          gameState,
          player,
          first.id,
        ),
    );

  for (const property of candidates) {
    const group = getPropertyGroupSpaces(
      property.group,
    );
    const owned = group.filter(
      (space) =>
        gameState.propertyOwners[
          space.id
        ] === player.id,
    );

    if (owned.length < group.length - 1) {
      continue;
    }

    if (
      owned.some(
        (space) =>
          gameState.mortgagedProperties[
            space.id
          ],
      )
    ) {
      continue;
    }

    const level =
      gameState.propertyDevelopments[
        property.id
      ] ?? 0;
    const lowest = Math.min(
      ...owned.map(
        (space) =>
          gameState.propertyDevelopments[
            space.id
          ] ?? 0,
      ),
    );

    if (
      level !== lowest ||
      level >= 6 ||
      player.cash -
        property.houseCost <
        profile.reserveCash
    ) {
      continue;
    }

    if (level === 5) {
      const complete =
        group.every(
          (space) =>
            gameState.propertyOwners[
              space.id
            ] === player.id,
        );
      const allHotels =
        group.every(
          (space) =>
            (gameState.propertyDevelopments[
              space.id
            ] ?? 0) >= 5,
        );

      if (!complete || !allHotels) {
        continue;
      }
    }

    if (!reserveBuilding(gameState, level)) {
      // A direct Hotel/Skyscraper is an inventory-shortage escape route only.
      // The shared planner simulates every skipped level, so AI players obey the
      // same colour-group even-building rules as human players.
      const directTargets: Array<5 | 6> = level < 5 ? [6, 5] : [6];
      let usedDirectBuild = false;

      for (const targetLevel of directTargets) {
        const plan = planDevelopmentToLevel(
          gameState,
          player.id,
          property.id,
          targetLevel,
        );

        if (
          !plan.ok ||
          player.cash - plan.totalCost < profile.reserveCash
        ) {
          continue;
        }

        player.cash -= plan.totalCost;
        recordCashFlow(gameState, player, -plan.totalCost);
        gameState.bankInventory = plan.endingInventory;
        for (const step of plan.steps) {
          gameState.propertyDevelopments[step.spaceId] = step.toLevel;
        }

        const targetName = targetLevel === 5 ? "Hotel" : "Skyscraper";
        pushGlobalNotice(gameState, {
          kind: "development",
          title: targetLevel === 5
            ? "🏨 House Shortage: Direct Hotel"
            : "🏙️ Building Shortage: Direct Skyscraper",
          message: `${player.name} used the Bank shortage rule to build a ${targetName} on ${property.name} for £${plan.totalCost.toLocaleString()}.`,
          playerId: player.id,
          presentation: "major",
          durationMs: 4200,
        });

        usedDirectBuild = true;
        break;
      }

      if (usedDirectBuild) {
        return `${player.name} used the Bank shortage rule to develop ${property.name}.`;
      }

      continue;
    }

    player.cash -= property.houseCost;
    recordCashFlow(gameState, player, -property.houseCost);
    gameState.propertyDevelopments[
      property.id
    ] =
      (level + 1) as BuildingLevel;

    const newLevel = (level + 1) as BuildingLevel;
    const developmentName = newLevel <= 4
      ? `${newLevel} house${newLevel === 1 ? "" : "s"}`
      : newLevel === 5
        ? "a Hotel"
        : "a Skyscraper";
    pushGlobalNotice(gameState, {
      kind: "development",
      title: newLevel === 5
        ? "🏨 Hotel Built"
        : newLevel === 6
          ? "🏙️ Skyscraper Built"
          : "🏠 Property Developed",
      message: `${player.name} developed ${property.name} to ${developmentName}.`,
      playerId: player.id,
      presentation: newLevel >= 5 ? "major" : "standard",
      durationMs: newLevel >= 5 ? 3600 : 2200,
    });

    return `${player.name} developed ${property.name}.`;
  }

  return null;
}

function tryBuildDepot(
  gameState: GameState,
  player: GamePlayer,
): string | null {
  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  if (gameState.bankInventory.depots < 1) {
    return null;
  }

  const railroad = player.properties
    .map((spaceId) =>
      getBoardSpace(spaceId),
    )
    .find(
      (space) =>
        isRailroadBoardSpace(space) &&
        !gameState.railroadDepots[
          space.id
        ] &&
        !gameState.mortgagedProperties[
          space.id
        ] &&
        player.cash -
          space.depotCost >=
          profile.reserveCash,
    );

  if (!isRailroadBoardSpace(railroad)) {
    return null;
  }

  player.cash -= railroad.depotCost;
  recordCashFlow(gameState, player, -railroad.depotCost);
  gameState.bankInventory.depots -= 1;
  gameState.railroadDepots[
    railroad.id
  ] = true;

  pushGlobalNotice(gameState, {
    kind: "development",
    title: "🚉 Train Depot Built",
    message: `${player.name} built a Train Depot on ${railroad.name}.`,
    playerId: player.id,
    presentation: "standard",
    durationMs: 2400,
  });

  return `${player.name} built a Train Depot on ${railroad.name}.`;
}

function tryUnmortgage(
  gameState: GameState,
  player: GamePlayer,
): string | null {
  const profile = getAiProfile(
    getAutomationDifficulty(player),
  );

  const asset = player.properties
    .map((spaceId) =>
      getBoardSpace(spaceId),
    )
    .filter(isOwnableBoardSpace)
    .filter(
      (space) =>
        gameState.mortgagedProperties[
          space.id
        ],
    )
    .sort(
      (first, second) =>
        estimateAssetValue(
          gameState,
          player,
          second.id,
        ) -
        estimateAssetValue(
          gameState,
          player,
          first.id,
        ),
    )[0];

  if (!asset) {
    return null;
  }

  const cost = Math.ceil(
    asset.mortgage * 1.1,
  );

  if (
    player.cash - cost <
    profile.reserveCash + 250
  ) {
    return null;
  }

  player.cash -= cost;
  recordCashFlow(gameState, player, -cost);
  gameState.mortgagedProperties[
    asset.id
  ] = false;

  return `${player.name} unmortgaged ${asset.name}.`;
}


function tryProposeAutomatedTrade(
  code: string,
  gameState: GameState,
  player: GamePlayer,
): string | null {
  if (gameState.pendingTrade || gameState.pendingDebt || gameState.pendingPurchase || gameState.pendingCard) return null;
  const key = `${code}:${gameState.turnNumber}:${player.id}`;
  if (automatedTradeAttempts.has(key)) return null;
  automatedTradeAttempts.add(key);

  const reserve = getAiProfile(getAutomationDifficulty(player)).reserveCash;
  const candidates = gameState.players
    .filter((candidate) => candidate.id !== player.id && !candidate.isBankrupt)
    .filter((candidate) => gameState.tradeRejectAllTurnByPlayerId?.[candidate.id] !== gameState.turnNumber)
    .flatMap((recipient) => recipient.properties.flatMap((spaceId) => {
      const space = getBoardSpace(spaceId);
      return isOwnableBoardSpace(space) ? [{ recipient, space }] : [];
    }))
    .filter((item) => {
      const space = item.space!;
      if (gameState.mortgagedProperties[space.id]) return false;
      if (
        isAutomatedTradeCoolingDown(
          code,
          gameState,
          player.id,
          item.recipient.id,
          [space.id],
          gameState.turnNumber,
        )
      ) {
        return false;
      }
      return true;
    })
    .map((item) => {
      const space = item.space!;
      let synergy = 0;
      if (space.type === "property") {
        synergy = getPropertyGroupSpaces(space.group).filter(
          (groupSpace) => gameState.propertyOwners[groupSpace.id] === player.id,
        ).length * 500;
      } else {
        synergy = player.properties.filter((id) => getBoardSpace(id)?.type === space.type).length * 250;
      }
      return { ...item, space, score: estimateAssetValue(gameState, player, space.id) + synergy };
    })
    .sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    const space = candidate.space;
    const recipientProfile = getAiProfile(getAutomationDifficulty(candidate.recipient));
    const recipientValue = estimateAssetValue(gameState, candidate.recipient, space.id);
    const proposerValue = estimateAssetValue(gameState, player, space.id);

    // Only make a cash offer when the buyer has a genuine strategic reason to
    // value the asset more highly than the seller. Price the offer near what
    // the recipient's own decision model requires instead of repeating a flat
    // 120% face-value bid that has already proven unrealistic in long games.
    const minimumLikelyAcceptance = Math.ceil(
      (recipientValue * recipientProfile.tradeThreshold) / 10,
    ) * 10;
    const baselineOffer = Math.ceil((space.price * 1.1) / 10) * 10;
    const offer = Math.max(baselineOffer, minimumLikelyAcceptance);
    const maximumStrategicOffer = Math.ceil((proposerValue * 1.08) / 10) * 10;

    if (
      offer <= 0 ||
      offer > maximumStrategicOffer ||
      player.cash - offer < reserve
    ) continue;

    gameState.pendingTrade = {
      id: `auto-trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      proposerId: player.id,
      recipientId: candidate.recipient.id,
      proposerCash: offer,
      recipientCash: 0,
      proposerPropertyIds: [],
      recipientPropertyIds: [space.id],
      proposerBusTicketIds: [],
      recipientBusTicketIds: [],
      proposerJailCardIds: [],
      recipientJailCardIds: [],
      proposerMortgageInterest: 0,
      recipientMortgageInterest: 0,
      status: "pending",
      createdAt: Date.now(),
    };
    const message = `${player.name} offered ${candidate.recipient.name} £${offer} for ${space.name}.`;
    recordActivity(gameState, message, "trade", player.id);
    return message;
  }
  return null;
}

function performAiOptionalAction(
  code: string,
  gameState: GameState,
  player: GamePlayer,
): string {
  const key = actionKey(
    code,
    player,
    gameState,
  );
  const count =
    optionalActionsTaken.get(key) ?? 0;
  const limit = getAiProfile(
    getAutomationDifficulty(player),
  ).optionalActionLimit;

  if (count < limit) {
    const action =
      tryProposeAutomatedTrade(code, gameState, player) ??
      tryUnmortgage(gameState, player) ??
      tryBuild(gameState, player) ??
      tryBuildDepot(gameState, player);

    if (action) {
      optionalActionsTaken.set(
        key,
        count + 1,
      );
      return action;
    }
  }

  optionalActionsTaken.delete(key);
  advanceTurn(gameState);
  return `${player.name} ended the turn.`;
}

function transferIds(
  from: string[],
  to: string[],
  selected: string[],
): void {
  const selectedSet = new Set(selected);
  const remaining = from.filter(
    (id) => !selectedSet.has(id),
  );
  from.splice(0, from.length, ...remaining);

  for (const id of selected) {
    if (!to.includes(id)) {
      to.push(id);
    }
  }
}

function transferProperties(
  gameState: GameState,
  from: GamePlayer,
  to: GamePlayer,
  propertyIds: number[],
): void {
  for (const propertyId of propertyIds) {
    from.properties =
      from.properties.filter(
        (id) => id !== propertyId,
      );
    if (!to.properties.includes(propertyId)) {
      to.properties.push(propertyId);
      to.properties.sort((a, b) => a - b);
    }
    gameState.propertyOwners[propertyId] =
      to.id;
  }
}

function tradeAssetValue(
  gameState: GameState,
  player: GamePlayer,
  propertyIds: number[],
  busTickets: number,
  jailCards: number,
  cash: number,
): number {
  return cash +
    propertyIds.reduce(
      (total, spaceId) =>
        total +
        estimateAssetValue(
          gameState,
          player,
          spaceId,
        ),
      0,
    ) +
    busTickets * 120 +
    jailCards * 180;
}

function tradeStillOwned(
  gameState: GameState,
  trade: TradeOffer,
): boolean {
  return (
    trade.proposerPropertyIds.every(
      (id) =>
        gameState.propertyOwners[id] ===
        trade.proposerId,
    ) &&
    trade.recipientPropertyIds.every(
      (id) =>
        gameState.propertyOwners[id] ===
        trade.recipientId,
    )
  );
}

function resolveAutomatedMultiPartyTrade(
  gameState: GameState,
  player: GamePlayer,
  trade: TradeOffer,
): string | null {
  const participantIds = trade.participantIds ?? [];
  if (
    !trade.multiParty ||
    !participantIds.includes(player.id) ||
    trade.proposerId === player.id ||
    (trade.acceptedPlayerIds ?? []).includes(player.id)
  ) {
    return null;
  }

  const validationError = validateMultiPartyTradeStillValid(gameState, trade);
  if (validationError) {
    trade.status = "declined";
    const message = `${player.name} declined an invalid ${participantIds.length}-way deal.`;
    gameState.lastTradeResult = {
      id: trade.id,
      proposerId: trade.proposerId,
      recipientId: trade.recipientId,
      participantIds: [...participantIds],
      status: "declined",
      message,
      resolvedAt: Date.now(),
    };
    gameState.pendingTrade = null;
    return message;
  }

  const incoming = (trade.transfers ?? [])
    .filter((leg) => leg.toPlayerId === player.id)
    .reduce(
      (total, leg) =>
        total +
        tradeAssetValue(
          gameState,
          player,
          leg.propertyIds,
          leg.busTicketIds.length,
          leg.jailCardIds.length,
          leg.cash,
        ),
      0,
    );
  const outgoing = (trade.transfers ?? [])
    .filter((leg) => leg.fromPlayerId === player.id)
    .reduce(
      (total, leg) =>
        total +
        tradeAssetValue(
          gameState,
          player,
          leg.propertyIds,
          leg.busTicketIds.length,
          leg.jailCardIds.length,
          leg.cash,
        ),
      0,
    ) + (trade.mortgageInterestByPlayerId?.[player.id] ?? 0);

  const threshold = getAiProfile(
    getAutomationDifficulty(player),
  ).tradeThreshold;

  if (incoming < outgoing * threshold) {
    trade.status = "declined";
    const message = `${player.name} declined the ${participantIds.length}-way deal.`;
    gameState.lastTradeResult = {
      id: trade.id,
      proposerId: trade.proposerId,
      recipientId: trade.recipientId,
      participantIds: [...participantIds],
      status: "declined",
      message,
      resolvedAt: Date.now(),
    };
    gameState.pendingTrade = null;
    return message;
  }

  trade.acceptedPlayerIds ??= [trade.proposerId];
  if (!trade.acceptedPlayerIds.includes(player.id)) {
    trade.acceptedPlayerIds.push(player.id);
  }

  const allAccepted = participantIds.every((id) => trade.acceptedPlayerIds!.includes(id));
  if (!allAccepted) {
    return `${player.name} accepted the ${participantIds.length}-way deal (${trade.acceptedPlayerIds.length}/${participantIds.length} approved).`;
  }

  executeMultiPartyTrade(gameState, trade);
  trade.status = "accepted";
  gameState.pendingTrade = null;
  const names = participantIds
    .map((id) => gameState.players.find((candidate) => candidate.id === id)?.name ?? "Player")
    .join(", ");
  const message = `The ${participantIds.length}-way deal between ${names} was accepted by everyone and completed.`;
  pushGlobalNotice(gameState, {
    kind: "trade-complete",
    title: `🤝 ${participantIds.length}-Way Deal Completed`,
    message,
    playerId: player.id,
    presentation: "standard",
    durationMs: 3600,
  });
  gameState.lastTradeResult = {
    id: trade.id,
    proposerId: trade.proposerId,
    recipientId: trade.recipientId,
    participantIds: [...participantIds],
    status: "accepted",
    message,
    resolvedAt: Date.now(),
  };
  return message;
}

export function resolveAiTrade(
  code: string,
  gameState: GameState,
  player: GamePlayer,
): string | null {
  const trade = gameState.pendingTrade;

  if (!trade) {
    return null;
  }

  if (trade.multiParty) {
    return resolveAutomatedMultiPartyTrade(gameState, player, trade);
  }

  if (trade.recipientId !== player.id) {
    return null;
  }

  const proposer = gameState.players.find(
    (candidate) =>
      candidate.id === trade.proposerId,
  );

  if (
    !proposer ||
    proposer.isBankrupt ||
    !tradeStillOwned(gameState, trade) ||
    proposer.cash < trade.proposerCash ||
    player.cash < trade.recipientCash
  ) {
    trade.status = "declined";
    const message = `${player.name} declined an invalid trade.`;
    gameState.lastTradeResult = {
      id: trade.id,
      proposerId: trade.proposerId,
      recipientId: trade.recipientId,
      status: "declined",
      message,
      resolvedAt: Date.now(),
    };
    rememberRejectedAutomatedTrade(code, gameState, trade);
    gameState.pendingTrade = null;
    return message;
  }

  const incoming = tradeAssetValue(
    gameState,
    player,
    trade.proposerPropertyIds,
    trade.proposerBusTicketIds.length,
    trade.proposerJailCardIds.length,
    trade.proposerCash,
  );
  const outgoing = tradeAssetValue(
    gameState,
    player,
    trade.recipientPropertyIds,
    trade.recipientBusTicketIds.length,
    trade.recipientJailCardIds.length,
    trade.recipientCash,
  ) + trade.recipientMortgageInterest;

  const threshold = getAiProfile(
    getAutomationDifficulty(player),
  ).tradeThreshold;

  if (
    incoming < outgoing * threshold ||
    player.cash -
      trade.recipientCash +
      trade.proposerCash -
      trade.recipientMortgageInterest <
      0
  ) {
    trade.status = "declined";
    const message = `${player.name} declined the trade.`;
    gameState.lastTradeResult = {
      id: trade.id,
      proposerId: trade.proposerId,
      recipientId: trade.recipientId,
      status: "declined",
      message,
      resolvedAt: Date.now(),
    };
    rememberRejectedAutomatedTrade(code, gameState, trade);
    gameState.pendingTrade = null;
    return message;
  }

  const proposerDelta =
    -trade.proposerCash +
    trade.recipientCash -
    trade.proposerMortgageInterest;
  const recipientDelta =
    -trade.recipientCash +
    trade.proposerCash -
    trade.recipientMortgageInterest;
  proposer.cash += proposerDelta;
  player.cash += recipientDelta;
  recordCashFlow(gameState, proposer, -trade.proposerCash);
  recordCashFlow(gameState, proposer, trade.recipientCash);
  recordCashFlow(gameState, proposer, -trade.proposerMortgageInterest);
  recordCashFlow(gameState, player, -trade.recipientCash);
  recordCashFlow(gameState, player, trade.proposerCash);
  recordCashFlow(gameState, player, -trade.recipientMortgageInterest);

  transferProperties(
    gameState,
    proposer,
    player,
    trade.proposerPropertyIds,
  );
  transferProperties(
    gameState,
    player,
    proposer,
    trade.recipientPropertyIds,
  );
  transferIds(
    proposer.busTicketIds,
    player.busTicketIds,
    trade.proposerBusTicketIds,
  );
  transferIds(
    player.busTicketIds,
    proposer.busTicketIds,
    trade.recipientBusTicketIds,
  );
  transferIds(
    proposer.getOutOfJailCardIds,
    player.getOutOfJailCardIds,
    trade.proposerJailCardIds,
  );
  transferIds(
    player.getOutOfJailCardIds,
    proposer.getOutOfJailCardIds,
    trade.recipientJailCardIds,
  );

  for (const candidate of [
    proposer,
    player,
  ]) {
    candidate.busTickets =
      candidate.busTicketIds.length;
    candidate.getOutOfJailCards =
      candidate.getOutOfJailCardIds.length;
  }

  trade.status = "accepted";
  const message = `${player.name} accepted ${proposer.name}'s trade.`;
  pushGlobalNotice(gameState, {
    kind: "trade-complete",
    title: "🤝 Trade Completed",
    message,
    playerId: player.id,
    presentation: "standard",
    durationMs: 2800,
  });
  gameState.lastTradeResult = {
    id: trade.id,
    proposerId: trade.proposerId,
    recipientId: trade.recipientId,
    status: "accepted",
    message,
    resolvedAt: Date.now(),
  };
  gameState.pendingTrade = null;
  return message;
}

function expireStaleAutomatedHumanTrade(
  code: string,
  gameState: GameState,
): string | null {
  const trade = gameState.pendingTrade;
  if (!trade || trade.multiParty || Date.now() - trade.createdAt < AUTOMATED_TRADE_RESPONSE_TIMEOUT_MS) {
    return null;
  }

  const proposer = gameState.players.find((candidate) => candidate.id === trade.proposerId);
  const recipient = gameState.players.find((candidate) => candidate.id === trade.recipientId);
  const recipientIsAutomated = Boolean(
    recipient &&
    !recipient.isBankrupt &&
    (recipient.isAi || recipient.autopilotEnabled),
  );
  if (!proposer || !recipient || !isAutomatedPlayer(proposer) || recipientIsAutomated) {
    return null;
  }

  trade.status = "cancelled";
  const message = `${proposer.name}'s trade offer to ${recipient.name} expired so the match could continue.`;
  gameState.lastTradeResult = {
    id: trade.id,
    proposerId: trade.proposerId,
    recipientId: trade.recipientId,
    status: "auto-declined",
    message,
    resolvedAt: Date.now(),
  };
  rememberRejectedAutomatedTrade(code, gameState, trade);
  gameState.pendingTrade = null;
  pushGlobalNotice(gameState, {
    kind: "trade-complete",
    title: "🤝 Trade offer expired",
    message,
    playerId: proposer.id,
    presentation: "standard",
    durationMs: 2200,
  });
  return message;
}

function performAiAuction(
  io: Server,
  code: string,
  gameState: GameState,
): string | null {
  const auction = gameState.pendingAuction;

  if (!auction) {
    return null;
  }

  const automatedBidders =
    auction.activeBidderIds
      .map((playerId) =>
        gameState.players.find(
          (player) =>
            player.id === playerId &&
            isAutomatedPlayer(player),
        ),
      )
      .filter(
        (player): player is GamePlayer =>
          Boolean(player),
      );

  for (const player of automatedBidders) {
    if (
      auction.highestBidderId ===
      player.id
    ) {
      continue;
    }

    const decisionKey =
      `${auction.id}:${player.id}:${auction.currentBid}`;

    if (
      auctionDecisionKeys.has(
        decisionKey,
      )
    ) {
      continue;
    }

    auctionDecisionKeys.add(
      decisionKey,
    );

    const limit = getAuctionLimit(
      gameState,
      player,
      auction.spaceId,
    );
    const difficulty =
      getAutomationDifficulty(player);
    const allowedIncrements =
      difficulty === "hard"
        ? [100, 50, 10]
        : difficulty === "normal"
          ? [50, 10]
          : [10];
    const increment =
      allowedIncrements.find(
        (candidate) =>
          auction.currentBid +
            candidate <=
          limit,
      );

    if (increment !== undefined) {
      const amount =
        auction.currentBid +
        increment;
      const result = placeAuctionBid(
        gameState,
        player.id,
        amount,
      );

      if (result.error) {
        continue;
      }

      syncAuctionTimer(io, code);
      const message = `${player.name} bid £${amount}.`;
      recordActivity(gameState, message, "auction", player.id, { announce: false });
      return message;
    }

    const result = withdrawAuctionBidder(
      gameState,
      player.id,
    );

    if (!result.error) {
      syncAuctionTimer(io, code);
      const message = `${player.name} withdrew from the auction.`;
      recordActivity(gameState, message, "auction", player.id, { announce: false });
      return message;
    }
  }

  return null;
}

function automatedActivityKind(
  phase: GameState["turnPhase"],
  message: string,
): GameActivityKind {
  switch (phase) {
    case "roll":
      return /offered .* for /i.test(message) ? "trade" : "roll";
    case "purchase":
      return "purchase";
    case "card":
      return "card";
    case "jail-decision":
      return "jail";
    case "speed-die-choice":
    case "mega-choice":
      return "mega";
    case "debt":
      return "debt";
    case "optional-actions":
      if (/trade|offered .* for /i.test(message)) return "trade";
      if (/mortgag/i.test(message)) return "mortgage";
      if (/developed|built a Train Depot/i.test(message)) return "building";
      return "turn";
    default:
      return "game";
  }
}

function tickRoom(
  io: Server,
  code: string,
): void {
  const room = rooms.get(code);
  const gameState = room?.gameState;

  if (
    !room?.started ||
    !gameState ||
    gameState.phase === "finished"
  ) {
    return;
  }

  if (checkAutomatedBlockWatchdog(code, gameState)) {
    emitGameState(io, code, gameState);
    scheduleDelay(code, 250);
    return;
  }

  const scheduledActionAt = nextActionAt.get(code) ?? 0;
  const scheduledDelayRemaining = scheduledActionAt - Date.now();
  const scheduledPlayer = gameState.players[gameState.currentPlayerIndex];
  const staleAutopilotRoll = Boolean(
    gameState.turnPhase === "roll" &&
      scheduledPlayer?.autopilotEnabled &&
      !scheduledPlayer.isBankrupt &&
      scheduledDelayRemaining > 5000,
  );

  // Autopilot must never leave a room parked forever on "Ready To Roll".
  // Normal human-autopilot pacing is preserved, but an unexpectedly stale
  // scheduler deadline is ignored so the coordinator can recover the turn.
  if (Date.now() < scheduledActionAt && !staleAutopilotRoll) {
    return;
  }

  if (gameState.phase === "ordering") {
    const activeRollerId =
      gameState.orderRollEligiblePlayerIds.find(
        (playerId) =>
          !gameState.orderRollCompletedPlayerIds.includes(playerId),
      );
    const aiPlayer = gameState.players.find(
      (player) =>
        player.id === activeRollerId &&
        player.isAi,
    );

    if (!aiPlayer) {
      return;
    }

    performAiOrderRoll(
      gameState,
      aiPlayer,
    );
    emitGameState(io, code, gameState);
    scheduleDelay(code);
    return;
  }

  const auctionAction =
    performAiAuction(
      io,
      code,
      gameState,
    );

  if (auctionAction) {
    emitGameState(io, code, gameState);
    scheduleDelay(code, 450);
    return;
  }

  const expiredAutomatedTrade = expireStaleAutomatedHumanTrade(code, gameState);
  if (expiredAutomatedTrade) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    recordActivity(
      gameState,
      expiredAutomatedTrade,
      "trade",
      currentPlayer?.id,
    );
    emitGameState(io, code, gameState);
    scheduleDelay(code, 250);
    return;
  }

  const tradeRecipient =
    gameState.pendingTrade
      ? gameState.pendingTrade.multiParty
        ? gameState.players.find(
            (player) =>
              gameState.pendingTrade?.participantIds?.includes(player.id) &&
              player.id !== gameState.pendingTrade?.proposerId &&
              !(gameState.pendingTrade?.acceptedPlayerIds ?? []).includes(player.id) &&
              isAutomatedPlayer(player),
          )
        : gameState.players.find(
            (player) =>
              player.id === gameState.pendingTrade?.recipientId &&
              isAutomatedPlayer(player),
          )
      : undefined;

  if (tradeRecipient) {
    const message = resolveAiTrade(
      code,
      gameState,
      tradeRecipient,
    );

    if (message) {
      recordActivity(gameState, message, "trade", tradeRecipient.id);
      logAutomation(tradeRecipient, message);
      emitGameState(io, code, gameState);
      scheduleDelay(code);
      return;
    }
  }

  if (gameState.pendingTrade) {
    // A human recipient is considering an automated offer. Do not let the
    // automated proposer end the turn or mutate the offer underneath them.
    return;
  }

  // Blocking decision watchdog: resolve automated purchase/card decisions by
  // the decision owner, even if recovery left currentPlayerIndex temporarily
  // out of sync. This prevents an AI/Autopilot purchase or card from freezing
  // every human client on a "waiting for current player" panel.
  if (gameState.pendingPurchase) {
    const decisionPlayer = gameState.players.find(
      (candidate) => candidate.id === gameState.pendingPurchase?.playerId,
    );

    if (!decisionPlayer || decisionPlayer.isBankrupt) {
      gameState.pendingPurchase = null;
      syncBlockingTurnPhase(gameState);
      emitGameState(io, code, gameState);
      scheduleDelay(code);
      return;
    }

    if (isAutomatedPlayer(decisionPlayer)) {
      const message = performAiPurchase(io, code, gameState, decisionPlayer);
      recordActivity(gameState, message, "purchase", decisionPlayer.id);
      logAutomation(decisionPlayer, message);
      emitGameState(io, code, gameState);
      scheduleDelay(code, decisionPlayer.isAi ? AI_TICK_MS : HUMAN_AUTOPILOT_TICK_MS);
      return;
    }
  }

  if (gameState.pendingCard) {
    const decisionPlayer = gameState.players.find(
      (candidate) => candidate.id === gameState.pendingCard?.playerId,
    );

    if (!decisionPlayer || decisionPlayer.isBankrupt) {
      gameState.pendingCard = null;
      syncBlockingTurnPhase(gameState);
      emitGameState(io, code, gameState);
      scheduleDelay(code);
      return;
    }

    if (isAutomatedPlayer(decisionPlayer)) {
      const pending = gameState.pendingCard;
      let message = `${decisionPlayer.name} resolved a card.`;

      try {
        const error = resolvePendingCard(gameState, decisionPlayer.id);
        if (error) {
          // An automated seat has nobody who can click past a broken card.
          // Clear only that card blocker and recover the intended continuation.
          if (gameState.pendingCard?.cardId === pending?.cardId) {
            gameState.pendingCard = null;
          }
          restoreAutomatedContinuation(gameState, pending?.resumeAction ?? "advance-turn");
          message = `${decisionPlayer.name}'s card resolution recovered: ${error}`;
        }
      } catch (error) {
        console.error(`Automated card resolution failed for ${decisionPlayer.name}:`, error);
        if (gameState.pendingCard?.cardId === pending?.cardId) {
          gameState.pendingCard = null;
        }
        restoreAutomatedContinuation(gameState, pending?.resumeAction ?? "advance-turn");
        message = `${decisionPlayer.name}'s card resolution recovered after an internal error.`;
      }

      syncBlockingTurnPhase(gameState);
      recordActivity(gameState, message, "card", decisionPlayer.id, { announce: false });
      logAutomation(decisionPlayer, message);
      emitGameState(io, code, gameState);
      scheduleDelay(code, decisionPlayer.isAi ? AI_TICK_MS : HUMAN_AUTOPILOT_TICK_MS);
      return;
    }
  }

  const player = activeAutomatedPlayer(gameState);

  if (!player) {
    return;
  }

  let message = "";
  const phaseBeforeAction = gameState.turnPhase;

  switch (gameState.turnPhase) {
    case "roll":
      message = tryProposeAutomatedTrade(code, gameState, player) ?? performAiRoll(
        gameState,
        player,
      );
      break;

    case "purchase":
      message = performAiPurchase(
        io,
        code,
        gameState,
        player,
      );
      break;

    case "card": {
      const pending = gameState.pendingCard;
      try {
        const error = resolvePendingCard(
          gameState,
          player.id,
        );
        if (error) {
          if (gameState.pendingCard?.cardId === pending?.cardId) {
            gameState.pendingCard = null;
          }
          restoreAutomatedContinuation(gameState, pending?.resumeAction ?? "advance-turn");
          message = `${player.name}'s card resolution recovered: ${error}`;
        } else {
          message = `${player.name} resolved a card.`;
        }
      } catch (error) {
        console.error(`Automated card resolution failed for ${player.name}:`, error);
        if (gameState.pendingCard?.cardId === pending?.cardId) {
          gameState.pendingCard = null;
        }
        restoreAutomatedContinuation(gameState, pending?.resumeAction ?? "advance-turn");
        message = `${player.name}'s card resolution recovered after an internal error.`;
      }
      syncBlockingTurnPhase(gameState);
      break;
    }

    case "jail-decision":
      message = performAiJailAction(
        gameState,
        player,
      );
      break;

    case "speed-die-choice":
      message = performAiSpeedChoice(
        gameState,
        player,
      );
      break;

    case "mega-choice":
      message = performAiMegaChoice(
        io,
        code,
        gameState,
        player,
      );
      break;

    case "debt":
      message = performAiDebt(
        gameState,
        player,
      );
      break;

    case "optional-actions":
      message = performAiOptionalAction(
        code,
        gameState,
        player,
      );
      break;

    case "resolve-space":
      syncBlockingTurnPhase(gameState);
      message =
        `${player.name} completed space resolution.`;
      break;

    case "auction":
      return;

    default:
      return;
  }

  recordActivity(
    gameState,
    message,
    automatedActivityKind(phaseBeforeAction, message),
    player.id,
  );
  logAutomation(player, message);
  emitGameState(io, code, gameState);
  scheduleDelay(
    code,
    player.isAi ? AI_TICK_MS : HUMAN_AUTOPILOT_TICK_MS,
  );
}

export function runAiTickOnce(
  io: Server,
  code: string,
  force = false,
): void {
  if (force) {
    nextActionAt.delete(code);
  }

  tickRoom(io, code);
}

export function startAiCoordinator(
  io: Server,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    for (const code of rooms.keys()) {
      try {
        runAiTickOnce(io, code);
      } catch (error) {
        console.error(
          `AI action failed in room ${code}:`,
          error,
        );

        const room = rooms.get(code);
        const gameState = room?.gameState;
        const player = gameState?.players[gameState.currentPlayerIndex];
        if (
          gameState &&
          player &&
          isAutomatedPlayer(player) &&
          gameState.turnPhase === "optional-actions" &&
          !gameState.pendingTrade
        ) {
          optionalActionsTaken.delete(actionKey(code, player, gameState));
          advanceTurn(gameState);
          pushGlobalNotice(gameState, {
            kind: "player-action",
            title: "🔧 AI turn recovered",
            message: `${player.name}'s optional action failed, so the turn was safely ended.`,
            playerId: player.id,
            durationMs: 1800,
          });
          emitGameState(io, code, gameState);
          scheduleDelay(code, 250);
          continue;
        }

        scheduleDelay(code, 1500);
      }
    }
  }, 200);
}
