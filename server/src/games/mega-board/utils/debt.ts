import {
  BOARD_SPACES,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import type {
  BuildingLevel,
  GamePlayer,
  GameState,
  PendingDebt,
} from "../../../../../shared/games/mega-board/game-state.js";

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
  syncBusTicketCounts,
} from "./mega-rules.js";

import {
  getMortgageTransferInterest,
} from "./mortgage-transfer.js";

import { pushGlobalNotice, recordActivity } from "./activity.js";
import { syncSpeedDieRetirement } from "./speed-die-lifecycle.js";
import { ensurePlayerStats, markEliminated, recordCashFlow, recordRentStats } from "./stats.js";

export function createDebt(
  gameState: GameState,
  debt: PendingDebt,
): void {
  const amount = Math.max(
    0,
    Math.floor(debt.amount),
  );

  const creditorShares = debt.creditorShares
    ?.map((share) => ({
      creditorId: share.creditorId,
      amount: Math.max(0, Math.floor(share.amount)),
    }))
    .filter((share) => share.amount > 0);

  gameState.pendingDebt = {
    ...debt,
    amount,
    ...(creditorShares?.length
      ? { creditorShares }
      : { creditorShares: undefined }),
    freeParkingContribution:
      debt.freeParkingContribution ===
      undefined
        ? undefined
        : Math.min(
            amount,
            Math.max(
              0,
              Math.floor(
                debt.freeParkingContribution,
              ),
            ),
          ),
  };
}

export function settleDebtIfAffordable(
  gameState: GameState,
): boolean {
  const debt = gameState.pendingDebt;

  if (!debt) {
    return false;
  }

  const debtor = gameState.players.find(
    (player) => player.id === debt.debtorId,
  );

  if (
    !debtor ||
    debtor.isBankrupt ||
    debtor.cash < debt.amount
  ) {
    return false;
  }

  debtor.cash -= debt.amount;

  const sharedCreditors = debt.creditorShares
    ?.map((share) => ({
      share,
      creditor: gameState.players.find(
        (player) => player.id === share.creditorId && !player.isBankrupt,
      ) ?? null,
    }))
    .filter(({ creditor }) => Boolean(creditor));

  if (sharedCreditors?.length) {
    let distributed = 0;
    for (const { share, creditor } of sharedCreditors) {
      if (!creditor) continue;
      creditor.cash += share.amount;
      distributed += share.amount;
      if (debt.reason.startsWith("Rent for ")) {
        recordRentStats(gameState, debtor, creditor, share.amount);
      } else {
        recordCashFlow(gameState, creditor, share.amount);
      }
    }

    if (debt.reason.startsWith("Rent for ")) {
      const propertyName = debt.reason.replace(/^Rent for /, "");
      const recipients = sharedCreditors
        .map(({ share, creditor }) => `${creditor?.name ?? "Player"} £${share.amount.toLocaleString()}`)
        .join(", ");
      pushGlobalNotice(gameState, {
        kind: "rent-payment",
        title: "🤝 Shared Maximum Rent",
        message: `${debtor.name} paid £${debt.amount.toLocaleString()} for ${propertyName}, split between ${recipients}.`,
        playerId: debtor.id,
        presentation: "major",
      });
    } else {
      recordCashFlow(gameState, debtor, -distributed);
    }

    const undistributed = Math.max(0, debt.amount - distributed);
    if (undistributed > 0) {
      recordCashFlow(gameState, debtor, -undistributed);
    }
  } else if (debt.creditorId) {
    const creditor = gameState.players.find(
      (player) => player.id === debt.creditorId,
    );

    if (creditor && !creditor.isBankrupt) {
      creditor.cash += debt.amount;
      if (debt.reason.startsWith("Rent for ")) {
        recordRentStats(gameState, debtor, creditor, debt.amount);
        const propertyName = debt.reason.replace(/^Rent for /, "");
        pushGlobalNotice(gameState, {
          kind: "rent-payment",
          title: "💷 Rent Paid",
          message: `${debtor.name} paid ${creditor.name} £${debt.amount.toLocaleString()} for ${propertyName}.`,
          playerId: debtor.id,
        });
      } else {
        recordCashFlow(gameState, debtor, -debt.amount);
        recordCashFlow(gameState, creditor, debt.amount);
      }
    } else {
      recordCashFlow(gameState, debtor, -debt.amount);
    }
  } else {
    recordCashFlow(gameState, debtor, -debt.amount);
  }

  if (!debt.creditorId &&
    debt.freeParkingContribution
  ) {
    addToFreeParkingPot(
      gameState,
      debt.freeParkingContribution,
    );
  }

  if (/^Jail fine/i.test(debt.reason)) {
    pushGlobalNotice(gameState, {
      kind: "jail-event",
      title: "🔓 Jail Fine Paid",
      message: `${debtor.name} raised the money, paid £${debt.amount.toLocaleString()} and is free to continue.`,
      playerId: debtor.id,
      presentation: "major",
      durationMs: 4000,
    });
  }

  const resumeAction = debt.resumeAction;
  const resumePhase = debt.resumePhase;
  gameState.pendingDebt = null;

  if (resumePhase) {
    gameState.awaitingReroll =
      resumePhase === "roll";
    setTurnPhase(
      gameState,
      resumePhase,
    );
    return true;
  }

  if (gameState.pendingSpeedDieAction) {
    gameState.awaitingReroll = false;

    setTurnPhase(
      gameState,
      "speed-die-choice",
    );

    return true;
  }

  if (resumeAction === "reroll") {
    gameState.awaitingReroll = true;

    setTurnPhase(
      gameState,
      "roll",
    );
  } else if (
    resumeAction === "roll"
  ) {
    gameState.awaitingReroll = false;

    setTurnPhase(
      gameState,
      "roll",
    );
  } else if (
    resumeAction === "jail-move"
  ) {
    gameState.awaitingReroll = false;

    setTurnPhase(
      gameState,
      "resolve-space",
    );
  } else {
    gameState.awaitingReroll = false;

    setTurnPhase(
      gameState,
      "optional-actions",
    );
  }

  return true;
}

