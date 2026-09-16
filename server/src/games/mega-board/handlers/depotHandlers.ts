import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import { recordCashFlow } from "../utils/stats.js";
import type { Server, Socket } from "socket.io";

import {
  getBoardSpace,
  isRailroadBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";

import type {
  GameStateResponse,
} from "../types/game.js";

import {
  settleDebtIfAffordable,
} from "../utils/debt.js";

import {
  emitGameState,
} from "../utils/game-state.js";

import {
  resumePendingJailMove,
} from "../utils/jail.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

interface DepotPayload {
  code: string;
  spaceId: number;
}

function validateCurrentPlayer(
  gameState: GameState,
  socketId: string,
): string | null {
  if (gameState.phase !== "playing") {
    return "Train Depots are only available during gameplay.";
  }

  if (
    gameState.pendingPurchase ||
    gameState.pendingCard ||
    gameState.pendingAuction ||
    gameState.pendingMegaAction ||
    gameState.pendingSpeedDieAction
  ) {
    return "Finish the current game decision before managing a Train Depot.";
  }

  if (
    gameState.pendingDebt &&
    gameState.pendingDebt.debtorId !==
      socketId
  ) {
    return "Another player must resolve their debt first.";
  }

  const currentPlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ];
  const isDebtDebtor =
    gameState.pendingDebt?.debtorId ===
    socketId;

  if (
    (!currentPlayer ||
      currentPlayer.id !== socketId) &&
    !isDebtDebtor
  ) {
    return "You can only manage Train Depots during your own turn, unless you are resolving a transferred mortgage debt.";
  }

  return null;
}

export function registerDepotHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:build-depot",
    (
      payload: DepotPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code?.trim().toUpperCase();

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

      const gameState = room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          ["roll", "optional-actions", "jail-decision"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const turnError =
        validateCurrentPlayer(
          gameState,
          socket.id,
        );

      if (turnError) {
        acknowledge({
          ok: false,
          reason: turnError,
        });
        return;
      }

      const railroad = getBoardSpace(
        payload.spaceId,
      );

      if (!isRailroadBoardSpace(railroad)) {
        acknowledge({
          ok: false,
          reason:
            "Train Depots can only be built on railway stations.",
        });
        return;
      }

      if (
        gameState.propertyOwners[
          railroad.id
        ] !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "You do not own this railway station.",
        });
        return;
      }

      if (
        gameState.mortgagedProperties[
          railroad.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "Unmortgage this railway station before building a Train Depot.",
        });
        return;
      }

      if (
        gameState.railroadDepots[
          railroad.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "This railway station already has a Train Depot.",
        });
        return;
      }

      const player = gameState.players.find(
        (candidate) =>
          candidate.id === socket.id,
      );

      if (!player) {
        acknowledge({
          ok: false,
          reason:
            "The player could not be found.",
        });
        return;
      }

      if (
        gameState.bankInventory.depots <= 0
      ) {
        acknowledge({
          ok: false,
          reason:
            "The bank has no Train Depots remaining.",
        });
        return;
      }

      if (
        player.cash < railroad.depotCost
      ) {
        acknowledge({
          ok: false,
          reason:
            `You need £${railroad.depotCost.toLocaleString()} to build a Train Depot.`,
        });
        return;
      }

      player.cash -= railroad.depotCost;
      recordCashFlow(gameState, player, -railroad.depotCost);
      gameState.bankInventory.depots -= 1;
      gameState.railroadDepots[
        railroad.id
      ] = true;
      const activityMessage = `${player.name} built a Train Depot on ${railroad.name}.`;
      pushGlobalNotice(gameState, {
        kind: "development",
        title: "🚉 Train Depot Built",
        message: activityMessage,
        playerId: player.id,
        presentation: "standard",
        durationMs: 2600,
      });
      recordActivity(gameState, activityMessage, "building", player.id);


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

  socket.on(
    "game:sell-depot",
    (
      payload: DepotPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code?.trim().toUpperCase();

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

      const gameState = room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          [
            "roll",
            "optional-actions",
            "jail-decision",
            "debt",
          ],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const turnError =
        validateCurrentPlayer(
          gameState,
          socket.id,
        );

      if (turnError) {
        acknowledge({
          ok: false,
          reason: turnError,
        });
        return;
      }

      const railroad = getBoardSpace(
        payload.spaceId,
      );

      if (!isRailroadBoardSpace(railroad)) {
        acknowledge({
          ok: false,
          reason:
            "Train Depots can only be sold from railway stations.",
        });
        return;
      }

      if (
        gameState.propertyOwners[
          railroad.id
        ] !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "You do not own this railway station.",
        });
        return;
      }

      if (
        !gameState.railroadDepots[
          railroad.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "This railway station does not have a Train Depot.",
        });
        return;
      }

      const player = gameState.players.find(
        (candidate) =>
          candidate.id === socket.id,
      );

      if (!player) {
        acknowledge({
          ok: false,
          reason:
            "The player could not be found.",
        });
        return;
      }

      const refund = Math.floor(
        railroad.depotCost / 2,
      );

      gameState.railroadDepots[
        railroad.id
      ] = false;
      gameState.bankInventory.depots += 1;
      player.cash += refund;
      recordCashFlow(gameState, player, refund);

      const debtSettled =
        settleDebtIfAffordable(
          gameState,
        );

      if (debtSettled) {
        resumePendingJailMove(
          gameState,
        );
      }
      const activityMessage = `${player.name} sold the Train Depot on ${railroad.name} for £${refund}.`;
      pushGlobalNotice(gameState, {
        kind: "development",
        title: "🚉 Train Depot Sold",
        message: activityMessage,
        playerId: player.id,
        presentation: "standard",
        durationMs: 2400,
      });
      recordActivity(gameState, activityMessage, "building", player.id);


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
