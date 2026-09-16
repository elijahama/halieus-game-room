import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const css = read('client/src/index.css');
const home = read('client/src/platform/components/HomeScreen.tsx');
const chat = read('client/src/platform/components/RoomChatPanel.tsx');
const time = read('client/src/platform/components/RoomTimeMeta.tsx');
const results = read('client/src/platform/components/GameResultsScreen.tsx');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const poker = read('client/src/games/poker/PokerScreen.tsx');
const gameStyles = read('client/src/games/mega-board/styles/gameStyles.ts');
for (const path of ['client/src/games/poker/utils/gameReport.ts','client/src/games/whot/utils/gameReport.ts','client/src/games/ludo/utils/gameReport.ts','client/src/games/blackjack/utils/gameReport.ts']) {
  const report = read(path);
  assert.match(report, /state\.startedAt \? formatDuration\(now - state\.startedAt\) : "0s"/);
  assert.doesNotMatch(report, /startedAt \?\? state\.createdAt/);
}

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Room activity is one shared Chat / Game Log / Spectators surface, not the superseded full-width chat strip.
assert.match(chat, />Chat\{/);
assert.match(chat, />Game Log</);
assert.match(chat, />Spectators <b>\{spectatorCount\}<\/b>/);
assert.match(chat, /gameLog\?: RoomActivityEntry\[\]/);
assert.match(app, /spectatorCount=\{ludoState\.spectatorCount\}/);
assert.match(app, /gameLog=\{whotState\.actionLog\.map/);
assert.match(app, /spectatorNames=\{spectators\.map/);
assert.match(css, /RC 3\.3\.45 — Phase 1A room activity foundation/);
assert.match(css, /right:14px !important/);

// Match duration begins only when actual gameplay starts; waiting-room age is not substituted.
assert.match(time, /const duration = started && startedAt \? now - startedAt : 0/);
assert.doesNotMatch(time, /startedAt \? startedAt : createdAt/);

// Casual is intentionally plain text. Ranked/Blitz retain distinguishing symbols.
assert.doesNotMatch(home, />[★♠] Casual</);
assert.match(home, />🏆 Ranked</);
assert.match(home, />⚡ Blitz</);
assert.doesNotMatch(whot, /"★ Casual"/);
assert.doesNotMatch(ludo, /"★ Casual"/);
assert.doesNotMatch(poker, /"♠ Casual"/);

// WHOT has no purple-era active chrome and uses a single physical-table composition.
assert.match(css, /\.whot-match-tabs button\.active[\s\S]*#8b1e2d/);
assert.match(css, /html\[data-theme="light"\] \.whot-mode-chip[\s\S]*#7b1828/);
assert.match(css, /\.whot-live-shell[\s\S]*grid-template-columns:minmax\(0,1fr\) !important/);
assert.match(css, /\.whot-status-panel \.whot-evidence-feed \{ display:none !important; \}/);

// Ludo desktop live play is viewport-contained so document scrolling cannot reflow piece placement.
assert.match(css, /\.ludo-page:has\(\.ludo-live-shell\)[\s\S]*overflow:hidden !important/);
assert.match(css, /\.ludo-live-shell[\s\S]*height:calc\(100dvh - 118px\) !important/);

// Mega active header and property typography use the shared Halieus visual language.
assert.match(app, /game-header card-game-header card-game-header-polished mega-active-header/);
assert.match(app, /GameBrandIcon game="mega-board" className="card-game-letter-token"/);
assert.match(gameStyles, /textTransform: "none"/);
assert.match(css, /\.board-space-name[\s\S]*text-transform:none !important/);

// Cross-game results can carry genuine game-specific stats and awards.
assert.match(results, /halieus-results-stats/);
assert.match(results, /halieus-awards-grid/);
assert.match(whot, /whot(?:ResultSummary|Results)/);
assert.match(ludo, /ludo(?:ResultSummary|Results)/);
assert.match(poker, /poker(?:ResultSummary|Results)/);

console.log('RC 3.3.45 staged room-activity/layout/results regression checks passed.');
