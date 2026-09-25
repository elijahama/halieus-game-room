import {
  BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS,
  TURN_ROLL_AUTOPILOT_DURATION_MS,
} from "../../../../../shared/games/mega-board/game-rules.js";
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
    turnTimerSeconds:
      room.turnTimerSeconds ?? Math.round(
        (room.blitz ? BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS : TURN_ROLL_AUTOPILOT_DURATION_MS) / 1000,
      ),
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
