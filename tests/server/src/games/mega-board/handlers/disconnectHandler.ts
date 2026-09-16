import type { Server, Socket } from "socket.io";

import { rooms } from "../state/rooms.js";
import { listSpectators, removeSpectatorEverywhere } from "../state/spectators.js";
import { emitGameState } from "../utils/game-state.js";
import { removeDisconnectedBidder } from "../utils/auction.js";
import { syncAuctionTimer } from "../utils/auction-timer.js";
import { queueRoomSave } from "../utils/persistence.js";
import { toPublicGameRoom } from "../utils/room-view.js";
import { scheduleHostGrace } from "../utils/host-grace.js";

export function registerDisconnectHandler(
  io: Server,
  socket: Socket,
): void {
  socket.on("disconnect", () => {
    const spectatorRooms = removeSpectatorEverywhere(socket.id);
    for (const code of spectatorRooms) {
      io.to(code).emit("game:spectators", listSpectators(code));
    }

    for (const [code, room] of rooms.entries()) {
      const player = room.players.find(
        (candidate) => candidate.id === socket.id,
      );
      if (!player || player.hasLeft) continue;

      player.isConnected = false;
      player.disconnectedAt = Date.now();
      room.updatedAt = Date.now();

      const gamePlayer = room.gameState?.players.find(
        (candidate) => candidate.id === socket.id,
      );
      if (gamePlayer) {
        gamePlayer.isConnected = false;
      }

      console.log(
        `${player.name} disconnected from game ${code}; recovery slot retained.`,
      );

      if (room.hostId === socket.id) {
        scheduleHostGrace(
          io,
          code,
        );
      }

      if (room.gameState?.pendingAuction) {
        removeDisconnectedBidder(
          room.gameState,
          socket.id,
        );
        syncAuctionTimer(io, code);
        emitGameState(io, code, room.gameState);
      }

      io.to(code).emit(
        "lobby:updated",
        toPublicGameRoom(room),
      );
      queueRoomSave();
    }

    console.log(`Player disconnected: ${socket.id}`);
  });
}
