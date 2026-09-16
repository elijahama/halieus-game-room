import type {
  Server,
  Socket,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
  SetAutopilotPayload,
} from "../types/game.js";

import {
  deferAutomation,
} from "../ai/ai-engine.js";

import {
  emitGameState,
} from "../utils/game-state.js";

const VALID_DIFFICULTIES =
  new Set([
    "easy",
    "normal",
    "hard",
  ]);

export function registerAutopilotHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:set-autopilot",
    (
      payload: SetAutopilotPayload,
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
            "The active game could not be found.",
        });
        return;
      }

      const gameState =
        room.gameState;

      const player =
        gameState.players.find(
          (candidate) =>
            candidate.id === socket.id,
        );

      if (!player) {
        acknowledge({
          ok: false,
          reason:
            "Your player could not be found.",
        });
        return;
      }

      if (player.isAi) {
        acknowledge({
          ok: false,
          reason:
            "AI players are already automated.",
        });
        return;
      }

      if (player.isBankrupt) {
        acknowledge({
          ok: false,
          reason:
            "A bankrupt player cannot use Autopilot.",
        });
        return;
      }

      if (
        gameState.phase === "finished"
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game has already finished.",
        });
        return;
      }

      const difficulty =
        VALID_DIFFICULTIES.has(
          payload.difficulty,
        )
          ? payload.difficulty
          : "normal";

      player.autopilotDifficulty =
        difficulty;
      player.autopilotEnabled =
        Boolean(payload.enabled);

      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: gameState,
      });

      console.log(
        `${player.name} ${
          player.autopilotEnabled
            ? `enabled Autopilot (${difficulty})`
            : "disabled Autopilot"
        }.`,
      );

      if (player.autopilotEnabled) {
        // Give the human a visible takeover window before the first automated action.
        deferAutomation(code, 3000);
      }
    },
  );
}
