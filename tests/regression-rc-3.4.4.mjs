import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const rootPkg = JSON.parse(read('package.json'));
const catalog = read('client/src/platform/games/catalog.ts');
const home = read('client/src/platform/components/HomeScreen.tsx');
const css = read('client/src/index.css');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const whotServer = read('server/src/games/whot/handlers.ts');
const cfTypes = read('shared/games/connect-four/types.ts');
const cfServer = read('server/src/games/connect-four/handlers.ts');
const cfClient = read('client/src/games/connect-four/ConnectFourScreen.tsx');
const pokerIcon = read('client/public/game-icons/poker.svg');
const connectIcon = read('client/public/game-icons/connect-four.svg');
const appIcon = read('client/public/app-icon.svg');
const lobby = read('client/src/games/mega-board/components/LobbyScreen.tsx');
const turnOrder = read('client/src/games/mega-board/components/TurnOrderScreen.tsx');
const winner = read('client/src/games/mega-board/components/WinnerScreen.tsx');
const invite = read('client/src/games/mega-board/components/InviteJoinScreen.tsx');
const serverIndex = read('server/src/index.ts');
const pokerServer = read('server/src/games/poker/handlers.ts');
const blackjackServer = read('server/src/games/blackjack/handlers.ts');
const ludoServer = read('server/src/games/ludo/handlers.ts');
const hiddenServer = read('server/src/games/hidden-dictator/handlers.ts');

assert.match(rootPkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Catalogue is deliberately grouped rather than a flat undifferentiated list.
assert.match(catalog, /export type GameCategory = "board" \| "cards" \| "social"/);
assert.match(catalog, /category: "board"/);
assert.match(catalog, /category: "cards"/);
assert.match(catalog, /category: "social"/);
assert.match(home, /Board & Strategy/);
assert.match(home, /Cards & Casino/);
assert.match(home, /Social & Party/);

// Poker keeps a clear P/card identity; exact suit placement was superseded by the approved 3.5.0 cleanup.
assert.match(pokerIcon, />P<\/text>/);
assert.ok((pokerIcon.match(/<rect/g) ?? []).length >= 3, 'Poker icon should retain overlapping playing cards');
assert.doesNotMatch(pokerIcon, />D<\/text>/);
assert.doesNotMatch(connectIcon, />4<\/text>/);

// The main Halieus mark is flush and does not re-introduce a white/light outline.
assert.match(appIcon, /stop-color="#f7c54a"/i);
assert.match(appIcon, /<rect[^>]*stroke="#b87300"/i);
assert.doesNotMatch(appIcon, /<rect[^>]*stroke="#(?:fff|f8|f9)|<rect[^>]*stroke="white/i);

// WHOT is a new 3.4.4 layout surface with eight-player support rather than the old seat geometry.
assert.match(whot, /whot344-live/);
assert.match(whot, /whot344-opponents/);
assert.match(whot, /whot344-centre/);
assert.match(whot, /whot344-local/);
assert.match(css, /\.whot344-opponents\s*\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/s);
assert.match(css, /\.whot344-hand\s*\{[^}]*overflow-x:auto/s);
assert.match(whotServer, /MAX_PLAYERS\s*=\s*8/);

// Connect Four is a match series with a visible drop animation and next-round lifecycle.
assert.match(cfTypes, /ConnectFourBestOf\s*=\s*1\s*\|\s*3\s*\|\s*5/);
assert.match(cfTypes, /seriesWins/);
assert.match(cfTypes, /roundHistory/);
assert.match(cfServer, /connect-four:next-round/);
assert.match(cfServer, /phase\s*!==\s*"round-over"/);
assert.match(cfClient, /Best of \{state\.bestOf\}/);
assert.match(cfClient, /is-last-drop/);
assert.match(css, /@keyframes connect344-drop/);

// Blackjack hands use flexible/fanned card presentation instead of fixed boxes that overflow.
assert.match(css, /blackjack.*hand|blackjack-hand/is);
assert.match(css, /margin-left:\s*clamp\(-/);

// Ambient motifs visibly animate, and theme changes are intentionally slower than the previous flash.
assert.match(css, /@keyframes halieus344-float/);
assert.match(css, /animation-name:halieus344-float/);
assert.match(css, /transition-duration:\s*680ms\s*!important/);

// Mega Board no longer carries a duplicate floating Light/Dark button in these core game screens.
for (const [name, source] of [['Lobby', lobby], ['Turn order', turnOrder], ['Winner', winner], ['Invite', invite]]) {
  assert.doesNotMatch(source, /<ThemeButton|import\s+ThemeButton/, `${name} still embeds ThemeButton`);
}

// Admin live-room count is connection-aware instead of counting dormant recoverable room objects.
assert.match(serverIndex, /getMegaBoardLiveRoomCount[\s\S]*player\.isConnected/);
for (const [name, source] of [['Poker', pokerServer], ['Blackjack', blackjackServer], ['WHOT', whotServer], ['Ludo', ludoServer], ['Hidden Dictator', hiddenServer], ['Connect Four', cfServer]]) {
  assert.match(source, /isConnected[\s\S]*spectators\.size\s*>\s*0|spectators\.size\s*>\s*0[\s\S]*isConnected/, `${name} live-room count is not connection-aware`);
}

console.log('RC 3.4.4 layout/icon/series/theme/live-room regression passed.');
