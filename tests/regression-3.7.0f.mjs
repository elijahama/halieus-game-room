import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

const displayVersion=read('VERSION').trim();
assert.match(displayVersion,/^(?:3\.7\.0[f-l]|4\.\d+\.\d+)$/);
const npmVersion=displayVersion.replace(/^(\d+\.\d+\.\d+)([a-z])$/,'$1-$2');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,npmVersion,`${file} version mismatch`);
}

const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0e\.mjs.*regression-3\.7\.0f\.mjs/s,'Regression chain must preserve 3.7.0e before 3.7.0f');

const deploy=read('tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(
  deploy,
  /if \(\$relative -match '\^server\/data\(\/\|\$\)' -and -not \$integrityFileSet\.ContainsKey\(\$relative\)\) \{ return \}/,
  'Oracle packer must exclude runtime server/data while allowing manifest-tracked static release data',
);
assert.match(deploy,/foreach \(\$releaseFile in @\(\$releaseManifest\.integrityFiles\)\)/,'Oracle packer must validate all release-integrity inputs before upload');
assert.equal((deploy.match(/if \(\$PackageOnly\)/g) ?? []).length,1,'Oracle deploy helper must contain exactly one package-only gate');
assert.equal((deploy.match(/\$target = "\$OracleUser@\$OracleHost"/g) ?? []).length,1,'Oracle deploy helper must not contain a duplicated deployment tail');

for (const file of ['server/data/word-board/SCOWL-COPYRIGHT.txt','server/data/word-board/scowl-en-us.dic']) {
  assert.ok(existsSync(new URL(`../${file}`,import.meta.url)),`${file} must ship in the owner workspace`);
}
const manifest=json('RELEASE.json');
assert.ok(manifest.integrityFiles.includes('server/data/word-board/SCOWL-COPYRIGHT.txt'),'SCOWL copyright must be a release-integrity input');
assert.ok(manifest.integrityFiles.includes('server/data/word-board/scowl-en-us.dic'),'SCOWL dictionary must be a release-integrity input');

console.log('Halieus Game Room 3.7.0f Oracle static-data packaging regression: PASS');
