import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const whotTypes = read('shared/games/whot/types.ts');
const whotServer = read('server/src/games/whot/handlers.ts');
const megaBoard = read('client/src/games/mega-board/components/GameBoard.tsx');
const liveTrade = read('client/src/games/mega-board/components/LiveTradeOverlay.tsx');
const tradePanel = read('client/src/games/mega-board/components/TradePanel.tsx');
const pokerTypes = read('server/src/games/poker/types.ts');
const pokerEngine = read('server/src/games/poker/engine.ts');
const pokerScreen = read('client/src/games/poker/PokerScreen.tsx');
const css = read('client/src/index.css');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// WHOT: physical-seat table, seat-aware dealing/draw motion and same-seat Autopilot.
assert.match(whotTypes, /autopilotEnabled: boolean/);
assert.match(whotServer, /whot:set-autopilot/);
assert.match(whotServer, /\(!player\.isAi && !player\.autopilotEnabled\)/);
assert.match(whotServer, /playerIsAi: ai\.isAi, action: "draw"/);
assert.match(whot, /whot344-opponents/);
assert.match(whot, /whot344-player/);
assert.match(whot, /whot344-centre/);
assert.match(whot, /whot344-hand/);
assert.match(whot, /AutopilotControl compact/);
assert.match(app, /whot:set-autopilot/);
assert.match(css, /3\.3\.39[^\n]*WHOT table seating/);

// Mega Board: scroll-safe lobby, rounded/clickable board spaces and cleaner trade presentation.
assert.match(megaBoard, /getBoardSpaceInfo/);
for (const label of ['Auction', 'Chance', 'Community Chest', 'Bank Deposit', 'GO', 'Go To Jail']) {
  assert.match(megaBoard, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}
assert.match(megaBoard, /space\.type === "tax"/);
assert.match(megaBoard, /board-space-info-layer/);
assert.match(liveTrade, /model\.proposerId === viewerPlayerId/);
assert.match(tradePanel, /mega-trade-recipient-grid/);
assert.match(tradePanel, /mega-trade-offer-grid/);
assert.match(css, /\.modern-player-list-v2/);
assert.match(css, /max-height:/);
assert.ok(/border-radius: 18px/.test(css) || /board-space, \.board-space\.is-corner[\s\S]*border-radius: 0 !important/.test(css), 'Mega board geometry must reflect either the 3.3.39 rounded pass or its later square-space supersession.');

// Catalogue order and Blackjack identity correction.
assert.ok(catalog.indexOf('id: "whot"') < catalog.indexOf('id: "blackjack"'), 'WHOT must appear above Blackjack in the catalogue.');
assert.match(catalog, /icon: "\/game-icons\/blackjack\.svg"/);
assert.match(catalog, /id: "ludo", name: "Ludo"/);
assert.match(catalog, /id: "blackjack", name: "Blackjack"/);

// Poker: variant state exists, while non-Hold'em engines remain visibly staged/disabled.
assert.match(pokerTypes, /PokerVariant = "texas-holdem" \| "omaha" \| "five-card-draw" \| "seven-card-stud"/);
assert.match(pokerTypes, /variant: PokerVariant/);
assert.match(pokerEngine, /variant: PokerVariant/);
assert.match(pokerScreen, /poker-variant-roadmap/);
assert.match(home, /Texas Hold’em/);
assert.match(home, /Omaha <i>Coming soon<\/i>/);
assert.match(home, /Five-Card Draw <i>Planned<\/i>/);
assert.doesNotMatch(home, /onPokerVariantChange\("omaha"\)/);
assert.match(app, /variant: pokerVariant/);

console.log('RC 3.3.39 regression checks passed.');
