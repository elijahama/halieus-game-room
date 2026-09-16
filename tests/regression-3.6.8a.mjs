import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const displayVersion = read('VERSION').trim();
assert.match(displayVersion, /^(?:3\.6\.8[a-z]?|3\.7\.0[a-z]?|4\.0\.0)$/, '3.6.8a regression must run only on the 3.6.8 line');
const npmVersion = displayVersion === '4.0.0' ? '4.0.0' : displayVersion.startsWith('3.7.0') ? (displayVersion === '3.7.0' ? '3.7.0' : `3.7.0-${displayVersion.slice(-1)}`) : displayVersion === '3.6.8' ? '3.6.8' : `3.6.8-${displayVersion.slice(-1)}`;
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version, npmVersion, `${file} version mismatch`);
}

const rootPackage = json('package.json');
for (const [name, version] of Object.entries({ postcss: '8.5.26', nanoid: '3.3.18', picomatch: '4.0.7' })) {
  assert.equal(rootPackage.overrides?.[name], version, `${name} security override must stay pinned`);
}
const lock = json('package-lock.json');
assert.equal(lock.packages['node_modules/postcss']?.version, '8.5.26', 'PostCSS security floor regressed');
assert.equal(lock.packages['node_modules/nanoid']?.version, '3.3.18', 'nanoid security floor regressed');
assert.equal(lock.packages['node_modules/picomatch']?.version, '4.0.7', 'picomatch security floor regressed');

const css = read('client/src/index.css');
assert.match(css, /\.leaderboard-backdrop\s*\{[\s\S]*?z-index:\s*180000;/, 'leaderboards must be above room creation overlays');
assert.match(css, /\.halieus-create-backdrop\{[^}]*z-index:120000/, 'Create Room reference layer changed unexpectedly');
assert.match(css, /ranked-universal-leaderboard-button/, 'universal ranked leaderboard action missing');
assert.match(css, /Uniform .*game-brand icon construction — 3\.6\.8[a-z]?/, 'uniform icon construction missing');
assert.match(css, /\.halieus-game-brand-icon[\s\S]*(?:outline:2px solid|border:2px solid)/, 'game-brand shared framing missing');

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /function rankedLeaderboardAction\(game: GameId, active: boolean\)/, 'generic ranked leaderboard helper missing');
for (const game of ['mega-board','poker','whot','ludo','blackjack','connect-four','hidden-dictator']) {
  assert.ok(home.includes(`rankedLeaderboardAction("${game}"`), `${game} Ranked mode must expose its leaderboard`);
}
assert.match(home, /rankedLeaderboardAction\(selectedClassicGame,/, 'Cheat/Dominoes Ranked modes must expose leaderboard');
assert.match(home, /rankedLeaderboardAction\(selectedWordArenaGame,/, 'Password/Anagrams Ranked modes must expose leaderboard');
assert.match(home, /createPortal\([\s\S]*leaderboard-backdrop leaderboard-backdrop-global/, 'generic leaderboard must portal to the global overlay host');

const brand = read('client/src/platform/components/GameBrandIcon.tsx');
assert.match(brand, /--game-icon-accent/, 'GameBrandIcon must carry the per-game accent into the shared outline');

console.log('Halieus Game Room 3.6.8a security / leaderboard / icon regression: PASS');
