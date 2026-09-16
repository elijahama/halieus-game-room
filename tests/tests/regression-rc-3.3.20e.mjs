import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const indexHtml = readFileSync(resolve(root, "client/index.html"), "utf8");
const home = readFileSync(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const catalog = readFileSync(resolve(root, "client/src/platform/games/catalog.ts"), "utf8");
const manifest = readFileSync(resolve(root, "client/public/site.webmanifest"), "utf8");
const server = readFileSync(resolve(root, "server/src/index.ts"), "utf8");

assert.match(indexHtml, /name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/);
assert.match(indexHtml, /name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/);
assert.match(indexHtml, /<title>Halieus Game Room<\/title>/);
assert.doesNotMatch(indexHtml, /<title>Mega Monopoly<\/title>/);
assert.doesNotMatch(indexHtml, /play-halieus\.tailab13d9\.ts\.net/);
assert.doesNotMatch(indexHtml, /Build an empire with friends/);

assert.match(home, /Halieus Game Room/);
assert.match(home, /Home/);
assert.match(home, /Games/);
assert.match(home, /Join Game/);

assert.match(home, /halieus-game-library/);
assert.match(home, /GAME_CATALOG/);
assert.match(catalog, /id: "mega-board", name: "Mega Board"/);
assert.match(catalog, /id: "blackjack", name: "Blackjack"/);
assert.match(home, /Create .*room|Create .*table/);
assert.doesNotMatch(home, /<h1>Mega Monopoly<\/h1>/);
assert.doesNotMatch(home, /Public game address:/);
assert.doesNotMatch(home, /Normal Mega Monopoly rules then apply/);

assert.match(manifest, /"name": "Halieus Game Room"/);
assert.match(manifest, /"short_name": "Game Room"/);
assert.doesNotMatch(manifest, /Mega Monopoly/);

assert.match(server, /X-Robots-Tag/);
assert.match(server, /noindex, nofollow, noarchive, nosnippet, noimageindex/);
assert.match(server, /Referrer-Policy/);

console.log("3.3.20e search-privacy and landing-page regression PASS");
