import type { Server, Socket } from "socket.io";

import {
  compareOrderRolls,
  findOrderRollTies,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";
import type {
  GameStateResponse,
  RoomCodePayload,
} from "../types/game.js";
import { rollTwoDice } from "../utils/dice.js";
import { emitGameState } from "../utils/game-state.js";

export function registerOrderHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:order-roll",
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
          reason: "The game has not started.",
        });
        return;
      }

      const gameState = room.gameState;

      if (gameState.phase !== "ordering") {
        acknowledge({
          ok: false,
          reason:
            "Turn order has already been decided.",
        });
        return;
      }

      const rollingPlayer = gameState.players.find(
        (player) => player.id === socket.id,
      );

      if (!rollingPlayer) {
        acknowledge({
          ok: false,
          reason:
            "You are not a player in this game.",
        });
        return;
      }

      const activeRollerId =
        gameState.orderRollEligiblePlayerIds.find(
          (playerId) =>
            !gameState.orderRollCompletedPlayerIds.includes(playerId),
        );

      if (rollingPlayer.id !== activeRollerId) {
        const activeRoller = gameState.players.find((player) => player.id === activeRollerId);
        acknowledge({
          ok: false,
          reason: activeRoller
            ? `Wait for ${activeRoller.name} to roll first.`
            : "Wait for the current turn-order roll to finish.",
        });
        return;
      }

      if (
        !gameState.orderRollEligiblePlayerIds.includes(
          rollingPlayer.id,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "You are not required to roll during this ordering round.",
        });
        return;
      }

      if (
        gameState.orderRollCompletedPlayerIds.includes(
          rollingPlayer.id,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "You have already rolled during this ordering round.",
        });
        return;
      }

      const roll = rollTwoDice();

      rollingPlayer.orderRolls.push(roll.total);
      gameState.orderRollCompletedPlayerIds.push(
        rollingPlayer.id,
      );
      gameState.lastDiceRoll = {
        white1: roll.white1,
        white2: roll.white2,
        speed: null,
        movementTotal: roll.total,
      };

      const everyoneEligibleHasRolled =
        gameState.orderRollEligiblePlayerIds.every(
          (playerId) =>
            gameState.orderRollCompletedPlayerIds.includes(
              playerId,
            ),
        );

      if (everyoneEligibleHasRolled) {
        const tiedGroups = findOrderRollTies(
          gameState.players,
        );

        const tiedPlayerIds =
          tiedGroups.flatMap((group) =>
            group.map((player) => player.id),
          );

        if (tiedPlayerIds.length > 0) {
          gameState.orderingRound += 1;
          gameState.orderRollEligiblePlayerIds =
            tiedPlayerIds;
          gameState.orderRollCompletedPlayerIds = [];
        } else {
          gameState.players.sort(compareOrderRolls);
          gameState.phase = "playing";
          gameState.turnPhase = "roll";
          gameState.currentPlayerIndex = 0;
          gameState.turnNumber = 1;
          gameState.orderRollEligiblePlayerIds = [];
          gameState.orderRollCompletedPlayerIds = [];
          gameState.lastDiceRoll = null;
        }
      }

      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: gameState,
        roll,
      });
    },
  );
}
