import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = readFileSync(resolve(root, 'VERSION'), 'utf8').trim();
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const megaLobby = readFileSync(resolve(root, 'client/src/games/mega-board/components/LobbyScreen.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'client/src/index.css'), 'utf8');
const launcher = readFileSync(resolve(root, 'Start Halieus Game Room.cmd'), 'utf8');
const serverIndex = readFileSync(resolve(root, 'server/src/index.ts'), 'utf8');

assert.match(version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i, `expected a supported public version, got ${version}`);

// The browser-visible target source has no Poker AI difficulty cards on the landing page.
assert.doesNotMatch(home, /AI difficulty/i);
assert.doesNotMatch(home, /Forgiving decisions/);
assert.doesNotMatch(home, /Balanced table play/);
assert.doesNotMatch(home, /Tighter, more disciplined/);
assert.match(home, /poker-home-settings/);
assert.match(home, /Starting stack/);
assert.match(home, /Blinds/);

// Mega Board's lobby source must be the redesigned hierarchy, not the legacy invite-heavy screen.
assert.match(megaLobby, /lobby-shell-v2/);
assert.match(megaLobby, /mega-lobby-v2/);
assert.match(megaLobby, /Bring everyone in, set the table and start when the room is ready/);
assert.match(megaLobby, /<InviteLobbyBar/);
assert.match(megaLobby, /lobby-main-grid/);
assert.match(megaLobby, /lobby-side-panel/);

// Shared Game Room/Menu labels must have a safe line box so glyphs are not vertically clipped.
assert.match(css, /game-room-back-label,[\s\S]*?font-weight: 800 !important;[\s\S]*?line-height: 1\.25 !important;/);
assert.match(css, /game-room-back-button,[\s\S]*?line-height: 1\.25;[\s\S]*?overflow: visible;/);
assert.match(css, /v0\.22\.9-rc\.3\.3\.30 — verified visible-bundle update \+ shared navigation text clipping repair/);

// The HTML shell must not be cached across releases; the normal launcher targets Oracle, not localhost.
assert.match(serverIndex, /Cache-Control", "no-store, no-cache, must-revalidate"/);
assert.match(serverIndex, /import \{ APP_VERSION \} from "\.\.\/\.\.\/shared\/version\.js"/);
assert.match(launcher, /halieus\.remotewire\.net/);
assert.doesNotMatch(launcher, /localhost:3000/);

console.log('3.3.30 visible bundle verification + shared text clipping regression PASS');
