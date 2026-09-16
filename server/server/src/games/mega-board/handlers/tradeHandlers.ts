import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import { recordCashFlow } from "../utils/stats.js";
import { rememberRejectedAutomatedTrade } from "../utils/automated-trade-memory.js";
import type { Server, Socket } from "socket.io";

import {
  BOARD_SPACES,
  getBoardSpace,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  type PropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  getBusTicketCard,
  getGameCard,
} from "../../../../../shared/games/mega-board/cards.js";

import type {
  GamePlayer,
  GameState,
  TradeOffer,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

import type {
  GameStateResponse,
} from "../types/game.js";

import {
  emitGameState,
} from "../utils/game-state.js";

import {
  syncBusTicketCounts,
} from "../utils/mega-rules.js";

import {
  getMortgageTransferInterest,
} from "../utils/mortgage-transfer.js";

interface ProposeTradePayload {
  code: string;
  recipientId: string;
  /** Additional recipients for atomic 3-way / 4-way deals. */
  recipientIds?: string[];
  /** Directed cash values keyed as `fromPlayerId->toPlayerId`. */
  cashTransfers?: Record<string, number>;
  /** Asset destination maps used by multi-party deals. */
  propertyRecipients?: Record<string, string>;
  busTicketRecipients?: Record<string, string>;
  jailCardRecipients?: Record<string, string>;
  proposerCash: number;
  recipientCash: number;
  proposerPropertyIds: number[];
  recipientPropertyIds: number[];
  proposerBusTicketIds: string[];
  recipientBusTicketIds: string[];
  proposerJailCardIds: string[];
  recipientJailCardIds: string[];
}

interface TradeDecisionPayload {
  code: string;
  tradeId: string;
}

interface TradeRejectAllPayload {
  code: string;
  enabled: boolean;
}

function normaliseCash(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function uniquePropertyIds(
  propertyIds: number[],
): number[] {
  return [
    ...new Set(
      propertyIds.filter(
        (propertyId) =>
          Number.isInteger(propertyId),
      ),
    ),
  ];
}

function uniqueItemIds(
  itemIds: string[] | undefined,
): string[] {
  return [
    ...new Set(
      (itemIds ?? [])
        .map((itemId) =>
          itemId.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function findPlayer(
  gameState: GameState,
  playerId: string,
): GamePlayer | undefined {
  return gameState.players.find(
    (player) => player.id === playerId,
  );
}

function playerOwnsProperties(
  gameState: GameState,
  playerId: string,
  propertyIds: number[],
): boolean {
  return propertyIds.every(
    (propertyId) =>
      gameState.propertyOwners[propertyId] ===
      playerId,
  );
}

function playerOwnsItemIds(
  ownedIds: string[],
  selectedIds: string[],
): boolean {
  return selectedIds.every((selectedId) =>
    ownedIds.includes(selectedId),
  );
}

function validateOwnableProperties(
  propertyIds: number[],
): boolean {
  return propertyIds.every((propertyId) =>
    isOwnableBoardSpace(
      getBoardSpace(propertyId),
    ),
  );
}

function validateBusTicketIds(
  ticketIds: string[],
): boolean {
  return ticketIds.every((ticketId) =>
    Boolean(getBusTicketCard(ticketId)),
  );
}

function validateJailCardIds(
  cardIds: string[],
): boolean {
  return cardIds.every((cardId) => {
    const card = getGameCard(cardId);

    return (
      card?.effect.type ===
      "get-out-of-jail"
    );
  });
}

function transferProperties(
  gameState: GameState,
  fromPlayer: GamePlayer,
  toPlayer: GamePlayer,
  propertyIds: number[],
): void {
  for (const propertyId of propertyIds) {
    fromPlayer.properties =
      fromPlayer.properties.filter(
        (ownedId) =>
          ownedId !== propertyId,
      );

    if (
      !toPlayer.properties.includes(
        propertyId,
      )
    ) {
      toPlayer.properties.push(propertyId);
      toPlayer.properties.sort((a, b) => a - b);
    }

    gameState.propertyOwners[
      propertyId
    ] = toPlayer.id;
  }
}

function transferItemIds(
  fromIds: string[],
  toIds: string[],
  selectedIds: string[],
): void {
  const selected = new Set(selectedIds);
  const retained = fromIds.filter(
    (itemId) => !selected.has(itemId),
  );

  fromIds.splice(
    0,
    fromIds.length,
    ...retained,
  );

  for (const itemId of selectedIds) {
    if (!toIds.includes(itemId)) {
      toIds.push(itemId);
    }
  }
}

function syncSpecialCardCounts(
  gameState: GameState,
): void {
  syncBusTicketCounts(gameState);

  for (const player of gameState.players) {
    player.getOutOfJailCardIds ??= [];
    player.getOutOfJailCards =
      player.getOutOfJailCardIds.length;
  }
}

function offerHasValue(
  trade: Pick<
    TradeOffer,
    | "proposerCash"
    | "recipientCash"
    | "proposerPropertyIds"
    | "recipientPropertyIds"
    | "proposerBusTicketIds"
    | "recipientBusTicketIds"
    | "proposerJailCardIds"
    | "recipientJailCardIds"
  >,
): boolean {
  return (
    trade.proposerCash > 0 ||
    trade.recipientCash > 0 ||
    trade.proposerPropertyIds.length > 0 ||
    trade.recipientPropertyIds.length > 0 ||
    trade.proposerBusTicketIds.length > 0 ||
    trade.recipientBusTicketIds.length > 0 ||
    trade.proposerJailCardIds.length > 0 ||
    trade.recipientJailCardIds.length > 0
  );
}

function validateTradeStillValid(
  gameState: GameState,
  trade: TradeOffer,
): string | null {
  const proposer = findPlayer(
    gameState,
    trade.proposerId,
  );

  const recipient = findPlayer(
    gameState,
    trade.recipientId,
  );

  if (!proposer || !recipient) {
    return "One of the players is no longer available.";
  }

  if (
    proposer.isBankrupt ||
    recipient.isBankrupt
  ) {
    return "Bankrupt players cannot complete trades.";
  }

  if (
    proposer.cash < trade.proposerCash
  ) {
    return `${proposer.name} no longer has enough cash for this trade.`;
  }

  if (
    recipient.cash < trade.recipientCash
  ) {
    return `${recipient.name} no longer has enough cash for this trade.`;
  }

  if (
    !playerOwnsProperties(
      gameState,
      proposer.id,
      trade.proposerPropertyIds,
    )
  ) {
    return `${proposer.name} no longer owns every offered property.`;
  }

  if (
    !playerOwnsProperties(
      gameState,
      recipient.id,
      trade.recipientPropertyIds,
    )
  ) {
    return `${recipient.name} no longer owns every requested property.`;
  }

  if (
    !playerOwnsItemIds(
      proposer.busTicketIds,
      trade.proposerBusTicketIds,
    ) ||
    !playerOwnsItemIds(
      recipient.busTicketIds,
      trade.recipientBusTicketIds,
    )
  ) {
    return "One of the selected Bus Tickets is no longer held by the offering player.";
  }

  if (
    !playerOwnsItemIds(
      proposer.getOutOfJailCardIds,
      trade.proposerJailCardIds,
    ) ||
    !playerOwnsItemIds(
      recipient.getOutOfJailCardIds,
      trade.recipientJailCardIds,
    )
  ) {
    return "One of the selected Get Out of Jail Free cards is no longer held by the offering player.";
  }

  const proposerInterest =
    getMortgageTransferInterest(
      gameState,
      trade.recipientPropertyIds,
    );
  const recipientInterest =
    getMortgageTransferInterest(
      gameState,
      trade.proposerPropertyIds,
    );

  const proposerFinalCash =
    proposer.cash -
    trade.proposerCash +
    trade.recipientCash -
    proposerInterest;
  const recipientFinalCash =
    recipient.cash -
    trade.recipientCash +
    trade.proposerCash -
    recipientInterest;

  if (proposerFinalCash < 0) {
    return `${proposer.name} cannot afford the £${proposerInterest} mortgage transfer interest.`;
  }

  if (recipientFinalCash < 0) {
    return `${recipient.name} cannot afford the £${recipientInterest} mortgage transfer interest.`;
  }

  trade.proposerMortgageInterest =
    proposerInterest;
  trade.recipientMortgageInterest =
    recipientInterest;

  return null;
}


function transferKey(fromPlayerId: string, toPlayerId: string): string {
  return `${fromPlayerId}->${toPlayerId}`;
}

function isMultiPartyTrade(trade: TradeOffer): boolean {
  return Boolean(
    trade.multiParty &&
    trade.participantIds &&
    trade.participantIds.length >= 3 &&
    trade.transfers,
  );
}

function tradeParticipantNames(gameState: GameState, participantIds: string[]): string[] {
  return participantIds.map((playerId) => findPlayer(gameState, playerId)?.name ?? "Player");
}

function formatMultiPartyLabel(gameState: GameState, participantIds: string[]): string {
  const names = tradeParticipantNames(gameState, participantIds);
  if (names.length <= 1) return names[0] ?? "players";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function buildMultiPartyTrade(
  gameState: GameState,
  proposer: GamePlayer,
  payload: ProposeTradePayload,
): { trade?: TradeOffer; error?: string } {
  const requestedRecipientIds = [
    ...new Set((payload.recipientIds ?? []).map((id) => id?.trim()).filter(Boolean)),
  ].filter((id) => id !== proposer.id);

  if (requestedRecipientIds.length < 2 || requestedRecipientIds.length > 3) {
    return { error: "A multi-party deal must involve exactly 3 or 4 total players." };
  }

  const participantIds = [proposer.id, ...requestedRecipientIds];
  const participants = participantIds.map((id) => findPlayer(gameState, id));
  if (participants.some((player) => !player)) {
    return { error: "Every player in the deal must still be in the game." };
  }

  const activeParticipants = participants as GamePlayer[];
  if (activeParticipants.some((player) => player.isBankrupt)) {
    return { error: "Bankrupt players cannot join a multi-party deal." };
  }

  const rejectingPlayer = activeParticipants.find(
    (player) =>
      player.id !== proposer.id &&
      gameState.tradeRejectAllTurnByPlayerId?.[player.id] === gameState.turnNumber,
  );
  if (rejectingPlayer) {
    return { error: `${rejectingPlayer.name} is rejecting all trade offers for turn ${gameState.turnNumber}.` };
  }

  const legMap = new Map<string, NonNullable<TradeOffer["transfers"]>[number]>();
  const getLeg = (fromPlayerId: string, toPlayerId: string) => {
    const key = transferKey(fromPlayerId, toPlayerId);
    let leg = legMap.get(key);
    if (!leg) {
      leg = {
        fromPlayerId,
        toPlayerId,
        cash: 0,
        propertyIds: [],
        busTicketIds: [],
        jailCardIds: [],
      };
      legMap.set(key, leg);
    }
    return leg;
  };

  for (const fromPlayerId of participantIds) {
    for (const toPlayerId of participantIds) {
      if (fromPlayerId === toPlayerId) continue;
      const amount = normaliseCash(payload.cashTransfers?.[transferKey(fromPlayerId, toPlayerId)] ?? 0);
      if (amount > 0) getLeg(fromPlayerId, toPlayerId).cash = amount;
    }
  }

  const selectedProperties = new Set<number>();
  for (const [rawPropertyId, toPlayerId] of Object.entries(payload.propertyRecipients ?? {})) {
    const propertyId = Number(rawPropertyId);
    if (!Number.isInteger(propertyId) || !participantIds.includes(toPlayerId)) {
      return { error: "One of the selected property destinations is invalid." };
    }
    const fromPlayerId = gameState.propertyOwners[propertyId];
    if (!fromPlayerId || !participantIds.includes(fromPlayerId) || fromPlayerId === toPlayerId) {
      return { error: "One of the selected properties is not owned by the player offering it." };
    }
    if (!validateOwnableProperties([propertyId]) || selectedProperties.has(propertyId)) {
      return { error: "One of the selected board spaces cannot be traded." };
    }
    selectedProperties.add(propertyId);
    getLeg(fromPlayerId, toPlayerId).propertyIds.push(propertyId);
  }

  const selectedBusTickets = new Set<string>();
  for (const [ticketId, toPlayerId] of Object.entries(payload.busTicketRecipients ?? {})) {
    if (!participantIds.includes(toPlayerId) || !validateBusTicketIds([ticketId]) || selectedBusTickets.has(ticketId)) {
      return { error: "One of the selected Bus Ticket transfers is invalid." };
    }
    const owner = activeParticipants.find((player) => player.busTicketIds.includes(ticketId));
    if (!owner || owner.id === toPlayerId) {
      return { error: "One of the selected Bus Tickets is not held by the player offering it." };
    }
    selectedBusTickets.add(ticketId);
    getLeg(owner.id, toPlayerId).busTicketIds.push(ticketId);
  }

  const selectedJailCards = new Set<string>();
  for (const [cardId, toPlayerId] of Object.entries(payload.jailCardRecipients ?? {})) {
    if (!participantIds.includes(toPlayerId) || !validateJailCardIds([cardId]) || selectedJailCards.has(cardId)) {
      return { error: "One of the selected Get Out of Jail Free card transfers is invalid." };
    }
    const owner = activeParticipants.find((player) => player.getOutOfJailCardIds.includes(cardId));
    if (!owner || owner.id === toPlayerId) {
      return { error: "One of the selected Get Out of Jail Free cards is not held by the player offering it." };
    }
    selectedJailCards.add(cardId);
    getLeg(owner.id, toPlayerId).jailCardIds.push(cardId);
  }

  const transfers = [...legMap.values()].filter(
    (leg) =>
      leg.cash > 0 ||
      leg.propertyIds.length > 0 ||
      leg.busTicketIds.length > 0 ||
      leg.jailCardIds.length > 0,
  );

  if (transfers.length === 0) {
    return { error: "A multi-party deal must include cash, property, a Bus Ticket or a Get Out of Jail Free card." };
  }

  const outgoingCashByPlayerId: Record<string, number> = {};
  const incomingCashByPlayerId: Record<string, number> = {};
  const incomingPropertyIdsByPlayerId: Record<string, number[]> = {};
  for (const id of participantIds) {
    outgoingCashByPlayerId[id] = 0;
    incomingCashByPlayerId[id] = 0;
    incomingPropertyIdsByPlayerId[id] = [];
  }

  for (const leg of transfers) {
    outgoingCashByPlayerId[leg.fromPlayerId] += leg.cash;
    incomingCashByPlayerId[leg.toPlayerId] += leg.cash;
    incomingPropertyIdsByPlayerId[leg.toPlayerId].push(...leg.propertyIds);
  }

  const mortgageInterestByPlayerId: Record<string, number> = {};
  for (const player of activeParticipants) {
    if (outgoingCashByPlayerId[player.id] > player.cash) {
      return { error: `${player.name} does not have enough cash for the amounts assigned in this deal.` };
    }
    const interest = getMortgageTransferInterest(gameState, incomingPropertyIdsByPlayerId[player.id]);
    mortgageInterestByPlayerId[player.id] = interest;
    const finalCash = player.cash - outgoingCashByPlayerId[player.id] + incomingCashByPlayerId[player.id] - interest;
    if (finalCash < 0) {
      return { error: `${player.name} cannot afford the deal plus £${interest} mortgage transfer interest.` };
    }
  }

  const primaryRecipientId = requestedRecipientIds[0];
  return {
    trade: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      proposerId: proposer.id,
      recipientId: primaryRecipientId,
      multiParty: true,
      participantIds,
      acceptedPlayerIds: [proposer.id],
      transfers,
      mortgageInterestByPlayerId,
      // Legacy two-party fields are intentionally empty. They remain on the
      // shape so old reports / AI code can safely ignore a multi-party deal.
      proposerCash: 0,
      recipientCash: 0,
      proposerPropertyIds: [],
      recipientPropertyIds: [],
      proposerBusTicketIds: [],
      recipientBusTicketIds: [],
      proposerJailCardIds: [],
      recipientJailCardIds: [],
      proposerMortgageInterest: 0,
      recipientMortgageInterest: 0,
      status: "pending",
      createdAt: Date.now(),
    },
  };
}

export function validateMultiPartyTradeStillValid(gameState: GameState, trade: TradeOffer): string | null {
  if (!isMultiPartyTrade(trade)) return "That multi-party deal is no longer valid.";
  const participantIds = trade.participantIds!;
  const participants = participantIds.map((id) => findPlayer(gameState, id));
  if (participants.some((player) => !player || player.isBankrupt)) {
    return "Every player in the deal must remain active until it completes.";
  }

  const activeParticipants = participants as GamePlayer[];
  const participantSet = new Set(participantIds);
  const seenProperties = new Set<number>();
  const seenBusTickets = new Set<string>();
  const seenJailCards = new Set<string>();
  const outgoingCashByPlayerId: Record<string, number> = Object.fromEntries(participantIds.map((id) => [id, 0]));
  const incomingCashByPlayerId: Record<string, number> = Object.fromEntries(participantIds.map((id) => [id, 0]));
  const incomingPropertyIdsByPlayerId: Record<string, number[]> = Object.fromEntries(participantIds.map((id) => [id, []]));

  for (const leg of trade.transfers!) {
    if (!participantSet.has(leg.fromPlayerId) || !participantSet.has(leg.toPlayerId) || leg.fromPlayerId === leg.toPlayerId) {
      return "One of the deal transfer legs is invalid.";
    }
    outgoingCashByPlayerId[leg.fromPlayerId] += normaliseCash(leg.cash);
    incomingCashByPlayerId[leg.toPlayerId] += normaliseCash(leg.cash);

    if (!validateOwnableProperties(leg.propertyIds) || !playerOwnsProperties(gameState, leg.fromPlayerId, leg.propertyIds)) {
      return `${findPlayer(gameState, leg.fromPlayerId)?.name ?? "A player"} no longer owns every property assigned in the deal.`;
    }
    for (const propertyId of leg.propertyIds) {
      if (seenProperties.has(propertyId)) return "A property appears more than once in the deal.";
      seenProperties.add(propertyId);
    }
    incomingPropertyIdsByPlayerId[leg.toPlayerId].push(...leg.propertyIds);

    const from = findPlayer(gameState, leg.fromPlayerId)!;
    if (!validateBusTicketIds(leg.busTicketIds) || !playerOwnsItemIds(from.busTicketIds, leg.busTicketIds)) {
      return `${from.name} no longer holds every Bus Ticket assigned in the deal.`;
    }
    for (const ticketId of leg.busTicketIds) {
      if (seenBusTickets.has(ticketId)) return "A Bus Ticket appears more than once in the deal.";
      seenBusTickets.add(ticketId);
    }

    if (!validateJailCardIds(leg.jailCardIds) || !playerOwnsItemIds(from.getOutOfJailCardIds, leg.jailCardIds)) {
      return `${from.name} no longer holds every Get Out of Jail Free card assigned in the deal.`;
    }
    for (const cardId of leg.jailCardIds) {
      if (seenJailCards.has(cardId)) return "A Get Out of Jail Free card appears more than once in the deal.";
      seenJailCards.add(cardId);
    }
  }

  const mortgageInterestByPlayerId: Record<string, number> = {};
  for (const player of activeParticipants) {
    if (outgoingCashByPlayerId[player.id] > player.cash) {
      return `${player.name} no longer has enough cash for this deal.`;
    }
    const interest = getMortgageTransferInterest(gameState, incomingPropertyIdsByPlayerId[player.id]);
    mortgageInterestByPlayerId[player.id] = interest;
    const finalCash = player.cash - outgoingCashByPlayerId[player.id] + incomingCashByPlayerId[player.id] - interest;
    if (finalCash < 0) {
      return `${player.name} cannot afford the deal plus £${interest} mortgage transfer interest.`;
    }
  }
  trade.mortgageInterestByPlayerId = mortgageInterestByPlayerId;
  return null;
}

export function executeMultiPartyTrade(gameState: GameState, trade: TradeOffer): void {
  if (!isMultiPartyTrade(trade)) return;

  for (const leg of trade.transfers!) {
    const from = findPlayer(gameState, leg.fromPlayerId)!;
    const to = findPlayer(gameState, leg.toPlayerId)!;
    if (leg.cash > 0) {
      from.cash -= leg.cash;
      to.cash += leg.cash;
      recordCashFlow(gameState, from, -leg.cash);
      recordCashFlow(gameState, to, leg.cash);
    }
  }

  for (const playerId of trade.participantIds!) {
    const player = findPlayer(gameState, playerId)!;
    const interest = trade.mortgageInterestByPlayerId?.[playerId] ?? 0;
    if (interest > 0) {
      player.cash -= interest;
      recordCashFlow(gameState, player, -interest);
    }
  }

  for (const leg of trade.transfers!) {
    const from = findPlayer(gameState, leg.fromPlayerId)!;
    const to = findPlayer(gameState, leg.toPlayerId)!;
    transferProperties(gameState, from, to, leg.propertyIds);
    transferItemIds(from.busTicketIds, to.busTicketIds, leg.busTicketIds);
    transferItemIds(from.getOutOfJailCardIds, to.getOutOfJailCardIds, leg.jailCardIds);
  }
  syncSpecialCardCounts(gameState);
}

export function registerTradeHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:trade-propose",
    (
      payload: ProposeTradePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code?.trim().toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason: "Game code is required.",
        });
        return;
      }

      const room = rooms.get(code);

      if (
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const turnPhaseError =
        requireTurnPhase(
          gameState,
          ["roll", "optional-actions", "jail-decision"],
        );

      if (turnPhaseError) {
        acknowledge({
          ok: false,
          reason: turnPhaseError,
        });
        return;
      }

      const currentPlayer =
        gameState.players[
          gameState.currentPlayerIndex
        ];

      if (
        !currentPlayer ||
        currentPlayer.id !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "Only the current player can propose a trade.",
        });
        return;
      }

      if (
        gameState.phase !== "playing"
      ) {
        acknowledge({
          ok: false,
          reason:
            "Trades can only be proposed during gameplay.",
        });
        return;
      }

      if (gameState.pendingCard) {
        acknowledge({
          ok: false,
          reason:
            "Resolve the drawn card first.",
        });
        return;
      }

      if (gameState.pendingDebt) {
        acknowledge({
          ok: false,
          reason:
            "Resolve the outstanding debt before trading.",
        });
        return;
      }

      if (gameState.pendingTrade) {
        acknowledge({
          ok: false,
          reason:
            "Another trade is already awaiting a response.",
        });
        return;
      }

      if (gameState.pendingPurchase) {
        acknowledge({
          ok: false,
          reason:
            "Resolve the current property purchase before trading.",
        });
        return;
      }

      const proposer = findPlayer(
        gameState,
        socket.id,
      );

      if (!proposer) {
        acknowledge({
          ok: false,
          reason: "The proposing player could not be found.",
        });
        return;
      }

      if ((payload.recipientIds?.length ?? 0) >= 2) {
        const built = buildMultiPartyTrade(gameState, proposer, payload);
        if (!built.trade) {
          acknowledge({ ok: false, reason: built.error ?? "Unable to create the multi-party deal." });
          return;
        }

        const trade = built.trade;
        gameState.pendingTrade = trade;
        gameState.lastTradeResult = null;
        const participantNames = formatMultiPartyLabel(gameState, trade.participantIds!);
        const activityMessage = `${proposer.name} proposed a ${trade.participantIds!.length}-way deal involving ${participantNames}.`;
        recordActivity(gameState, activityMessage, "trade", proposer.id);
        emitGameState(io, code, gameState);
        acknowledge({ ok: true, state: gameState });
        console.log(activityMessage);
        return;
      }

      const recipient = findPlayer(
        gameState,
        payload.recipientId,
      );

      if (!recipient) {
        acknowledge({
          ok: false,
          reason:
            "Both trade players must be in the game.",
        });
        return;
      }

      if (proposer.id === recipient.id) {
        acknowledge({
          ok: false,
          reason:
            "You cannot trade with yourself.",
        });
        return;
      }

      if (
        proposer.isBankrupt ||
        recipient.isBankrupt
      ) {
        acknowledge({
          ok: false,
          reason:
            "Bankrupt players cannot trade.",
        });
        return;
      }

      if (
        gameState.tradeRejectAllTurnByPlayerId?.[recipient.id] ===
        gameState.turnNumber
      ) {
        const message = `${recipient.name} is rejecting all trade offers for turn ${gameState.turnNumber}.`;
        gameState.lastTradeResult = {
          id: `${Date.now()}-auto-declined`,
          proposerId: proposer.id,
          recipientId: recipient.id,
          status: "auto-declined",
          message,
          resolvedAt: Date.now(),
        };
        recordActivity(gameState, message, "trade", recipient.id);
        emitGameState(io, code, gameState);
        acknowledge({
          ok: true,
          state: gameState,
          reason: message,
        });
        return;
      }

      const proposerCash = normaliseCash(
        payload.proposerCash,
      );
      const recipientCash = normaliseCash(
        payload.recipientCash,
      );
      const proposerPropertyIds =
        uniquePropertyIds(
          payload.proposerPropertyIds ?? [],
        );
      const recipientPropertyIds =
        uniquePropertyIds(
          payload.recipientPropertyIds ?? [],
        );
      const proposerBusTicketIds =
        uniqueItemIds(
          payload.proposerBusTicketIds,
        );
      const recipientBusTicketIds =
        uniqueItemIds(
          payload.recipientBusTicketIds,
        );
      const proposerJailCardIds =
        uniqueItemIds(
          payload.proposerJailCardIds,
        );
      const recipientJailCardIds =
        uniqueItemIds(
          payload.recipientJailCardIds,
        );

      const draft = {
        proposerCash,
        recipientCash,
        proposerPropertyIds,
        recipientPropertyIds,
        proposerBusTicketIds,
        recipientBusTicketIds,
        proposerJailCardIds,
        recipientJailCardIds,
      };

      if (!offerHasValue(draft)) {
        acknowledge({
          ok: false,
          reason:
            "A trade must include cash, property, a Bus Ticket or a Get Out of Jail Free card.",
        });
        return;
      }

      if (proposerCash > proposer.cash) {
        acknowledge({
          ok: false,
          reason:
            "You do not have enough cash for that offer.",
        });
        return;
      }

      if (recipientCash > recipient.cash) {
        acknowledge({
          ok: false,
          reason:
            `${recipient.name} does not have enough cash for that request.`,
        });
        return;
      }

      if (
        !validateOwnableProperties(
          proposerPropertyIds,
        ) ||
        !validateOwnableProperties(
          recipientPropertyIds,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "A selected board space cannot be traded.",
        });
        return;
      }

      if (
        !validateBusTicketIds(
          proposerBusTicketIds,
        ) ||
        !validateBusTicketIds(
          recipientBusTicketIds,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "A selected Bus Ticket could not be validated.",
        });
        return;
      }

      if (
        !validateJailCardIds(
          proposerJailCardIds,
        ) ||
        !validateJailCardIds(
          recipientJailCardIds,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "A selected Get Out of Jail Free card could not be validated.",
        });
        return;
      }

      if (
        !playerOwnsProperties(
          gameState,
          proposer.id,
          proposerPropertyIds,
        ) ||
        !playerOwnsItemIds(
          proposer.busTicketIds,
          proposerBusTicketIds,
        ) ||
        !playerOwnsItemIds(
          proposer.getOutOfJailCardIds,
          proposerJailCardIds,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "You do not own every asset or special card you selected.",
        });
        return;
      }

      if (
        !playerOwnsProperties(
          gameState,
          recipient.id,
          recipientPropertyIds,
        ) ||
        !playerOwnsItemIds(
          recipient.busTicketIds,
          recipientBusTicketIds,
        ) ||
        !playerOwnsItemIds(
          recipient.getOutOfJailCardIds,
          recipientJailCardIds,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            `${recipient.name} no longer owns every requested asset or special card.`,
        });
        return;
      }

      const proposerMortgageInterest =
        getMortgageTransferInterest(
          gameState,
          recipientPropertyIds,
        );
      const recipientMortgageInterest =
        getMortgageTransferInterest(
          gameState,
          proposerPropertyIds,
        );

      const proposerFinalCash =
        proposer.cash -
        proposerCash +
        recipientCash -
        proposerMortgageInterest;
      const recipientFinalCash =
        recipient.cash -
        recipientCash +
        proposerCash -
        recipientMortgageInterest;

      if (proposerFinalCash < 0) {
        acknowledge({
          ok: false,
          reason:
            `You need £${proposerMortgageInterest} available for incoming mortgage interest.`,
        });
        return;
      }

      if (recipientFinalCash < 0) {
        acknowledge({
          ok: false,
          reason:
            `${recipient.name} needs £${recipientMortgageInterest} available for incoming mortgage interest.`,
        });
        return;
      }

      const trade: TradeOffer = {
        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        proposerId: proposer.id,
        recipientId: recipient.id,
        ...draft,
        proposerMortgageInterest,
        recipientMortgageInterest,
        status: "pending",
        createdAt: Date.now(),
      };

      gameState.pendingTrade = trade;
      gameState.lastTradeResult = null;
      const activityMessage = `${proposer.name} proposed a trade to ${recipient.name}.`;
      recordActivity(gameState, activityMessage, "trade", proposer.id);


      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: gameState,
      });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:trade-accept",
    (
      payload: TradeDecisionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code?.trim().toUpperCase();
      const room = code
        ? rooms.get(code)
        : undefined;

      if (
        !code ||
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;
      const trade = gameState.pendingTrade;

      if (
        !trade ||
        trade.id !== payload.tradeId
      ) {
        acknowledge({
          ok: false,
          reason:
            "That trade is no longer available.",
        });
        return;
      }

      if (isMultiPartyTrade(trade)) {
        const participantIds = trade.participantIds!;
        if (!participantIds.includes(socket.id) || trade.proposerId === socket.id) {
          acknowledge({ ok: false, reason: "Only an invited participant can accept this multi-party deal." });
          return;
        }

        trade.acceptedPlayerIds ??= [trade.proposerId];
        if (trade.acceptedPlayerIds.includes(socket.id)) {
          acknowledge({ ok: true, state: gameState, reason: "You have already accepted this deal." });
          return;
        }

        const validationError = validateMultiPartyTradeStillValid(gameState, trade);
        if (validationError) {
          const message = `The multi-party deal was cancelled: ${validationError}`;
          gameState.pendingTrade = null;
          trade.status = "cancelled";
          gameState.lastTradeResult = {
            id: trade.id,
            proposerId: trade.proposerId,
            recipientId: trade.recipientId,
            participantIds: [...participantIds],
            status: "cancelled",
            message,
            resolvedAt: Date.now(),
          };
          recordActivity(gameState, message, "trade", socket.id);
          emitGameState(io, code, gameState);
          acknowledge({ ok: false, reason: validationError, state: gameState });
          return;
        }

        trade.acceptedPlayerIds.push(socket.id);
        const actor = findPlayer(gameState, socket.id)!;
        const allAccepted = participantIds.every((id) => trade.acceptedPlayerIds!.includes(id));

        if (!allAccepted) {
          const message = `${actor.name} accepted the ${participantIds.length}-way deal (${trade.acceptedPlayerIds.length}/${participantIds.length} approved).`;
          recordActivity(gameState, message, "trade", actor.id);
          emitGameState(io, code, gameState);
          acknowledge({ ok: true, state: gameState, reason: message });
          return;
        }

        executeMultiPartyTrade(gameState, trade);
        trade.status = "accepted";
        gameState.pendingTrade = null;
        const names = formatMultiPartyLabel(gameState, participantIds);
        const activityMessage = `The ${participantIds.length}-way deal between ${names} was accepted by everyone and completed.`;
        pushGlobalNotice(gameState, {
          kind: "trade-complete",
          title: `🤝 ${participantIds.length}-Way Deal Completed`,
          message: activityMessage,
          playerId: actor.id,
          presentation: "standard",
          durationMs: 3600,
        });
        gameState.lastTradeResult = {
          id: trade.id,
          proposerId: trade.proposerId,
          recipientId: trade.recipientId,
          participantIds: [...participantIds],
          status: "accepted",
          message: activityMessage,
          resolvedAt: Date.now(),
        };
        recordActivity(gameState, activityMessage, "trade", actor.id);
        emitGameState(io, code, gameState);
        acknowledge({ ok: true, state: gameState });
        console.log(activityMessage);
        return;
      }

      if (trade.recipientId !== socket.id) {
        acknowledge({
          ok: false,
          reason:
            "Only the recipient can accept this trade.",
        });
        return;
      }

      const validationError =
        validateTradeStillValid(
          gameState,
          trade,
        );

      if (validationError) {
        gameState.pendingTrade = null;
        emitGameState(io, code, gameState);
        acknowledge({
          ok: false,
          reason: validationError,
          state: gameState,
        });
        return;
      }

      const proposer = findPlayer(
        gameState,
        trade.proposerId,
      )!;
      const recipient = findPlayer(
        gameState,
        trade.recipientId,
      )!;

      proposer.cash -= trade.proposerCash;
      recipient.cash += trade.proposerCash;
      recipient.cash -= trade.recipientCash;
      proposer.cash += trade.recipientCash;
      recordCashFlow(gameState, proposer, -trade.proposerCash);
      recordCashFlow(gameState, recipient, trade.proposerCash);
      recordCashFlow(gameState, recipient, -trade.recipientCash);
      recordCashFlow(gameState, proposer, trade.recipientCash);

      proposer.cash -=
        trade.proposerMortgageInterest;
      recipient.cash -=
        trade.recipientMortgageInterest;
      recordCashFlow(gameState, proposer, -trade.proposerMortgageInterest);
      recordCashFlow(gameState, recipient, -trade.recipientMortgageInterest);

      transferProperties(
        gameState,
        proposer,
        recipient,
        trade.proposerPropertyIds,
      );
      transferProperties(
        gameState,
        recipient,
        proposer,
        trade.recipientPropertyIds,
      );

      transferItemIds(
        proposer.busTicketIds,
        recipient.busTicketIds,
        trade.proposerBusTicketIds,
      );
      transferItemIds(
        recipient.busTicketIds,
        proposer.busTicketIds,
        trade.recipientBusTicketIds,
      );
      transferItemIds(
        proposer.getOutOfJailCardIds,
        recipient.getOutOfJailCardIds,
        trade.proposerJailCardIds,
      );
      transferItemIds(
        recipient.getOutOfJailCardIds,
        proposer.getOutOfJailCardIds,
        trade.recipientJailCardIds,
      );

      syncSpecialCardCounts(gameState);

      trade.status = "accepted";
      gameState.pendingTrade = null;
      const activityMessage = `${recipient.name} accepted ${proposer.name}'s trade.`;
      pushGlobalNotice(gameState, {
        kind: "trade-complete",
        title: "🤝 Trade Completed",
        message: activityMessage,
        playerId: recipient.id,
        presentation: "standard",
        durationMs: 3200,
      });
      gameState.lastTradeResult = {
        id: trade.id,
        proposerId: proposer.id,
        recipientId: recipient.id,
        status: "accepted",
        message: activityMessage,
        resolvedAt: Date.now(),
      };
      recordActivity(gameState, activityMessage, "trade", recipient.id);


      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: gameState,
      });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:trade-decline",
    (
      payload: TradeDecisionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code?.trim().toUpperCase();
      const room = code
        ? rooms.get(code)
        : undefined;

      if (
        !code ||
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;
      const trade = gameState.pendingTrade;

      if (
        !trade ||
        trade.id !== payload.tradeId
      ) {
        acknowledge({
          ok: false,
          reason:
            "That trade is no longer available.",
        });
        return;
      }

      const participantIds = isMultiPartyTrade(trade)
        ? trade.participantIds!
        : [trade.proposerId, trade.recipientId];

      if (!participantIds.includes(socket.id)) {
        acknowledge({
          ok: false,
          reason:
            "You are not part of this trade.",
        });
        return;
      }

      const actor = findPlayer(
        gameState,
        socket.id,
      );
      const wasCancelled =
        trade.proposerId === socket.id;

      trade.status = wasCancelled
        ? "cancelled"
        : "declined";
      gameState.pendingTrade = null;
      const activityMessage = `${actor?.name ?? "A player"} ${wasCancelled ? "cancelled" : "declined"} the ${isMultiPartyTrade(trade) ? `${participantIds.length}-way deal` : "trade"}.`;
      gameState.lastTradeResult = {
        id: trade.id,
        proposerId: trade.proposerId,
        recipientId: trade.recipientId,
        ...(isMultiPartyTrade(trade) ? { participantIds: [...participantIds] } : {}),
        status: wasCancelled ? "cancelled" : "declined",
        message: activityMessage,
        resolvedAt: Date.now(),
      };
      if (!wasCancelled && !isMultiPartyTrade(trade)) {
        rememberRejectedAutomatedTrade(code, gameState, trade);
      }
      recordActivity(gameState, activityMessage, "trade", actor?.id);


      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: gameState,
      });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:trade-reject-all",
    (
      payload: TradeRejectAllPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room?.started || !room.gameState) {
        acknowledge({ ok: false, reason: "The game could not be found." });
        return;
      }

      const gameState = room.gameState;
      const player = findPlayer(gameState, socket.id);

      if (!player || player.isBankrupt) {
        acknowledge({ ok: false, reason: "Only an active player can change trade preferences." });
        return;
      }

      gameState.tradeRejectAllTurnByPlayerId ??= {};
      if (payload.enabled) {
        gameState.tradeRejectAllTurnByPlayerId[player.id] = gameState.turnNumber;
      } else {
        delete gameState.tradeRejectAllTurnByPlayerId[player.id];
      }

      const pending = gameState.pendingTrade;
      if (
        payload.enabled &&
        pending &&
        (isMultiPartyTrade(pending)
          ? pending.participantIds!.includes(player.id) && pending.proposerId !== player.id
          : pending.recipientId === player.id)
      ) {
        pending.status = "declined";
        gameState.pendingTrade = null;
        const proposer = findPlayer(gameState, pending.proposerId);
        const message = `${player.name} declined ${proposer?.name ?? "the"} trade and is rejecting all further offers this turn.`;
        gameState.lastTradeResult = {
          id: pending.id,
          proposerId: pending.proposerId,
          recipientId: pending.recipientId,
          ...(isMultiPartyTrade(pending) ? { participantIds: [...pending.participantIds!] } : {}),
          status: "auto-declined",
          message,
          resolvedAt: Date.now(),
        };
        if (!isMultiPartyTrade(pending)) rememberRejectedAutomatedTrade(code, gameState, pending);
        recordActivity(gameState, message, "trade", player.id);
      }

      emitGameState(io, code, gameState);
      acknowledge({ ok: true, state: gameState });
    },
  );

}
