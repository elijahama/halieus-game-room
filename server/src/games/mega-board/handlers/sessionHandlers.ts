import { publicProgressionState } from "../../../platform/progression.js";
import type {
  Server,
  Socket,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";

import {
  addSpectator,
  listSpectators,
} from "../state/spectators.js";

import type {
  GameResponse,
  RoomCodePayload,
} from "../types/game.js";

import {
  removeDisconnectedBidder,
} from "../utils/auction.js";

import { recordActivity } from "../utils/activity.js";

import {
  syncAuctionTimer,
} from "../utils/auction-timer.js";

import {
  forfeitGamePlayer,
} from "../utils/forfeit.js";

import {
  emitGameState,
} from "../utils/game-state.js";

import {
  cancelHostGrace,
} from "../utils/host-grace.js";

import {
  queueRoomSave,
} from "../utils/persistence.js";

import {
  endRoom,
} from "../utils/room-lifecycle.js";

import {
  toPublicGameRoom,
} from "../utils/room-view.js";

function findRoomPlayer(
  code: string,
  socketId: string,
) {
  const room = rooms.get(code);
  const player = room?.players.find(
    (candidate) =>
      candidate.id === socketId,
  );

  return {
    room,
    player,
  };
}

export function registerSessionHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:leave",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason:
            "A room code is required.",
        });
        return;
      }

      const {
        room,
        player,
      } = findRoomPlayer(
        code,
        socket.id,
      );

      if (!room || !player) {
        acknowledge({
          ok: false,
          reason:
            "You are not an active player in that game.",
        });
        return;
      }

      if (player.isHost) {
        cancelHostGrace(code);
        endRoom(
          io,
          code,
          `${player.name} ended the game.`,
        );

        acknowledge({
          ok: true,
          roomEnded: true,
        });
        return;
      }

      // Once a match is already finished, leaving is pure cleanup/navigation.
      // Do not run forfeit logic again: that can reject the exit and trap a
      // completed player on the results screen.
      if (room.gameState?.phase === "finished") {
        player.isConnected = false;
        player.hasLeft = true;
        player.disconnectedAt = null;
        player.reconnectToken = "";
        room.updatedAt = Date.now();
        socket.leave(code);
        queueRoomSave();

        io.to(code).emit(
          "lobby:updated",
          toPublicGameRoom(room),
        );

        acknowledge({
          ok: true,
          room: toPublicGameRoom(room),
          state: publicProgressionState(room.gameState),
        });
        return;
      }

      if (!room.started) {
        room.players =
          room.players.filter(
            (candidate) =>
              candidate.id !==
              socket.id,
          );
        room.updatedAt = Date.now();
        socket.leave(code);
        queueRoomSave();

        io.to(code).emit(
          "lobby:updated",
          toPublicGameRoom(room),
        );

        acknowledge({
          ok: true,
          room:
            toPublicGameRoom(room),
        });
        return;
      }

      player.isConnected = false;
      player.hasLeft = true;
      player.disconnectedAt =
        Date.now();
      player.reconnectToken = "";

      const gameState =
        room.gameState;

      if (gameState) {
        removeDisconnectedBidder(
          gameState,
          socket.id,
        );

        const error =
          forfeitGamePlayer(
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

        recordActivity(
          gameState,
          `${player.name} forfeited the match. Their assets returned to the Bank.`,
          "game",
          socket.id,
        );

        syncAuctionTimer(
          io,
          code,
        );
        emitGameState(
          io,
          code,
          gameState,
        );
      }

      room.updatedAt = Date.now();
      socket.leave(code);
      queueRoomSave();

      io.to(code).emit(
        "lobby:updated",
        toPublicGameRoom(room),
      );

      acknowledge({
        ok: true,
        room:
          toPublicGameRoom(room),
        state:
          gameState ?? undefined,
      });

      console.log(
        `${player.name} left game ${code} and forfeited.`,
      );
    },
  );

  socket.on(
    "game:forfeit",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason:
            "A room code is required.",
        });
        return;
      }

      const {
        room,
        player,
      } = findRoomPlayer(
        code,
        socket.id,
      );

      if (
        !room ||
        !player ||
        !room.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "You are not an active player in that game.",
        });
        return;
      }

      if (player.hasLeft) {
        acknowledge({
          ok: false,
          reason:
            "That player has already left the active match.",
        });
        return;
      }

      const gameState = room.gameState;

      removeDisconnectedBidder(
        gameState,
        socket.id,
      );

      const error =
        forfeitGamePlayer(
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

      // A forfeit ends only this seat, never the room. Keep the socket in the
      // room and register it as a spectator so the player can continue watching.
      player.isConnected = false;
      player.hasLeft = true;
      player.disconnectedAt = null;
      player.reconnectToken = "";
      room.updatedAt = Date.now();

      if (player.isHost) {
        cancelHostGrace(code);
      }
      addSpectator(
        code,
        socket.id,
        player.name,
      );

      recordActivity(
        gameState,
        `${player.name} forfeited the match. Their assets returned to the Bank.`,
        "game",
        socket.id,
      );

      syncAuctionTimer(
        io,
        code,
      );
      emitGameState(
        io,
        code,
        gameState,
      );
      io.to(code).emit(
        "game:spectators",
        listSpectators(code),
      );
      io.to(code).emit(
        "lobby:updated",
        toPublicGameRoom(room),
      );
      queueRoomSave();

      acknowledge({
        ok: true,
        code,
        playerId: socket.id,
        room:
          toPublicGameRoom(room),
        state: publicProgressionState(gameState),
        spectator: true,
      });

      console.log(
        `${player.name} forfeited game ${code} and is now spectating.`,
      );
    },
  );

  socket.on(
    "game:end-room",
    (
      payload: RoomCodePayload,
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

      if (room.hostId !== socket.id) {
        acknowledge({
          ok: false,
          reason:
            "Only the host can end the game for everyone.",
        });
        return;
      }

      const host =
        room.players.find(
          (player) =>
            player.id === socket.id,
        );

      cancelHostGrace(code);
      endRoom(
        io,
        code,
        `${host?.name ?? "The host"} ended the game.`,
      );

      acknowledge({
        ok: true,
        roomEnded: true,
      });
    },
  );
}
