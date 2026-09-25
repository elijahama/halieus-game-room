import { publicProgressionState } from "../../../platform/progression.js";
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
  emitGameState,
} from "../utils/game-state.js";

import {
  resolveBusMove,
  resolveBusTicketChoice,
  resolveMrMonopolyMove,
  resolveTripleMove,
} from "../utils/speed-die.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

interface TripleMovePayload
  extends RoomCodePayload {
  position: number;
}

interface BusMovePayload extends RoomCodePayload {
  spaces: number;
}

interface ValidSpeedDieContext {
  ok: true;
  code: string;
  gameState: GameState;
}

interface InvalidSpeedDieContext {
  ok: false;
  reason: string;
}

function getSpeedDieContext(
  socket: Socket,
  payload: RoomCodePayload,
):
  | ValidSpeedDieContext
  | InvalidSpeedDieContext {
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
    return {
      ok: false,
      reason:
        "The game could not be found.",
    };
  }

  const gameState = room.gameState;

  const phaseError =
    requireTurnPhase(
      gameState,
      ["speed-die-choice"],
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
        "Only the current player can complete the Speed Die action.",
    };
  }

  if (
    gameState.pendingSpeedDieAction
      ?.playerId !== socket.id
  ) {
    return {
      ok: false,
      reason:
        "There is no matching Speed Die action for this player.",
    };
  }

  return {
    ok: true,
    code,
    gameState,
  };
}

function emitResolution(
  io: Server,
  code: string,
  gameState: GameState,
  actorId: string,
  acknowledge: (
    response: GameStateResponse,
  ) => void,
  result: {
    error: string | null;
    message: string;
  },
): void {
  if (result.error) {
    acknowledge({
      ok: false,
      reason: result.error,
    });
    return;
  }

  recordActivity(gameState, result.message, "mega", actorId);

  emitGameState(
    io,
    code,
    gameState,
  );

  acknowledge({
    ok: true,
    state: publicProgressionState(gameState),
  });

  console.log(result.message);
}

export function registerSpeedDieHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:speed-die-triple-move",
    (
      payload: TripleMovePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context =
        getSpeedDieContext(
          socket,
          payload,
        );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      emitResolution(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        resolveTripleMove(
          context.gameState,
          socket.id,
          payload.position,
        ),
      );
    },
  );

  socket.on(
    "game:speed-die-bus-move",
    (
      payload: BusMovePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context = getSpeedDieContext(socket, payload);
      if (!context.ok) {
        acknowledge({ ok: false, reason: context.reason });
        return;
      }

      emitResolution(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        resolveBusMove(context.gameState, socket.id, payload.spaces),
      );
    },
  );

  socket.on(
    "game:speed-die-take-ticket",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context =
        getSpeedDieContext(
          socket,
          payload,
        );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      emitResolution(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        resolveBusTicketChoice(
          context.gameState,
          socket.id,
        ),
      );
    },
  );


  socket.on(
    "game:speed-die-mr-monopoly",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context =
        getSpeedDieContext(
          socket,
          payload,
        );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      emitResolution(
        io,
        context.code,
        context.gameState,
        socket.id,
        acknowledge,
        resolveMrMonopolyMove(
          context.gameState,
          socket.id,
        ),
      );
    },
  );
}
