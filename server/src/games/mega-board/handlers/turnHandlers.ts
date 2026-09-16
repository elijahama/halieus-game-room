import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
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

      if (!code || !room?.started || !room.gameState) {
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

      const gameState = room.gameState;
      const seconds = payload.seconds;
      gameState.turnTimerSeconds = seconds;

      // An explicit host change is allowed to restart the currently active human
      // window at the new duration. Ordinary refresh/reconnect never does this.
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (
        gameState.phase === "playing" &&
        currentPlayer &&
        !currentPlayer.isAi &&
        !currentPlayer.isBankrupt &&
        !currentPlayer.autopilotEnabled
      ) {
        if (gameState.turnPhase === "roll") {
          gameState.turnRollDeadline = Date.now() + seconds * 1000;
          gameState.turnRollDeadlinePlayerId = currentPlayer.id;
        }
      }

      const label = seconds % 60 === 0
        ? `${seconds / 60} minute${seconds === 60 ? "" : "s"}`
        : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      recordActivity(gameState, `Turn timer changed to ${label} by the host.`, "game", socket.id);
      pushGlobalNotice(gameState, {
        kind: "game-mode",
        title: "⏱ Turn Timer Updated",
        message: `The host changed the human turn timer to ${label}.`,
        playerId: socket.id,
        presentation: "standard",
        durationMs: 2600,
      });

      emitGameState(io, code, gameState);
      acknowledge({ ok: true, state: gameState });
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
        state: gameState,
      });
      console.log(activityMessage);
    },
  );
}
