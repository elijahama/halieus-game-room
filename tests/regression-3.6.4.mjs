import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

assert.equal(read('VERSION').trim(), '3.6.4');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.6.4', `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.4"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.6.4');
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, '3.6.4', `package-lock ${workspace || 'root'} version mismatch`);

// Keep the patched dependency floor established during the 3.6.3 security pass.
assert.equal(lock.packages?.['node_modules/vite']?.version, '6.4.3');
assert.equal(lock.packages?.['node_modules/socket.io-parser']?.version, '4.2.7');
assert.equal(lock.packages?.['node_modules/engine.io']?.version, '6.6.9');
assert.equal(lock.packages?.['node_modules/express']?.version, '4.22.2');
assert.equal(lock.packages?.['node_modules/qs']?.version, '6.15.3');
assert.equal(lock.packages?.['node_modules/ws']?.version, '8.21.2');
for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (packagePath.endsWith('/debug') && metadata?.version === '4.4.2') assert.fail(`Compromised debug 4.4.2 present: ${packagePath}`);
}

// Locked mature game areas are explicitly out of scope for 3.6.4.
const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'client/src/games/mega-board/components/GameBoard.tsx': '547f7f792202971153e47952205dfdb7d3cb32941872d7fc0b52defac367a0b6',
  'client/src/games/mega-board/components/PlayerRail.tsx': '97e70665e9930afb38e9f1b51317a6c3596c8b31f3b0a9da49303a81e9723c8d',
  'client/src/games/mega-board/styles/gameStyles.ts': '48fb45f725c5d296604c14e1c6f533f6205407457cf525fbce5eae931079d749',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

