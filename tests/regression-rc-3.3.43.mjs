import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const css = read('client/src/index.css');
const poker = read('client/src/games/poker/PokerScreen.tsx');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const ludoTypes = read('shared/games/ludo/types.ts');
const ludoServer = read('server/src/games/ludo/handlers.ts');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const chatClient = read('client/src/platform/components/RoomChatPanel.tsx');
const chatServer = read('server/src/platform/roomChat.ts');
const timeMeta = read('client/src/platform/components/RoomTimeMeta.tsx');
const token = read('client/src/games/mega-board/components/MegaTokenGlyph.tsx');
const rail = read('client/src/games/mega-board/components/PlayerRail.tsx');
const board = read('client/src/games/mega-board/components/GameBoard.tsx');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Shared room chat is server-owned and mounted for every current playable room family.
assert.match(chatServer, /room-chat:join/);
assert.match(chatServer, /room-chat:send/);
assert.match(chatServer, /MAX_MESSAGES = 120/);
assert.match(chatServer, /MAX_MESSAGE_LENGTH = 500/);
for (const game of ['mega-board','poker','blackjack','whot','ludo']) assert.match(chatClient + app, new RegExp(game.replace('-', '\\-')));
assert.match(chatClient, /senderRole/);
assert.match(chatClient, /Spectator/i);

// Room time metadata exposes both live duration and actual clock time.
assert.match(timeMeta, /Duration/);
assert.match(timeMeta, />Time <strong>/);
for (const game of ['poker','whot','ludo','blackjack']) {
  assert.match(read(`client/src/games/${game === 'blackjack' ? 'blackjack/BlackjackScreen.tsx' : game === 'whot' ? 'whot/WhotScreen.tsx' : game === 'ludo' ? 'ludo/LudoScreen.tsx' : 'poker/PokerScreen.tsx'}`), /RoomTimeMeta/);
}

// Mega token visuals: actual one-wheel barrow, black silhouette in picker/rail/board, and tighter long labels.
assert.match(token, /WheelbarrowIcon/);
assert.match(token, /<circle cx="17" cy="50" r="7"/);
assert.doesNotMatch(token, /🛒/);
assert.match(rail, /MegaTokenGlyph/);
assert.match(board, /MegaTokenGlyph/);
assert.match(board, /space\.name\.length >= 20/);
assert.match(css, /\.mega-token-glyph[\s\S]*drop-shadow\(1\.35px 0 0 #050505\)/);

// Poker presentation rotates seats around the viewer and keeps the ring inside the felt/sidebar boundary.
assert.match(poker, /anchorSeat = !state\.isSpectator && viewer \? viewer\.seat : 0/);
assert.match(poker, /\(player\.seat - anchorSeat \+ 8\) % 8/);
assert.match(css, /\.poker-seat-2 \{ left:2\.5% !important; top:41% !important; \}/);
assert.match(css, /\.poker-seat-6 \{ right:2\.5% !important; top:41% !important; \}/);

// WHOT uses a recognisable original ivory/burgundy geometric card language.
assert.match(whot, /whot-card-authentic/);
assert.match(css, /--whot-ink:#7b1828/);
for (const shape of ['circle','square','triangle','star','cross']) assert.match(css, new RegExp(`shape-${shape}`));
assert.match(css, /\.whot-motion-card\.is-back,[\s\S]*#721a2c/);

// Ludo now rolls for starting order and ties reroll; centre colour wedges match the finish directions.
assert.match(ludoTypes, /"ordering"/);
assert.match(ludoTypes, /orderRoll/);
assert.match(ludoServer, /function rollForOrder/);
assert.match(ludoServer, /Tie on \$\{highest\}/);
assert.match(ludoServer, /room\.phase = "playing"/);
assert.match(ludo, /Roll for order/);
assert.match(css, /\.ludo-home-centre i\.red \{ grid-row:2; grid-column:1; \}/);
assert.match(css, /\.ludo-home-centre i\.green \{ grid-row:1; grid-column:1; \}/);

// Game setup primary controls consistently inherit module accents instead of hard-coded Mega green.
assert.match(css, /\.home-shell \.button-primary,[\s\S]*var\(--game-accent\)/);
assert.match(css, /\.home-shell \.match-tabs button\.active[\s\S]*var\(--game-accent\)/);

console.log('RC 3.3.43 full-patch regression checks passed.');
