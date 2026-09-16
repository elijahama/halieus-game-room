import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = readFileSync(resolve(root, 'VERSION'), 'utf8').trim();
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const megaLobby = readFileSync(resolve(root, 'client/src/games/mega-board/components/LobbyScreen.tsx'), 'utf8');
const poker = readFileSync(resolve(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const launcher = readFileSync(resolve(root, 'Start Halieus Game Room.cmd'), 'utf8');
const serverIndex = readFileSync(resolve(root, 'server/src/index.ts'), 'utf8');

assert.match(version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i, `expected a supported public version, got ${version}`);

// Poker setup page must not render the three-card AI difficulty selector.
assert.doesNotMatch(home, /AI difficulty/i);
assert.doesNotMatch(home, /Forgiving decisions/);
assert.doesNotMatch(home, /Balanced table play/);
assert.doesNotMatch(home, /Tighter, more disciplined/);

// AI difficulty remains available only as one table-wide lobby setting.
assert.match(poker, /poker-global-ai-control/);
assert.match(poker, /Applies to all AI players/);

// Mega Board must use the actual redesigned waiting-room hierarchy.
assert.match(megaLobby, /lobby-overview-grid/);
assert.match(megaLobby, /<InviteLobbyBar/);
assert.match(megaLobby, /lobby-main-grid/);
assert.match(megaLobby, /lobby-side-panel/);

// The user-facing launcher is now website-only. Legacy workstation server
// preparation was retired once Oracle became authoritative.
assert.match(launcher, /https:\/\/halieus\.remotewire\.net/);
assert.doesNotMatch(launcher, /localhost/i);
assert.doesNotMatch(launcher, /start-background\.ps1/);

assert.match(serverIndex, /import \{ APP_VERSION \} from "\.\.\/\.\.\/shared\/version\.js"/);

console.log('3.3.29 visible-bundle refresh + launcher version enforcement regression PASS');
