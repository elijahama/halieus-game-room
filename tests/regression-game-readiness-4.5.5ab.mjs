import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GAME_DEVELOPMENT, GAME_MATURITY_LABEL } from "../client/src/platform/games/development.ts";

const source = await readFile(new URL("../client/src/platform/games/catalog.ts", import.meta.url), "utf8");
const account = await readFile(new URL("../client/src/platform/accounts/AccountPanel.tsx", import.meta.url), "utf8");
const ids = [...source.matchAll(/\{ id: "([a-z-]+)", name:/g)].map(match => match[1]);
assert.equal(ids.length, 14, "Track every current HGR game explicitly");
assert.equal(new Set(ids).size, ids.length, "Game IDs must be unique");
assert.deepEqual(Object.keys(GAME_DEVELOPMENT).sort(), [...ids].sort(), "Metadata must exactly match catalogue IDs");
for (const id of ids) {
  const info = GAME_DEVELOPMENT[id];
  assert.ok(info && info.maturity in GAME_MATURITY_LABEL, id + " must have a defined maturity");
  assert.ok(info.version === null || /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(info.version),
    id + " version must be explicit SemVer or unassigned, never an invented platform-wide value");
  assert.ok(info.verifiedAt === null || !Number.isNaN(Date.parse(info.verifiedAt)),
    id + " verification date must be valid");
  assert.notEqual(info.maturity === "stable" && !info.verifiedAt, true,
    "Never claim a stable game without a recorded verified acceptance");
}
assert.equal(GAME_DEVELOPMENT.ayo.maturity, "needs-repair");
assert.equal(GAME_DEVELOPMENT["hidden-dictator"].maturity, "beta");
assert.equal(ids.filter(id => GAME_DEVELOPMENT[id].maturity === "stable").length, 0,
  "Until game-specific owner acceptance, do not falsely declare completion");
assert.match(account, /adminTab === "overview"[\s\S]*aria-label="Game development status"/,
  "Game development panel must remain restricted to authenticated admin overview");
assert.match(account, /GAME_DEVELOPMENT\[game\.id\]/, "Admin panel must read per-game version/status");
const subtitles = [...source.split("export const ACTIVE_GAME_CATALOG")[0].matchAll(/subtitle:\s*"([^"]+)"/g)].map(match => match[1]);
assert.equal(subtitles.length, ids.length);
for (const text of subtitles) {
  for (const segment of text.split(/\u00b7/)) {
    const clause = segment.trim();
    assert.match(clause, /^\p{Lu}/u, "Game subtitle clause must begin with a capital letter: " + clause);
  }
}
console.log("PASS 4.5.5ab: all game versions independently tracked, truthful maturity, admin-only QA, corrected sentence-case subtitles");
