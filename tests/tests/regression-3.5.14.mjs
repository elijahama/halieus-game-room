import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 14, '3.5.14 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const serverIndex = read('server/src/index.ts');
assert.doesNotMatch(serverIndex, /room\.gameState\?\.startedAt/, 'Mega Board live-room summary must use the real gameStartedAt field');
assert.match(serverIndex, /room\.gameState\?\.gameStartedAt \?\? null/, 'live-room summary must compile against GameState');

const timer = read('server/src/games/mega-board/utils/game-state.ts');
assert.match(timer, /existing\?\.deadline === deadline/, 'same deadline must keep the same scheduled timer');
assert.doesNotMatch(timer, /optionalActionDeadline <= Date\.now\(\)[\s\S]{0,120}Date\.now\(\) \+ optionalActionDuration/, 'expired turns must not receive a fresh 2:30 deadline');
assert.match(timer, /trade is part of the current player's turn/i, 'trade must remain inside the turn clock');

const sidebar = read('client/src/games/mega-board/components/GameSidebar.tsx');
assert.match(sidebar, /optionalActionDeadlineRef/, 'client must preserve the authoritative deadline through trade UI updates');
assert.match(sidebar, /gameState\.pendingTrade && outgoingTradeForMe/, 'outgoing trade dialog must keep rendering the active turn clock');

console.log('Halieus Game Room 3.5.14 build + trade timer regression PASS');
