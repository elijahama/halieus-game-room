import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const clientPkg = JSON.parse(read('client/package.json'));
const serverPkg = JSON.parse(read('server/package.json'));
const app = read('client/src/App.tsx');
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const css = read('client/src/index.css');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const ludoTypes = read('shared/games/ludo/types.ts');
const ludoServer = read('server/src/games/ludo/handlers.ts');
const megaState = read('shared/games/mega-board/game-state.ts');
const order = read('server/src/games/mega-board/handlers/orderHandlers.ts');
const turnOrder = read('client/src/games/mega-board/components/TurnOrderScreen.tsx');
const board = read('client/src/games/mega-board/components/GameBoard.tsx');
const tokenGlyph = read('client/src/games/mega-board/components/MegaTokenGlyph.tsx');
const poker = read('client/src/games/poker/PokerScreen.tsx');

for (const value of [pkg.version, clientPkg.version, serverPkg.version]) assert.equal(value, pkg.version, 'workspace versions should stay aligned');

// Casual/Ranked games own two columns and never reserve a fake Blitz slot.
assert.match(css, /\.match-tabs\.is-two-mode\{grid-template-columns:repeat\(2/);
assert.match(home, /aria-label="WHOT match type"/);
assert.match(home, /aria-label="Ludo match type"/);
assert.doesNotMatch(home.match(/aria-label="Ludo match type"[\s\S]{0,500}/)?.[0] ?? '', /Blitz/);

// Ludo mode is server-owned and finished pieces stay in their colour quadrant.
assert.match(ludoTypes, /export type LudoMatchMode = "casual" \| "ranked"/);
assert.match(ludoTypes, /matchMode: LudoMatchMode/);
assert.match(ludoServer, /matchMode: payload\?\.matchMode === "ranked" \? "ranked" : "casual"/);
assert.match(app, /matchMode: ludoMatchMode/);
assert.match(ludo, /FINISH_CELLS/);
assert.match(ludo, /return FINISH_CELLS\[player\.colour\]/);
assert.match(css, /@media \(max-width:1180px\)[\s\S]*\.ludo-turn-console \{ position:relative !important/);

// WHOT motion ends at a visible hand anchor derived from the same seat layout.
assert.match(whot, /function opponentCardTarget/);
assert.match(whot, /return opponentCardTarget\(index, opponents\.length\)/);
assert.match(whot, /whot344-mini-cards/);
assert.match(whot, /whot344-hand/);

// Mega Board restores classic square spaces and adds a real pre-roll piece picker.
assert.match(megaState, /tokenId: string/);
assert.match(order, /"game:set-token"/);
assert.match(order, /claimed\?\.isAi/);
assert.match(turnOrder, /Choose your piece/);
assert.match(app, /handleSelectMegaToken/);
assert.match(tokenGlyph, /"top-hat": "🎩"/);
assert.match(css, /\.board-space,\s*\.board-space\.is-corner \{ border-radius:0 !important/);

// Poker visual depth and moving D/SB/BB markers are present without changing Hold'em engine scope.
assert.match(poker, /poker-position-marker/);
assert.match(css, /\.poker-seat-0 \{ transform:translateX\(-50%\) scale\(1\.09\)/);
assert.match(css, /@keyframes poker-position-slide/);

// Game Room keeps a consistent branded icon family for every playable title.
for (const marker of ['mega-board.svg','poker.svg','whot.svg','ludo.svg','blackjack.svg']) assert.match(catalog, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
for (const id of ['mega-board','poker','whot','ludo','blackjack']) assert.match(catalog, new RegExp(`id: \"${id}\"`));

console.log('RC 3.3.41 batch-polish regression checks passed.');
