import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const pokerScreen = readFileSync(resolve(root, "client/src/games/poker/PokerScreen.tsx"), "utf8");
const pokerHandlers = readFileSync(resolve(root, "server/src/games/poker/handlers.ts"), "utf8");
const launcher = readFileSync(resolve(root, "launcher-shortcuts.ps1"), "utf8");
const startCmd = readFileSync(resolve(root, "Start Halieus Game Room.cmd"), "utf8");
const closeCmd = readFileSync(resolve(root, "Close Halieus Game Room.cmd"), "utf8");

assert.match(home, /onGameSelect\("poker"\)/);
assert.match(home, /Texas Hold’em with virtual chips/);
assert.match(home, /Private table · friends only/);
assert.match(home, /No wagering, store or monetisation/);
assert.match(home, /home-game-icon-poker[^>]*src="\/poker-icon-192\.png(?:\?v=[^"]+)?"/);
assert.match(pokerScreen, /Fold/);
assert.match(pokerScreen, /Call/);
assert.match(pokerScreen, /Raise/);
assert.match(pokerScreen, /All-in/);
assert.match(pokerHandlers, /"poker:create"/);
assert.match(pokerHandlers, /"poker:join"/);
assert.match(pokerHandlers, /"poker:action"/);
assert.match(pokerHandlers, /"poker:add-ai"/);

for (const asset of ["favicon.ico", "favicon-32.png", "app-icon-180.png", "app-icon-192.png", "app-icon-512.png", "poker-icon-192.png"]) {
  assert.ok(existsSync(resolve(root, "client/public", asset)), `${asset} must exist`);
}
assert.ok(existsSync(resolve(root, "assets/branding/Mega Board.ico")));
assert.ok(existsSync(resolve(root, "Halieus Game Room.ico")));
assert.match(launcher, /Start Halieus Game Room\.cmd/);
assert.match(launcher, /Close Halieus Game Room\.cmd/);
assert.match(launcher, /Start Halieus Game Room\.lnk/);
assert.match(launcher, /Close Halieus Game Room\.lnk/);
assert.match(launcher, /Halieus Game Room\.ico/);
assert.match(startCmd, /HALIEUS GAME ROOM/);
assert.match(closeCmd, /Halieus Game Room server stopped/);
assert.ok(!existsSync(resolve(root, "Mega Monopoly.cmd")));
assert.ok(!existsSync(resolve(root, "Close Monopoly.cmd")));

const engineUrl = pathToFileURL(resolve(root, "server/dist/server/src/games/poker/engine.js")).href;
const { evaluateBest } = await import(engineUrl);
const royal = evaluateBest([
  { rank: 14, suit: "H" }, { rank: 13, suit: "H" }, { rank: 12, suit: "H" },
  { rank: 11, suit: "H" }, { rank: 10, suit: "H" }, { rank: 2, suit: "C" }, { rank: 3, suit: "D" },
]);
assert.equal(royal.name, "Straight flush");
const boat = evaluateBest([
  { rank: 9, suit: "H" }, { rank: 9, suit: "S" }, { rank: 9, suit: "D" },
  { rank: 4, suit: "C" }, { rank: 4, suit: "H" }, { rank: 2, suit: "S" }, { rank: 14, suit: "D" },
]);
assert.equal(boat.name, "Full house");

console.log("3.3.21 Halieus multi-game/Poker/Mega Board packaging regression PASS");
