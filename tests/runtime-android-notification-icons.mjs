import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const [main, control, sender, accounts, home] = await Promise.all([
  read("client/public/sw.js"),
  read("client/public/control/sw.js"),
  read("server/src/platform/pushNotifications.ts"),
  read("server/src/platform/accounts.ts"),
  read("client/src/platform/components/HomeScreen.tsx"),
]);

function bootServiceWorker(source, suffix) {
  const handlers = {};
  const notifications = [];
  const self = {
    location: { href: "https://halieus.remotewire.net/" + suffix },
    addEventListener(type, handler) { handlers[type] = handler; },
    registration: {
      showNotification(title, options) {
        notifications.push({ title, ...options });
        return Promise.resolve();
      },
    },
  };
  vm.runInNewContext(source, { self, URL, caches: {}, console }, { filename: suffix });
  assert.equal(typeof handlers.push, "function");
  return {
    async push(payload) {
      let done;
      handlers.push({ data: { json: () => payload }, waitUntil(promise) { done = promise; } });
      assert.ok(done, "Service worker must keep push alive");
      await done;
      return notifications.at(-1);
    },
  };
}

const web = bootServiceWorker(main, "sw.js?release=4.7.4");
const general = await web.push({ title: "HGR", url: "/?inbox=1", tag: "general" });
assert.equal(general.icon, "/app-icon-192.png?identity=install-h6", "Use the approved main app icon");
assert.equal(general.badge, "/notification-badges/hgr.png", "Android status bar uses the H silhouette");
assert.equal(general.data.url, "/?inbox=1");

const mega = await web.push({ title: "Mega Board invite", game: "mega-board", url: "/?inbox=1" });
assert.equal(mega.icon, "/game-icons/mega-board.svg", "Use the existing Mega Board game icon");
assert.equal(mega.badge, "/notification-badges/mega-board.png", "Use the source-derived Mega Board M in the Android status bar");

const poker = await web.push({ title: "Poker invite", game: "poker" });
assert.equal(poker.icon, "/game-icons/poker.svg", "Other approved game artwork also maps by canonical ID");
assert.equal(poker.badge, "/notification-badges/hgr.png", "Do not mask an opaque game tile into a solid block");

const invalid = await web.push({ title: "Unexpected", game: "../../control/control-icon", icon: "https://invalid.example/icon.png" });
assert.equal(invalid.icon, general.icon, "Arbitrary game IDs must not become asset paths");
assert.equal(invalid.badge, general.badge, "Never accept arbitrary badge URLs");

const controlSw = bootServiceWorker(control, "control/sw.js?v=notification-identity");
const admin = await controlSw.push({ title: "HGR Control", icon: "/game-icons/mega-board.svg" });
assert.equal(admin.icon, "/control/control-icon.png?v=part26-control-approved2", "Control uses approved Control artwork only");
assert.equal(admin.badge, "/notification-badges/control.png", "Control status bar uses derived H-and-cog");
assert.equal(admin.data.url, "/control/", "Control notification stays in its own access area");

assert.match(sender, /game: typeof notice\.game === "string" \? notice\.game\.slice\(0,40\)/);
assert.match(accounts, /tag:"hgr-room-"\+invite\.id,\s*game:room\.game/);
assert.match(accounts, /tag:"hgr-request-"\+item\.id,\s*game:item\.game/);
assert.match(home, /icon: `\/game-icons\/\$\{newest\.game\}\.svg`/);
assert.match(home, /badge: newest\.game === "mega-board"/);

for (const name of ["hgr", "control", "mega-board"]) {
  const bytes = await readFile(resolve(root, `client/public/notification-badges/${name}.png`));
  assert.equal(bytes.subarray(0,8).toString("hex"), "89504e470d0a1a0a", name + " must be PNG");
  assert.equal(bytes.readUInt32BE(16), 96, name + " must accommodate Android 4x status-bar resolution");
  assert.equal(bytes.readUInt32BE(20), 96, name + " must be square");
  assert.equal(bytes[25], 6, name + " must retain transparency (RGBA), not an opaque square");
}

console.log("PASS approved Android status icons: main H, Control H/cog, Mega Board M; per-game full icon, source-only badge, safe fallback and protected routes.");
