import type {
  Server,
} from "socket.io";

import {
  rooms,
} from "../state/rooms.js";

import {
  endRoom,
} from "./room-lifecycle.js";

import {
  queueRoomSave,
} from "./persistence.js";

export const HOST_RECONNECT_GRACE_MS =
  90_000;

const hostGraceTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

export function cancelHostGrace(
  code: string,
): void {
  const timer =
    hostGraceTimers.get(code);

  if (timer) {
    clearTimeout(timer);
    hostGraceTimers.delete(code);
  }

  const room = rooms.get(code);
  if (room) {
    room.hostDisconnectDeadline =
      null;
  }
}

export function scheduleHostGrace(
  io: Server,
  code: string,
): void {
  cancelHostGrace(code);

  const room = rooms.get(code);
  if (!room) return;

  const host = room.players.find(
    (player) =>
      player.id === room.hostId,
  );

  if (
    !host ||
    host.isAi ||
    host.isConnected ||
    host.hasLeft
  ) {
    return;
  }

  const disconnectedAt =
    host.disconnectedAt ?? Date.now();
  const deadline =
    disconnectedAt +
    HOST_RECONNECT_GRACE_MS;
  const delay = Math.max(
    0,
    deadline - Date.now(),
  );

  room.hostDisconnectDeadline =
    deadline;
  queueRoomSave();

  const timer = setTimeout(
    () => {
      hostGraceTimers.delete(code);

      const currentRoom =
        rooms.get(code);
      const currentHost =
        currentRoom?.players.find(
          (player) =>
            player.id ===
            currentRoom.hostId,
        );

      if (
        !currentRoom ||
        !currentHost ||
        currentHost.isConnected ||
        currentHost.hasLeft
      ) {
        return;
      }

      endRoom(
        io,
        code,
        "The host did not reconnect in time, so the game was closed.",
      );
    },
    delay,
  );

  hostGraceTimers.set(
    code,
    timer,
  );
}

export function restoreHostGraceTimers(
  io: Server,
): void {
  for (
    const [code, room]
    of rooms.entries()
  ) {
    const host =
      room.players.find(
        (player) =>
          player.id === room.hostId,
      );

    if (
      host &&
      !host.isAi &&
      !host.isConnected &&
      !host.hasLeft
    ) {
      scheduleHostGrace(
        io,
        code,
      );
    }
  }
}
