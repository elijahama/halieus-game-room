import type {
  Server,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";
import { getSoloTournamentBoundRoom, isSoloPrestartResetClosing } from "../../../platform/soloTournamentRegistration.js";

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
  options: { allowVerifiedSoloReset?: boolean } = {},
): boolean {
  const room = rooms.get(code);

  if (!room) {
    return false;
  }
  // General cleanup must never discard an unsettled tournament match.
  if (getSoloTournamentBoundRoom(code) &&
      !(options.allowVerifiedSoloReset && isSoloPrestartResetClosing(code))) {
    console.warn("[HGR] Refused deleting an unsettled Solo tournament room:", code);
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
