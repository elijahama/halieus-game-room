import type {
  GameRoom,
  PublicGameRoom,
} from "../types/game.js";

export function toPublicGameRoom(
  room: GameRoom,
): PublicGameRoom {
  return {
    code: room.code,
    ranked: room.ranked,
    blitz: room.blitz,
    hostId: room.hostId,
    started: room.started,
    hostDisconnectDeadline:
      room.hostDisconnectDeadline,
    freeParkingJackpotEnabled:
      room.freeParkingJackpotEnabled,
    players: room.players.map(
      ({
        id,
        name,
        isHost,
        isConnected,
        isAi,
        aiDifficulty,
        hasLeft,
      }) => ({
        id,
        name,
        isHost,
        isConnected,
        isAi,
        aiDifficulty,
        hasLeft,
      }),
    ),
  };
}
