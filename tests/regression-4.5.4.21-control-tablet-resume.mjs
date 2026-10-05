import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../client/public/control/cloud-update.js", import.meta.url), "utf8");

assert.match(source, /const REQUEST_TIMEOUT_MS = 10_000;/, "Control cloud requests must be bounded on suspended tablet browsers");
assert.match(source, /new AbortController\(\)/, "Control cloud requests must support aborting a stalled fetch");
assert.match(source, /Control status request timed out\. Reconnecting…/, "Timeout must surface as reconnecting rather than fabricated updater failure");
assert.match(source, /let refreshInFlight = null;/, "Only one Control refresh may be in flight at a time");
assert.match(source, /if \(refreshInFlight\) return refreshInFlight;/, "Overlapping tablet refresh intervals must coalesce");
assert.match(source, /function startRefreshLoop\(immediate = true\)/, "Control polling must have an explicit restartable lifecycle");
assert.match(source, /function stopRefreshLoop\(\)/, "Control polling must have an explicit stop lifecycle");
assert.match(source, /addEventListener\("pagehide", stopRefreshLoop\)/, "Background/BFCache transitions must stop the old interval");
assert.match(source, /addEventListener\("pageshow", \(\) => startRefreshLoop\(true\)\)/, "BFCache return must restart polling immediately");
assert.match(source, /addEventListener\("online", \(\) => startRefreshLoop\(true\)\)/, "Network return must restart polling immediately");
assert.match(source, /document\.visibilityState === "visible"\) startRefreshLoop\(true\)/, "Foreground return must restart polling immediately");
assert.match(source, /running \? "Cloud Update reconnecting" : "Cloud Update unavailable"/, "A running operation must remain truthful while its status transport reconnects");
assert.doesNotMatch(source, /lastOperation\s*=\s*\{[^}]*state:\s*"failed"/s, "Client recovery must never invent a failed updater result");

console.log("PASS 4.5.4.21 tablet Control update polling resumes after suspension/BFCache/network return without fake progress");
