import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameRoom } from "../types/game.js";
import { getSavePath } from "./persistence.js";
import { replacePlayerId } from "./reconnection.js";

export type SaveSlot = "slot-1" | "slot-2" | "slot-3";
export interface SaveSummary {
  slot: SaveSlot;
  at: number;
  turn: number;
  players: number;
  gameStartedAt: number;
}
interface SaveDocument {
  version: 1;
  at: number;
  code: string;
  gameStartedAt: number;
  room: GameRoom;
}
const SLOTS: SaveSlot[] = ["slot-1", "slot-2", "slot-3"];
const locks = new Set<string>();

function slotPath(code: string, slot: SaveSlot): string {
  // Hash an untrusted room code before using it as part of a file path.
  const key = createHash("sha256").update(code).digest("hex");
  return path.join(path.dirname(getSavePath()), "saved-games", key, slot + ".json");
}
export function isSaveSlot(value: unknown): value is SaveSlot {
  return SLOTS.includes(value as SaveSlot);
}
export function canSaveRoom(room: GameRoom): string | null {
  const state = room.gameState;
  if (room.ranked || state?.ranked) return "Ranked games cannot be rolled back.";
  if (state?.pauseState) return "Resume the suspended match before changing save slots.";
  if (!room.started || !state || state.phase !== "playing") return "Only an ongoing match can be saved.";
  if (state.turnPhase !== "roll" && state.turnPhase !== "optional-actions") {
    return "Save between decisions, after the current auction, debt or card has resolved.";
  }
  if (state.pendingPurchase || state.pendingAuction || state.pendingTrade || state.pendingDebt ||
      state.pendingCard || state.pendingJailMove || state.pendingMegaAction || state.pendingSpeedDieAction) {
    return "Resolve the current match decision before saving.";
  }
  return null;
}
function validateSave(document: SaveDocument, room: GameRoom): boolean {
  if (!document || document.version !== 1 || document.code !== room.code ||
      document.room?.code !== room.code || !document.room.gameState ||
      canSaveRoom(document.room)) {
    throw new Error("This saved game uses an unsupported or invalid format.");
  }
  // The same public room code can be reused for a later match. Earlier
  // private checkpoints belong to their original seats and must not show in
  // the new host's slot list or be restored into a different match.
  return document.gameStartedAt === room.gameState?.gameStartedAt &&
    document.room.players.length === room.players.length &&
    document.room.players.every(savedPlayer =>
      room.players.some(current =>
        current.reconnectToken === savedPlayer.reconnectToken &&
        current.isAi === savedPlayer.isAi
      )
    );
}
async function readSlot(room: GameRoom, slot: SaveSlot): Promise<SaveDocument | null> {
  try {
    const text = await readFile(slotPath(room.code, slot), "utf8");
    const doc = JSON.parse(text) as SaveDocument;
    return validateSave(doc, room) ? doc : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function listSaveSlots(room: GameRoom): Promise<SaveSummary[]> {
  const result: SaveSummary[] = [];
  for (const slot of SLOTS) {
    const doc = await readSlot(room, slot);
    if (!doc) continue;
    result.push({
      slot, at: doc.at, turn: doc.room.gameState!.turnNumber,
      players: doc.room.gameState!.players.length, gameStartedAt: doc.gameStartedAt,
    });
  }
  return result;
}
export async function createSaveSlot(room: GameRoom, slot: SaveSlot): Promise<SaveSummary> {
  const reason = canSaveRoom(room);
  if (reason) throw new Error(reason);
  const fullPath = slotPath(room.code, slot);
  const directory = path.dirname(fullPath);
  const document: SaveDocument = {
    version: 1, at: Date.now(), code: room.code,
    gameStartedAt: room.gameState!.gameStartedAt,
    room: JSON.parse(JSON.stringify(room)) as GameRoom,
  };
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = fullPath + "." + randomUUID() + ".tmp";
  await writeFile(temporary, JSON.stringify(document), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, fullPath);
  return {
    slot, at: document.at, turn: document.room.gameState!.turnNumber,
    players: document.room.players.length, gameStartedAt: document.gameStartedAt,
  };
}

export async function restoreSaveSlot(room: GameRoom, slot: SaveSlot): Promise<void> {
  if (locks.has(room.code)) throw new Error("A restore is already running.");
  const reason = canSaveRoom(room);
  if (reason) throw new Error(reason);
  // Never rewrite an opponent's ongoing turn or ranked history. This first pilot
  // only supports a quiet, human-only casual room; AI timers need a later adapter.
  if (room.players.some(p => p.isAi)) throw new Error("Restoring games with CPU players is not available yet.");
  if (room.players.some(p => !p.isAi && !p.hasLeft && !p.isHost && p.isConnected)) {
    throw new Error("Other players are still online. Restore is blocked until their seats disconnect.");
  }
  const hostAtRequest = room.hostId;
  const startedAtRequest = room.gameState!.gameStartedAt;
  locks.add(room.code);
  try {
    const document = await readSlot(room, slot);
    if (!document) throw new Error("No saved game exists in this slot.");
    // Filesystem I/O yields. Recheck ownership, phase and presence to prevent
    // an opponent joining or a turn ending while an old restore is pending.
    if (room.hostId !== hostAtRequest ||
        room.gameState?.gameStartedAt !== startedAtRequest ||
        canSaveRoom(room) ||
        room.players.some(p => p.isAi) ||
        room.players.some(p => !p.isAi && !p.hasLeft && !p.isHost && p.isConnected)) {
      throw new Error("The room changed while loading. No checkpoint was applied.");
    }
    const stored = document.room;
    // Never resurrect forfeited/bankrupt seats or silently roll back a changed
    // roster. Recovery may change socket IDs, but the private seat identity and
    // eliminated/left status must remain stable.
    if (stored.players.length !== room.players.length ||
        stored.players.some(savedPlayer => {
          const current = room.players.find(player => player.reconnectToken === savedPlayer.reconnectToken);
          if (!current || current.hasLeft !== savedPlayer.hasLeft || current.isAi !== savedPlayer.isAi) return true;
          const savedGamePlayer = stored.gameState!.players.find(player => player.id === savedPlayer.id);
          const currentGamePlayer = room.gameState!.players.find(player => player.id === current.id);
          return !savedGamePlayer || !currentGamePlayer ||
            (currentGamePlayer.isBankrupt && !savedGamePlayer.isBankrupt);
        })) {
      throw new Error("Seats were eliminated or the roster changed. This checkpoint cannot restore them.");
    }
    const next = structuredClone(stored.gameState!);
    // Human socket IDs can change on recovery. Match by private stable recovery
    // tokens strictly on the server, without exposing them to the replay UI.
    for (const savedPlayer of stored.players) {
      const current = room.players.find(p => p.reconnectToken === savedPlayer.reconnectToken);
      if (!current) throw new Error("Player identities changed; the checkpoint cannot be restored.");
      if (savedPlayer.id !== current.id) replacePlayerId(next, savedPlayer.id, current.id);
    }
    // Never reuse an expired countdown after loading an earlier turn.
    next.turnRollDeadline = null;
    next.turnRollDeadlinePlayerId = null;
    next.optionalActionDeadline = null;
    for (const player of next.players) {
      const current = room.players.find(p => p.id === player.id);
      player.isConnected = Boolean(current?.isConnected);
      player.autopilotEnabled = false;
    }
    room.gameState = next;
    room.updatedAt = Date.now();
  } finally {
    locks.delete(room.code);
  }
}
