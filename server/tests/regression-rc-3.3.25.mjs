import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// RC 3.3.25 regression: shared game chrome, theme scoping, Autopilot, audio isolation,
// current game-library palette, report wording and retired Cloudflare tooling must stay coherent.
const app = readFileSync(resolve(root, 'client/src/App.tsx'), 'utf8');
const poker = readFileSync(resolve(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const gameChrome = readFileSync(resolve(root, 'client/src/platform/components/GameChrome.tsx'), 'utf8');
const displaySettings = readFileSync(resolve(root, 'client/src/platform/components/DisplaySettingsPanel.tsx'), 'utf8');
const autopilot = readFileSync(resolve(root, 'client/src/platform/components/AutopilotControl.tsx'), 'utf8');
const soundHook = readFileSync(resolve(root, 'client/src/games/mega-board/hooks/useGameSound.ts'), 'utf8');
const pokerHandlers = readFileSync(resolve(root, 'server/src/games/poker/handlers.ts'), 'utf8');
const pokerTypes = readFileSync(resolve(root, 'server/src/games/poker/types.ts'), 'utf8');
const megaRules = readFileSync(resolve(root, 'server/src/games/mega-board/utils/mega-rules.ts'), 'utf8');
const report = readFileSync(resolve(root, 'client/src/games/mega-board/utils/gameReport.ts'), 'utf8');
const winner = readFileSync(resolve(root, 'client/src/games/mega-board/components/WinnerScreen.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'client/src/index.css'), 'utf8');
const indexHtml = readFileSync(resolve(root, 'client/index.html'), 'utf8');

assert.match(gameChrome, /Shared, intentionally-small in-game chrome/);
assert.match(gameChrome, /label="Game Room"/);
assert.match(gameChrome, />Menu</);
assert.match(displaySettings, /Display & sound/);
assert.match(app, /<GameChrome/);
assert.match(poker, /<GameChrome/);
assert.match(css, /Persistent game chrome intentionally exposes only navigation \+ Menu/);

assert.match(css, /html\[data-theme="light"\] \.poker-page/);
assert.match(css, /--poker-seat-surface: rgba\(255, 255, 255, \.96\)/);
assert.match(poker, /DisplaySettingsPanel/);

assert.match(autopilot, /same seat\/state/i);
assert.match(app, /AutopilotControl/);
assert.match(poker, /AutopilotControl/);
assert.match(pokerHandlers, /poker:set-autopilot/);
assert.match(pokerTypes, /autopilotEnabled: boolean/);

assert.match(app, /useGameSound\([\s\S]*Boolean\(!megaBoardParked && !pokerState && gameStarted\)/);
assert.match(soundHook, /activeRef/);
assert.match(soundHook, /timeoutIds/);
assert.match(soundHook, /contexts/);

assert.match(home, /blackjack-icon-192\.png\?v=3\.3\.25/);
assert.match(home, /whot-icon-192\.png\?v=3\.3\.25/);
assert.match(home, /more-games-icon-192\.png\?v=3\.3\.25/);
assert.match(css, /\.home-game-tile\.is-blackjack[\s\S]*rgba\(72, 143, 255, \.56\)/);
assert.match(css, /\.home-game-tile\.is-whot[\s\S]*rgba\(154, 91, 246, \.58\)/);
assert.match(css, /\.home-game-tile\.is-more[\s\S]*rgba\(45, 196, 190, \.52\)/);
for (const asset of ['blackjack-icon-192.png', 'whot-icon-192.png', 'more-games-icon-192.png']) {
  assert.ok(existsSync(resolve(root, 'client/public', asset)), `${asset} must exist`);
}

assert.match(report, /all 37 ownable assets shuffled indiscriminately, then dealt round-robin/);
assert.doesNotMatch(report, /assigned independently at random at game start/);
assert.match(winner, /dealt evenly by count with no value\/group balancing/);
assert.match(megaRules, /prevents duplicate activity\/report rows/);

assert.ok(!existsSync(resolve(root, 'tools/cloudflared.exe')), 'retired cloudflared.exe must not ship');
assert.ok(!existsSync(resolve(root, 'start-play-tunnel.ps1')), 'retired Cloudflare play tunnel script must not ship');
assert.ok(!existsSync(resolve(root, 'start-beta-tunnel.ps1')), 'retired Cloudflare beta tunnel script must not ship');
assert.doesNotMatch(indexHtml, /play\.halieus\.net|cloudflare/i);

console.log('3.3.25 shared chrome + theme + Autopilot + audio + cleanup regression PASS');
