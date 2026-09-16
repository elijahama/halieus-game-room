import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const indexHtml = readFileSync(resolve(root, "client/index.html"), "utf8");
const home = readFileSync(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const manifest = readFileSync(resolve(root, "client/public/site.webmanifest"), "utf8");
const server = readFileSync(resolve(root, "server/src/index.ts"), "utf8");

assert.match(indexHtml, /name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/);
assert.match(indexHtml, /name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/);
assert.match(indexHtml, /<title>Halieus Game Room<\/title>/);
assert.doesNotMatch(indexHtml, /<title>Mega Monopoly<\/title>/);
assert.doesNotMatch(indexHtml, /play-halieus\.tailab13d9\.ts\.net/);
assert.doesNotMatch(indexHtml, /Build an empire with friends/);

assert.match(home, /<h1>Halieus Game Room<\/h1>/);
assert.match(home, /<p>Private game library<\/p>/);
assert.match(home, /Private access • Share the room (?:link or )?code (?:only )?with invited (?:players|friends)\./);

assert.match(home, /className="home-game-library"/);
assert.match(home, /<strong>(?:Property Trading|Mega Board)<\/strong>/);
assert.match(home, /<strong>More games<\/strong>/);
assert.match(home, /(?:Property Trading|Mega Board)[\s\S]*Create or join a room/);
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
