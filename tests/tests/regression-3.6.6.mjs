import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

assert.equal(read('VERSION').trim(), '3.6.6');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.6.6', `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.6"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.6.6');
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, '3.6.6', `package-lock ${workspace || 'root'} version mismatch`);

const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'client/src/games/mega-board/components/GameBoard.tsx': '547f7f792202971153e47952205dfdb7d3cb32941872d7fc0b52defac367a0b6',
  'client/src/games/mega-board/components/PlayerRail.tsx': '97e70665e9930afb38e9f1b51317a6c3596c8b31f3b0a9da49303a81e9723c8d',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

const types = read('shared/games/word-arena/types.ts');
assert.match(types, /export type WordGameMode = "daily" \| "practice"/);
assert.match(types, /wordGameMode\?: WordGameMode/);
assert.match(types, /wordPuzzleKey: string \| null/);

const handlers = read('server/src/games/word-arena/handlers.ts');
assert.match(handlers, /function dailyPuzzleKey/);
assert.match(handlers, /function dailyWord/);
assert.match(handlers, /room\.wordGameMode==="daily"\?dailyWord\(\):randomWord\(WORDLE_WORDS\)/);
assert.match(handlers, /const maxPlayers=game==="word-game"\?1:8/);
assert.match(handlers, /const aiCount=game==="word-game"\?0:/);
assert.match(handlers, /Daily puzzle complete\. The answer was/);
assert.match(handlers, /maximumPlayers:game==="word-game"\?1:8/);

const accounts = read('server/src/platform/accounts.ts');
assert.match(accounts, /accounts\/word-game\/leaderboard/);
assert.match(accounts, /Only the first daily attempt counts/);
assert.match(accounts, /wordGameFriendIds/);
assert.match(accounts, /currentStreak/);
assert.match(accounts, /bestStreak/);

const screen = read('client/src/games/word-arena/WordArenaScreen.tsx');
assert.match(screen, /DAILY LEADERBOARD/);
assert.match(screen, />Today<\/button>/);
assert.match(screen, />Friends<\/button>/);
assert.match(screen, />All Time<\/button>/);
assert.match(screen, /Current streak/);
assert.match(screen, /Practice result — leaderboard unchanged/);
assert.match(screen, /Hide social/);
assert.match(screen, /Daily Puzzle/);

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /wordGameMode/);
assert.match(home, />Daily Puzzle<\/button>/);
assert.match(home, />Practice<\/button>/);
assert.match(home, /first completed attempt counts toward the leaderboard/);

const css = read('client/src/index.css');
const patch = css.slice(css.lastIndexOf('3.6.6 — Word Game daily leaderboard + larger solo composition'));
assert.ok(patch.length > 0, '3.6.6 CSS marker missing');
assert.match(patch, /grid-template-columns:minmax\(270px,300px\) minmax\(620px,1fr\) minmax\(250px,285px\)/);
assert.match(patch, /\.wordle-row span \{[\s\S]*?width:64px;[\s\S]*?height:64px;/);
assert.match(patch, /\.word-game-leaderboard-panel/);
assert.match(patch, /\.word-game-social-toggle/);
assert.doesNotMatch(patch, /zoom\s*:/);
assert.doesNotMatch(patch, /transform\s*:\s*scale\(/);

// Prior fixes remain present.
assert.match(read('shared/games/mega-board/game-rules.ts'), /TURN_ROLL_AUTOPILOT_DURATION_MS = 45_000/);
assert.match(read('client/src/games/mega-board/styles/gameStyles.ts'), /depotButton:\s*\{[\s\S]*?background: "#2563eb"/);
assert.match(css, /\.trade-reject-all-button\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);

console.log('Halieus Game Room 3.6.6 Word Game daily leaderboard regression: PASS');
