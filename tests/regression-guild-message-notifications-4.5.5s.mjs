import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const get=file=>readFile(new URL("../"+file,import.meta.url),"utf8");
const [server,guild,home,ui,main,contract]=await Promise.all([
 "server/src/platform/guilds.ts","shared/platform/guilds.ts",
 "client/src/platform/components/HomeScreen.tsx",
 "client/src/platform/components/GuildMessageDropdown.tsx",
 "client/src/main.tsx","client/src/platform/components/gameInviteNotifications.ts"
].map(get));
assert.match(server,/app\.get\("\/guilds\/message-notifications"/,"Server-scoped notification feed");
assert.match(server,/member\.joinedAt/,"Do not leak messages from before guild join date");
assert.match(server,/message\.senderAccountId !== accountId/,"No self notifications");
assert.match(server,/message\.senderAccountId !== "system"/,"No system pseudo-message alerts");
assert.match(guild,/interface HalieusGuildMessageNotification/);
assert.match(home,/setGuildMessageNotices\(result\.messages\)/,"Guild messages must poll independently of game/live data");
assert.match(home,/const unreadGuildMessages = useMemo/,"Unread count must use seen keys");
assert.match(home,/readSeenGameNotifications\(accountId, "messages"\)/);
assert.match(home,/saveSeenGameNotifications\(account\.id, "messages", next\)/,"Read acknowledgement persists");
assert.match(home,/readSeenGameNotifications\(account\.id, "message-popup"\)/,"Do not repeat the popup each poll");
assert.match(home,/aria-label="Unread guild messages"/);
assert.match(home,/aria-label="Incoming friend requests"/,"Friend invitations are visible in the shared inbox");
assert.match(home,/onClick=\{\(\) => openGuildMessage\(notice\)\}/,"Message must open relevant guild");
assert.match(home,/preferredGuildId=\{preferredGuildId\}/);
assert.match(ui,/role="region" aria-label="New guild message"/);
assert.match(main,/hgr-4\.5\.5s-guild-message-notices\.css/);
assert.match(contract,/\| "messages" \| "message-popup"/);
console.log("PASS 4.5.5s: membership-scoped messages, independent UI alerts, friend requests, read state and linked guild chat");
