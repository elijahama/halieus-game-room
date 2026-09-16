import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

assert.match(read('VERSION').trim(),/^(?:3\.7\.0[f-l]|4\.0\.0)$/);
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version,/^(?:3\.7\.0-[f-l]|4\.0\.0)$/,`${file} version mismatch`);
}

const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0e\.mjs.*regression-3\.7\.0f\.mjs/s,'Regression chain must preserve 3.7.0e before 3.7.0f');

const deploy=read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(
  deploy,
  /if \(\$relative -match '\^server\/data\(\/\|\$\)' -and -not \$integrityFileSet\.ContainsKey\(\$relative\)\) \{ return \}/,
  'Oracle packer must exclude runtime server/data while allowing manifest-tracked static release data',
);
assert.match(deploy,/foreach \(\$releaseFile in @\(\$releaseManifest\.integrityFiles\)\)/,'Oracle packer must validate all release-integrity inputs before upload');

for (const file of ['server/data/word-board/SCOWL-COPYRIGHT.txt','server/data/word-board/scowl-en-us.dic']) {
  assert.ok(existsSync(new URL(`../${file}`,import.meta.url)),`${file} must ship in the owner workspace`);
}
const manifest=json('RELEASE.json');
assert.ok(manifest.integrityFiles.includes('server/data/word-board/SCOWL-COPYRIGHT.txt'),'SCOWL copyright must be a release-integrity input');
assert.ok(manifest.integrityFiles.includes('server/data/word-board/scowl-en-us.dic'),'SCOWL dictionary must be a release-integrity input');

console.log('Halieus Game Room 3.7.0f Oracle static-data packaging regression: PASS');
