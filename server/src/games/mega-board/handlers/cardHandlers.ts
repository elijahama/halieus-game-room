import { publicProgressionState } from "../../../platform/progression.js";
import type {
  Server,
  Socket,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
} from "../types/game.js";

import {
  resolvePendingCard,
} from "../utils/cards.js";

import {
  emitGameState,
} from "../utils/game-state.js";

import {
  requireTurnPhase,
  syncBlockingTurnPhase,
} from "../utils/turn-engine.js";

interface CardActionPayload {
  code: string;
}

export function registerCardHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:card-continue",
    (
      payload: CardActionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      const room =
        code
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
          ["card"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      if (
        gameState.pendingCard
          ?.playerId !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "Only the player who drew the card can continue.",
        });
        return;
      }

      const error =
        resolvePendingCard(
          gameState,
          socket.id,
        );

      if (error) {
        acknowledge({
          ok: false,
          reason: error,
        });
        return;
      }

      syncBlockingTurnPhase(
        gameState,
      );

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
