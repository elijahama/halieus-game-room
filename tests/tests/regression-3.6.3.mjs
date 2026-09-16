import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');
const version = read('VERSION').trim();

assert.match(version, /^3\.6\.3[a-z]?$/, '3.6.3 stabilization family version mismatch');
const npmVersion = version === '3.6.3' ? version : `3.6.3-${version.slice(-1)}`;
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, npmVersion, `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${version.replaceAll('.', '\\.') }\"`));
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, npmVersion);
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, npmVersion, `package-lock ${workspace || 'root'} version mismatch`);

// Offline security baseline for known 2026 HIGH advisories affecting the shipped dependency family.
// A registry-backed `npm audit` is still required before production acceptance, but these
// assertions prevent regression below the minimum patched versions already locked here.
const lockedVersions = {
  vite: lock.packages?.['node_modules/vite']?.version,
  socketIoParser: lock.packages?.['node_modules/socket.io-parser']?.version,
  engineIo: lock.packages?.['node_modules/engine.io']?.version,
  express: lock.packages?.['node_modules/express']?.version,
  qs: lock.packages?.['node_modules/qs']?.version,
  ws: lock.packages?.['node_modules/ws']?.version,
};
assert.equal(lockedVersions.vite, '6.4.3', 'Vite must remain on the patched 6.4.3 baseline');
assert.equal(lockedVersions.socketIoParser, '4.2.7', 'socket.io-parser must remain on the patched 4.2.7 baseline');
assert.equal(lockedVersions.engineIo, '6.6.9', 'engine.io must remain on the patched 6.6.9 baseline');
assert.equal(lockedVersions.express, '4.22.2', 'Express must remain on the patched 4.22.2 baseline');
assert.equal(lockedVersions.qs, '6.15.3', 'qs must remain on the patched 6.15.3 baseline');
assert.equal(lockedVersions.ws, '8.21.2', 'ws must remain on the patched 8.21.2 baseline');
for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (packagePath.endsWith('/debug') && metadata?.version === '4.4.2') {
    assert.fail(`Compromised debug 4.4.2 must not be present: ${packagePath}`);
  }
}

// Start / Restart remain launch-only; Update remains the publishing boundary.
for (const file of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd']) {
  const source = read(file);
  assert.doesNotMatch(source, /update-website\.ps1/i, `${file} must not deploy`);
  assert.doesNotMatch(source, /deploy-from-windows\.ps1/i, `${file} must not deploy`);
  assert.doesNotMatch(source, /\bssh\b/i, `${file} must not use SSH`);
}

// Frozen rollback stays byte-identical.
const frozenBackup = 'dev-tools/Oracle Quick Deploy/Backups/Halieus Game Room 3.5.27 - FROZEN BACKUP.zip';
assert.ok(existsSync(resolve(root, frozenBackup)), '3.5.27 frozen rollback ZIP is missing');
assert.equal(sha(frozenBackup), 'a71d846fe68d237b3ba6a82ca30550d1038791efa439cc3bbf83a782f86fd237', '3.5.27 frozen rollback ZIP changed');

// Locked gameplay sources may not drift in this stabilization patch.
const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'update-website.ps1': 'f6912de819207ee9dfacece8fd5455ff7ed963aae34821a0a8d1a6a628dd0e80',
  'dev-tools/Oracle Quick Deploy/quick-install.sh': 'edcbb8dfd0524e328ae720ad8aac51857609ea1cfbf60f192ffed518031a4ef6',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

