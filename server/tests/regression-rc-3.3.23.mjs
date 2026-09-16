import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageInfo = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const clientPackage = JSON.parse(readFileSync(resolve(root, 'client/package.json'), 'utf8'));
const serverPackage = JSON.parse(readFileSync(resolve(root, 'server/package.json'), 'utf8'));
const sharedPackage = JSON.parse(readFileSync(resolve(root, 'shared/package.json'), 'utf8'));

assert.equal(packageInfo.name, 'halieus-game-room');
assert.deepEqual(packageInfo.workspaces, ['client', 'server', 'shared']);
assert.equal(clientPackage.name, 'halieus-game-room-client');
assert.equal(serverPackage.name, 'halieus-game-room-server');
assert.equal(sharedPackage.name, 'halieus-game-room-shared');

assert.ok(!existsSync(resolve(root, 'Mega Board')), 'Mega Board must no longer be the application root folder');
assert.ok(existsSync(resolve(root, 'Start Halieus Game Room.cmd')));
assert.ok(existsSync(resolve(root, 'Close Halieus Game Room.cmd')));
assert.ok(!existsSync(resolve(root, 'Start Mega Board.cmd')));
assert.ok(!existsSync(resolve(root, 'Close Mega Board.cmd')));

for (const path of [
  'client/src/platform/components/HomeScreen.tsx',
  'client/src/games/mega-board/components/GameBoard.tsx',
  'client/src/games/poker/PokerScreen.tsx',
  'client/src/games/blackjack/README.md',
  'client/src/games/whot/README.md',
  'server/src/games/mega-board/handlers/lobbyHandlers.ts',
  'server/src/games/poker/handlers.ts',
  'server/src/games/blackjack/README.md',
  'server/src/games/whot/README.md',
  'shared/games/mega-board/game-state.ts',
  'shared/platform/README.md',
]) {
  assert.ok(existsSync(resolve(root, path)), `${path} must exist`);
}

const serverIndex = readFileSync(resolve(root, 'server/src/index.ts'), 'utf8');
assert.match(serverIndex, /\.\/games\/mega-board\/handlers\/lobbyHandlers\.js/);
assert.match(serverIndex, /\.\/games\/poker\/handlers\.js/);
const app = readFileSync(resolve(root, 'client/src/App.tsx'), 'utf8');
assert.match(app, /\.\/games\/mega-board\/components\/GameBoard/);
assert.match(app, /\.\/games\/poker\/PokerScreen/);
assert.match(app, /\.\/platform\/components\/HomeScreen/);

const launcher = readFileSync(resolve(root, 'launcher-shortcuts.ps1'), 'utf8');
assert.match(launcher, /Start Halieus Game Room\.cmd/);
assert.match(launcher, /Close Halieus Game Room\.cmd/);
assert.match(launcher, /Halieus Game Room\.ico/);

console.log('3.3.23 Halieus application-root/module-architecture regression PASS');
