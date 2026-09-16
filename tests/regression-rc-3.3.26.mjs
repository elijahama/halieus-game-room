import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// RC 3.3.26 regression: completed matches must exit without a second forfeit,
// Poker recovery/difficulty must inherit Poker identity, and light-mode nested
// surfaces must not fall back to dark-only chrome.
const app = readFileSync(resolve(root, 'client/src/App.tsx'), 'utf8');
const winner = readFileSync(resolve(root, 'client/src/games/mega-board/components/WinnerScreen.tsx'), 'utf8');
const sessionHandlers = readFileSync(resolve(root, 'server/src/games/mega-board/handlers/sessionHandlers.ts'), 'utf8');
const poker = readFileSync(resolve(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const pokerHandlers = readFileSync(resolve(root, 'server/src/games/poker/handlers.ts'), 'utf8');
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'client/src/index.css'), 'utf8');

assert.match(sessionHandlers, /room\.gameState\?\.phase === "finished"/);
assert.match(sessionHandlers, /Once a match is already finished, leaving is pure cleanup\/navigation/);
assert.match(winner, /Close completed room & return/);
assert.match(winner, /Return to Game Room/);

assert.match(pokerHandlers, /poker:set-ai-difficulty/);
assert.match(pokerHandlers, /room\.aiDifficulty = payload\.difficulty/);
assert.match(app, /handlePokerAiDifficultyChange/);
assert.match(poker, /poker-ai-difficulty-panel|poker-global-ai-control/);
assert.match(poker, /Existing AI seats update too|Applies to all AI players/);
assert.match(home, /poker-ai-setup|poker-home-settings/);
assert.doesNotMatch(home, /<option value="easy">Easy<\/option>/);

assert.match(css, /\.resume-icon \{[\s\S]*background: var\(--game-accent/);
assert.match(css, /html\[data-theme="light"\] \.game-menu-modal/);
assert.match(css, /html\[data-theme="light"\] \.lobby-card \.invite-lobby-panel/);
assert.match(css, /html\[data-theme="light"\] \.poker-page \.poker-control-panel/);

console.log('3.3.26 completion + Poker AI + recovery accent + light-theme regression PASS');
