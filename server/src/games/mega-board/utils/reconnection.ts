import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";
import type {
  GameRoom,
  RoomPlayer,
} from "../types/game.js";

function replaceArrayValue(
  values: string[],
  oldId: string,
  newId: string,
): void {
  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    if (values[index] === oldId) {
      values[index] = newId;
    }
  }
}

function replaceRecordKey(
  values: Record<string, number>,
  oldId: string,
  newId: string,
): void {
  if (!(oldId in values)) {
    return;
  }

  values[newId] = values[oldId];
  delete values[oldId];
}

export function replacePlayerId(
  gameState: GameState,
  oldId: string,
  newId: string,
): void {
  const player = gameState.players.find(
    (candidate) =>
      candidate.id === oldId,
  );

  if (player) {
    player.id = newId;
    player.isConnected = true;
  }

  // A repeated recovery on the same connection must not copy then delete
  // record entries under the very same key (stats, bids and trade state).
  if (oldId === newId) return;

  for (
    const [spaceId, ownerId]
    of Object.entries(
      gameState.propertyOwners,
    )
  ) {
    if (ownerId === oldId) {
      gameState.propertyOwners[
        Number(spaceId)
      ] = newId;
    }
  }

  // Player IDs are socket IDs and therefore change after a reconnect. Match
  // statistics are long-lived match data, so migrate the stats key instead of
  // starting a fresh zeroed record for the reconnected human.
  if (gameState.playerStats?.[oldId]) {
    gameState.playerStats[newId] = gameState.playerStats[oldId];
    delete gameState.playerStats[oldId];
  }

  if (gameState.tradeRejectAllTurnByPlayerId?.[oldId] !== undefined) {
    gameState.tradeRejectAllTurnByPlayerId[newId] =
      gameState.tradeRejectAllTurnByPlayerId[oldId];
    delete gameState.tradeRejectAllTurnByPlayerId[oldId];
  }

  const replace = (
    value: string | null,
  ): string | null =>
    value === oldId
      ? newId
      : value;

  if (gameState.pendingPurchase) {
    gameState.pendingPurchase.playerId =
      replace(
        gameState.pendingPurchase.playerId,
      )!;
  }

  if (gameState.pendingDebt) {
    gameState.pendingDebt.debtorId =
      replace(
        gameState.pendingDebt.debtorId,
      )!;
    gameState.pendingDebt.creditorId =
      replace(
        gameState.pendingDebt.creditorId,
      );
    if (gameState.pendingDebt.creditorShares) {
      gameState.pendingDebt.creditorShares =
        gameState.pendingDebt.creditorShares.map((share) => ({
          ...share,
          creditorId: replace(share.creditorId)!,
        }));
    }
  }

  if (gameState.pendingCard) {
    gameState.pendingCard.playerId =
      replace(
        gameState.pendingCard.playerId,
      )!;
  }

  if (gameState.pendingJailMove) {
    gameState.pendingJailMove.playerId =
      replace(
        gameState.pendingJailMove.playerId,
      )!;
  }

  if (gameState.pendingMegaAction) {
    gameState.pendingMegaAction.playerId =
      replace(
        gameState.pendingMegaAction.playerId,
      )!;
  }

  if (gameState.pendingSpeedDieAction) {
    gameState.pendingSpeedDieAction.playerId =
      replace(
        gameState.pendingSpeedDieAction.playerId,
      )!;
  }

  if (gameState.pendingTrade) {
    gameState.pendingTrade.proposerId =
      replace(
        gameState.pendingTrade.proposerId,
      )!;
    gameState.pendingTrade.recipientId =
      replace(
        gameState.pendingTrade.recipientId,
      )!;
    if (gameState.pendingTrade.participantIds) {
      replaceArrayValue(gameState.pendingTrade.participantIds, oldId, newId);
    }
    if (gameState.pendingTrade.acceptedPlayerIds) {
      replaceArrayValue(gameState.pendingTrade.acceptedPlayerIds, oldId, newId);
    }
    for (const transfer of gameState.pendingTrade.transfers ?? []) {
      transfer.fromPlayerId = replace(transfer.fromPlayerId)!;
      transfer.toPlayerId = replace(transfer.toPlayerId)!;
    }
    if (gameState.pendingTrade.mortgageInterestByPlayerId) {
      replaceRecordKey(gameState.pendingTrade.mortgageInterestByPlayerId, oldId, newId);
    }
  }

  const auction =
    gameState.pendingAuction;

  if (auction) {
    auction.initiatedByPlayerId =
      replace(
        auction.initiatedByPlayerId,
      )!;
    auction.highestBidderId =
      replace(
        auction.highestBidderId,
      );
    replaceArrayValue(
      auction.activeBidderIds,
      oldId,
      newId,
    );
    replaceArrayValue(
      auction.withdrawnPlayerIds,
      oldId,
      newId,
    );
    replaceRecordKey(
      auction.bidsByPlayerId,
      oldId,
      newId,
    );
  }

  replaceArrayValue(
    gameState.orderRollEligiblePlayerIds,
    oldId,
    newId,
  );
  replaceArrayValue(
    gameState.orderRollCompletedPlayerIds,
    oldId,
    newId,
  );

  if (gameState.lastTradeResult) {
    gameState.lastTradeResult.proposerId = replace(gameState.lastTradeResult.proposerId)!;
    gameState.lastTradeResult.recipientId = replace(gameState.lastTradeResult.recipientId)!;
    if (gameState.lastTradeResult.participantIds) {
      replaceArrayValue(gameState.lastTradeResult.participantIds, oldId, newId);
    }
  }

  if (gameState.lastCardDraw) {
    gameState.lastCardDraw.playerId = replace(gameState.lastCardDraw.playerId)!;
  }

  if (gameState.lastGlobalNotice?.playerId === oldId) {
    gameState.lastGlobalNotice.playerId = newId;
  }
  for (const notice of gameState.globalNotices ?? []) {
    if (notice.playerId === oldId) notice.playerId = newId;
  }
  for (const activity of gameState.activityLog ?? []) {
    if (activity.playerId === oldId) activity.playerId = newId;
  }


  // A browser refresh gives the player a new socket ID. The absolute deadline
  // belongs to the seat/turn, not to the old socket, so migrate only its owner
  // ID and keep the timestamp unchanged. Otherwise syncTurnRollDeadline would
  // interpret the reconnect as a new turn and incorrectly grant fresh time.
  gameState.turnRollDeadlinePlayerId = replace(
    gameState.turnRollDeadlinePlayerId,
  );

  gameState.winnerId = replace(
    gameState.winnerId,
  );
}

