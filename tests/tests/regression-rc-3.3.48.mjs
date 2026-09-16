import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const clientPkg = JSON.parse(read('client/package.json'));
const serverPkg = JSON.parse(read('server/package.json'));

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);
assert.equal(clientPkg.version, pkg.version);
assert.equal(serverPkg.version, pkg.version);
assert.equal(read('VERSION').trim(), pkg.version);
assert.match(read('client/src/version.ts'), /export \{ APP_VERSION \} from/);
assert.match(read('server/src/index.ts'), /import \{ APP_VERSION \} from/);

assert.equal(existsSync('scripts/build-portable-client.mjs'), false, 'portable client builder must not ship');

const deploy = read('dev-tools/Oracle Quick Deploy/quick-install.sh');
assert.match(deploy, /npm ci/);
assert.match(deploy, /npm run build/);
assert.match(deploy, /npm prune --omit=dev/);

console.log('RC 3.3.48 release recovery regression checks passed.');
