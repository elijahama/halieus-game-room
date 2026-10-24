import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [catalog, home, docs] = await Promise.all([
  read("client/src/platform/games/catalog.ts"),
  read("client/src/platform/components/HomeScreen.tsx"),
  read("docs/GAME_CATALOGUE.md"),
]);
const entry = catalog.split("export const GAME_CATALOG:")[1].split("export const ACTIVE_GAME_CATALOG")[0];
const games = catalog.split("export const FUTURE_GAME_QUEUE = [")[1].split("] as const;")[0];
const formats = catalog.split("export const FUTURE_POKER_VARIANTS = [")[1].split("] as const;")[0];
const names = (str) => [...str.matchAll(/\bname:\s*"([^"]+)"/g)].map(m => m[1]);
const gameNames = names(games), formatNames = names(formats);
assert.deepEqual(gameNames, ["Tic-Tac-Toe","Villagers & Mafia","Settlers","Spot the Match"]);
assert.deepEqual(formatNames, ["Omaha","Five-Card Draw","Seven-Card Stud"]);
assert.equal(new Set([...gameNames,...formatNames]).size,7,"No duplicate roadmap entries");
for(const n of gameNames) {
  assert.equal(entry.includes('name: "'+n+'"'),false,n+" must not become a playable game");
  assert.ok(docs.includes(n),"Documentation must name "+n);
}
for(const n of formatNames) assert.ok(docs.includes(n),"Poker variants must be documented");
assert.match(games,/Tic-Tac-Toe[^\n]+Rules foundation/,"Tic-Tac-Toe has not passed multiplayer QA");
assert.match(games,/3×3 \/ 4×4 \/ 5×5/,"All requested board sizes remain visible");
assert.match(games,/Casual \/ Ranked/,"Both modes remain in scope");
assert.match(home,/aria-label="Coming Soon games and variants"/);
assert.match(home,/FUTURE_GAME_QUEUE\.map/);
assert.match(home,/FUTURE_POKER_VARIANTS\.map/);
assert.match(home,/game\.stage/);
assert.match(home,/These are roadmap previews, not playable rooms/);
const future = home.split('<section className="halieus-future-games"')[1].split('</section>')[0];
assert.doesNotMatch(future, /openCreate\(|onClick=|<button/,"Coming Soon must never offer a playable button");
assert.ok(!games.includes('status: "live"') && !formats.includes('status: "live"'));
assert.ok(!formatNames.some(n=>entry.includes('name: "'+n+'"')));
console.log("PASS 4.5.6a Coming Soon: four planned titles, three variants, correct readiness, no playable controls");
