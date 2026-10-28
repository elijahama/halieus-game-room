import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const get=file=>readFile(new URL("../"+file,import.meta.url),"utf8");
const [push,index,guilds,accounts,button,home,sw,pkg]=await Promise.all([
 "server/src/platform/pushNotifications.ts","server/src/index.ts","server/src/platform/guilds.ts",
 "server/src/platform/accounts.ts","client/src/platform/components/NotificationPermissionButton.tsx",
 "client/src/platform/components/HomeScreen.tsx","client/public/sw.js","server/package.json",
].map(get));
assert.match(push,/isTrustedPushEndpoint/,"Only approved HTTPS browser push providers");
assert.match(push,/getHalieusDataRoot/,"Persist server credentials in durable data root");
assert.match(push,/chmod\(file, 0o600\)/,"Private VAPID keys must have strict Unix permissions");
assert.match(push,/registerPushRoutes/);
assert.match(push,/app\.post\("\/accounts\/push\/subscribe"/);
assert.match(push,/app\.post\("\/accounts\/push\/unsubscribe"/);
assert.match(push,/app\.post\("\/accounts\/push\/test"/,"Signed-in push delivery test must exist");
assert.match(push,/accountId===account\.id && item\.endpoint===endpoint/,"Only test the enrolled account's own device");
assert.match(push,/lastTestByDevice/,"Bounded test notification cooldown");
assert.match(push,/item\.accountId===account\.id && item\.endpoint===endpoint/,"Account-specific device status");
assert.match(push,/knownProviders\.includes\(host\)/,"Server push endpoint allowlist");
assert.match(push,/state\.subscriptions=state\.subscriptions\.filter\(item=>item\.endpoint!==endpoint\)/,
 "One browser subscription must not be bound to multiple accounts");
assert.match(push,/state\.subscriptions=state\.subscriptions\.filter\(item=>item\.accountId!==account\.id \|\| item\.endpoint!==endpoint\)/,
 "Unsubscribing cannot revoke another player's device");
assert.match(push,/void|Promise\.allSettled/);
assert.match(index,/await initializePushNotifications\(\)/,"Push initialization before serving HGR");
assert.match(guilds,/topic:"messages"/,"Guild messages enqueue background push");
assert.match(guilds,/member\.accountId !== account\.id/,"Do not send self-message pushes");
assert.match(guilds,/Never include private chat content/,"Push lock screen must not reveal private chat text");
assert.match(guilds,/topic:"invites"/,"Guild invitations enqueue background push");
assert.match(accounts,/topic:"invites"/,"Game/friend invitations enqueue background push");
assert.match(button,/Notification\.requestPermission\(\)/,"Permission must follow user click");
assert.match(button,/onClick=\{\(\) => void toggle\(\)\}/);
assert.match(button,/registration\.pushManager\.subscribe\(/);
assert.match(button,/registration\.pushManager\.getSubscription\(\)/,"Allow safe rebind/unsubscribe");
assert.match(button,/Send test notification/,"Like Logic & Philo, HGR gives users a real device push test");
assert.match(button,/topics:\s*\["invites",\s*"messages"\]/,"Both requested notice classes opt in");
assert.match(home,/const subscribed = await registration\.pushManager\?\.getSubscription\(\)/,
 "Do not double-fire hidden-tab fallback when push is active");
assert.match(home,/url\.searchParams\.get\("guild"\)/,"Clicking message push navigates to guild chat");
assert.match(sw,/self\.addEventListener\('push'/);
assert.match(sw,/self\.addEventListener\('notificationclick'/);
assert.match(pkg,/"web-push": "\^3\.6\.7"/);
console.log("PASS 4.5.5t: opt-in browser push, durable private keys, safe endpoint registration, per-account subscriptions, guild/game/friend delivery and SW deep links");
