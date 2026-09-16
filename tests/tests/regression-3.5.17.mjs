import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 17, '3.5.17 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${version.replace(/\./g, '\\.') }\"`));

const updateCmd = read('Update Halieus Website.cmd');
assert.match(updateCmd, /Halieus Website Updater %HGR_VERSION%/, 'update launcher must identify its release');
assert.match(updateCmd, /Running from: %CD%/, 'update launcher must reveal the exact executing folder');

const updater = read('update-website.ps1');
assert.match(updater, /Halieus Website Updater \$expectedVersion/, 'PowerShell updater must identify its release');
assert.match(updater, /Updater folder: \$ProjectRoot/, 'PowerShell updater must reveal the exact executing folder');
assert.match(updater, /Get-PrivateKeyCandidates/, '3.5.16 credential discovery must remain present');
assert.doesNotMatch(updater, /Join-Path \$env:USERPROFILE "\.ssh\\halieus-oracle\.key"/, 'updater must not revert to a hard-coded key path');

const firstRun = read('FIRST RUN - Refresh Halieus Launchers.cmd');
assert.match(firstRun, /launcher-shortcuts\.ps1/, 'first-run helper must regenerate local shortcuts');
assert.match(firstRun, /THIS extracted folder/i, 'first-run helper must explain folder-local shortcut generation');

const shippedLinks = readdirSync(root).filter((name) => name.toLowerCase().endsWith('.lnk'));
assert.deepEqual(shippedLinks, [], 'release source/package must not ship absolute-path Windows shortcuts');

assert.match(read('client/index.html'), new RegExp(`favicon\\.ico\\?v=${version.replace(/\./g, '\\.')}`), 'release must bump browser cache-busters');
assert.match(read('client/src/App.tsx'), new RegExp(`halieus-intro-seen-${version.replace(/\./g, '\\.')}`), 'current client release stamp must be updated');

console.log('Halieus Game Room 3.5.17 stale-launcher protection regression PASS');