function returnDevelopmentToBank(
  gameState: GameState,
  propertyId: number,
): void {
  const level =
    gameState.propertyDevelopments[propertyId] ?? 0;

  if (level >= 1 && level <= 4) {
    gameState.bankInventory.houses += level;
  } else if (level === 5) {
    gameState.bankInventory.hotels += 1;
  } else if (level === 6) {
    gameState.bankInventory.skyscrapers += 1;
  }

  gameState.propertyDevelopments[propertyId] = 0;
}

function transferPlayerAssets(
  gameState: GameState,
  debtor: GamePlayer,
  creditor: GamePlayer | null,
): number {
  const transferredPropertyIds =
    [...debtor.properties];
  const mortgageInterest = creditor
    ? getMortgageTransferInterest(
        gameState,
        transferredPropertyIds,
      )
    : 0;
  for (const propertyId of [...debtor.properties]) {
    const space = BOARD_SPACES[propertyId];

  if (
  space &&
  space.type === "property"
) {
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

      const depotRefund = Math.floor(
        space.depotCost / 2,
      );

      if (creditor) {
        creditor.cash += depotRefund;
        recordCashFlow(gameState, creditor, depotRefund);
      }
    }

    if (creditor) {
      gameState.propertyOwners[propertyId] = creditor.id;

      if (!creditor.properties.includes(propertyId)) {
        creditor.properties.push(propertyId);
        creditor.properties.sort((a, b) => a - b);
      }
    } else {
      gameState.propertyOwners[propertyId] = null;
      gameState.mortgagedProperties[propertyId] = false;
      gameState.railroadDepots[propertyId] = false;
    }
  }

  debtor.properties = [];

  if (creditor) {
    const transferredCash = debtor.cash;
    creditor.cash += transferredCash;
    if (transferredCash > 0) {
      recordCashFlow(gameState, debtor, -transferredCash);
      recordCashFlow(gameState, creditor, transferredCash);
    }
    creditor.busTicketIds ??= [];
    debtor.busTicketIds ??= [];
    creditor.busTicketIds.push(
      ...debtor.busTicketIds,
    );
    creditor.getOutOfJailCardIds.push(
      ...debtor.getOutOfJailCardIds,
    );
    creditor.getOutOfJailCards =
      creditor.getOutOfJailCardIds.length;
  } else {
    debtor.busTicketIds ??= [];
    gameState.busTicketsDiscarded ??= [];
    gameState.busTicketsDiscarded.push(
      ...debtor.busTicketIds,
    );

    for (
      const cardId
      of debtor.getOutOfJailCardIds
    ) {
      if (cardId.startsWith("chance-")) {
        gameState.chanceDeck.push(cardId);
      } else {
        gameState.communityChestDeck.push(
          cardId,
        );
      }
    }
  }

  debtor.cash = 0;
  debtor.busTickets = 0;
  debtor.busTicketIds = [];
  debtor.getOutOfJailCards = 0;
  debtor.getOutOfJailCardIds = [];
  syncBusTicketCounts(gameState);
  return mortgageInterest;
}

