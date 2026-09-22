import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const displayVersion = read('VERSION').trim();
assert.match(displayVersion, /^(?:3\.6\.8[a-z]?|3\.7\.0[a-z]?|4\.\d+\.\d+)$/, 'Historical 3.6.8 regression must remain valid on later HGR 4.x releases');
const npmVersion = displayVersion.replace(/^(\d+\.\d+\.\d+)([a-z])$/, '$1-$2')
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version, npmVersion, `${file} version mismatch`);
}

const rootPackage = json('package.json');
assert.deepEqual(rootPackage.overrides, {
  postcss: '8.5.26',
  nanoid: '3.3.18',
  picomatch: '4.0.7',
  esbuild: '0.28.1',
  qs: '6.16.0',
}, 'security overrides must stay pinned');
assert.equal(rootPackage.engines?.node, '>=20.19.0', 'Vite 7 Node floor must be enforced');

const clientPackage = json('client/package.json');
assert.equal(clientPackage.dependencies?.vite, '7.3.6', 'Vite security/toolchain floor regressed');
assert.equal(clientPackage.dependencies?.['@vitejs/plugin-react'], '5.2.0', 'React Vite plugin floor regressed');

const lock = json('package-lock.json');
for (const [name, version] of Object.entries({
  postcss: '8.5.26',
  nanoid: '3.3.18',
  picomatch: '4.0.7',
  esbuild: '0.28.1',
  vite: '7.3.6',
  '@vitejs/plugin-react': '5.2.0',
  '@rolldown/pluginutils': '1.0.0-rc.3',
  'react-refresh': '0.18.0',
})) {
  assert.equal(lock.packages?.[`node_modules/${name}`]?.version, version, `${name} lockfile security/toolchain floor regressed`);
}
assert.ok(!Object.keys(lock.packages || {}).some((path) => path.startsWith('node_modules/vite/node_modules/esbuild')), 'Vite must not carry a private stale esbuild copy');
assert.match(lock.packages['node_modules/vite']?.dependencies?.esbuild || '', /0\.28\.0/, 'Vite must accept the pinned esbuild 0.28 line');

const oracleInstaller = read('dev-tools/Oracle Quick Deploy/quick-install.sh');
// 3.6.8c supersedes 3.6.8b's moderate threshold while retaining a registry-backed audit gate.
assert.match(oracleInstaller, /npm audit --audit-level=(?:moderate|high)/, 'Oracle deploy must retain a registry-backed audit gate');

console.log('Halieus Game Room 3.6.8b npm security regression: PASS');
