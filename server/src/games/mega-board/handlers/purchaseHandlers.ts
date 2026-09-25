import { publicProgressionState } from "../../../platform/progression.js";
import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import { recordCashFlow } from "../utils/stats.js";
import type { Server, Socket } from "socket.io";

import {
  getBoardSpace,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import { rooms } from "../state/rooms.js";
import type {
  GameStateResponse,
  RoomCodePayload,
} from "../types/game.js";
import {
  emitGameState,
  resolvePurchaseDecision,
} from "../utils/game-state.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

import {
  startAuction,
} from "../utils/auction.js";

import {
  syncAuctionTimer,
} from "../utils/auction-timer.js";

export function registerPurchaseHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:purchase",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason: "Game code is required.",
        });
        return;
      }

      const room = rooms.get(code);

      if (!room?.started || !room.gameState) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

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
          reason: "Resolve the outstanding debt first.",
        });
        return;
      }
      const phaseError =
        requireTurnPhase(
          gameState,
          ["purchase"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const pendingPurchase =
        gameState.pendingPurchase;

      if (!pendingPurchase) {
        acknowledge({
          ok: false,
          reason:
            "There is no property awaiting purchase.",
        });
        return;
      }

      if (pendingPurchase.playerId !== socket.id) {
        acknowledge({
          ok: false,
          reason:
            "Only the player who landed on this space can purchase it.",
        });
        return;
      }

      const player = gameState.players.find(
        (gamePlayer) =>
          gamePlayer.id === socket.id,
      );

      const space = getBoardSpace(
        pendingPurchase.spaceId,
      );

      if (!player || !isOwnableBoardSpace(space)) {
        acknowledge({
          ok: false,
          reason:
            "The purchasing player or board space could not be found.",
        });
        return;
      }

      if (gameState.propertyOwners[space.id]) {
        acknowledge({
          ok: false,
          reason:
            "That property is already owned.",
        });
        return;
      }

      if (player.cash < space.price) {
        acknowledge({
          ok: false,
          reason:
            `You need £${space.price.toLocaleString()} to purchase ${space.name}.`,
        });
        return;
      }

      player.cash -= space.price;
      recordCashFlow(gameState, player, -space.price);

      if (!player.properties.includes(space.id)) {
        player.properties.push(space.id);
        player.properties.sort((a, b) => a - b);
      }

      gameState.propertyOwners[space.id] =
        player.id;

      resolvePurchaseDecision(gameState);
      const activityMessage = `${player.name} purchased ${space.name} for £${space.price.toLocaleString()}.`;
      pushGlobalNotice(gameState, {
        kind: "purchase-complete",
        title: "🏠 Property Purchased",
        message: activityMessage,
        playerId: player.id,
        presentation: "standard",
        durationMs: 3000,
      });
      recordActivity(gameState, activityMessage, "purchase", player.id);

      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:decline-purchase",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason: "Game code is required.",
        });
        return;
      }

      const room = rooms.get(code);

      if (!room?.started || !room.gameState) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          ["purchase"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const pendingPurchase =
        gameState.pendingPurchase;

      if (!pendingPurchase) {
        acknowledge({
          ok: false,
          reason:
            "There is no property awaiting a decision.",
        });
        return;
      }

      if (pendingPurchase.playerId !== socket.id) {
        acknowledge({
          ok: false,
          reason:
            "Only the player who landed on this space can decline it.",
        });
        return;
      }

      const player = gameState.players.find(
        (gamePlayer) =>
          gamePlayer.id === socket.id,
      );

      const space = getBoardSpace(
        pendingPurchase.spaceId,
      );

      const auctionError = startAuction(
        gameState,
        pendingPurchase.spaceId,
        socket.id,
      );

      if (auctionError) {
        acknowledge({
          ok: false,
          reason: auctionError,
        });
        return;
      }

      syncAuctionTimer(
        io,
        code,
      );
      const activityMessage = `${player?.name ?? "A player"} passed on ${space?.name ?? "the property"}. A 30-second auction started.`;
      recordActivity(gameState, activityMessage, "purchase", player?.id);


      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
      console.log(activityMessage);
    },
  );
}
