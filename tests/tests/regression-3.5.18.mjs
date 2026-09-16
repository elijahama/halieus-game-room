import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 18, '3.5.18 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const updater = read('update-website.ps1');
assert.match(updater, /Get-SavedKeyPath/, 'updater must reuse the path of a previously proven owner key');
assert.match(updater, /Save-KeyPath/, 'updater must remember a successful key path without copying the key');
assert.match(updater, /owner-update\.json/, 'owner key-path memory must live outside the release folder');
assert.match(updater, /Downloads/, 'updater must search common downloaded-key locations');
assert.match(updater, /Desktop/, 'updater must search the owner Desktop');
assert.match(updater, /Documents/, 'updater must search the owner Documents folder');
assert.match(updater, /OneDrive/, 'updater must account for redirected Windows owner folders');
assert.match(updater, /Select-PrivateKeyInteractive/, 'explicit website update must offer a local key file picker');
assert.match(updater, /OpenFileDialog/, 'key picker must use a local Windows file chooser rather than asking for secret contents');
assert.match(updater, /PuTTY \.ppk/, 'updater must identify unsupported PuTTY key format');
assert.match(updater, /Oracle access must be restored from the Oracle Cloud console/, 'missing-key error must distinguish genuine credential loss from updater failure');
assert.match(updater, /Do not upload or share the private key/i, 'owner secret must remain protected');
assert.doesNotMatch(updater, /Set-Content[^\n]+private key/i, 'updater must never write private-key contents');

assert.match(read('client/index.html'), new RegExp(`favicon\\.ico\\?v=${version.replace(/\./g, '\\.')}`), 'release must bump browser cache-busters');
assert.match(read('client/src/App.tsx'), new RegExp(`halieus-intro-seen-${version.replace(/\./g, '\\.')}`), 'current client release stamp must be updated');

console.log('Halieus Game Room 3.5.18 Oracle key recovery regression PASS');
