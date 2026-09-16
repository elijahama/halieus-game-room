import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));
assert.equal(read('VERSION').trim(),'3.7.0b');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) assert.equal(json(file).version,'3.7.0-b',`${file} version mismatch`);
for (const file of ['client/src/games/ayo/AyoScreen.tsx','client/src/games/word-board/WordBoardScreen.tsx']) {
  const source=read(file);
  assert.match(source,/onDownloadReport=\{\(\)=>\{/,'new result screens must provide the required report-download action');
  assert.match(source,/URL\.createObjectURL\(new Blob/,'report action must create a local downloadable game report');
}
console.log('Halieus Game Room 3.7.0b new-game results/typecheck hotfix regression: PASS');
