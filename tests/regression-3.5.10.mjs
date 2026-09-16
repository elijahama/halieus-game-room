import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.equal(version.split('.').slice(0,2).join('.'), '3.5');
assert.ok(Number(version.split('.')[2]) >= 10, '3.5.10 mobile/live-room/no-flash guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) assert.equal(json(path).version, version, `${path} version`);
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${version.replaceAll('.', '\\.') }\"`));

const app = read('client/src/App.tsx');
assert.match(app, /const appReady = guestAccessRequested \|\| Boolean\(authStatus\) \|\| Boolean\(authLoadError\)/, 'boot curtain waits for auth resolution');
assert.doesNotMatch(app, /Checking player access/, 'technical account check copy is absent');

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /\/accounts\/live-games/, 'Game Room polls authoritative live rooms');
assert.match(home, /ACTIVE GAMES/, 'active games surface is present');
assert.match(home, />Spectate<\/button>/, 'active games can be spectated');
assert.match(home, /halieus-mobile-menu-button/, 'mobile header has app-menu control');
assert.doesNotMatch(home.match(/<header className="halieus-mobile-bar"[\s\S]*?<\/header>/)?.[0] ?? '', /halieus-mobile-join/, 'mobile header no longer duplicates Join');
assert.match(home, /halieus-mobile-nav/, 'fixed bottom app navigation remains');

const accounts = read('server/src/platform/accounts.ts');
assert.match(accounts, /app\.get\("\/accounts\/live-games"/, 'signed-in live games endpoint exists');
assert.match(accounts, /getLiveRooms/, 'live-room provider is wired');
const index = read('server/src/index.ts');
assert.match(index, /getMegaBoardLiveRoomSummaries/, 'Mega Board is included in live discovery');
assert.match(index, /getPokerLiveRoomSummaries/, 'Poker is included in live discovery');
assert.match(index, /getWhotLiveRoomSummaries/, 'WHOT is included in live discovery');

const css = read('client/src/index.css');
assert.match(css, /approved mobile shell \+ live-room discovery/);
assert.match(css, /position:fixed !important;[\s\S]*bottom:0 !important;/, 'mobile nav is viewport fixed');
assert.match(css, /\.halieus-sidebar\.is-mobile-open/, 'mobile drawer is viewport fixed/openable');
assert.match(css, /WHOT desktop composition now mirrors Ludo/, 'WHOT chat/status uses Ludo-style side stack');

const blackjack = read('client/public/game-icons/blackjack.svg');
assert.match(blackjack, />A<\/text>/, 'Blackjack icon has an Ace');
assert.match(blackjack, />K<\/text>/, 'Blackjack icon has a King');
assert.ok(statSync(resolve(root, 'client/public/blackjack-icon-192.png')).size > 5000, 'Blackjack raster icon regenerated');
assert.ok(statSync(resolve(root, 'Halieus Game Room.ico')).size > 10000, 'Windows ICO regenerated');

console.log('Halieus Game Room 3.5.10 mobile/live-room/no-flash regression PASS');
