import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { RoomChatGame, RoomChatMessage, RoomChatRole } from "../../../shared/platform/room-chat.js";

export interface RoomChatIdentity {
  name: string;
  role: RoomChatRole;
}

type IdentityResolver = (code: string, socketId: string) => RoomChatIdentity | null;
export type RoomChatResolvers = Record<RoomChatGame, IdentityResolver>;

const histories = new Map<string, RoomChatMessage[]>();
const MAX_MESSAGES = 120;
const MAX_MESSAGE_LENGTH = 500;

function normaliseCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : "";
}

function normaliseGame(value: unknown): RoomChatGame | null {
  return value === "mega-board" || value === "poker" || value === "blackjack" || value === "whot" || value === "ludo" || value === "hidden-dictator" || value === "connect-four" || value === "word-game" || value === "password" || value === "anagrams-race" || value === "cheat" || value === "dominoes" ? value : null;
}

function keyFor(game: RoomChatGame, code: string): string {
  return `${game}:${code}`;
}

function socketRoom(game: RoomChatGame, code: string): string {
  return `room-chat:${game}:${code}`;
}

function historyFor(game: RoomChatGame, code: string): RoomChatMessage[] {
  return histories.get(keyFor(game, code)) ?? [];
}

export function clearRoomChat(game: RoomChatGame, code: string): void {
  histories.delete(keyFor(game, normaliseCode(code)));
}

export function registerRoomChatHandlers(io: Server, socket: Socket, resolvers: RoomChatResolvers): void {
  socket.on("room-chat:join", (payload: any, acknowledge: (response: any) => void) => {
    const game = normaliseGame(payload?.game);
    const code = normaliseCode(payload?.code);
    if (!game || !code) return acknowledge({ ok: false, reason: "Room chat could not identify this game room." });
    const identity = resolvers[game](code, socket.id);
    if (!identity) return acknowledge({ ok: false, reason: "Join or spectate this room before opening chat." });
    socket.join(socketRoom(game, code));
    acknowledge({ ok: true, messages: historyFor(game, code), viewerRole: identity.role, viewerName: identity.name });
  });

  socket.on("room-chat:send", (payload: any, acknowledge: (response: any) => void) => {
    const game = normaliseGame(payload?.game);
    const code = normaliseCode(payload?.code);
    const text = typeof payload?.text === "string" ? payload.text.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!game || !code) return acknowledge({ ok: false, reason: "Room chat could not identify this game room." });
    if (!text) return acknowledge({ ok: false, reason: "Type a message first." });
    const identity = resolvers[game](code, socket.id);
    if (!identity) return acknowledge({ ok: false, reason: "You are no longer connected to this room." });

    const message: RoomChatMessage = {
      id: randomBytes(8).toString("hex"),
      game,
      code,
      senderName: identity.name,
      senderRole: identity.role,
      text,
      at: Date.now(),
    };
    const history = historyFor(game, code).slice();
    history.push(message);
    if (history.length > MAX_MESSAGES) history.splice(0, history.length - MAX_MESSAGES);
    histories.set(keyFor(game, code), history);
    io.to(socketRoom(game, code)).emit("room-chat:message", message);
    acknowledge({ ok: true, message });
  });
}
