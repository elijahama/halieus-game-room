import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

const displayVersion=read('VERSION').trim();
assert.match(displayVersion,/^(?:3\.7\.0[j-l]|4\.\d+\.\d+)$/);
const npmVersion=displayVersion.replace(/^(\d+\.\d+\.\d+)([a-z])$/,'$1-$2');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,npmVersion,`${file} version mismatch`);
}
const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0i\.mjs.*regression-3\.7\.0j\.mjs/s,'Regression chain must preserve 3.7.0i before 3.7.0j');

const rules=read('shared/games/mega-board/game-rules.ts');
assert.match(rules,/TURN_ROLL_AUTOPILOT_DURATION_MS = 45_000/,'Standard Mega Board roll window must remain 45 seconds');
assert.match(rules,/BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS = 150_000/,'Blitz roll window must be 2 minutes 30 seconds');
assert.match(rules,/OPTIONAL_ACTION_DURATION_MS = 150_000/,'Existing optional-action window must remain 2 minutes 30 seconds');

const gameState=read('server/src/games/mega-board/utils/game-state.ts');
assert.match(gameState,/BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS/,'Blitz timer constant must be consumed by authoritative server state');
assert.match(gameState,/if \(gameState\.blitz\) \{[\s\S]*?Date\.now\(\) \+ BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS/,'Only Blitz must receive the 150-second roll deadline');
assert.match(gameState,/Date\.now\(\) \+ TURN_ROLL_AUTOPILOT_DURATION_MS/,'Normal modes must retain their existing roll deadline');

console.log('Halieus Game Room 3.7.0j Blitz 2:30 turn-timer regression: PASS');
