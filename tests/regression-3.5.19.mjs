import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 19, '3.5.19 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const updater = read('update-website.ps1');
assert.doesNotMatch(updater, /return\s+@\(\$(?:items|results)\)/, 'Windows PowerShell 5.1 must not receive generic List<T> through @($list)');
assert.match(updater, /return \$items\.ToArray\(\)/, 'generic object/string candidate lists must use ToArray for Windows PowerShell 5.1');
assert.match(updater, /return \$results\.ToArray\(\)/, 'key search results must use ToArray for Windows PowerShell 5.1');
assert.match(updater, /Oracle Quick Deploy/, 'updater must continue to use the Oracle deploy path');
assert.match(updater, /Get-KeySearchRoots/, 'updater must still discover owner key locations');
assert.match(updater, /Select-PrivateKeyInteractive/, 'explicit update must retain key picker fallback');

assert.match(read('client/index.html'), new RegExp(`favicon\\.ico\\?v=${version.replace(/\./g, '\\.')}`), 'release must bump browser cache-busters');
assert.match(read('client/src/App.tsx'), new RegExp(`halieus-intro-seen-${version.replace(/\./g, '\\.')}`), 'current client release stamp must be updated');

console.log('Halieus Game Room 3.5.19 Windows PowerShell updater compatibility regression PASS');