export function declareBankruptcy(
  gameState: GameState,
  debtorId: string,
): string | null {
  const debt = gameState.pendingDebt;

  if (!debt || debt.debtorId !== debtorId) {
    return "There is no matching debt to resolve.";
  }

  const debtor = gameState.players.find(
    (player) => player.id === debtorId,
  );

  if (!debtor) {
    return "The debtor could not be found.";
  }

  const creditor = debt.creditorId
    ? gameState.players.find(
        (player) => player.id === debt.creditorId,
      ) ?? null
    : null;

  const sharedBankruptcyCreditors = debt.creditorShares
    ?.map((share) => ({
      share,
      creditor: gameState.players.find(
        (player) => player.id === share.creditorId && !player.isBankrupt,
      ) ?? null,
    }))
    .filter(({ creditor }) => Boolean(creditor));

  if (sharedBankruptcyCreditors?.length && debtor.cash > 0) {
    const availableCash = debtor.cash;
    const totalShares = sharedBankruptcyCreditors.reduce(
      (sum, entry) => sum + entry.share.amount,
      0,
    );
    let remainingCash = availableCash;
    sharedBankruptcyCreditors.forEach(({ share, creditor }, index) => {
      if (!creditor || remainingCash <= 0) return;
      const isLast = index === sharedBankruptcyCreditors.length - 1;
      const allocation = isLast
        ? remainingCash
        : Math.min(
            remainingCash,
            Math.floor((availableCash * share.amount) / Math.max(1, totalShares)),
          );
      if (allocation <= 0) return;
      creditor.cash += allocation;
      debtor.cash -= allocation;
      remainingCash -= allocation;
      recordRentStats(gameState, debtor, creditor, allocation);
    });
  }

  markEliminated(gameState, debtor);

  const speedDieWasRetired = Boolean(gameState.speedDieRetired);
  const mortgageInterest =
    transferPlayerAssets(
      gameState,
      debtor,
      creditor,
    );
  syncSpeedDieRetirement(gameState);

  debtor.isBankrupt = true;
  debtor.inJail = false;
  debtor.jailTurns = 0;

  const bankruptcyRecipient = creditor?.name ??
    (sharedBankruptcyCreditors?.length ? "the tied rent owners" : "the Bank");
  pushGlobalNotice(gameState, {
    kind: "bankruptcy",
    title: "💸 BANKRUPTCY",
    message: `${debtor.name} has gone bankrupt.`,
    playerId: debtor.id,
    presentation: "major",
    steps: creditor
      ? [
          `${debtor.name} cannot pay £${debt.amount.toLocaleString()} to ${bankruptcyRecipient}.`,
          `Remaining transferable assets now pass to ${bankruptcyRecipient}.`,
          `Buildings and Train Depots are liquidated according to the bankruptcy rules.`,
          `${debtor.name} has been eliminated from the match.`,
        ]
      : sharedBankruptcyCreditors?.length
        ? [
            `${debtor.name} cannot pay £${debt.amount.toLocaleString()} in shared maximum rent.`,
            `Any remaining cash is divided across the tied rent owners according to their shares.`,
            `Remaining properties return to the Bank rather than being awarded arbitrarily to one creditor.`,
            `${debtor.name} has been eliminated from the match.`,
          ]
        : [
          `${debtor.name} cannot pay £${debt.amount.toLocaleString()} to the Bank.`,
          `${debtor.name} has been declared bankrupt.`,
          `${debtor.name}'s assets are returning to the Bank.`,
          `${debtor.name} has been eliminated from the match.`,
        ],
    durationMs: 5000,
  });

  if (!creditor && speedDieWasRetired && !gameState.speedDieRetired) {
    recordActivity(
      gameState,
      "Speed Die reactivated because bankruptcy returned ownable assets to the Bank.",
      "mega",
      undefined,
      { announce: false },
    );
    pushGlobalNotice(gameState, {
      kind: "speed-die",
      title: "🎲 Speed Die Returns",
      message: "The Speed Die is back in play because assets have returned to the Bank.",
      presentation: "major",
      steps: [
        "Bankruptcy returned ownable assets to the Bank.",
        "Not every ownable asset is currently owned.",
        "The red Speed Die is back in play!",
      ],
      durationMs: 3800,
    });
  }

  gameState.pendingDebt = null;
  gameState.pendingPurchase = null;

  if (
    gameState.pendingMegaAction
      ?.playerId === debtor.id
  ) {
    gameState.pendingMegaAction = null;
  }

  if (
    gameState.pendingSpeedDieAction
      ?.playerId === debtor.id
  ) {
    gameState.pendingSpeedDieAction = null;
  }

  if (
    gameState.pendingJailMove
      ?.playerId === debtor.id
  ) {
    gameState.pendingJailMove = null;
  }

  if (
    gameState.pendingTrade &&
    (
      gameState.pendingTrade.proposerId === debtor.id ||
      gameState.pendingTrade.recipientId === debtor.id ||
      gameState.pendingTrade.participantIds?.includes(debtor.id)
    )
  ) {
    gameState.pendingTrade = null;
  }

  const activePlayers = gameState.players.filter(
    (player) => !player.isBankrupt,
  );

  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    ensurePlayerStats(gameState, winner).finishPosition = 1;
    gameState.phase = "finished";
    gameState.turnPhase = "finished";
    gameState.winnerId = winner.id;
    gameState.currentPlayerIndex =
      gameState.players.findIndex(
        (player) => player.id === winner.id,
      );
    pushGlobalNotice(gameState, {
      kind: "winner",
      title: "👑 GAME WINNER",
      message: `${winner.name} has won the game!`,
      playerId: winner.id,
      presentation: "major",
      steps: [
        `${debtor.name} has been eliminated.`,
        `${winner.name} is the last player standing.`,
        `Congratulations ${winner.name}!`,
      ],
      durationMs: 7000,
    });
    return null;
  }

  if (
    gameState.players[gameState.currentPlayerIndex]?.id ===
    debtor.id
  ) {
    advanceTurn(gameState);
  }

  if (creditor && mortgageInterest > 0) {
    const paidImmediately = Math.min(
      creditor.cash,
      mortgageInterest,
    );
    creditor.cash -= paidImmediately;
    recordCashFlow(gameState, creditor, -paidImmediately);
    const remaining =
      mortgageInterest - paidImmediately;

    if (remaining > 0) {
      const resumePhase =
        gameState.turnPhase;
      createDebt(gameState, {
        debtorId: creditor.id,
        creditorId: null,
        amount: remaining,
        reason:
          "Mortgage transfer interest after bankruptcy",
        resumeAction: "advance-turn",
        resumePhase,
      });
      gameState.turnPhase = "debt";
    }
  }

  return null;
}

