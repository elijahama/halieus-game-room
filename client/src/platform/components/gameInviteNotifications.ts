import type {
  HalieusGameInviteSummary,
  HalieusGameRequestSummary,
} from "../../../../shared/platform/accounts";

/** Notices shown in the lobby/PWA while it is open. No hidden player data. */
export type HgrIncomingGameNotification =
  | {
      kind: "request";
      key: string;
      id: string;
      sender: string;
      gameTitle: string;
      game: HalieusGameRequestSummary["game"];
      createdAt: number;
      roomCode: string | null;
    }
  | {
      kind: "room";
      key: string;
      id: string;
      sender: string;
      gameTitle: string;
      game: HalieusGameInviteSummary["game"];
      createdAt: number;
      roomCode: string;
    };

export function incomingGameNotifications(
  accountId: string | undefined,
  requests: readonly HalieusGameRequestSummary[],
  roomInvites: readonly HalieusGameInviteSummary[],
  now = Date.now(),
): HgrIncomingGameNotification[] {
  if (!accountId) return [];
  return [
    ...requests
      .filter((item) => item.recipientAccountId === accountId && item.status === "pending" && item.expiresAt > now)
      .map((item): HgrIncomingGameNotification => ({
        kind: "request", key: "request:" + item.id, id: item.id,
        sender: item.senderDisplayName, gameTitle: item.gameTitle,
        game: item.game, createdAt: item.createdAt, roomCode: item.roomCode,
      })),
    ...roomInvites
      .filter((item) => item.recipientAccountId === accountId && item.expiresAt > now)
      .map((item): HgrIncomingGameNotification => ({
        kind: "room", key: "room:" + item.id, id: item.id,
        sender: item.senderDisplayName, gameTitle: item.gameTitle,
        game: item.game, createdAt: item.createdAt, roomCode: item.roomCode,
      })),
  ].sort((a, b) => b.createdAt - a.createdAt || a.key.localeCompare(b.key));
}

const STORAGE_PREFIX = "halieus-notices-v1";
const MAX_REMEMBERED = 160;

/** Seen keys only mute popup repeats. They never cancel persistent inbox items. */
export function readSeenGameNotifications(accountId: string, channel: "in-app" | "system" | "messages" | "message-popup"): Set<string> {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${channel}:${accountId}`);
    const values: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(values)
      ? values.filter((value): value is string => typeof value === "string" && value.length < 120).slice(-MAX_REMEMBERED)
      : []);
  } catch {
    return new Set();
  }
}

export function saveSeenGameNotifications(
  accountId: string,
  channel: "in-app" | "system" | "messages" | "message-popup",
  keys: Set<string>,
): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${channel}:${accountId}`,
      JSON.stringify([...keys].slice(-MAX_REMEMBERED)));
  } catch {
    // Private browsing or disabled storage never prevents responding to an invite.
  }
}
