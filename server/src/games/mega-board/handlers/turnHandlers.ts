import { publicProgressionState } from "../../../platform/progression.js";
import { recordActivity } from "../utils/activity.js";
import { queueRoomSave } from "../utils/persistence.js";
import { toPublicGameRoom } from "../utils/room-view.js";
import type {
  Server,
  Socket,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
  RoomCodePayload,
  SetTurnTimerPayload,
} from "../types/game.js";

import {
  advanceTurn,
  emitGameState,
} from "../utils/game-state.js";
import { isValidTurnTimerSeconds } from "../../../../../shared/games/mega-board/game-rules.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

export function registerTurnHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:set-turn-timer",
    (
      payload: SetTurnTimerPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room) {
        acknowledge({ ok: false, reason: "The game could not be found." });
        return;
      }
      if (room.hostId !== socket.id) {
        acknowledge({ ok: false, reason: "Only the host can change the turn timer." });
        return;
      }
      if (!isValidTurnTimerSeconds(payload.seconds)) {
        acknowledge({ ok: false, reason: "Choose one of the available turn timer presets." });
        return;
      }

      if (room.started || room.gameState) {
        acknowledge({ ok: false, reason: "The turn timer is locked once the game starts." });
        return;
      }
      room.turnTimerSeconds = payload.seconds;
      room.updatedAt = Date.now();
      queueRoomSave();
      io.to(code).emit("lobby:updated", toPublicGameRoom(room));
      acknowledge({ ok: true });
    },
  );
  socket.on(
    "game:end-turn",
    (
      payload: RoomCodePayload,
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
          ["optional-actions"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      if (gameState.pendingTrade) {
        acknowledge({
          ok: false,
          reason:
            "Resolve or cancel the pending trade before ending the turn.",
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
            "Only the current player can end the turn.",
        });
        return;
      }

      advanceTurn(gameState);
      const activityMessage = `${currentPlayer.name} ended their turn.`;
      recordActivity(gameState, activityMessage, "turn", currentPlayer.id);


      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
      console.log(activityMessage);
    },
  );
}
