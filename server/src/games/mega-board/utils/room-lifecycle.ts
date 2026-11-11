import type {
  Server,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";
import { getSoloTournamentBoundRoom } from "../../../platform/soloTournamentRegistration.js";
import { getGuildFixtureBoundRoom } from "../../../platform/guildFixtures.js";

import {
  cancelAuctionTimer,
} from "./auction-timer.js";

import {
  queueRoomSave,
} from "./persistence.js";

export interface GameEndedPayload {
  code: string;
  reason: string;
}

export function endRoom(
  io: Server,
  code: string,
  reason: string,
  options: { soloResetMatchId?: string } = {},
): boolean {
  const room = rooms.get(code);

  if (!room) {
    return false;
  }
  // General cleanup must never discard an unsettled tournament match.
  const binding = getSoloTournamentBoundRoom(code);
  const authorisedReset = binding?.match.status === "reset-pending" &&
    binding.match.boardMatchId === options.soloResetMatchId &&
    binding.match.roomCreatedAt === room.createdAt && !room.started && room.gameState === null;
  if ((binding && !authorisedReset) || getGuildFixtureBoundRoom(code)) {
    console.warn("[HGR] Refused deleting an unsettled tournament room:", code);
    return false;
  }

  cancelAuctionTimer(code);

  const payload: GameEndedPayload = {
    code,
    reason,
  };

  io.to(code).emit(
    "game:ended",
    payload,
  );

  rooms.delete(code);
  io.in(code).socketsLeave(code);
  queueRoomSave();

  console.log(
    `Game ${code} ended: ${reason}`,
  );

  return true;
}
