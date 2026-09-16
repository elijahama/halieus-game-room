import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.equal(version, '3.5.15');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.5\.15"/);

const start = read('Start Halieus Game Room.cmd');
const restart = read('Restart Halieus Game Room.cmd');
for (const launcher of [start, restart]) {
  assert.match(launcher, /update-website\.ps1" -IfNeeded/i, 'owner launcher must self-check/deploy an older public site');
}

const updater = read('update-website.ps1');
assert.match(updater, /\/health\?build=/, 'updater must inspect the public health/version endpoint');
assert.match(updater, /Owner SSH key is not present, so automatic deployment was skipped/i, 'player copies must not attempt owner deployment');
assert.match(updater, /localSemver -le \$publicSemver/, 'automatic updater must never downgrade a newer public release');
assert.match(updater, /Public website version could not be checked, so automatic deployment was skipped/i, 'automatic updater must not deploy merely because the health check is unreachable');
assert.match(updater, /deploy-from-windows\.ps1/i, 'owner updater must route through the protected Oracle deployment path');

const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deploy, /public website did not upgrade/i, 'Windows deploy must fail if the public hostname stays on an old version');
assert.match(deploy, /candidateHealth\.version\) -eq \$expectedVersion/, 'Windows deploy must verify the exact public version');

const installer = read('dev-tools/Oracle Quick Deploy/quick-install.sh');
assert.match(installer, /HEALTH_VERSION.*EXPECTED_VERSION/s, 'Oracle installer must compare local health version with the candidate version');
assert.match(installer, /exact-version health verification/i, 'Oracle installer must reject a stale service process');
assert.match(installer, /SOURCE_ROOT\/deploy\/oracle\/halieus\.env\.example/, 'first deploy env template must come from the validated candidate');

const shortcuts = read('launcher-shortcuts.ps1');
assert.match(shortcuts, /Update Halieus Website\.lnk/, 'owner-friendly website update shortcut must be generated');
assert.match(read('client/index.html'), /favicon\.ico\?v=3\.5\.15/, 'release must bump browser cache-busters');
assert.match(read('client/src/App.tsx'), /halieus-intro-seen-3\.5\.15/, 'current client release stamp must be updated');

console.log('Halieus Game Room 3.5.15 website self-upgrade regression PASS');
