import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

assert.equal(read('VERSION').trim(), '3.6.5');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.6.5', `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.5"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.6.5');
for (const workspace of ['', 'client', 'server', 'shared', 'desktop']) {
  if (lock.packages?.[workspace]) assert.equal(lock.packages[workspace].version, '3.6.5', `package-lock ${workspace || 'root'} version mismatch`);
}

// Mature game surfaces remain protected during the Word Arena setup/AI patch.
const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'client/src/games/mega-board/components/GameBoard.tsx': '547f7f792202971153e47952205dfdb7d3cb32941872d7fc0b52defac367a0b6',
  'client/src/games/mega-board/components/PlayerRail.tsx': '97e70665e9930afb38e9f1b51317a6c3596c8b31f3b0a9da49303a81e9723c8d',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

const home = read('client/src/platform/components/HomeScreen.tsx');
// Word Game remains the already-approved simple solo-capable setup.
assert.match(home, /selectedWordArenaGame === "word-game" \? \{ matchMode: "casual", aiCount: 0, aiDifficulty: "normal", targetScore: 1 \}/);
assert.match(home, /selectedWordArenaGame === "word-game" && <div className="halieus-rule-note"><strong>Word Game<\/strong><small>1–8 players · six five-letter guesses · first solver wins the puzzle\.<\/small><\/div>/);
// Password + Anagrams Race expose real setup options.
assert.match(home, /selectedWordArenaGame === "password" \|\| selectedWordArenaGame === "anagrams-race"/);
assert.match(home, />Casual<\/button>/);
assert.match(home, />🏆 Ranked<\/button>/);
assert.match(home, />AI players<select/);
assert.match(home, />AI difficulty<select/);
assert.match(home, />Points to win<select/);
assert.match(home, /First to \{value\}/);
assert.match(home, /setWordArenaAiCount\(\(current\) => current === 0 \? 1 : current\)/);

const types = read('shared/games/word-arena/types.ts');
assert.match(types, /interface WordArenaCreateOptions[\s\S]*?matchMode:[\s\S]*?aiCount:[\s\S]*?aiDifficulty:[\s\S]*?targetScore:/);
assert.match(types, /isAi: boolean/);

const handlers = read('server/src/games/word-arena/handlers.ts');
assert.match(handlers, /createAiPlayers\(count:number,difficulty:WordArenaAiDifficulty/);
assert.match(handlers, /const aiCount=clampInt\(payload\?\.aiCount,0,maxPlayers-1,0\)/);
assert.match(handlers, /players:\[p,\.\.\.bots\]/);
assert.match(handlers, /Add an AI player or invite someone\./);
assert.match(handlers, /schedulePasswordAiClue/);
assert.match(handlers, /schedulePasswordAiGuess/);
assert.match(handlers, /scheduleAnagramAi/);
assert.match(handlers, /aiReactionDelay/);
assert.match(handlers, /aiSuccessChance/);

// Word Game icon geometry is symmetric inside its 96x96 badge.
const wordIcon = read('client/public/game-icons/word-game.svg');
assert.match(wordIcon, /viewBox="0 0 96 96"/);
assert.match(wordIcon, /<rect x="18" y="18" width="60" height="60"/);
assert.doesNotMatch(wordIcon, /transform=/);

const css = read('client/src/index.css');
const patch = css.slice(css.lastIndexOf('3.6.5 — Word Arena room options + owner modal height polish'));
assert.ok(patch.length > 0, '3.6.5 CSS marker missing');
assert.match(patch, /\.word-arena-create-settings[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(patch, /\.account-panel \{[\s\S]*?height: auto !important;[\s\S]*?max-height: calc\(100dvh - 32px\)/);
assert.doesNotMatch(patch, /zoom\s*:/);
assert.doesNotMatch(patch, /transform\s*:\s*scale\(/);

// Previous Mega Board fixes remain present.
assert.match(read('shared/games/mega-board/game-rules.ts'), /TURN_ROLL_AUTOPILOT_DURATION_MS = 45_000/);
assert.match(read('server/src/games/mega-board/ai/ai-engine.ts'), /handleExpiredHumanRollDeadline/);
assert.match(read('client/src/games/mega-board/styles/gameStyles.ts'), /depotButton:\s*\{[\s\S]*?background: "#2563eb"/);
assert.match(css, /\.trade-reject-all-button\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);

console.log('Halieus Game Room 3.6.5 Password/Anagrams AI + setup regression: PASS');
