import { randomUUID } from "node:crypto";
import type {
  Server,
  Socket,
} from "socket.io";

import type {
  AiDifficulty,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";

import type {
  AddAiPayload,
  GameResponse,
  GameRoom,
  RemoveAiPayload,
  RoomPlayer,
} from "../types/game.js";

import {
  queueRoomSave,
} from "../utils/persistence.js";

import {
  toPublicGameRoom,
} from "../utils/room-view.js";

const MAXIMUM_PLAYERS = 8;

const AI_NAMES = [
  "Atlas",
  "Nova",
  "Rook",
  "Echo",
  "Pixel",
  "Sage",
  "Milo",
  "Orbit",
];

function isDifficulty(
  value: string,
): value is AiDifficulty {
  return (
    value === "easy" ||
    value === "normal" ||
    value === "hard"
  );
}

function nextAiName(
  usedNames: string[],
): string {
  const normalised = new Set(
    usedNames.map((name) =>
      name.toLowerCase(),
    ),
  );

  const available = AI_NAMES.find(
    (name) =>
      !normalised.has(
        name.toLowerCase(),
      ),
  );

  if (available) {
    return available;
  }

  let number = 1;

  while (
    normalised.has(
      `computer ${number}`,
    )
  ) {
    number += 1;
  }

  return `Computer ${number}`;
}

function emitLobby(
  io: Server,
  code: string,
): void {
  const room = rooms.get(code);

  if (!room) {
    return;
  }

  io.to(code).emit(
    "lobby:updated",
    toPublicGameRoom(room),
  );
}


function socketIsCurrentHost(
  room: GameRoom,
  socketId: string,
): boolean {
  if (room.hostId === socketId) {
    return true;
  }

  const connectedHost = room.players.find(
    (player) =>
      !player.hasLeft &&
      !player.isAi &&
      player.isHost &&
      player.id === socketId,
  );

  if (!connectedHost) {
    return false;
  }

  // Persisted/recovered lobbies can briefly carry an old hostId after a
  // socket replacement. The host flag belongs to the recovered seat, so
  // repair hostId here instead of blocking legitimate host-only actions.
  room.hostId = socketId;
  room.updatedAt = Date.now();
  queueRoomSave();
  return true;
}

export function registerAiLobbyHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:add-ai",
    (
      payload: AddAiPayload,
      acknowledge: (
        response: GameResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      const room = code
        ? rooms.get(code)
        : undefined;

      if (!code || !room) {
        acknowledge({
          ok: false,
          reason:
            "That game room does not exist.",
        });
        return;
      }

      if (!socketIsCurrentHost(room, socket.id)) {
        acknowledge({
          ok: false,
          reason:
            "Only the host can add AI players.",
        });
        return;
      }

      if (room.started) {
        acknowledge({
          ok: false,
          reason:
            "AI players can only be added before the game starts.",
        });
        return;
      }

      if (room.ranked) {
        acknowledge({
          ok: false,
          reason:
            "AI players are disabled in ranked games.",
        });
        return;
      }

      if (
        room.players.filter(
          (player) => !player.hasLeft,
        ).length >= MAXIMUM_PLAYERS
      ) {
        acknowledge({
          ok: false,
          reason:
            "That game room is full.",
        });
        return;
      }

      if (
        !isDifficulty(
          payload.difficulty,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "Choose an Easy, Normal or Hard AI.",
        });
        return;
      }

      const aiPlayer: RoomPlayer = {
        id: `ai:${randomUUID()}`,
        name: nextAiName(
          room.players.map(
            (player) => player.name,
          ),
        ),
        isHost: false,
        isConnected: true,
        isAi: true,
        aiDifficulty:
          payload.difficulty,
        hasLeft: false,
        reconnectToken: "",
        disconnectedAt: null,
      };

      room.players.push(aiPlayer);
      room.updatedAt = Date.now();
      queueRoomSave();
      emitLobby(io, code);

      acknowledge({
        ok: true,
        code,
        room: toPublicGameRoom(room),
      });

      console.log(
        `${aiPlayer.name} (${aiPlayer.aiDifficulty}) added to ${code}.`,
      );
    },
  );

  socket.on(
    "game:remove-ai",
    (
      payload: RemoveAiPayload,
      acknowledge: (
        response: GameResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      const room = code
        ? rooms.get(code)
        : undefined;

      if (!code || !room) {
        acknowledge({
          ok: false,
          reason:
            "That game room does not exist.",
        });
        return;
      }

      if (!socketIsCurrentHost(room, socket.id)) {
        acknowledge({
          ok: false,
          reason:
            "Only the host can remove AI players.",
        });
        return;
      }

      if (room.started) {
        acknowledge({
          ok: false,
          reason:
            "AI players cannot be removed after the game starts.",
        });
        return;
      }

      const aiPlayer =
        room.players.find(
          (player) =>
            player.id ===
              payload.playerId &&
            player.isAi,
        );

      if (!aiPlayer) {
        acknowledge({
          ok: false,
          reason:
            "That AI player could not be found.",
        });
        return;
      }

      room.players =
        room.players.filter(
          (player) =>
            player.id !== aiPlayer.id,
        );

      room.updatedAt = Date.now();
      queueRoomSave();
      emitLobby(io, code);

      acknowledge({
        ok: true,
        code,
        room: toPublicGameRoom(room),
      });

      console.log(
        `${aiPlayer.name} removed from ${code}.`,
      );
    },
  );
}
