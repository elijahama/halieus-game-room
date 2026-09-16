import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 13, '3.5.13 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const gameState = read('server/src/games/mega-board/utils/game-state.ts');
assert.doesNotMatch(gameState, /turnPhase !== "optional-actions" \|\| gameState\.pendingTrade/, 'pending trade must not disable the optional-action timer');
assert.doesNotMatch(gameState, /current\.pendingTrade \|\|\n\s*current\.optionalActionDeadline !== deadline/, 'pending trade must not block the turn-expiry callback');
assert.match(gameState, /trade offer expired when the turn timer ran out/, 'turn expiry must cancel an unresolved trade');
assert.match(gameState, /current\.pendingTrade = null;[\s\S]*?advanceTurn\(current\)/, 'expired trade must be cleared before the turn advances');

const sidebar = read('client/src/games/mega-board/components/GameSidebar.tsx');
assert.match(sidebar, /deadline - Date\.now\(\)/, 'client turn timer remains deadline-driven');
assert.match(sidebar, /window\.setInterval\(update, 250\)/, 'client timer continues to tick locally');

console.log('Halieus Game Room 3.5.13 trade turn-timer regression PASS');
