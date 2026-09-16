import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const app = readFileSync(resolve(root, 'client/src/App.tsx'), 'utf8');
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const invite = readFileSync(resolve(root, 'client/src/platform/components/InviteLobbyPanel.tsx'), 'utf8');
const megaLobby = readFileSync(resolve(root, 'client/src/games/mega-board/components/LobbyScreen.tsx'), 'utf8');
const poker = readFileSync(resolve(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const pokerClientTypes = readFileSync(resolve(root, 'client/src/games/poker/types.ts'), 'utf8');
const pokerServerTypes = readFileSync(resolve(root, 'server/src/games/poker/types.ts'), 'utf8');
const pokerEngine = readFileSync(resolve(root, 'server/src/games/poker/engine.ts'), 'utf8');
const pokerHandlers = readFileSync(resolve(root, 'server/src/games/poker/handlers.ts'), 'utf8');
const css = readFileSync(resolve(root, 'client/src/index.css'), 'utf8');

// One reusable invite component must serve Mega Board and Poker with game-specific routes/branding.
assert.match(invite, /gameTitle: string/);
assert.match(invite, /invitePathPrefix: string/);
assert.match(invite, /Join my \$\{gameTitle\} room in Halieus Game Room/);
assert.match(megaLobby, /invitePathPrefix="\/join"/);
assert.match(megaLobby, /gameTitle="Mega Board"/);
assert.match(poker, /invitePathPrefix="\/poker"/);
assert.match(poker, /gameTitle="Poker"/);
assert.match(poker, /Invite players/);

// Poker invite URLs must load Poker and preserve the invited room code for a guest without a saved session.
assert.match(app, /readMegaSpectatorCodeFromPath\(\)[\s\S]*readPokerCodeFromPath\(\)[\s\S]*readLudoCodeFromPath\(\)[\s\S]*readHiddenDictatorCodeFromPath\(\)[\s\S]*readConnectFourCodeFromPath\(\)[\s\S]*generateRoomCode\(\)/);
assert.match(app, /Poker invite ready\. Enter your name and join the waiting room\./);

// Poker Ranked is authoritative room state, not a decorative client-only tab.
assert.match(home, /pokerMatchMode === "ranked"/);
assert.match(home, /🏆 Ranked/);
assert.match(app, /matchMode: pokerMatchMode/);
assert.match(pokerServerTypes, /PokerMatchMode = "casual" \| "ranked"/);
assert.match(pokerServerTypes, /matchMode: PokerMatchMode/);
assert.match(pokerClientTypes, /matchMode: PokerMatchMode/);
assert.match(pokerHandlers, /normaliseMatchMode/);
assert.match(pokerHandlers, /matchMode: room\.matchMode/);
assert.match(pokerEngine, /matchMode: PokerMatchMode/);
assert.match(poker, /state\.matchMode === "ranked"/);

// Invite redesign must use the compact shared composition and Poker-specific modal/strip.
assert.match(css, /\.invite-lobby-panel-redesigned/);
assert.match(css, /\.invite-panel-heading/);
assert.match(css, /\.poker-lobby-invite-strip/);
assert.match(css, /\.poker-invite-modal/);
assert.match(css, /\.poker-match-tabs \{[\s\S]*grid-template-columns: repeat\(2/);

console.log('3.3.27 shared invites + Mega invite redesign + Poker Ranked regression PASS');