function canSellDevelopmentEvenlyForDebt(
  gameState: GameState,
  propertyId: number,
): boolean {
  const space = BOARD_SPACES[propertyId];
  if (!space || space.type !== "property") return false;
  const group = BOARD_SPACES.filter(
    (candidate) => candidate.type === "property" && candidate.group === space.group,
  );
  const level = gameState.propertyDevelopments[propertyId] ?? 0;
  const highest = Math.max(...group.map((candidate) => gameState.propertyDevelopments[candidate.id] ?? 0));
  return level > 0 && level === highest;
}

function ownerPropertyGroupHasDevelopment(
  gameState: GameState,
  ownerId: string,
  propertyId: number,
): boolean {
  const space = BOARD_SPACES[propertyId];
  if (!space || space.type !== "property") return false;
  return BOARD_SPACES.some(
    (candidate) =>
      candidate.type === "property" &&
      candidate.group === space.group &&
      gameState.propertyOwners[candidate.id] === ownerId &&
      (gameState.propertyDevelopments[candidate.id] ?? 0) > 0,
  );
}

function sellOneDevelopmentForDebt(
  gameState: GameState,
  player: GamePlayer,
  propertyId: number,
): boolean {
  const space = BOARD_SPACES[propertyId];
  if (!space || space.type !== "property" || !canSellDevelopmentEvenlyForDebt(gameState, propertyId)) {
    return false;
  }

  const level = gameState.propertyDevelopments[propertyId] ?? 0;
  if (level <= 0) return false;

  if (level >= 1 && level <= 4) {
    gameState.bankInventory.houses += 1;
  } else if (level === 5) {
    if (gameState.bankInventory.houses < 4) return false;
    gameState.bankInventory.hotels += 1;
    gameState.bankInventory.houses -= 4;
  } else if (level === 6) {
    if (gameState.bankInventory.hotels < 1) return false;
    gameState.bankInventory.skyscrapers += 1;
    gameState.bankInventory.hotels -= 1;
  }

  const refund = Math.floor(space.houseCost / 2);
  player.cash += refund;
  recordCashFlow(gameState, player, refund);
  gameState.propertyDevelopments[propertyId] = (level - 1) as BuildingLevel;
  return true;
}

