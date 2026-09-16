import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
const poker = fs.readFileSync(new URL('../client/src/games/poker/PokerScreen.tsx', import.meta.url), 'utf8');
const pokerTypes = fs.readFileSync(new URL('../client/src/games/poker/types.ts', import.meta.url), 'utf8');
const pokerHandlers = fs.readFileSync(new URL('../server/src/games/poker/handlers.ts', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../client/src/index.css', import.meta.url), 'utf8');
const megaLeaderboard = fs.readFileSync(new URL('../client/src/games/mega-board/components/LeaderboardModal.tsx', import.meta.url), 'utf8');
const pokerLeaderboard = fs.readFileSync(new URL('../client/src/games/poker/components/PokerLeaderboardModal.tsx', import.meta.url), 'utf8');

assert.match(app, /leftRailPlayers/);
assert.match(app, /rightRailPlayers/);
assert.match(app, /player-rail-side-right mega-live-player-rail/);
assert.doesNotMatch(app, /players=\{liveRailPlayers\}/);
assert.match(css, /mega-live-layout-v3/);
assert.match(css, /grid-template-columns:\s*minmax\(195px, 235px\) minmax\(0, 1fr\) minmax\(195px, 235px\)/);

assert.match(pokerTypes, /PokerAutopilotMode = "off" \| "semi" \| "full"/);
assert.match(poker, /Semi Auto/);
assert.match(poker, /Full Auto/);
assert.match(poker, /Take Control/);
assert.match(pokerHandlers, /autopilotMode === "semi"/);
assert.match(pokerHandlers, /latestHost\.autopilotMode !== "full"/);
assert.match(pokerHandlers, /startNextHand\(latest\)/);

assert.match(megaLeaderboard, /leaderboard-empty-state/);
assert.match(pokerLeaderboard, /leaderboard-empty-state/);
assert.match(pokerLeaderboard, /leaderboard-header-actions/);
assert.match(css, /\.leaderboard-calibration-note/);

assert.match(css, /\.poker-game-shell \{[\s\S]*max-width: none/);
assert.match(css, /\.poker-lobby-shell \{[\s\S]*width: min\(1680px, 100%\)/);
assert.match(poker, /<h2 id="poker-game-menu-title">Game menu<\/h2>/);

console.log('RC 3.3.33 regression checks passed.');