const catalog = read('client/src/platform/games/catalog.ts');
for (const [id, name] of [['word-game','Word Game'],['password','Password'],['anagrams-race','Anagrams Race']]) {
  assert.match(catalog, new RegExp(`id: "${id}"[\\s\\S]*?name: "${name}"[\\s\\S]*?status: "live"`), `${name} must be live`);
}
const futureBlock = catalog.slice(catalog.indexOf('export const FUTURE_GAME_QUEUE'));
for (const name of ['Word Game','Password','Anagrams Race']) assert.doesNotMatch(futureBlock, new RegExp(name), `${name} must leave Coming next`);
for (const name of ['Villagers & Mafia','Settlers','Spot the Match','Cheat / BS','Dominoes']) assert.match(futureBlock, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const sharedTypes = read('shared/games/word-arena/types.ts');
assert.match(sharedTypes, /"word-game" \| "password" \| "anagrams-race"/);
const liveTypes = read('shared/platform/live-games.ts');
const chatTypes = read('shared/platform/room-chat.ts');
for (const id of ['word-game','password','anagrams-race']) { assert.match(liveTypes, new RegExp(`"${id}"`)); assert.match(chatTypes, new RegExp(`"${id}"`)); }

const handlers = read('server/src/games/word-arena/handlers.ts');
for (const id of ['word-game','password','anagrams-race']) assert.match(handlers, new RegExp(`roomsByGame[\\s\\S]*?${id.replace('-', '\\-')}`));
assert.match(handlers, /p\.attempts\.length>=6/);
assert.match(handlers, /feedback\(room\.secret,guess\)/);
assert.match(handlers, /clueGiverPlayerId/);
assert.match(handlers, /cleanSingleWord/);
assert.match(handlers, /first correct answer wins the point/i);
assert.match(handlers, /winner\.score>=room\.targetScore/);
assert.match(handlers, /socket\.on\(`\$\{game\}:create`/);
assert.match(handlers, /socket\.on\(`\$\{game\}:join`/);
assert.match(handlers, /socket\.on\(`\$\{game\}:reconnect`/);
assert.match(handlers, /socket\.on\(`\$\{game\}:spectate`/);
assert.match(handlers, /socket\.on\(`\$\{game\}:submit`/);
assert.match(handlers, /socket\.on\("password:clue"/);

const server = read('server/src/index.ts');
assert.match(server, /registerWordArenaHandlers\(io, socket\)/);
assert.match(server, /activeWordArenaRooms: getWordArenaRoomCount\(\)/);
for (const id of ['word-game','password','anagrams-race']) assert.match(server, new RegExp(`"?${id}"?: \\(code, socketId\\) => getWordArenaChatIdentity`));
assert.doesNotMatch(server, /registerBlackjackHandlers|registerWhotHandlers/);

const app = read('client/src/App.tsx');
for (const id of ['word-game','password','anagrams-race']) {
  assert.match(app, new RegExp(`socket\\.on\\("${id}:state"`));
}
assert.match(app, /<WordArenaScreen/);
assert.match(app, /createWordArena/);
assert.match(app, /spectateWordArena/);
assert.match(app, /recoverWordArena/);

const screen = read('client/src/games/word-arena/WordArenaScreen.tsx');
assert.match(screen, /wordle-board/);
assert.match(screen, /password-stage/);
assert.match(screen, /anagram-stage/);
assert.match(screen, /RoomChatPanel|roomActivity/);
assert.match(screen, /InviteLobbyPanel/);

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /wordArenaSelected/);
assert.match(home, /onCreateWordArena/);
assert.match(home, /1–8 players · six five-letter guesses/);
assert.match(home, /2–8 players · rotating clue giver/);
assert.match(home, /2–8 players · shared scrambled word/);
assert.match(home, /<header><div><h2>\{group\.label\}<\/h2><span>\{group\.description\}<\/span><\/div>/);
assert.doesNotMatch(home, /group\.label\.toUpperCase\(\)/, 'Games category title must not be repeated as an eyebrow');

const css = read('client/src/index.css');
const patch = css.slice(css.lastIndexOf('3.6.4 — Games library + owner/admin cleanup + Word Arena'));
assert.ok(patch.length > 0, '3.6.4 CSS marker missing');
assert.match(patch, /\.account-panel \.account-owner-metrics[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(patch, /\.account-panel \.account-owner-actions/);
assert.match(patch, /\.account-panel \.account-invite-subnav[\s\S]*?repeat\(3, minmax\(0,1fr\)\)/);
assert.match(patch, /\.account-panel \.account-invites-layout[\s\S]*?minmax\(320px, 400px\)/);
assert.match(patch, /label::before,[\s\S]*?label::after \{ display: none/);
assert.match(patch, /\.word-arena-page/);
assert.match(patch, /\.wordle-board/);
assert.match(patch, /\.password-stage/);
assert.match(patch, /\.anagram-stage/);
assert.doesNotMatch(patch, /\.ludo[-\w\s>.:#\[]*\{/i, '3.6.4 must not target Ludo');
assert.doesNotMatch(patch, /\.poker[-\w\s>.:#\[]*\{/i, '3.6.4 must not target Poker');
assert.doesNotMatch(patch, /\bzoom\s*:/, '3.6.4 must not use CSS zoom');
assert.doesNotMatch(patch, /transform\s*:\s*scale\(/, '3.6.4 must not use global scale hacks');

// Letter-patch compatibility introduced in 3.6.3b must survive the numeric release.
assert.match(read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1'), /Convert-HalieusVersionToNpm/);
assert.match(read('dev-tools/Oracle Quick Deploy/quick-install.sh'), /expectedPackageVersion/);
assert.match(read('start-background.ps1'), /Convert-HalieusVersionToNpm/);
assert.match(read('update-website.ps1'), /Compare-HalieusVersions/);

// No credential-like files may enter a release source tree.
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules','.release-backups','dist','.runtime','logs'].includes(name)) continue;
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else assert.ok(!/\.(key|pem|ppk|pub)$/i.test(name), `Credential-like file found: ${full}`);
  }
}
walk(root);
assert.equal(existsSync(resolve(root, 'OWNER SETUP CODE.txt')), false);

console.log('Halieus Game Room 3.6.4 new-games + UI cleanup regression: PASS');
