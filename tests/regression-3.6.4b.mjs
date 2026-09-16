import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

assert.equal(read('VERSION').trim(), '3.6.4b');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.6.4-b', `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.4b"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.6.4-b');
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, '3.6.4-b', `package-lock ${workspace || 'root'} version mismatch`);

// Protected gameplay/board surfaces stay untouched in this UI-only patch.
const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'client/src/games/mega-board/components/GameBoard.tsx': '547f7f792202971153e47952205dfdb7d3cb32941872d7fc0b52defac367a0b6',
  'client/src/games/mega-board/components/PlayerRail.tsx': '97e70665e9930afb38e9f1b51317a6c3596c8b31f3b0a9da49303a81e9723c8d',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

const propertyPanel = read('client/src/games/mega-board/components/PropertyManagementPanel.tsx');
assert.match(propertyPanel, /hasDepot \? "is-sell" : "is-depot"/);
const assetPanel = read('client/src/games/mega-board/components/AssetManagementPanel.tsx');
assert.match(assetPanel, /styles\.depotButton/);
const styles = read('client/src/games/mega-board/styles/gameStyles.ts');
assert.match(styles, /depotButton:\s*\{/);
assert.match(styles, /background: "#2563eb"/);

const css = read('client/src/index.css');
const patch = css.slice(css.lastIndexOf('3.6.4b — Mega Board action clarity'));
assert.ok(patch.length > 0, '3.6.4b CSS marker missing');
assert.match(css, /\.property-build-action\.is-depot\s*\{[\s\S]*?background:\s*#2563eb/);
assert.match(patch, /\.trade-reject-all-button\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
assert.match(patch, /width:\s*100%/);
assert.match(patch, /min-height:\s*36px/);
assert.doesNotMatch(patch, /zoom\s*:/);
assert.doesNotMatch(patch, /transform\s*:\s*scale\(/);

// Anti-stall safeguard from 3.6.4a must remain present.
assert.match(read('shared/games/mega-board/game-rules.ts'), /TURN_ROLL_AUTOPILOT_DURATION_MS = 45_000/);
assert.match(read('server/src/games/mega-board/ai/ai-engine.ts'), /handleExpiredHumanRollDeadline/);

console.log('Halieus Game Room 3.6.4b Mega Board action-clarity regression: PASS');