/**
 * Raise only enough cash to cover the current debt. This is intentionally
 * separate from human Autopilot: it only liquidates assets and never rolls,
 * trades, builds or ends the turn.
 */
export function autoLiquidateDebt(
  gameState: GameState,
  debtorId: string,
): { error: string | null; raised: number } {
  const debt = gameState.pendingDebt;
  const player = gameState.players.find((candidate) => candidate.id === debtorId);
  if (!debt || debt.debtorId !== debtorId || !player || player.isBankrupt) {
    return { error: "There is no matching debt to liquidate.", raised: 0 };
  }

  const startingCash = player.cash;
  let guard = 0;

  while (player.cash < debt.amount && guard < 200) {
    guard += 1;
    const shortfall = debt.amount - player.cash;

    // First mortgage an asset that is already clear of development.
    const mortgageCandidates = player.properties
      .map((spaceId) => BOARD_SPACES[spaceId])
      .filter(isOwnableBoardSpace)
      .filter((space) => !gameState.mortgagedProperties[space.id])
      .filter((space) => space.type !== "property" || !ownerPropertyGroupHasDevelopment(gameState, player.id, space.id))
      .filter((space) => space.type !== "railroad" || !gameState.railroadDepots[space.id])
      .sort((a, b) => {
        const aOver = a.mortgage >= shortfall ? 0 : 1;
        const bOver = b.mortgage >= shortfall ? 0 : 1;
        return aOver - bOver || a.mortgage - b.mortgage;
      });

    const mortgage = mortgageCandidates[0];
    if (mortgage) {
      gameState.mortgagedProperties[mortgage.id] = true;
      player.cash += mortgage.mortgage;
      recordCashFlow(gameState, player, mortgage.mortgage);
      continue;
    }

    // A depot must be removed before that station can be mortgaged.
    const depotRailroad = player.properties
      .map((spaceId) => BOARD_SPACES[spaceId])
      .find((space) => space?.type === "railroad" && gameState.railroadDepots[space.id]);
    if (depotRailroad && depotRailroad.type === "railroad") {
      gameState.railroadDepots[depotRailroad.id] = false;
      gameState.bankInventory.depots += 1;
      const depotRefund = Math.floor(depotRailroad.depotCost / 2);
      player.cash += depotRefund;
      recordCashFlow(gameState, player, depotRefund);
      continue;
    }

    // Finally sell one legal development level, maintaining even-selling.
    const developed = player.properties
      .filter((spaceId) => (gameState.propertyDevelopments[spaceId] ?? 0) > 0)
      .filter((spaceId) => canSellDevelopmentEvenlyForDebt(gameState, spaceId))
      .sort((a, b) => {
        const aSpace = BOARD_SPACES[a];
        const bSpace = BOARD_SPACES[b];
        const aRefund = aSpace?.type === "property" ? Math.floor(aSpace.houseCost / 2) : Number.MAX_SAFE_INTEGER;
        const bRefund = bSpace?.type === "property" ? Math.floor(bSpace.houseCost / 2) : Number.MAX_SAFE_INTEGER;
        return aRefund - bRefund;
      });

    const propertyId = developed[0];
    if (propertyId !== undefined && sellOneDevelopmentForDebt(gameState, player, propertyId)) {
      continue;
    }

    break;
  }

  const raised = Math.max(0, player.cash - startingCash);
  return {
    error: player.cash >= debt.amount ? null : "No further legal liquidation can raise enough cash to cover this debt.",
    raised,
  };
}
