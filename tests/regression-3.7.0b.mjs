import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));
assert.match(read('VERSION').trim(),/^(?:3\.7\.0[b-z]|4\.0\.0)$/);
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) assert.match(json(file).version,/^(?:3\.7\.0-[b-z]|4\.0\.0)$/,`${file} version mismatch`);
for (const file of ['client/src/games/ayo/AyoScreen.tsx','client/src/games/word-board/WordBoardScreen.tsx']) {
  const source=read(file);
  assert.match(source,/onDownloadReport=\{\(\)=>\{/,'new result screens must provide the required report-download action');
  assert.match(source,/URL\.createObjectURL\(new Blob/,'report action must create a local downloadable game report');
}
console.log('Halieus Game Room 3.7.0b new-game results/typecheck hotfix regression: PASS');
