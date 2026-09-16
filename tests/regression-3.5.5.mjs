import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const currentVersion = read('VERSION').trim();

assert.equal(currentVersion.split('.').slice(0,2).join('.'), '3.5');
assert.ok(Number(currentVersion.split('.')[2]) >= 5, '3.5.5 table/intro guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, currentVersion, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.') }\"`));

const app = read('client/src/App.tsx');
assert.match(app, /import \{ HalieusIntro \}/, 'intro component is wired into the root app');
// 3.5.6 supersedes the delayed access bridge with a static first-paint curtain.
assert.doesNotMatch(app, /authBridgeVisible/, 'technical access bridge remains retired');
assert.match(app, /<HalieusIntro/, 'intro is restored');
assert.match(app, /sessionStorage\.setItem\(INTRO_SESSION_KEY, "1"\)/, 'intro runs once per browsing session');

const intro = read('client/src/platform/components/HalieusIntro.tsx');
for (const game of ['Mega Board','Poker','WHOT','Ludo','Blackjack','Connect Four','Hidden Dictator']) {
  assert.match(intro, new RegExp(game.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `intro lists ${game}`);
}
assert.match(intro, /6 ready · 1 beta/i, 'intro communicates Hidden Dictator beta status');
assert.match(intro, /tone: "dictator", state: "BETA"/, 'Hidden Dictator appears in intro as beta');

const catalog = read('client/src/platform/games/catalog.ts');
assert.match(catalog, /id: "hidden-dictator"[\s\S]*?accent: "#ea580c"[\s\S]*?status: "beta"/, 'Hidden Dictator uses the orange social-game identity');
const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /\{ id: "social", label: "Social & Party"/, 'social category remains explicit');
assert.match(home, /ordered\.slice\(0, 7\)/, 'all seven games can appear in Quick Play, including Hidden Dictator');

const whot = read('client/src/games/whot/WhotScreen.tsx');
assert.match(whot, /function opponentSeat/, 'WHOT owns one seat geometry function');
assert.match(whot, /whot355-felt/, 'WHOT uses the 3.5.5 physical felt');
assert.match(whot, /--whot-seat-left/, 'WHOT visible seats consume the seat coordinates');
assert.match(whot, /opponentCardTarget\([\s\S]*?opponentSeat/, 'WHOT deal animation derives from visible seat geometry');

const blackjack = read('client/src/games/blackjack/BlackjackScreen.tsx');
assert.match(blackjack, /blackjackSeatPoint/, 'Blackjack uses seat-ring geometry');
assert.match(blackjack, /blackjack355-felt/, 'Blackjack uses the 3.5.5 casino felt');
assert.match(blackjack, /blackjack355-player-ring/, 'Blackjack players occupy the physical table ring');
assert.match(blackjack, /blackjack355-bet-chip/, 'Blackjack bets read as table chips');

const dictator = read('client/src/games/hidden-dictator/HiddenDictatorScreen.tsx');
assert.match(dictator, /hd-live-roster/, 'Hidden Dictator live table exposes the public room roster');
assert.match(dictator, /is-speaker/, 'Hidden Dictator roster visibly identifies the Speaker');
assert.match(dictator, /is-deputy/, 'Hidden Dictator roster visibly identifies the Deputy');
assert.match(dictator, /Recoverable/, 'Hidden Dictator keeps reconnect state visible');

const css = read('client/src/index.css');
for (const selector of ['.account-loading-screen','.whot355-table','.whot355-player','.blackjack355-table','.blackjack355-seat','.hd-live-roster']) {
  assert.match(css, new RegExp(selector.replace('.', '\\.'), 'm'), `${selector} style exists`);
}
assert.match(css, /3\.5\.5 — restored intro \+ WHOT\/Blackjack\/Hidden Dictator table polish/);
assert.match(css, /prefers-reduced-motion:reduce/, 'new motion respects reduced-motion');

const whotIconPath = existsSync(resolve(root, 'client/public/game-icons/whot.png')) ? 'client/public/game-icons/whot.png' : 'client/public/game-icons/whot.svg';
assert.equal(existsSync(resolve(root, whotIconPath)), true, 'WHOT game icon exists');
for (const [icon, token] of [['blackjack.svg','21'],['hidden-dictator.svg','?']]) {
  const path = `client/public/game-icons/${icon}`;
  assert.equal(existsSync(resolve(root, path)), true, `${path} exists`);
  assert.match(read(path), new RegExp(token.replace('?', '\\?')), `${path} contains its recognition mark`);
}

for (const path of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd','Close Halieus Game Room.cmd']) {
  assert.doesNotMatch(read(path), /localhost/i, `${path} remains production-site only`);
}
assert.equal(existsSync(resolve(root, 'dev-tools/Local Development')), false, 'retired localhost launcher folder stays absent');

console.log('Halieus Game Room 3.5.5 access/intro + WHOT/Blackjack/Hidden Dictator UI regression PASS');
