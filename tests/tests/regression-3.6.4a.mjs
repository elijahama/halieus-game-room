import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

assert.equal(read('VERSION').trim(), '3.6.4a');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.6.4-a', `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.4a"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.6.4-a');
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, '3.6.4-a', `package-lock ${workspace || 'root'} version mismatch`);

// Protected mature layouts/game implementations remain untouched by this safeguard.
const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'client/src/games/mega-board/components/GameBoard.tsx': '547f7f792202971153e47952205dfdb7d3cb32941872d7fc0b52defac367a0b6',
  'client/src/games/mega-board/components/PlayerRail.tsx': '97e70665e9930afb38e9f1b51317a6c3596c8b31f3b0a9da49303a81e9723c8d',
  'client/src/games/mega-board/styles/gameStyles.ts': '48fb45f725c5d296604c14e1c6f533f6205407457cf525fbce5eae931079d749',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

const rules = read('shared/games/mega-board/game-rules.ts');
assert.match(rules, /TURN_ROLL_AUTOPILOT_DURATION_MS = 45_000/);
const state = read('shared/games/mega-board/game-state.ts');
assert.match(state, /turnRollDeadline: number \| null/);
assert.match(state, /turnRollDeadlinePlayerId: PlayerId \| null/);

const gameStateUtil = read('server/src/games/mega-board/utils/game-state.ts');
assert.match(gameStateUtil, /function syncTurnRollDeadline/);
assert.match(gameStateUtil, /Date\.now\(\) \+ TURN_ROLL_AUTOPILOT_DURATION_MS/);
assert.match(gameStateUtil, /!currentPlayer\.autopilotEnabled/);
assert.match(gameStateUtil, /gameState\.turnRollDeadline = null/);

const ai = read('server/src/games/mega-board/ai/ai-engine.ts');
assert.match(ai, /handleExpiredHumanRollDeadline/);
assert.match(ai, /player\.autopilotEnabled = true/);
assert.match(ai, /Autopilot took over to keep the game moving/);
assert.match(ai, /scheduleDelay\(code, 900\)/);

const gameplay = read('server/src/games/mega-board/handlers/gameplayHandlers.ts');
assert.match(gameplay, /Autopilot is controlling this seat\. Take Control before rolling manually/);
const persistence = read('server/src/games/mega-board/utils/persistence.ts');
assert.match(persistence, /turnRollDeadline \?\?= null/);
assert.match(persistence, /turnRollDeadlinePlayerId \?\?= null/);

const app = read('client/src/App.tsx');
assert.match(app, /megaRollTimerSeconds/);
assert.match(app, /className={`mega-roll-timer/);
assert.match(app, /Roll timer/);
assert.match(app, /auto in/);
const css = read('client/src/index.css');
const patch = css.slice(css.lastIndexOf('3.6.4a — Mega Board anti-stall roll countdown'));
assert.ok(patch.length > 0, '3.6.4a CSS marker missing');
assert.match(patch, /\.mega-game-meta > span\.mega-roll-timer/);
assert.match(patch, /\.mega-roll-timer\.is-urgent/);
assert.doesNotMatch(patch, /\.ludo[-\w\s>.:#\[]*\{/i);
assert.doesNotMatch(patch, /\.poker[-\w\s>.:#\[]*\{/i);
assert.doesNotMatch(patch, /\bzoom\s*:/);
assert.doesNotMatch(patch, /transform\s*:\s*scale\(/);

// Letter-patch updater compatibility must continue to normalize display vs npm SemVer forms.
assert.match(read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1'), /Convert-HalieusVersionToNpm/);
assert.match(read('dev-tools/Oracle Quick Deploy/quick-install.sh'), /expectedPackageVersion/);
assert.match(read('start-background.ps1'), /Convert-HalieusVersionToNpm/);
assert.match(read('update-website.ps1'), /Compare-HalieusVersions/);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules','.release-backups','dist','.runtime','logs'].includes(name)) continue;
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else assert.ok(!/\.(key|pem|ppk|pub)$/i.test(name), `Credential-like file found: ${full}`);
  }
}
walk(root);
assert.equal(existsSync(resolve(root, 'OWNER SETUP CODE.txt')), false);

console.log('Halieus Game Room 3.6.4a Mega Board anti-stall regression: PASS');