const catalog = read('client/src/platform/games/catalog.ts');
assert.match(catalog, /id: "blackjack"[\s\S]*?status: "retired"/);
assert.match(catalog, /id: "whot"[\s\S]*?status: "retired"/);
assert.match(catalog, /ACTIVE_GAME_CATALOG = GAME_CATALOG\.filter\(\(game\) => game\.status !== "retired"\)/);
for (const future of ['Villagers & Mafia','Word Game','Settlers','Spot the Match','Cheat / BS','Dominoes','Password','Anagrams Race']) assert.match(catalog, new RegExp(future.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /const GAMES = ACTIVE_GAME_CATALOG/);
assert.doesNotMatch(home.slice(home.indexOf('const savedSeats'), home.indexOf('useEffect', home.indexOf('const savedSeats'))), /Blackjack|WHOT/);
assert.match(home, /FUTURE_GAME_QUEUE/);
assert.match(home, /Coming next/);
assert.match(home, /Full screen is not available in this browser or installed window/);
assert.match(home, /--game-create-accent/);
assert.match(home, /Friends are at the table/);
assert.match(home, /Invite to game/);
assert.ok(home.indexOf('halieus-side-account halieus-side-account-top') < home.indexOf('<nav className="halieus-side-nav"'), 'profile must appear before Home navigation');

const app = read('client/src/App.tsx');
assert.match(app, /Blackjack" : "WHOT"\} is temporarily unavailable while its Halieus module is rebuilt/);
assert.doesNotMatch(app.match(/const \[selectedGame[\s\S]*?;\n/)?.[0] ?? '', /readBlackjackCodeFromPath|readWhotCodeFromPath/);
assert.match(app, /type HalieusThemeMode = "system" \| "light" \| "dark"/);

const server = read('server/src/index.ts');
assert.doesNotMatch(server, /registerBlackjackHandlers/);
assert.doesNotMatch(server, /registerWhotHandlers/);
assert.doesNotMatch(server, /getBlackjackLiveRoomSummaries|getWhotLiveRoomSummaries/);
assert.match(server, /blackjack: \(\) => null/);
assert.match(server, /whot: \(\) => null/);
assert.match(server, /retiredModules: \["blackjack", "whot"\]/);

const css = read('client/src/index.css');
const finalCss = css.slice(css.lastIndexOf('3.6.3 — authoritative stabilization contract'));
assert.match(finalCss, /\.halieus-main[\s\S]*?height: 100dvh[\s\S]*?overflow-y: auto/);
assert.match(finalCss, /#halieus-build-marker[\s\S]*?display: none/);
assert.match(finalCss, /\.view-games \.halieus-game-library\.is-categorized[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
assert.match(finalCss, /\.halieus-future-games/);
assert.match(finalCss, /\.halieus-create-modal \.match-tabs button\.active/);
assert.match(finalCss, /\.poker-room-panel-slot[\s\S]*?min-height: 220px/);
assert.match(finalCss, /\.connect-four-room-stack/);
assert.doesNotMatch(finalCss, /\bzoom\s*:/, '3.6.3 must not use CSS zoom');
assert.doesNotMatch(finalCss, /transform\s*:\s*scale\(/, '3.6.3 must not use global scale hacks');
assert.doesNotMatch(finalCss, /\.ludo[-\w\s>.:#\[]*\{/i, '3.6.3 final CSS must not target Ludo');

// Launcher actions have distinct HGR icons and the refresh script assigns them.
const launcher = read('launcher-shortcuts.ps1');
for (const icon of ['Start Halieus Game Room.ico','Restart Halieus Game Room.ico','Update Halieus Website.ico','Close Halieus Game Room.ico']) {
  assert.ok(existsSync(resolve(root, icon)), `${icon} missing`);
  assert.match(launcher, new RegExp(icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(launcher, /-IconPath \$StartIconPath/);
assert.match(launcher, /-IconPath \$RestartIconPath/);
assert.match(launcher, /-IconPath \$UpdateIconPath/);
assert.match(launcher, /-IconPath \$CloseIconPath/);

// Do not ship private credentials, owner bootstrap codes, or stale nested app copies.
assert.equal(existsSync(resolve(root, 'OWNER SETUP CODE.txt')), false);
assert.equal(existsSync(resolve(root, 'docs/OWNER SETUP CODE.txt')), false);
assert.equal(existsSync(resolve(root, 'server/client')), false);
assert.equal(existsSync(resolve(root, 'server/server')), false);
assert.equal(existsSync(resolve(root, 'server/shared')), false);
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules','.release-backups','dist','.runtime','logs'].includes(name)) continue;
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else assert.ok(!/\.(key|pem|ppk|pub)$/i.test(name), `SSH credential-like file packaged: ${full}`);
  }
}
walk(root);

// Release source packer must preserve the exact integrity inventory and omit runtime data.
const deployPacker = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deployPacker, /releaseManifest\.integrityFiles/);
assert.match(deployPacker, /Deployment package completeness verified/);
assert.match(deployPacker, /\^server\/data/);
for (const icon of ['Start Halieus Game Room.ico','Restart Halieus Game Room.ico','Update Halieus Website.ico','Close Halieus Game Room.ico']) assert.match(deployPacker, new RegExp(icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

console.log('Halieus Game Room 3.6.3 stabilization regression: PASS');