export interface ReconnectResult {
  player: RoomPlayer;
  oldPlayerId: string;
}

export function reconnectRoomPlayer(
  room: GameRoom,
  reconnectToken: string,
  newSocketId: string,
  expectedPlayerName?: string,
  force = false,
): ReconnectResult | string {
  const player = room.players.find(
    (candidate) =>
      candidate.reconnectToken ===
      reconnectToken,
  );

  if (!player) {
    return "That recovery key is not valid for this room.";
  }

  if (player.hasLeft) {
    return "That player has already left this game.";
  }

  if (
    expectedPlayerName &&
    player.name.toLowerCase() !==
      expectedPlayerName.toLowerCase()
  ) {
    return "The player name does not match that recovery key.";
  }

  if (
    player.isConnected &&
    player.id !== newSocketId &&
    !force
  ) {
    return "That player session is already active. Choose Take Over Session to continue here.";
  }

  const oldPlayerId = player.id;
  player.id = newSocketId;
  player.isConnected = true;
  player.disconnectedAt = null;

  if (room.hostId === oldPlayerId) {
    room.hostId = newSocketId;
  }

  if (room.gameState) {
    replacePlayerId(
      room.gameState,
      oldPlayerId,
      newSocketId,
    );
  }

  room.updatedAt = Date.now();

  return {
    player,
    oldPlayerId,
  };
}
