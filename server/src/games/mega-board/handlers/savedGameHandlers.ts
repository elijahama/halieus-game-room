import type { Server, Socket } from "socket.io";
import { rooms } from "../state/rooms.js";
import { emitGameState } from "../utils/game-state.js";
import { flushRoomSave } from "../utils/persistence.js";
import { pauseMegaRoom, resumeMegaRoom, isBlockedWhilePaused } from "../utils/pause-room.js";
import { createSaveSlot, listSaveSlots, restoreSaveSlot, isSaveSlot, type SaveSlot, type SaveSummary } from "../utils/saved-games.js";

interface SlotPayload { code: string; slot?: SaveSlot }
interface Reply { ok: boolean; reason?: string; saves?: SaveSummary[]; saved?: SaveSummary }
function ownedRoom(socket: Socket, payload: SlotPayload) {
  const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
  const room = code && rooms.get(code);
  if (!room || !room.started || room.hostId !== socket.id ||
      !room.players.some(player => player.id === socket.id && player.isHost && !player.hasLeft && !player.isAi)) {
    throw new Error("Only the current host can manage this match's saved games.");
  }
  return room;
}
export function registerMegaSavedGameHandlers(io: Server, socket: Socket): void {
  // Apply before gameplay handlers are registered. Authoritative server-side
  // guard prevents stale tabs or manually crafted Socket.IO gameplay packets
  // from mutating an explicitly paused room.
  socket.use((packet, next) => {
    const event = String(packet[0] ?? "");
    const payload = packet[1] as { code?: unknown } | undefined;
    const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
    const room = code ? rooms.get(code) : undefined;
    if (room?.gameState?.pauseState && isBlockedWhilePaused(event)) {
      const response = { ok: false, reason: "This Mega Board match is paused. The host must resume it first." };
      const callback = packet.at(-1);
      if (typeof callback === "function") callback(response);
      else socket.emit("game:paused-action-blocked", { code, reason: response.reason });
      return;
    }
    next();
  });

  socket.on("game:pause-room", async (payload: SlotPayload, acknowledge: (reply: Reply) => void) => {
    try {
      const room = ownedRoom(socket, payload);
      pauseMegaRoom(room);
      emitGameState(io, room.code, room.gameState!);
      await flushRoomSave();
      acknowledge({ ok: true });
    } catch (error) { acknowledge({ ok: false, reason: (error as Error).message }); }
  });
  socket.on("game:resume-room", async (payload: SlotPayload, acknowledge: (reply: Reply) => void) => {
    try {
      const room = ownedRoom(socket, payload);
      resumeMegaRoom(room);
      emitGameState(io, room.code, room.gameState!);
      await flushRoomSave();
      acknowledge({ ok: true });
    } catch (error) { acknowledge({ ok: false, reason: (error as Error).message }); }
  });

  socket.on("game:saves-list", async (payload: SlotPayload, acknowledge: (reply: Reply) => void) => {
    try {
      const room = ownedRoom(socket, payload);
      acknowledge({ ok: true, saves: await listSaveSlots(room) });
    } catch (error) {
      acknowledge({ ok: false, reason: (error as Error).message });
    }
  });
  socket.on("game:save-slot", async (payload: SlotPayload, acknowledge: (reply: Reply) => void) => {
    try {
      const room = ownedRoom(socket, payload);
      if (!isSaveSlot(payload.slot)) throw new Error("Choose a valid save slot.");
      const saved = await createSaveSlot(room, payload.slot);
      acknowledge({ ok: true, saved });
    } catch (error) {
      acknowledge({ ok: false, reason: (error as Error).message });
    }
  });
  socket.on("game:restore-slot", async (payload: SlotPayload, acknowledge: (reply: Reply) => void) => {
    try {
      const room = ownedRoom(socket, payload);
      if (!isSaveSlot(payload.slot)) throw new Error("Choose a valid save slot.");
      await restoreSaveSlot(room, payload.slot);
      emitGameState(io, room.code, room.gameState!);
      await flushRoomSave();
      acknowledge({ ok: true });
    } catch (error) {
      acknowledge({ ok: false, reason: (error as Error).message });
    }
  });
}
