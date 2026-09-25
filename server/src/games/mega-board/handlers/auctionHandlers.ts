import { publicProgressionState } from "../../../platform/progression.js";
import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import type {
  Server,
  Socket,
} from "socket.io";

import {
  getBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
} from "../types/game.js";

import {
  emitGameState,
} from "../utils/game-state.js";

import {
  placeAuctionBid,
  withdrawAuctionBidder,
} from "../utils/auction.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

import {
  syncAuctionTimer,
} from "../utils/auction-timer.js";

interface AuctionBidPayload {
  code: string;
  amount: number;
}

interface AuctionActionPayload {
  code: string;
}

function logResolution(
  gameState: NonNullable<
    ReturnType<typeof rooms.get>
  >["gameState"],
  winnerId: string | null,
  amount: number,
  spaceId: number,
): void {
  if (!gameState) {
    return;
  }

  const space = getBoardSpace(spaceId);
  const winner = winnerId
    ? gameState.players.find(
        (player) =>
          player.id === winnerId,
      )
    : undefined;

  if (winner) {
    const message = `${winner.name} won the auction for ${space?.name ?? "an asset"} with £${amount.toLocaleString()}.`;
    pushGlobalNotice(gameState, {
      kind: "auction-result",
      title: "🔨 Auction Won",
      message,
      playerId: winner.id,
      presentation: "major",
      steps: [
        `Bidding closed at £${amount.toLocaleString()}.`,
        `${winner.name} won ${space?.name ?? "the asset"}.`,
        `Ownership has transferred to ${winner.name}.`,
      ],
      durationMs: 4400,
    });
    recordActivity(gameState, message, "auction", winner.id);
    console.log(message);
  } else {
    const message = `The auction for ${space?.name ?? "an asset"} ended without a sale.`;
    pushGlobalNotice(gameState, {
      kind: "auction-result",
      title: "🔨 Auction Ended",
      message,
      presentation: "standard",
      durationMs: 3000,
    });
    recordActivity(gameState, message, "auction");
    console.log(message);
  }
}

export function registerAuctionHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:auction-bid",
    (
      payload: AuctionBidPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

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

      const gameState =
        room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          ["auction"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const result = placeAuctionBid(
        gameState,
        socket.id,
        payload.amount,
      );

      if (result.error) {
        if (result.resolution) {
          syncAuctionTimer(
            io,
            code,
          );

          logResolution(
            gameState,
            result.resolution.winnerId,
            result.resolution.amount,
            result.resolution.spaceId,
          );

          emitGameState(
            io,
            code,
            gameState,
          );
        }

        acknowledge({
          ok: false,
          reason: result.error,
          state: publicProgressionState(gameState),
        });
        return;
      }

      syncAuctionTimer(
        io,
        code,
      );

      const player =
        gameState.players.find(
          (candidate) =>
            candidate.id === socket.id,
        );

      const bidMessage = `${player?.name ?? "A player"} bid £${Math.floor(payload.amount)}.`;
      recordActivity(gameState, bidMessage, "auction", player?.id, { announce: false });
      console.log(bidMessage);

      if (result.resolution) {
        logResolution(
          gameState,
          result.resolution.winnerId,
          result.resolution.amount,
          result.resolution.spaceId,
        );
      }

      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
    },
  );

  socket.on(
    "game:auction-withdraw",
    (
      payload: AuctionActionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

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

      const gameState =
        room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          ["auction"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const result =
        withdrawAuctionBidder(
          gameState,
          socket.id,
        );

      if (result.error) {
        if (result.resolution) {
          syncAuctionTimer(
            io,
            code,
          );

          logResolution(
            gameState,
            result.resolution.winnerId,
            result.resolution.amount,
            result.resolution.spaceId,
          );

          emitGameState(
            io,
            code,
            gameState,
          );
        }

        acknowledge({
          ok: false,
          reason: result.error,
          state: publicProgressionState(gameState),
        });
        return;
      }

      syncAuctionTimer(
        io,
        code,
      );

      const player =
        gameState.players.find(
          (candidate) =>
            candidate.id === socket.id,
        );

      const withdrawMessage = `${player?.name ?? "A player"} withdrew from the auction.`;
      recordActivity(gameState, withdrawMessage, "auction", player?.id, { announce: false });
      console.log(withdrawMessage);

      if (result.resolution) {
        logResolution(
          gameState,
          result.resolution.winnerId,
          result.resolution.amount,
          result.resolution.spaceId,
        );
      }

      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
    },
  );
}
