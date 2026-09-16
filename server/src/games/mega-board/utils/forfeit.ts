import {
  BOARD_SPACES,
} from "../../../../../shared/games/mega-board/board.js";

import {
  compareOrderRolls,
  findOrderRollTies,
  type GamePlayer,
  type GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  advanceTurn,
} from "./game-state.js";

import {
  syncBusTicketCounts,
} from "./mega-rules.js";

import { ensurePlayerStats, markEliminated } from "./stats.js";
import { pushGlobalNotice, recordActivity } from "./activity.js";
import { syncSpeedDieRetirement } from "./speed-die-lifecycle.js";

function returnDevelopmentToBank(
  gameState: GameState,
  propertyId: number,
): void {
  const level =
    gameState.propertyDevelopments[
      propertyId
    ] ?? 0;

  if (level >= 1 && level <= 4) {
    gameState.bankInventory.houses +=
      level;
  } else if (level === 5) {
    gameState.bankInventory.hotels += 1;
  } else if (level === 6) {
    gameState.bankInventory.skyscrapers +=
      1;
  }

  gameState.propertyDevelopments[
    propertyId
  ] = 0;
}

function returnAssetsToBank(
  gameState: GameState,
  player: GamePlayer,
): void {
  for (
    const propertyId
    of [...player.properties]
  ) {
    const space =
      BOARD_SPACES[propertyId];

    if (space?.type === "property") {
      returnDevelopmentToBank(
        gameState,
        propertyId,
      );
    }

    if (
      space?.type === "railroad" &&
      gameState.railroadDepots[
        propertyId
      ]
    ) {
      gameState.railroadDepots[
        propertyId
      ] = false;
      gameState.bankInventory.depots += 1;
    }

    gameState.propertyOwners[
      propertyId
    ] = null;
    gameState.mortgagedProperties[
      propertyId
    ] = false;
    gameState.railroadDepots[
      propertyId
    ] = false;
  }

  player.properties = [];
  player.busTicketIds ??= [];
  gameState.busTicketsDiscarded ??= [];
  gameState.busTicketsDiscarded.push(
    ...player.busTicketIds,
  );

  for (
    const cardId
    of player.getOutOfJailCardIds
  ) {
    if (cardId.startsWith("chance-")) {
      gameState.chanceDeck.push(cardId);
    } else {
      gameState.communityChestDeck.push(
        cardId,
      );
    }
  }

  player.cash = 0;
  player.busTickets = 0;
  player.busTicketIds = [];
  player.getOutOfJailCards = 0;
  player.getOutOfJailCardIds = [];

  syncBusTicketCounts(gameState);
}

function clearPendingPlayerActions(
  gameState: GameState,
  playerId: string,
): void {
  if (
    gameState.pendingPurchase
      ?.playerId === playerId
  ) {
    gameState.pendingPurchase = null;
  }

  if (
    gameState.pendingCard
      ?.playerId === playerId
  ) {
    gameState.pendingCard = null;
  }

  if (
    gameState.pendingDebt
      ?.debtorId === playerId
  ) {
    gameState.pendingDebt = null;
  } else if (
    gameState.pendingDebt
      ?.creditorId === playerId
  ) {
    gameState.pendingDebt.creditorId =
      null;
  }

  if (
    gameState.pendingJailMove
      ?.playerId === playerId
  ) {
    gameState.pendingJailMove = null;
  }

  if (
    gameState.pendingMegaAction
      ?.playerId === playerId
  ) {
    gameState.pendingMegaAction = null;
  }

  if (
    gameState.pendingSpeedDieAction
      ?.playerId === playerId
  ) {
    gameState.pendingSpeedDieAction =
      null;
  }

  if (
    gameState.pendingTrade &&
    (
      gameState.pendingTrade.proposerId === playerId ||
      gameState.pendingTrade.recipientId === playerId ||
      gameState.pendingTrade.participantIds?.includes(playerId)
    )
  ) {
    gameState.pendingTrade = null;
  }

  gameState.orderRollEligiblePlayerIds =
    gameState.orderRollEligiblePlayerIds.filter(
      (candidateId) =>
        candidateId !== playerId,
    );
  gameState.orderRollCompletedPlayerIds =
    gameState.orderRollCompletedPlayerIds.filter(
      (candidateId) =>
        candidateId !== playerId,
    );
}

