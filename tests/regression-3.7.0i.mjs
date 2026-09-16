import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

assert.match(read('VERSION').trim(),/^(?:3\.7\.0[i-l]|4\.0\.0)$/);
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version,/^(?:3\.7\.0-[i-l]|4\.0\.0)$/,`${file} version mismatch`);
}
const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0h\.mjs.*regression-3\.7\.0i\.mjs/s,'Regression chain must preserve 3.7.0h before 3.7.0i');

const classic=read('client/src/games/classic-table/ClassicTableScreen.tsx');
const classicFinishedChecks=classic.match(/state\.phase === \"finished\"/g)??[];
assert.equal(classicFinishedChecks.length,1,'Classic table must only branch on finished at the top-level results-screen boundary');
assert.doesNotMatch(classic,/classic-turn-banner[^\n]*state\.phase === \"finished\"/,'Live classic-table banner must not compare an already narrowed playing phase against finished');
assert.doesNotMatch(classic,/classic-finish/,'Classic live table must not duplicate the finished UI inside the non-finished branch');

const wordArena=read('client/src/games/word-arena/WordArenaScreen.tsx');
const wordFinishedChecks=wordArena.match(/state\.phase===\"finished\"/g)??[];
assert.equal(wordFinishedChecks.length,2,'Word Arena should retain only the leaderboard refresh check and top-level results-screen finished branch');
assert.doesNotMatch(wordArena,/word-arena-finish/,'Word Arena live stage must not duplicate the finished UI inside its non-finished branch');

console.log('Halieus Game Room 3.7.0i client phase-narrowing build regression: PASS');
