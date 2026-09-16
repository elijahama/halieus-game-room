import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const rootPkg = JSON.parse(read('package.json'));
const home = read('client/src/platform/components/HomeScreen.tsx');
const accounts = read('server/src/platform/accounts.ts');
const sharedAccounts = read('shared/platform/accounts.ts');
const cf = read('client/src/games/connect-four/ConnectFourScreen.tsx');
const app = read('client/src/App.tsx');
const css = read('client/src/index.css');
const catalog = read('client/src/platform/games/catalog.ts');
const ludoIcon = read('client/public/game-icons/ludo.svg');
const cfIcon = read('client/public/game-icons/connect-four.svg');
const pokerIcon = read('client/public/game-icons/poker.svg');
const whotIcon = read('client/public/game-icons/whot.svg');
assert.equal(rootPkg.version, JSON.parse(read('client/package.json')).version, 'root/client versions should stay aligned');

// Home is launch-first: current room when one exists, otherwise a real quick-play path.
assert.match(home, /CURRENTLY PLAYING/);
assert.match(home, /PLAY A GAME/);
assert.match(home, /Your usual tables/);
assert.match(home, /accounts\/me\/quick-play/);
assert.match(home, /function applyQuickPlay/);
assert.doesNotMatch(home.slice(home.indexOf('function applyQuickPlay'), home.indexOf('function selectGame')), /setView\("games"\)/);
assert.match(home, /RECENTLY PLAYED/);

// Quick Play is derived from completed account history and remembers meaningful variants.
assert.match(sharedAccounts, /HalieusQuickPlayPreference/);
assert.match(accounts, /async function quickPlayProfile/);
assert.match(accounts, /pokerStartingChips/);
assert.match(accounts, /connectFourBestOf/);
assert.match(accounts, /app\.get\("\/accounts\/me\/quick-play"/);

// Connect Four drop travels down the selected column and lands with a bounded bounce.
assert.match(cf, /--connect-drop-origin/);
assert.match(css, /@keyframes connect344b-drop/);
assert.match(css, /translateY\(var\(--connect-drop-origin/);
assert.match(css, /\.connect-four-board\{overflow:hidden!important/);

// Mega lobby and active match presentation stay contained with large rosters and readable metadata.
assert.match(css, /\.lobby-shell-v2 \.modern-player-list-v2\{[^}]*overflow-y:auto!important/s);
assert.match(app, /<small>Match<\/small>/);
assert.match(app, /<small>Duration<\/small>/);
assert.match(css, /\.mega-game-meta\{display:grid!important/);

// Theme and ambient movement are intentionally gentler/faster respectively.
assert.match(css, /transition-duration:980ms!important/);
assert.match(app, /theme-transitioning/);
assert.match(app, /THEME_TRANSITION_MS/);
assert.match(css, /animation-duration:10s!important/);

// Icon family refinements remain graphical rather than literal L/4. Poker/WHOT
// geometry was deliberately superseded by the approved 3.5.0 icon cleanup.
assert.doesNotMatch(ludoIcon, />L<\/text>|>L</);
assert.doesNotMatch(cfIcon, />4<\/text>/);
assert.match(pokerIcon, />P<\/text>/);
assert.ok((pokerIcon.match(/<rect/g) ?? []).length >= 3, 'Poker keeps a two-card composition');
assert.ok((whotIcon.match(/<rect/g) ?? []).length >= 3, 'WHOT keeps a two-card composition');
assert.doesNotMatch(catalog, /motifs: \[[^\]]*"L"[^\]]*\]/);
console.log('RC 3.4.4b Home/Quick Play/motion/presentation regression passed.');
