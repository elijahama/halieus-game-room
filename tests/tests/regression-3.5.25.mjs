import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const sha = (path) => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");

assert.equal(read("VERSION").trim(), "3.5.27");
assert.match(read("shared/version.ts"), /APP_VERSION = "3\.5\.25"/);
assert.match(read("package.json"), /"version": "3\.5\.25"/);

const app = read("client/src/App.tsx");
assert.match(app, /type HalieusThemeMode = "system" \| "light" \| "dark"/);
assert.match(app, /prefers-color-scheme: dark/);
assert.match(app, /halieus-theme-mode/);

const themeButton = read("client/src/platform/components/ThemeButton.tsx");
for (const mode of ["system", "light", "dark"]) assert.match(themeButton, new RegExp(`value="${mode}"`));

const settings = read("client/src/platform/components/DisplaySettingsPanel.tsx");
assert.match(settings, /Follow device/);
assert.match(settings, /halieus-theme-mode/);

const home = read("client/src/platform/components/HomeScreen.tsx");
assert.match(home, /halieus-player-tools/);
assert.match(home, /"in-game"/);
assert.match(home, /selectedPlayerRoom\.joinable/);
assert.match(home, /selectedPlayerRoom\.spectatable/);
assert.match(home, /Friends are at the table/);

const css = read("client/src/index.css");
const releaseBlock = css.slice(css.lastIndexOf("/* 3.5.27"));
assert.ok(!/\bzoom\s*:/.test(releaseBlock), "3.5.27 must not add CSS zoom hacks");
assert.ok(!/transform\s*:\s*scale\(/.test(releaseBlock), "3.5.27 must not add global scale hacks");
const autopilotMarker = css.lastIndexOf("3.5.24 — Mega Board Autopilot/header isolation");
assert.ok(autopilotMarker >= 0, "3.5.24 Mega Board Autopilot isolation must remain present");
const autopilotPatch = css.slice(autopilotMarker, css.indexOf("/* 3.5.27", autopilotMarker));
assert.match(autopilotPatch, /\.mega-game-meta \.halieus-autopilot-control[\s\S]*?position:absolute !important[\s\S]*?right:0/);
assert.match(autopilotPatch, /grid-column:auto !important/);

const protectedHashes = {
  "client/src/games/poker/PokerScreen.tsx": "ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18",
  "client/src/games/ludo/LudoScreen.tsx": "b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f",
  "server/src/games/poker/handlers.ts": "be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be",
  "server/src/games/ludo/handlers.ts": "af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786",
  "update-website.ps1": "3672e902e3af5604d0c1caa82c8bcb00198b45a70df0ef71b56f707761242c8e",
  "server/src/index.ts": "cca1e880e9688b1eeaaa130acfd3ef97579d1bfb3d2c6f0a98d46b3e173cda5b",
};
for (const [path, expected] of Object.entries(protectedHashes)) assert.equal(sha(path), expected, `${path} changed unexpectedly`);

console.log("3.5.27 regression checks passed");
