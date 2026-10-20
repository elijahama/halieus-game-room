import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
const [home, dropdown, helper, server, sw, css, main] = await Promise.all([
  "client/src/platform/components/HomeScreen.tsx",
  "client/src/platform/components/GameInviteDropdown.tsx",
  "client/src/platform/components/gameInviteNotifications.ts",
  "server/src/platform/accounts.ts",
  "client/public/sw.js",
  "client/src/styles/hgr-4.5.5r-invitation-dropdown.css",
  "client/src/main.tsx",
].map(read));

assert.match(home,/const loadInvitations = \(\) =>/,"Game invites must poll independently of stats/live-room API failures");
assert.match(home,/void loadOtherData\(\); void loadFriends\(\); loadInvitations\(\)/);
assert.match(home,/window\.setInterval\(load, 10000\)/,"No tight/push-like polling loop");
assert.match(home,/incomingGameNotifications\(account\.id, gameRequests, gameInvites\)/,
  "Both game requests and active-room invites feed the same foreground dropdown");
assert.match(home,/saveSeenGameNotifications\(account\.id, "in-app", updated\)/,
  "The popup must deduplicate seen notifications across polls");
assert.match(home,/saveSeenGameNotifications\(account\.id, "system", seen\)/,
  "The optional PWA system alert must be deduplicated separately");
assert.match(home,/data: \{ url: "\/\?inbox=1" \}/,
  "Tapping a PWA notification should open the persistent HGR Inbox");
assert.match(home,/url\.searchParams\.get\("inbox"\) !== "1"/);
assert.match(home,/setInboxOpen\(true\)/);
assert.match(home,/onLater=\{\(\) => setGameNotice\(null\)\}/,
  "Later must only dismiss the transient popup, not the persistent server invite");
assert.match(home,/onOpenInbox=\{\(\) => \{ setGameNotice\(null\); setInboxOpen\(true\); \}\}/);
assert.match(home,/\/accounts\/game-requests\/\$\{encodeURIComponent\(notice\.id\)\}\/respond/,
  "Accept and Decline must be server-authoritative and recipient-only");
assert.match(home,/\/accounts\/game-invites\/\$\{encodeURIComponent\(notice\.id\)\}\/dismiss/,
  "Room invite Decline must use the recipient-only dismiss route");
assert.match(home,/setJoinIntent\("join"\)/,"Room invitations must open the existing room join flow");
assert.match(home,/onRoomCodeChange\(notice\.roomCode\)/,"Room invite must preserve its exact live-room code");
assert.match(home,/\!inboxOpen && \!createOpen && \!joinOpen && overlayHost && createPortal/,
  "Dropdown cannot obstruct active game/room and Inbox dialogs");
assert.match(dropdown,/role="region"/);
assert.match(dropdown,/Later closes this alert. The invitation remains in your Inbox\./);
assert.match(dropdown,/aria-label="Later — keep invitation in inbox"/);
assert.match(dropdown,/onClick=\{onAccept\}/);
assert.match(dropdown,/onClick=\{onDecline\}/);
assert.match(helper,/recipientAccountId === accountId && item\.status === "pending" && item\.expiresAt > now/,
  "Only unexpired pending requests should be notified");
assert.match(helper,/item\.recipientAccountId === accountId && item\.expiresAt > now/,
  "Only the authenticated recipient's unexpired room invitations should be notified");
assert.match(server,/app\.post\("\/accounts\/game-requests\/:requestId\/respond"/);
assert.match(server,/app\.post\("\/accounts\/game-invites\/:inviteId\/dismiss"/);
assert.match(sw,/self\.addEventListener\('notificationclick'/);
assert.match(css,/max-height: min\(43dvh, 310px\)/,"Phone popup must not fill the entire viewport");
assert.match(css,/min-height: 44px/,"Mobile invitation decisions must be tappable");
assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
assert.match(main,/hgr-4\.5\.5r-invitation-dropdown\.css/);
console.log("PASS 4.5.5r: delivery polling, persistence, recipient-only actions, PWA deep link, notification dedup and portrait-safe dropdown wiring");
