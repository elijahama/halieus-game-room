import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = async file => readFile(new URL("../" + file, import.meta.url), "utf8");
const nav = await read("client/public/control-navigation.js");
async function fullscreenScenario(userAgent, installed, apiSupported) {
  const handlers = new Map(), windowHandlers = new Map();
  const buttonHandlers = new Map();
  const button = { hidden: true, disabled: false, textContent: "", title: "",
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, cb) { buttonHandlers.set(name, cb); } };
  const doc = {
    readyState: "loading", fullscreenElement: null,
    documentElement: {},
    getElementById: id => id === "controlFullscreen" ? button : null,
    addEventListener(name, cb) { handlers.set(name, cb); },
  };
  if (apiSupported) {
    doc.documentElement.requestFullscreen = async () => {
      doc.fullscreenElement = doc.documentElement;
      handlers.get("fullscreenchange")?.();
    };
    doc.exitFullscreen = async () => {
      doc.fullscreenElement = null;
      handlers.get("fullscreenchange")?.();
    };
  }
  const ctx = {
    document: doc, navigator: { userAgent, platform: "Linux", maxTouchPoints: 5 },
    window: { matchMedia: () => ({ matches: installed }),
      addEventListener(name, cb) { windowHandlers.set(name, cb); } },
    matchMedia: () => ({ matches: installed }),
    sessionStorage: { getItem: () => null },
  };
  vm.runInNewContext(nav, ctx);
  assert.equal(button.hidden, false, "Fullscreen action should be discoverable even in portrait app mode.");
  if (apiSupported && !/iPhone/.test(userAgent)) {
    assert.equal(button.disabled, false);
    assert.equal(buttonHandlers.has("click"), true);
    await buttonHandlers.get("click")();
    assert.equal(Boolean(doc.fullscreenElement), true);
    assert.equal(button["aria-pressed"], "true");
    await buttonHandlers.get("click")();
    assert.equal(Boolean(doc.fullscreenElement), false);
  } else {
    assert.equal(button.disabled, true, "Unsupported Apple/device API must not pretend to enter fullscreen.");
    assert.ok(button.title);
  }
}
await fullscreenScenario("Mozilla/5.0 (Linux; Android 16) Chrome/130", true, true);
await fullscreenScenario("Mozilla/5.0 (Linux; Android 16) Chrome/130", false, true);
await fullscreenScenario("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)", false, true);
await fullscreenScenario("Mozilla/5.0 (Linux; Android 16)", true, false);

const sw = await read("client/public/control/sw.js");
const swHandlers = new Map();
const notifications = [];
const opened = [];
const service = {
  location: { origin: "https://halieus.remotewire.net" },
  registration: { showNotification: async (...args) => { notifications.push(args); } },
  clients: {
    matchAll: async () => [],
    openWindow: async url => { opened.push(url); },
  },
  addEventListener: (name, cb) => swHandlers.set(name, cb),
};
vm.runInNewContext(sw, { self: service, caches: {}, URL });
let pending;
swHandlers.get("push")({
  data: { json: () => ({ title: "HGR Update · In progress 50%", body: "Verified 50%",
    tag: "hgr-control-update-op1", url: "https://evil.example/steal" }) },
  waitUntil: task => { pending = task; },
});
await pending;
assert.equal(notifications.length, 1);
assert.equal(notifications[0][1].data.url, "/control/", "Push payload cannot redirect to an attacker.");
assert.equal(notifications[0][1].tag, "hgr-control-update-op1");
assert.equal(notifications[0][1].renotify, true);
swHandlers.get("notificationclick")({
  notification: { close() {}, data: { url: "https://evil.example/" } },
  waitUntil: task => { pending = task; },
});
await pending;
assert.deepEqual(opened, ["/control/"], "Tap returns to authenticated Control.");

const serviceSource = await read("server/src/platform/pushNotifications.ts");
const cloudSource = await read("server/src/platform/control-cloud-server-preload.ts");
const ui = await read("client/public/control/index.html");
const alerts = await read("client/public/control/update-alerts.js");
assert.match(serviceSource, /account\.role !== "owner" && account\.role !== "admin"/);
assert.match(serviceSource, /item === "operations"/);
assert.match(serviceSource, /notice\.topic === "operations"/);
assert.match(cloudSource, /requestedByAccountId: actor\.id/);
assert.match(cloudSource, /getAccountSummaryById\(actorId\)/);
assert.match(cloudSource, /notifiedProgressMilestone/);
assert.match(cloudSource, /sendHgrPush\(\[actor\.id\]/);
assert.match(ui, /id="controlFullscreen"/);
assert.match(ui, /id="controlUpdateAlerts"/);
assert.match(ui, /id="controlUpdateAlertsTest"/);
assert.match(alerts, /Notification\.requestPermission\(\)/);
assert.match(alerts, /topics: \["operations"\]/);
assert.match(alerts, /currentRegistration\(\)/);
assert.ok(!/requestedByAccountId\s*:\s*request\.requestedByAccountId/.test(cloudSource.slice(
  cloudSource.indexOf("function publicOperation("),
  cloudSource.indexOf("function latestLiveRequest("))), "Actor account ID must remain private.");
console.log("PASS Control portrait fullscreen and private opt-in background Update push: Android standalone, Apple fallback, safe notification click, owner role and durable progress guard");
