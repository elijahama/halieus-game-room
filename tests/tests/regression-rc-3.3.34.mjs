import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('client/src/App.tsx');
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const intro = read('client/src/platform/components/HalieusIntro.tsx');
const accountPortal = read('client/src/platform/accounts/AccountPortal.tsx');
const css = read('client/src/index.css');
const blackjackClient = read('client/src/games/blackjack/BlackjackScreen.tsx');
const blackjackServer = read('server/src/games/blackjack/handlers.ts');
const blackjackTypes = read('shared/games/blackjack/types.ts');
const whotClient = read('client/src/games/whot/WhotScreen.tsx');
const whotServer = read('server/src/games/whot/handlers.ts');
const archive = read('server/src/platform/sessionArchive.ts');
const megaAi = read('server/src/games/mega-board/ai/ai-engine.ts');
const megaState = read('shared/games/mega-board/game-state.ts');

// Card-game modules remain real code paths. Later releases may promote staged Blackjack to a live selectable module.
assert.match(catalog, /id: "blackjack", name: "Blackjack"/);
assert.match(catalog, /icon: "\/game-icons\/blackjack\.svg"/);
assert.match(catalog, /id: "whot", name: "WHOT"/);
assert.match(catalog, /icon: "\/game-icons\/whot\.svg"/);
assert.match(app, /<BlackjackScreen/);
assert.match(app, /<WhotScreen/);
assert.match(blackjackServer, /registerBlackjackHandlers/);
assert.match(whotServer, /registerWhotHandlers/);
assert.match(blackjackTypes, /blackjackPayout/);

// Nigerian-oriented WHOT rule contract and deck/action engine.
for (const marker of ['Hold On', 'Pick Two', 'Pick Three', 'Suspension', 'General Market']) {
  assert.match(whotServer, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(whotServer, /for \(let index = 0; index < 5; index \+= 1\) deck\.push\(\{ id: `whot-20-/);
assert.match(whotServer, /starScoresDouble: true/);
assert.match(whotServer, /startingHandSize: 5/);
assert.match(whotClient, /Nigerian house-rules preset/);

// Session archive has canonical final records, local retry queue and real Drive destinations.
assert.match(archive, /dataRoot = getSessionDataDirectory\(\)/);
assert.match(archive, /upload-queue/);
assert.match(archive, /sessions-index\.ndjson/);
assert.match(archive, /1eDMQAe3pWWhVt4En-YaxmoLp61pV6Kzm/);
assert.match(archive, /1K0r04km_qSMpu0vaV1sAkmBz2kKU6iav_ZdFSKh99uQ/);
assert.match(archive, /pending-oauth/);
assert.match(blackjackServer, /finalizeSession\("blackjack"/);
assert.match(whotServer, /finalizeSession\("whot"/);
assert.match(blackjackServer, /"host-ended"/);
assert.match(whotServer, /"host-ended"/);

// Mega AI now evaluates opponents and logs inspectable reason codes.
assert.match(megaState, /aiDecisionLog: AiDecisionEvent\[\]/);
assert.match(megaAi, /opponentPressureForProperty/);
assert.match(megaAi, /monopolyDenialPremium/);
assert.match(megaAi, /OPPONENT_PRESSURE/);
assert.match(megaAi, /MONOPOLY_DENIAL/);

// H front door and organic ambience are shared platform features.
assert.match(app, /<AccountPortal/);
assert.match(accountPortal, /app-icon-192\.png\?v=[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?/);
assert.match(accountPortal, /Halieus Game Room/);
assert.match(accountPortal, /Sign in/);
assert.match(css, /@keyframes halieus-lava-a/);
assert.match(css, /@keyframes halieus-lava-b/);
assert.match(css, /prefers-reduced-motion: reduce/);

// Poker desktop/fullscreen is a single no-scroll viewport with no nested control scrollbar.
assert.match(css, /body:has\(\.poker-page\)[\s\S]*overflow: hidden !important/);
assert.match(css, /\.poker-page \{[\s\S]*height: 100dvh;[\s\S]*overflow: hidden !important/);
assert.match(css, /\.poker-control-panel \{[\s\S]*overflow: hidden !important/);

// Game menus must sit above all gameplay overlays and obscure the live UI.
assert.match(css, /z-index: 50000 !important/);
assert.match(css, /backdrop-filter: blur\(18px\)/);
assert.match(blackjackClient, /game-menu-top-layer/);
assert.match(whotClient, /game-menu-top-layer/);

console.log('RC 3.3.34 regression checks passed.');
