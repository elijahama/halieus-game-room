import {
  getBoardSpace,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  AUCTION_BID_RESET_DURATION_MS,
  AUCTION_INITIAL_DURATION_MS,
} from "../../../../../shared/games/mega-board/game-rules.js";

import { recordCashFlow } from "./stats.js";

import type {
  AuctionResumePhase,
  GamePlayer,
  GameState,
  PendingAuction,
} from "../../../../../shared/games/mega-board/game-state.js";

export interface AuctionResolution {
  completed: boolean;
  winnerId: string | null;
  amount: number;
  spaceId: number;
}

export interface AuctionActionResult {
  error: string | null;
  resolution: AuctionResolution | null;
  timerReset: boolean;
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

function restoreResumePhase(
  gameState: GameState,
  resumePhase: AuctionResumePhase,
): void {
  gameState.pendingAuction = null;
  gameState.awaitingReroll =
    resumePhase === "roll";
  gameState.turnPhase = resumePhase;
}

function awardAuction(
  gameState: GameState,
  auction: PendingAuction,
): AuctionResolution {
  const winner = auction.highestBidderId
    ? activePlayer(
        gameState,
        auction.highestBidderId,
      )
    : undefined;

  const space = getBoardSpace(
    auction.spaceId,
  );

  if (
    !winner ||
    !isOwnableBoardSpace(space) ||
    winner.cash < auction.currentBid
  ) {
    const resolution: AuctionResolution = {
      completed: true,
      winnerId: null,
      amount: 0,
      spaceId: auction.spaceId,
    };

    restoreResumePhase(
      gameState,
      auction.resumePhase,
    );

    return resolution;
  }

  winner.cash -= auction.currentBid;
  recordCashFlow(gameState, winner, -auction.currentBid);

  if (
    !winner.properties.includes(
      space.id,
    )
  ) {
    winner.properties.push(space.id);
    winner.properties.sort((a, b) => a - b);
  }

  gameState.propertyOwners[space.id] =
    winner.id;

  const resolution: AuctionResolution = {
    completed: true,
    winnerId: winner.id,
    amount: auction.currentBid,
    spaceId: space.id,
  };

  restoreResumePhase(
    gameState,
    auction.resumePhase,
  );

  return resolution;
}

function finishWithoutSale(
  gameState: GameState,
  auction: PendingAuction,
): AuctionResolution {
  const resolution: AuctionResolution = {
    completed: true,
    winnerId: null,
    amount: 0,
    spaceId: auction.spaceId,
  };

  restoreResumePhase(
    gameState,
    auction.resumePhase,
  );

  return resolution;
}

function normaliseActiveBidders(
  gameState: GameState,
  auction: PendingAuction,
): void {
  auction.activeBidderIds =
    auction.activeBidderIds.filter(
      (playerId) =>
        Boolean(
          activePlayer(
            gameState,
            playerId,
          ),
        ),
    );

  auction.withdrawnPlayerIds = [
    ...new Set(
      auction.withdrawnPlayerIds,
    ),
  ];
}

function recalculateHighestBid(
  gameState: GameState,
  auction: PendingAuction,
): void {
  const eligibleEntries =
    Object.entries(
      auction.bidsByPlayerId,
    )
      .filter(([playerId]) =>
        auction.activeBidderIds.includes(
          playerId,
        ),
      )
      .filter(([playerId]) =>
        Boolean(
          activePlayer(
            gameState,
            playerId,
          ),
        ),
      )
      .sort(
        ([, firstBid], [, secondBid]) =>
          secondBid - firstBid,
      );

  const highest = eligibleEntries[0];

  auction.highestBidderId =
    highest?.[0] ?? null;
  auction.currentBid =
    highest?.[1] ?? 0;
}

export function resolveAuctionIfComplete(
  gameState: GameState,
): AuctionResolution | null {
  const auction =
    gameState.pendingAuction;

  if (!auction) {
    return null;
  }

  normaliseActiveBidders(
    gameState,
    auction,
  );

  if (
    auction.highestBidderId &&
    auction.activeBidderIds.length === 1 &&
    auction.activeBidderIds[0] ===
      auction.highestBidderId
  ) {
    return awardAuction(
      gameState,
      auction,
    );
  }

  if (
    !auction.highestBidderId &&
    auction.activeBidderIds.length === 0
  ) {
    return finishWithoutSale(
      gameState,
      auction,
    );
  }

  return null;
}

export function resolveAuctionAtDeadline(
  gameState: GameState,
  now = Date.now(),
): AuctionResolution | null {
  const auction =
    gameState.pendingAuction;

  // The competitive countdown does not exist until the first valid bid.
  // Before that, the auction stays open so a property cannot silently pass
  // through an eight-second window with no bidder ever participating.
  if (!auction || !auction.highestBidderId || now < auction.endsAt) {
    return null;
  }

  normaliseActiveBidders(
    gameState,
    auction,
  );

  return awardAuction(
    gameState,
    auction,
  );
}

export function startAuction(
  gameState: GameState,
  spaceId: number,
  initiatedByPlayerId: string,
): string | null {
  const space = getBoardSpace(spaceId);

  if (!isOwnableBoardSpace(space)) {
    return "That board space cannot be auctioned.";
  }

  if (gameState.propertyOwners[space.id]) {
    return "That asset is already owned.";
  }

  const activeBidderIds =
    gameState.players
      .filter(
        (player) =>
          !player.isBankrupt,
      )
      .map((player) => player.id);

  if (activeBidderIds.length === 0) {
    return "There are no eligible auction bidders.";
  }

  const resumePhase: AuctionResumePhase =
    gameState.pendingSpeedDieAction
      ? "speed-die-choice"
      : gameState.awaitingReroll
        ? "roll"
        : "optional-actions";

  const startedAt = Date.now();

  gameState.pendingPurchase = null;
  gameState.awaitingReroll = false;

  gameState.pendingAuction = {
    id:
      `${startedAt}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    spaceId: space.id,
    initiatedByPlayerId,
    resumePhase,
    currentBid: 0,
    highestBidderId: null,
    minimumIncrement: 10,
    startedAt,
    endsAt:
      startedAt +
      AUCTION_INITIAL_DURATION_MS,
    activeBidderIds,
    withdrawnPlayerIds: [],
    bidsByPlayerId: {},
  };

  gameState.turnPhase = "auction";

  return null;
}

export function placeAuctionBid(
  gameState: GameState,
  playerId: string,
  amount: number,
): AuctionActionResult {
  const auction =
    gameState.pendingAuction;

  if (!auction) {
    return {
      error:
        "There is no auction in progress.",
      resolution: null,
      timerReset: false,
    };
  }

  const now = Date.now();

  if (auction.highestBidderId && now >= auction.endsAt) {
    return {
      error:
        "The auction timer has expired.",
      resolution:
        resolveAuctionAtDeadline(
          gameState,
          now,
        ),
      timerReset: false,
    };
  }

  const player = activePlayer(
    gameState,
    playerId,
  );

  if (!player) {
    return {
      error:
        "You are not an active player in this auction.",
      resolution: null,
      timerReset: false,
    };
  }

  if (
    !auction.activeBidderIds.includes(
      player.id,
    )
  ) {
    return {
      error:
        "You have withdrawn from this auction.",
      resolution: null,
      timerReset: false,
    };
  }

  const bid = Math.floor(amount);
  const increment =
    bid - auction.currentBid;
  const allowedIncrements = [
    10,
    50,
    100,
  ];

  if (
    !Number.isFinite(amount) ||
    !allowedIncrements.includes(
      increment,
    )
  ) {
    return {
      error:
        "Bids can only increase by £10, £50 or £100.",
      resolution: null,
      timerReset: false,
    };
  }

  if (player.cash < bid) {
    return {
      error:
        `You only have £${player.cash.toLocaleString()} available.`,
      resolution: null,
      timerReset: false,
    };
  }

  auction.bidsByPlayerId[
    player.id
  ] = bid;
  auction.currentBid = bid;
  auction.highestBidderId =
    player.id;
  auction.endsAt =
    now +
    AUCTION_BID_RESET_DURATION_MS;

  return {
    error: null,
    resolution:
      resolveAuctionIfComplete(
        gameState,
      ),
    timerReset: true,
  };
}

export function withdrawAuctionBidder(
  gameState: GameState,
  playerId: string,
): AuctionActionResult {
  const auction =
    gameState.pendingAuction;

  if (!auction) {
    return {
      error:
        "There is no auction in progress.",
      resolution: null,
      timerReset: false,
    };
  }

  const now = Date.now();

  if (auction.highestBidderId && now >= auction.endsAt) {
    return {
      error:
        "The auction timer has expired.",
      resolution:
        resolveAuctionAtDeadline(
          gameState,
          now,
        ),
      timerReset: false,
    };
  }

  if (
    !auction.activeBidderIds.includes(
      playerId,
    )
  ) {
    return {
      error:
        "You have already withdrawn from this auction.",
      resolution: null,
      timerReset: false,
    };
  }

  if (
    auction.highestBidderId ===
    playerId
  ) {
    return {
      error:
        "The current highest bidder cannot withdraw unless they are outbid.",
      resolution: null,
      timerReset: false,
    };
  }

  auction.activeBidderIds =
    auction.activeBidderIds.filter(
      (activeId) =>
        activeId !== playerId,
    );

  auction.withdrawnPlayerIds.push(
    playerId,
  );

  delete auction.bidsByPlayerId[
    playerId
  ];

  return {
    error: null,
    resolution:
      resolveAuctionIfComplete(
        gameState,
      ),
    timerReset: false,
  };
}

export function removeDisconnectedBidder(
  gameState: GameState,
  playerId: string,
): AuctionResolution | null {
  const auction =
    gameState.pendingAuction;

  if (!auction) {
    return null;
  }

  auction.activeBidderIds =
    auction.activeBidderIds.filter(
      (activeId) =>
        activeId !== playerId,
    );

  if (
    !auction.withdrawnPlayerIds.includes(
      playerId,
    )
  ) {
    auction.withdrawnPlayerIds.push(
      playerId,
    );
  }

  delete auction.bidsByPlayerId[
    playerId
  ];

  if (
    auction.highestBidderId ===
    playerId
  ) {
    recalculateHighestBid(
      gameState,
      auction,
    );
  }

  return resolveAuctionIfComplete(
    gameState,
  );
}
