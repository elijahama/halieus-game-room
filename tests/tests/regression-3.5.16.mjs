import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.equal(version, '3.5.16');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.5\.16"/);

const updater = read('update-website.ps1');
assert.match(updater, /Get-PrivateKeyCandidates/, 'updater must discover private keys instead of assuming one filename');
assert.match(updater, /Get-ChildItem[^\n]+\.ssh|Get-ChildItem -LiteralPath \$sshDir/s, 'updater must scan the owner .ssh folder');
assert.match(updater, /Test-OracleSsh/, 'candidate credentials must be proven against Oracle before use');
assert.match(updater, /BatchMode=yes/, 'credential probes must be non-interactive');
assert.match(updater, /existing OpenSSH agent\/config/, 'updater must support ssh-agent/config authentication');
assert.match(updater, /Do not upload or share the private key/i, 'missing-key guidance must protect the owner secret');
assert.doesNotMatch(updater, /Join-Path \$env:USERPROFILE "\.ssh\\halieus-oracle\.key"/, 'updater must not require one hard-coded private-key filename');

const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deploy, /\[switch\]\$UseDefaultSshAuth/, 'deploy must support agent/config authentication');
assert.match(deploy, /IdentitiesOnly=yes/, 'explicit-key deployments must use only the selected key');
assert.match(deploy, /StrictHostKeyChecking=accept-new/, 'first owner connection may safely record the Oracle host key');

assert.match(read('client/index.html'), /favicon\.ico\?v=3\.5\.16/, 'release must bump browser cache-busters');
assert.match(read('client/src/App.tsx'), /halieus-intro-seen-3\.5\.16/, 'current client release stamp must be updated');

console.log('Halieus Game Room 3.5.16 Oracle credential discovery regression PASS');
