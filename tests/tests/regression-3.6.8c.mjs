import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const displayVersion = read('VERSION').trim();
assert.match(displayVersion, /^(?:3\.6\.8[a-z]?|3\.7\.0[a-z]?)$/, '3.6.8c regression must stay on the 3.6.8 line');
const npmVersion = displayVersion.startsWith('3.7.0') ? (displayVersion === '3.7.0' ? '3.7.0' : `3.7.0-${displayVersion.slice(-1)}`) : displayVersion === '3.6.8' ? '3.6.8' : `3.6.8-${displayVersion.slice(-1)}`;
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version, npmVersion, `${file} version mismatch`);
}

const rootPackage = json('package.json');
assert.deepEqual(rootPackage.overrides, {
  postcss: '8.5.26',
  nanoid: '3.3.18',
  picomatch: '4.0.7',
  esbuild: '0.28.1',
}, '3.6.8b dependency security floors must remain pinned');

const clientPackage = json('client/package.json');
assert.equal(clientPackage.dependencies?.vite, '7.3.6', 'Vite floor regressed');
assert.equal(clientPackage.dependencies?.['@vitejs/plugin-react'], '5.2.0', 'React Vite plugin floor regressed');

const oracleInstaller = read('dev-tools/Oracle Quick Deploy/quick-install.sh');
assert.match(oracleInstaller, /npm audit --audit-level=high/, 'Oracle deploy must block HIGH-or-higher npm audit findings');
assert.doesNotMatch(oracleInstaller, /npm audit --audit-level=moderate/, 'moderate findings must not create a false deployment failure');
assert.match(oracleInstaller, /npm ci/, 'npm ci must remain a hard candidate gate');
assert.match(oracleInstaller, /npm run build/, 'production build must remain a hard candidate gate');
assert.match(oracleInstaller, /release-integrity\.mjs --verify/, 'release fingerprint verification must remain a hard candidate gate');
assert.match(oracleInstaller, /Rolling back/, 'post-activation exact-release failure must retain rollback');

console.log('Halieus Game Room 3.6.8c Oracle audit-gate regression: PASS');