function continueOrderingAfterForfeit(
  gameState: GameState,
): void {
  if (gameState.phase !== "ordering") {
    return;
  }

  const everyoneEligibleHasRolled =
    gameState.orderRollEligiblePlayerIds.every(
      (playerId) =>
        gameState.orderRollCompletedPlayerIds.includes(
          playerId,
        ),
    );

  if (!everyoneEligibleHasRolled) {
    return;
  }

  const activePlayers =
    gameState.players.filter(
      (player) => !player.isBankrupt,
    );
  const tiedGroups =
    findOrderRollTies(activePlayers);
  const tiedPlayerIds =
    tiedGroups.flatMap((group) =>
      group.map((player) => player.id),
    );

  if (tiedPlayerIds.length > 0) {
    gameState.orderingRound += 1;
    gameState.orderRollEligiblePlayerIds =
      tiedPlayerIds;
    gameState.orderRollCompletedPlayerIds =
      [];
    return;
  }

  gameState.players.sort(compareOrderRolls);
  gameState.phase = "playing";
  gameState.turnPhase = "roll";
  gameState.currentPlayerIndex = 0;
  gameState.turnNumber = 1;
  gameState.orderRollEligiblePlayerIds = [];
  gameState.orderRollCompletedPlayerIds = [];
  gameState.lastDiceRoll = null;
}

export function forfeitGamePlayer(
  gameState: GameState,
  playerId: string,
): string | null {
  const player =
    gameState.players.find(
      (candidate) =>
        candidate.id === playerId,
    );

  if (!player) {
    return "The player could not be found.";
  }

  if (player.isBankrupt) {
    return null;
  }

  const wasOrdering =
    gameState.phase === "ordering";
  const wasCurrentPlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ]?.id === playerId;

  markEliminated(gameState, player);
  const speedDieWasRetired = Boolean(gameState.speedDieRetired);
  returnAssetsToBank(
    gameState,
    player,
  );
  syncSpeedDieRetirement(gameState);
  if (speedDieWasRetired && !gameState.speedDieRetired) {
    recordActivity(
      gameState,
      `Speed Die reactivated because ${player.name}'s forfeited assets returned to the Bank.`,
      "mega",
      undefined,
      { announce: false },
    );
    pushGlobalNotice(gameState, {
      kind: "speed-die",
      title: "🎲 Speed Die Returns",
      message: `${player.name}'s assets returned to the Bank. The red Speed Die is back in play.`,
      presentation: "major",
      durationMs: 3400,
    });
  }
  clearPendingPlayerActions(
    gameState,
    playerId,
  );

  player.isBankrupt = true;
  player.autopilotEnabled = false;
  player.isConnected = false;
  player.inJail = false;
  player.jailTurns = 0;

  continueOrderingAfterForfeit(
    gameState,
  );

  const activePlayers =
    gameState.players.filter(
      (candidate) =>
        !candidate.isBankrupt,
    );

  if (activePlayers.length === 1) {
    ensurePlayerStats(gameState, activePlayers[0]).finishPosition = 1;
    gameState.phase = "finished";
    gameState.turnPhase = "finished";
    gameState.winnerId =
      activePlayers[0].id;
    gameState.currentPlayerIndex =
      gameState.players.findIndex(
        (candidate) =>
          candidate.id ===
          activePlayers[0].id,
      );
    pushGlobalNotice(gameState, {
      kind: "winner",
      title: "👑 GAME WINNER",
      message: `${activePlayers[0].name} has won the game!`,
      playerId: activePlayers[0].id,
      presentation: "major",
      steps: [
        `${player.name} forfeited the match.`,
        `${activePlayers[0].name} is the last player standing.`,
        `Congratulations ${activePlayers[0].name}!`,
      ],
      durationMs: 7000,
    });
    return null;
  }

  if (
    wasCurrentPlayer &&
    !wasOrdering &&
    gameState.phase === "playing"
  ) {
    advanceTurn(gameState);
  }

  return null;
}
