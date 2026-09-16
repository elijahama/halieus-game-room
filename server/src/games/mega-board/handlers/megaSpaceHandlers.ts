import { recordActivity } from "../utils/activity.js";
import type {
  Server,
  Socket,
} from "socket.io";

import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
  RoomCodePayload,
} from "../types/game.js";

import {
  syncAuctionTimer,
} from "../utils/auction-timer.js";

import {
  emitGameState,
} from "../utils/game-state.js";

import {
  cancelBusTicketUse,
  chooseAuctionSpaceAsset,
  chooseBirthdayGift,
  moveWithBusTicket,
  startBusTicketUse,
  type MegaActionResult,
} from "../utils/mega-actions.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

interface PositionPayload
  extends RoomCodePayload {
  position: number;
}

interface SpacePayload
  extends RoomCodePayload {
  spaceId: number;
}

interface ValidContext {
  ok: true;
  code: string;
  gameState: GameState;
}

interface InvalidContext {
  ok: false;
  reason: string;
}

function getContext(
  socket: Socket,
  payload: RoomCodePayload,
  phases: Parameters<
    typeof requireTurnPhase
  >[1],
): ValidContext | InvalidContext {
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
    return {
      ok: false,
      reason:
        "The game could not be found.",
    };
  }

  const gameState = room.gameState;
  const phaseError = requireTurnPhase(
    gameState,
    phases,
  );

  if (phaseError) {
    return {
      ok: false,
      reason: phaseError,
    };
  }

  const currentPlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ];

  if (
    !currentPlayer ||
    currentPlayer.id !== socket.id
  ) {
    return {
      ok: false,
      reason:
        "Only the current player can complete this action.",
    };
  }

  return {
    ok: true,
    code,
    gameState,
  };
}

function finish(
  io: Server,
  code: string,
  gameState: GameState,
  actorId: string,
  acknowledge: (
    response: GameStateResponse,
  ) => void,
  result: MegaActionResult,
): void {
  if (result.error) {
    acknowledge({
      ok: false,
      reason: result.error,
      state: gameState,
    });
    return;
  }

  if (result.auctionStarted) {
    syncAuctionTimer(io, code);
  }

  recordActivity(gameState, result.message, "mega", actorId);
  emitGameState(io, code, gameState);

  acknowledge({
    ok: true,
    state: gameState,
    ...(result.utilityRoll
      ? { roll: result.utilityRoll }
      : {}),
  });

  console.log(result.message);
}

export function registerMegaSpaceHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:bus-ticket-start",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getContext(
        socket,
        payload,
        ["roll"],
      );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      finish(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        startBusTicketUse(
          context.gameState,
          socket.id,
        ),
      );
    },
  );

  socket.on(
    "game:bus-ticket-cancel",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getContext(
        socket,
        payload,
        ["mega-choice"],
      );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      finish(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        cancelBusTicketUse(
          context.gameState,
          socket.id,
        ),
      );
    },
  );

  socket.on(
    "game:bus-ticket-move",
    (
      payload: PositionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getContext(
        socket,
        payload,
        ["mega-choice"],
      );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      finish(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        moveWithBusTicket(
          context.gameState,
          socket.id,
          payload.position,
        ),
      );
    },
  );

  socket.on(
    "game:birthday-gift-cash",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getContext(
        socket,
        payload,
        ["mega-choice"],
      );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      finish(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        chooseBirthdayGift(
          context.gameState,
          socket.id,
          "cash",
        ),
      );
    },
  );

  socket.on(
    "game:birthday-gift-ticket",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getContext(
        socket,
        payload,
        ["mega-choice"],
      );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      finish(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        chooseBirthdayGift(
          context.gameState,
          socket.id,
          "ticket",
        ),
      );
    },
  );

  socket.on(
    "game:auction-space-select",
    (
      payload: SpacePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getContext(
        socket,
        payload,
        ["mega-choice"],
      );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      finish(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        chooseAuctionSpaceAsset(
          context.gameState,
          socket.id,
          payload.spaceId,
        ),
      );
    },
  );
}
