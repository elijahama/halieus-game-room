import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const css = read('client/src/index.css');
const results = read('client/src/platform/components/GameResultsScreen.tsx');
const poker = read('client/src/games/poker/PokerScreen.tsx');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const app = read('client/src/App.tsx');
const main = read('client/src/main.tsx');
const pokerTypes = read('server/src/games/poker/types.ts');
const pokerHandlers = read('server/src/games/poker/handlers.ts');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Full-screen victory ceremony uses the Mega Board finish architecture.
assert.match(results, /winner-sequence-layer is-winner/);
assert.match(results, /halieus-results-podium/);
assert.match(results, /halieus-final-results-grid/);
assert.match(results, /ResultsGraph/);
assert.match(results, /results-action-toggle/);
assert.match(results, /halieus-results-action-list/);
assert.match(results, />🏆 Results</);
assert.match(results, />📊 Stats</);
assert.match(results, />⭐ Awards</);
assert.match(css, /\.halieus-victory-stage \{[\s\S]*position:fixed !important/);
assert.match(css, /\.halieus-results-confetti \{[\s\S]*z-index:0 !important/);
assert.doesNotMatch(css, /halieus-results-confetti[^}]*z-index:-1/);
assert.match(css, /\.halieus-results-tabs \{[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);

// Poker no longer needs a one-off chrome offset and now exposes real telemetry.
assert.doesNotMatch(css, /\.poker-game-chrome\s*\{[^}]*top:/);
assert.match(pokerTypes, /PokerActionLogEntry/);
assert.match(pokerTypes, /actionLog: PokerActionLogEntry\[\]/);
assert.match(pokerHandlers, /appendPokerActionLog/);
assert.match(pokerHandlers, /actionLog: \(room\.actionLog \?\? \[\]\)\.slice/);
assert.match(app, /pokerState\.actionLog\.map/);
assert.match(poker, /Chip stacks through the match/);

// WHOT and Ludo ceremonies include game-specific graph + player action telemetry.
assert.match(whot, /Cards remaining through the round/);
assert.match(whot, /actions: state\.actionLog\.filter/);
assert.match(ludo, /Piece moves through the match/);
assert.match(ludo, /actions: state\.actionLog\.filter/);

// Every screenshot/browser session can identify the actual compiled client build.
assert.match(main, /document\.documentElement\.dataset\.halieusBuild = APP_VERSION/);
assert.match(main, /halieus-build-marker/);
assert.match(read('client/src/version.ts'), /export \{ APP_VERSION \} from/);
assert.match(css, /#halieus-build-marker/);

console.log('RC 3.3.47 full victory framework regression checks passed.');
