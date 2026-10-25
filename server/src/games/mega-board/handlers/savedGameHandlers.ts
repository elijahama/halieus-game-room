import type { Server, Socket } from "socket.io";
import { rooms } from "../state/rooms.js";
import { emitGameState } from "../utils/game-state.js";
import { flushRoomSave } from "../utils/persistence.js";
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
