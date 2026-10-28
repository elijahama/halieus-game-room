import assert from "node:assert/strict";
import { subscribeToProgressionUpdates, PROGRESSION_RETRY_DELAYS_MS } from "../client/src/platform/progressionRefresh.ts";
import { CORE_THEME_IDS, themeEntitlements, themeIsAvailable } from "../shared/platform/themeProgression.ts";

const beforeWindow = globalThis.window;
const beforeDocument = globalThis.document;
const windowTarget = new EventTarget();
const documentTarget = new EventTarget();
const timers = new Map();
let nextId = 0;
Object.assign(windowTarget, {
  setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback: () => { timers.delete(id); callback(); }, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
});
Object.defineProperty(documentTarget, "visibilityState", { value:"visible", writable:true, configurable:true });
globalThis.window = windowTarget;
globalThis.document = documentTarget;
try {
  let updates = 0;
  const unsubscribe = subscribeToProgressionUpdates(() => updates++);
  windowTarget.dispatchEvent(new Event("halieus:game-activity"));
  assert.deepEqual([...timers.values()].map(x=>x.delay), [...PROGRESSION_RETRY_DELAYS_MS]);
  windowTarget.dispatchEvent(new Event("halieus:game-activity"));
  assert.equal(timers.size, PROGRESSION_RETRY_DELAYS_MS.length, "Consecutive finished notifications coalesce per delayed check");
  for (const { callback } of [...timers.values()]) callback();
  assert.equal(updates,4,"A bounded retry after game completion handles archive commit latency");
  documentTarget.visibilityState="hidden";
  documentTarget.dispatchEvent(new Event("visibilitychange"));
  assert.equal(timers.size,0,"Hidden document must not fetch unlocks");
  documentTarget.visibilityState="visible";
  documentTarget.dispatchEvent(new Event("visibilitychange"));
  assert.equal([...timers.values()][0].delay,0);
  for(const { callback } of timers.values()) callback();
  assert.equal(updates,5);
  timers.clear();
  windowTarget.dispatchEvent(new Event("focus"));
  for(const { callback } of timers.values()) callback();
  assert.equal(updates,6);
  unsubscribe();
  assert.equal(timers.size,0,"Cleanup cancels pending delayed fetches");
  windowTarget.dispatchEvent(new Event("halieus:game-activity"));
  assert.equal(timers.size,0,"Closed views do not poll progression");

  const progression = {
    gamerScore: 50, maxGamerScore:500, activePlayMs:0, played:1, wins:0,
    awards:[{id:"first-match",title:"First Steps",points:10,earnedAt:1,sessionId:"test"}],
    achievements:[],byGame:{},
  };
  const earned = themeEntitlements(progression);
  assert(earned.includes("lavender-16bit") && earned.includes("black-drive"),
    "Verified Gamer Score of 50 unlocks 40/50 themes");
  assert(!earned.includes("xbox-core"),"Higher score threshold remains locked");
  assert(!themeIsAvailable("black-drive", [], false),"Client cannot grant a theme from an unverified total");
  assert(themeIsAvailable("black-drive", earned, false),"Server entitlement allows earned theme");
  assert(themeIsAvailable("black-drive", CORE_THEME_IDS, true),"Beta is an ephemeral preview");
  assert(!themeIsAvailable("black-drive", CORE_THEME_IDS, false),"Beta preview must not persist");
  console.log("PASS HGR progression refresh: verified score thresholds, bounded match completion retries, focus/visibility, cleanup and server-authoritative entitlements");
} finally {
  globalThis.window = beforeWindow;
  globalThis.document = beforeDocument;
}
