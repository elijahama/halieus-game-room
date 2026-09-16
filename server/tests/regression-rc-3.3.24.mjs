import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// RC 3.3.24 regression: the approved game-library icon family and shared non-destructive Game Room navigation must stay wired after future refactors.
const app = readFileSync(resolve(root, 'client/src/App.tsx'), 'utf8');
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const poker = readFileSync(resolve(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const lobby = readFileSync(resolve(root, 'client/src/games/mega-board/components/LobbyScreen.tsx'), 'utf8');
const ordering = readFileSync(resolve(root, 'client/src/games/mega-board/components/TurnOrderScreen.tsx'), 'utf8');
const preferences = readFileSync(resolve(root, 'client/src/games/mega-board/components/GamePreferences.tsx'), 'utf8');
const backButton = readFileSync(resolve(root, 'client/src/platform/components/BackToGameRoomButton.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'client/src/index.css'), 'utf8');

assert.match(app, /const \[megaBoardParked, setMegaBoardParked\]/);
assert.match(app, /function handleBackToGameRoom\(\)/);
assert.match(app, /!megaBoardParked && gameStarted && lobby && gameState/);
assert.match(app, /session && megaBoardParked && lobby\?\.code === session\.code/);
assert.match(app, /onBackToGameRoom=\{handleBackToGameRoom\}/);
assert.match(preferences, /BackToGameRoomButton/);
assert.match(lobby, /onBackToGameRoom/);
assert.match(ordering, /BackToGameRoomButton/);
assert.match(poker, /BackToGameRoomButton|GameChrome/);
assert.match(poker, /derivePotLayers/);
assert.match(poker, /poker-pot-layers/);
assert.match(backButton, /return to the Game Room/i);
assert.doesNotMatch(lobby, /dealt independently to a random player/i);
assert.match(lobby, /all 37 ownable assets are shuffled together and dealt round-robin/i);

for (const asset of [
  'client/public/mega-board-icon-192.png',
  'client/public/poker-icon-192.png',
  'client/public/blackjack-icon-192.png',
  'client/public/whot-icon-192.png',
  'client/public/more-games-icon-192.png',
  'client/public/mega-board-icon-512.png',
  'client/public/poker-icon-512.png',
]) {
  assert.ok(existsSync(resolve(root, asset)), `${asset} must exist`);
}

assert.match(home, /mega-board-icon-192\.png\?v=3\.3\.(?:24|25)/);
assert.match(home, /poker-icon-192\.png\?v=3\.3\.(?:24|25)/);
assert.match(home, /blackjack-icon-192\.png\?v=3\.3\.(?:24|25)/);
assert.match(home, /whot-icon-192\.png\?v=3\.3\.(?:24|25)/);
assert.match(home, /more-games-icon-192\.png\?v=3\.3\.(?:24|25)/);
assert.match(css, /full rounded perimeter/i);
assert.match(css, /\.game-room-back-button/);
assert.match(css, /\.home-game-tile\.is-mega/);
assert.match(css, /\.home-game-tile\.is-poker/);
assert.match(css, /@keyframes poker-card-reveal/);
assert.match(css, /@keyframes poker-ambient-orbit-one/);
assert.match(css, /prefers-reduced-motion/);

console.log('3.3.24 icon-family + Back-to-Game-Room regression PASS');
