import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const css = read('client/src/index.css');
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const accountPanel = read('client/src/platform/accounts/AccountPanel.tsx');
const chat = read('client/src/platform/components/RoomChatPanel.tsx');
const activity = read('client/src/platform/components/GlobalGameActivity.tsx');
const results = read('client/src/platform/components/GameResultsScreen.tsx');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const poker = read('client/src/games/poker/PokerScreen.tsx');
const rail = read('client/src/games/mega-board/components/PlayerRail.tsx');
const board = read('client/src/games/mega-board/components/GameBoard.tsx');
const megaReport = read('client/src/games/mega-board/utils/gameReport.ts');
const megaServer = read('server/src/games/mega-board/utils/game-state.ts');
const pokerServer = read('server/src/games/poker/handlers.ts');
const whotServer = read('server/src/games/whot/handlers.ts');
const ludoServer = read('server/src/games/ludo/handlers.ts');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// WHOT seats are pulled safely below the top chrome and identity follows the burgundy card family.
assert.match(whot, /WHOT_ACCENT = GAME_BY_ID\["whot"\]\.accent/);
assert.match(catalog, /id: "whot"[\s\S]{0,220}accent: "#8b1e2d"/);
assert.match(whot, /whot344-opponents/);
assert.match(whot, /whot344-centre/);
assert.match(whot, /whot344-hand/);
assert.match(css, /\.whot-page[\s\S]{0,120}--game-accent:var\(--game-whot\)!important/);
assert.match(css, /\.whot344-table[\s\S]{0,500}#8b1e2d/);

// Mega pieces use the token itself, a softer even outline and no coloured token disc/dark selected shadow.
assert.match(rail, /style=\{\{ color: player\.colour \}\}/);
assert.match(board, /color:\s*player\.colour/);
assert.match(css, /\.player-rail-token[\s\S]*background:transparent !important/);
assert.match(css, /\.animated-board-token[\s\S]*background:transparent !important/);
assert.match(css, /drop-shadow\(\.72px 0 0 rgba\(0,0,0,\.88\)\)/);
assert.match(css, /\.animated-board-token\.is-current-token \{ box-shadow:none !important/);

// Shared chat remains room-wide and retains player/spectator access; later RCs may refine its presentation.
assert.match(chat, /room-chat-preview/);
assert.match(chat, /Players and spectators share this room chat/);
assert.match(chat, /room-chat:join/);
assert.match(chat, /room-chat:send/);
assert.match(css, /\.room-chat-shell/);
assert.match(css, /\.room-chat-trigger/);

// Poker blind roles use blue/yellow chip markers with transition motion.
assert.match(poker, /poker-blind-chip is-small-blind/);
assert.match(poker, /poker-blind-chip is-big-blind/);
assert.match(css, /\.poker-blind-chip\.is-small-blind \{ background:#facc15 !important; \}/);
assert.match(css, /\.poker-blind-chip\.is-big-blind \{ background:#3b82f6 !important; \}/);
assert.match(css, /@keyframes poker-chip-orbit-in/);

// Ludo, WHOT and finished Poker tables share the new results surface.
for (const source of [ludo, whot, poker]) assert.match(source, /GameResultsScreen/);
assert.match(results, /final results/);
assert.match(results, /Game report/);
assert.match(results, /Back to Game Room/);
assert.match(catalog, /id: "ludo", name: "Ludo"/);
assert.match(catalog, /id: "blackjack", name: "Blackjack"/);

// Site-wide finish notices are emitted from active server modules and surfaced globally.
for (const source of [megaServer, pokerServer, whotServer, ludoServer]) assert.match(source, /platform:game-finished/);
assert.match(activity, /platform:game-finished/);
assert.match(activity, /halieus-game-activity-v1/);
assert.match(accountPanel, /accounts\/me\/stats/);

// Mega Board metadata/report vocabulary now matches the other game modules.
assert.match(app, /<small>Time<\/small><strong>\{localClock\.toLocaleTimeString/);
assert.match(app, /connectionStatus/);
assert.match(megaReport, /HALIEUS GAME ROOM — MEGA BOARD MATCH REPORT/);
assert.match(megaReport, /`App version: \$\{(?:packageInfo\.version|APP_VERSION)\}`/);
assert.match(megaReport, /`Exported:/);
assert.match(megaReport, /`Duration:/);

// Menu row geometry receives the same height/radius baseline.
assert.match(css, /\.game-menu-modal \.menu-action \{ min-height:58px !important/);

console.log('RC 3.3.44 polish/results/activity regression checks passed.');
