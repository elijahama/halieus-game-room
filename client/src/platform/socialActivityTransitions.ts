import type { HgrSocialActivityEntry } from "../../../shared/platform/social-activity";

export type HgrSocialActivityNotice = {
  id: string;
  actorId: string;
  displayName: string;
  kind: "online" | "game";
  title: string;
  detail: string;
  gameId: string | null;
  roomCode: string | null;
  at: number;
  read: boolean;
};

/** No socket name comparison; snapshots already contain authorised social IDs.
 * The initial server snapshot is a baseline, not a retroactive notification.
 */
export function deriveSocialActivityNotices(
  previous: readonly HgrSocialActivityEntry[] | null,
  current: readonly HgrSocialActivityEntry[],
  at: number,
): HgrSocialActivityNotice[] {
  if (!previous) return [];
  const before = new Map(previous.map((item) => [item.accountId, item]));
  const additions: HgrSocialActivityNotice[] = [];
  for (const contact of current) {
    const old = before.get(contact.accountId);
    if (!old) continue;
    const newGame = contact.game && (!old.game ||
      old.game.id !== contact.game.id || old.game.code !== contact.game.code);
    if (newGame && contact.game) {
      additions.push({
        id: [at, contact.accountId, "game", contact.game.id, contact.game.code].join(":"),
        actorId: contact.accountId, displayName: contact.displayName, kind: "game",
        title: contact.displayName + " entered " + contact.game.title,
        detail: contact.game.started ? "Playing now" : "In the game lobby",
        gameId: contact.game.id, roomCode: contact.game.code, at, read: false,
      });
    } else if (!old.online && contact.online) {
      additions.push({
        id: [at, contact.accountId, "online"].join(":"),
        actorId: contact.accountId, displayName: contact.displayName, kind: "online",
        title: contact.displayName + " is online",
        detail: "A friend or guild contact is available",
        gameId: null, roomCode: null, at, read: false,
      });
    }
  }
  return additions.slice(0, 12);
}
