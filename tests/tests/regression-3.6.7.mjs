import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const sha = (file) => createHash('sha256').update(read(file)).digest('hex');

assert.equal(read('VERSION').trim(), '3.6.7b');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.6.7-b', `${file} version mismatch`);
}
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.6.7-b');
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, '3.6.7-b', `package-lock ${workspace || 'root'} mismatch`);
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.7b"/);

const catalog = read('client/src/platform/games/catalog.ts');
for (const id of ['blackjack','whot','cheat','dominoes']) {
  assert.match(catalog, new RegExp(`id: "${id}"[^\n]+status: "live"`), `${id} must be active/live`);
}
assert.ok(!catalog.includes('Cheat / BS'), 'Cheat must not be called BS');
assert.match(catalog, /name: "Cheat"/);
assert.ok(!read('server/src/index.ts').includes('retiredModules: ["blackjack", "whot"]'), 'Blackjack/WHOT must not remain retired');
assert.match(read('server/src/index.ts'), /registerBlackjackHandlers\(io, socket\)/);
assert.match(read('server/src/index.ts'), /registerWhotHandlers\(io, socket\)/);
assert.match(read('server/src/index.ts'), /registerClassicTableHandlers\(io, socket\)/);

for (const file of [
  'server/src/games/blackjack/rebuild.ts',
  'server/src/games/whot/rebuild.ts',
  'server/src/games/classic-table/handlers.ts',
  'client/src/games/blackjack/BlackjackRebuildScreen.tsx',
  'client/src/games/whot/WhotRebuildScreen.tsx',
  'client/src/games/classic-table/ClassicTableScreen.tsx',
  'shared/games/classic-table/types.ts',
  'client/public/game-icons/cheat.svg',
  'client/public/game-icons/dominoes.svg',
]) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} missing`);

const blackjack = read('server/src/games/blackjack/rebuild.ts');
assert.match(blackjack, /deckCount: 6/);
assert.match(blackjack, /blackjackPayout: 1\.5/);
assert.match(blackjack, /blackjack:add-ai/);
assert.match(blackjack, /blackjack:action/);
assert.match(blackjack, /getBlackjackLiveRoomSummaries/);

const whot = read('server/src/games/whot/rebuild.ts');
for (const value of ['card.number === 1','card.number === 8','card.number === 14','card.number === 2','card.number === 5']) assert.ok(whot.includes(value), `WHOT action rule missing: ${value}`);
assert.match(whot, /card\.shape === "whot"/);
assert.match(whot, /whot:add-ai/);
assert.match(whot, /getWhotLiveRoomSummaries/);

const classic = read('server/src/games/classic-table/handlers.ts');
assert.match(classic, /ClassicGameId =|registerClassicTableHandlers/);
assert.match(classic, /createCheatDeck/);
assert.match(classic, /Call Cheat|callCheat/);
assert.match(classic, /createDominoSet/);
assert.match(classic, /boneyard/);
assert.match(classic, /finishBlockedDominoes/);
// 3.6.7a: Windows/Oracle server-build hotfix guards.
assert.match(classic, /function pipTotal\(tiles: DominoTile\[\]\): number/, 'Dominoes pipTotal helper must exist');
assert.match(classic, /const publicPlayers = room\.game === "cheat"[\s\S]*?ordered\(room\)[\s\S]*?: ordered\(room\)/, 'classic-table public state must narrow the room union before ordered()');
assert.ok(!classic.includes('players: ordered(room).map((player) => publicPlayer(room, player, viewerId))'), 'do not pass AnyRoom directly into the generic ordered() helper');

const home = read('client/src/platform/components/HomeScreen.tsx');
const main = read('client/src/main.tsx');
assert.ok(!main.includes('document.body.appendChild(buildMarker)'), 'always-visible build marker must be removed');
assert.match(home, /Build Info/);
assert.match(home, /RELEASE_FINGERPRINT/);
assert.match(read('client/src/platform/components/DisplaySettingsPanel.tsx'), /Build info/);

const app = read('client/src/App.tsx');
assert.match(app, /BlackjackRebuildScreen as BlackjackScreen/);
assert.match(app, /WhotRebuildScreen as WhotScreen/);
assert.match(app, /ClassicTableScreen/);
assert.match(app, /blackjack:create/);
assert.match(app, /whot:create/);
assert.match(app, /createClassic/);

// Protected reference-game presentation stays untouched in this expansion.
assert.equal(sha('client/src/games/ludo/LudoScreen.tsx'), 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f');
assert.equal(sha('client/src/games/poker/PokerScreen.tsx'), 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18');

const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
const integrity = read('scripts/release-integrity.mjs');
assert.match(deploy, /\$optionalRootFiles = @\("Halieus Game Room\.ico"\)/, 'main launcher ICO must be optional for Oracle deployment');
const requiredRootLine = deploy.match(/\$rootFiles = @\([^\n]+/i)?.[0] ?? '';
assert.ok(!/\"Halieus Game Room\.ico\"/.test(requiredRootLine), 'main launcher ICO must not be a required Oracle deployment file');
assert.match(deploy, /Optional local launcher file missing; website deployment will continue/, 'missing optional icon should produce a non-fatal warning');
const singlesBlock = integrity.slice(integrity.indexOf('const singles = ['), integrity.indexOf('];', integrity.indexOf('const singles = [')));
assert.ok(!singlesBlock.includes("'Halieus Game Room.ico'"), 'desktop-only root ICO must not be a release-integrity input');

console.log('Halieus Game Room 3.6.7b Oracle optional-launcher-asset hotfix regression: PASS');
