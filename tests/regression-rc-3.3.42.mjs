import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const css = read('client/src/index.css');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const megaState = read('shared/games/mega-board/game-state.ts');
const order = read('server/src/games/mega-board/handlers/orderHandlers.ts');
const turn = read('client/src/games/mega-board/components/TurnOrderScreen.tsx');
const board = read('client/src/games/mega-board/components/GameBoard.tsx');
const invite = read('client/src/platform/components/InviteLobbyPanel.tsx');
const lobby = read('client/src/games/mega-board/components/LobbyScreen.tsx');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Mega token set, board silhouette and long-label fitting.
for (const id of ['top-hat','car','ship','dog','cat','boot','thimble','wheelbarrow','t-rex','duck']) assert.match(turn + order, new RegExp(id));
assert.match(megaState, /wheelbarrow/);
assert.match(board, /board-token-glyph/);
assert.match(board, /space\.name\.length >= 14/);
assert.match(css, /\.board-token-glyph[\s\S]*drop-shadow/);

// Spectator links are real deep links, not a join-link label.
assert.match(invite, /spectatorPathPrefix/);
assert.match(invite, /Copy spectator link/);
assert.match(lobby, /spectatorPathPrefix="\/spectate\/mega"/);
assert.match(app, /readMegaSpectatorCodeFromPath/);
assert.match(app, /socket\.emit\("game:spectate"/);

// Poker centre keeps its translation while depth is applied.
assert.match(css, /\.poker-table-center[\s\S]*transform:translate\(-50%,-50%\) perspective\(900px\) rotateX\(1\.5deg\)/);
assert.match(css, /\.poker-seat-cards \{ justify-content:center; \}/);

// WHOT keeps a deliberate multi-opponent layout. The original fixed seat map was superseded by the 3.4.4 responsive table rebuild.
assert.ok(/const OPPONENT_LAYOUTS/.test(whot) || /whot344-opponents/.test(whot));
assert.ok(/OPPONENT_LAYOUTS/.test(whot) || /opponentSeat\(/.test(whot) || /whot344-player/.test(whot));

// Ludo turn console is structurally outside the board at all desktop widths.
assert.match(css, /\.ludo-table-wrap \{[\s\S]*display:flex !important[\s\S]*flex-direction:column !important/);
assert.match(css, /\.ludo-turn-console \{[\s\S]*position:relative !important/);

// The modern account home consumes the canonical playable catalogue instead of duplicating title metadata inline.
for (const id of ['mega-board','poker','whot','ludo','blackjack']) assert.match(catalog, new RegExp(`id: "${id}"`));
assert.match(home, /GAME_CATALOG/);

console.log('RC 3.3.42 reference-led polish regression checks passed.');
