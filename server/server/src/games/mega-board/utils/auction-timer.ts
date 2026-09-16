import type {
  Server,
} from "socket.io";

import {
  getBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  rooms,
} from "../state/rooms.js";

import {
  emitGameState,
} from "./game-state.js";

import { pushGlobalNotice, recordActivity } from "./activity.js";

import {
  resolveAuctionAtDeadline,
  type AuctionResolution,
} from "./auction.js";

interface AuctionTimerEntry {
  auctionId: string;
  timeout: ReturnType<typeof setTimeout>;
}

const auctionTimers =
  new Map<string, AuctionTimerEntry>();

function logResolution(
  code: string,
  resolution: AuctionResolution,
): void {
  const room = rooms.get(code);
  const gameState = room?.gameState;

  if (!gameState) {
    return;
  }

  const space = getBoardSpace(
    resolution.spaceId,
  );

  const winner = resolution.winnerId
    ? gameState.players.find(
        (player) =>
          player.id ===
          resolution.winnerId,
      )
    : undefined;

  if (winner) {
    console.log(
      `${winner.name} won the timed auction for ${space?.name ?? "an asset"} with £${resolution.amount}.`,
    );
  } else {
    console.log(
      `The timed auction for ${space?.name ?? "an asset"} ended without a sale.`,
    );
  }
}

export function cancelAuctionTimer(
  code: string,
): void {
  const existing =
    auctionTimers.get(code);

  if (!existing) {
    return;
  }

  clearTimeout(existing.timeout);
  auctionTimers.delete(code);
}

export function syncAuctionTimer(
  io: Server,
  code: string,
): void {
  cancelAuctionTimer(code);

  const room = rooms.get(code);
  const gameState = room?.gameState;
  const auction =
    gameState?.pendingAuction;

  if (!gameState || !auction) {
    return;
  }

  // Wait for the first real bid before arming the auction countdown.
  if (!auction.highestBidderId) {
    return;
  }

  const auctionId = auction.id;
  const delay = Math.max(
    0,
    auction.endsAt - Date.now(),
  );

  const timeout = setTimeout(
    () => {
      auctionTimers.delete(code);

      const currentRoom =
        rooms.get(code);
      const currentState =
        currentRoom?.gameState;
      const currentAuction =
        currentState?.pendingAuction;

      if (
        !currentState ||
        !currentAuction ||
        currentAuction.id !== auctionId ||
        !currentAuction.highestBidderId
      ) {
        return;
      }

      if (
        Date.now() <
        currentAuction.endsAt
      ) {
        syncAuctionTimer(
          io,
          code,
        );
        return;
      }

      const resolution =
        resolveAuctionAtDeadline(
          currentState,
        );

      if (!resolution) {
        syncAuctionTimer(
          io,
          code,
        );
        return;
      }

      const resolvedSpace = getBoardSpace(resolution.spaceId);
      const resolvedWinner = resolution.winnerId
        ? currentState.players.find((player) => player.id === resolution.winnerId)
        : undefined;

      if (resolvedWinner) {
        const message = `${resolvedWinner.name} won the auction for ${resolvedSpace?.name ?? "an asset"} with £${resolution.amount.toLocaleString()}.`;
        pushGlobalNotice(currentState, {
          kind: "auction-result",
          title: "🔨 Auction Won",
          message,
          playerId: resolvedWinner.id,
          presentation: "major",
          steps: [
            `Time expired at £${resolution.amount.toLocaleString()}.`,
            `${resolvedWinner.name} won ${resolvedSpace?.name ?? "the asset"}.`,
            `Ownership has transferred to ${resolvedWinner.name}.`,
          ],
          durationMs: 4400,
        });
        recordActivity(currentState, message, "auction", resolvedWinner.id);
      } else {
        const message = `The auction for ${resolvedSpace?.name ?? "an asset"} ended without a sale.`;
        pushGlobalNotice(currentState, {
          kind: "auction-result",
          title: "🔨 Auction Ended",
          message,
          presentation: "standard",
          durationMs: 3000,
        });
        recordActivity(currentState, message, "auction");
      }

      emitGameState(
        io,
        code,
        currentState,
      );

      logResolution(
        code,
        resolution,
      );
    },
    delay,
  );

  auctionTimers.set(code, {
    auctionId,
    timeout,
  });
}
