import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const css = read('client/src/index.css');
const chat = read('client/src/platform/components/RoomChatPanel.tsx');
const results = read('client/src/platform/components/GameResultsScreen.tsx');
const globalActivity = read('client/src/platform/components/GlobalGameActivity.tsx');
const activityContract = read('shared/platform/game-activity.ts');
const megaState = read('server/src/games/mega-board/utils/game-state.ts');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const poker = read('client/src/games/poker/PokerScreen.tsx');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// The 27 Aug live playtest becomes the patch input: room activity is persistent
// inside the spare/control column and may still be collapsed by the viewer.
assert.match(chat, /embedded\?: boolean/);
assert.match(chat, /defaultOpen = embedded/);
assert.match(chat, /game-\$\{game\}/);
assert.match(app, /<RoomChatPanel embedded game="ludo"/);
assert.match(app, /<RoomChatPanel embedded game="whot"/);
assert.match(app, /<RoomChatPanel embedded game="poker"/);
assert.match(css, /\.room-chat-shell\.is-embedded[\s\S]*position:relative !important/);

// WHOT no longer carries a purple library perimeter and follows the Poker-style
// table + right control/activity column composition.
assert.match(css, /\.home-game-tile\.is-whot \{[\s\S]*#8b1e2d/);
assert.match(css, /\.home-game-tile\.is-whot\.is-active[\s\S]*#a73547/);
assert.match(css, /\.whot344-live[\s\S]{0,220}width:min\(1500px,100%\)/);
assert.match(whot, /className="whot344-activity"/);
assert.match(whot, /\{roomActivity\}/);

// Poker uses the same shared chrome without a game-specific positional override,
// and the old large report/status tail is replaced by the live room panel slot.
assert.match(poker, /className="poker-game-chrome"/);
assert.doesNotMatch(css, /\.poker-game-chrome\s*\{[^}]*top:/);
assert.match(poker, /className="poker-room-panel-slot"/);
assert.doesNotMatch(poker, /poker-report-inline/);

// Ludo preserves board geometry while the side stack owns status + room activity.
assert.match(ludo, /className="ludo-side-stack"/);
assert.match(css, /\.ludo-side-stack[\s\S]*grid-template-rows:auto minmax\(0,1fr\)/);

// Non-Mega games inherit the full Mega-style ceremony rather than the old thin
// result card: confetti, trophy hero and Results / Statistics / Awards tabs.
assert.match(results, /confetti-layer halieus-results-confetti/);
assert.match(results, /winner-trophy winner-trophy-animation/);
assert.match(results, />🏆 Results</);
assert.match(results, />📊 Stats</);
assert.match(results, />⭐ Awards</);
assert.match(results, /halieus-results-podium/);
assert.match(results, /results-footer/);

// Background completion notices carry an authoritative server-owned result
// snapshot, so leaving the room cannot freeze the eventual result at old state.
assert.match(activityContract, /HalieusFinishedResultSnapshot/);
assert.match(activityContract, /result\?: HalieusFinishedResultSnapshot/);
assert.match(megaState, /const finalRows = gameState\.players/);
assert.match(megaState, /result: \{/);
assert.match(megaState, /awards: finalAwards/);
assert.match(globalActivity, /notice\.result\.rows\.slice\(0, 3\)/);
assert.match(css, /\.halieus-global-finish-notice\.has-result-snapshot/);

console.log('RC 3.3.46 live-playtest correction regression checks passed.');
