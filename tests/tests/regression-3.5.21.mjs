import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 21, '3.5.21 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
const compressionAssembly = deploy.indexOf('Add-Type -AssemblyName System.IO.Compression -ErrorAction Stop');
const fileSystemAssembly = deploy.indexOf('Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop');
const zipModeUse = deploy.indexOf('[System.IO.Compression.ZipArchiveMode]::Create');
assert.ok(compressionAssembly >= 0, 'Windows PowerShell 5.1 deployer must explicitly load System.IO.Compression');
assert.ok(fileSystemAssembly >= 0, 'deployer must explicitly load System.IO.Compression.FileSystem');
assert.ok(zipModeUse >= 0, 'deployer must create a ZIP archive');
assert.ok(compressionAssembly < zipModeUse, 'System.IO.Compression must load before ZipArchiveMode is referenced');
assert.ok(fileSystemAssembly < zipModeUse, 'FileSystem must load before ZipFile is used');
assert.match(deploy, /Using Oracle SSH key|Uploading Halieus|Packing Halieus/, 'deployment flow must remain intact after the ZIP compatibility patch');

assert.match(read('client/index.html'), new RegExp(`favicon\\.ico\\?v=${version.replace(/\./g, '\\.')}`), 'release must bump browser cache-busters');
assert.match(read('client/src/App.tsx'), new RegExp(`halieus-intro-seen-${version.replace(/\./g, '\\.')}`), 'current client release stamp must be updated');

console.log('Halieus Game Room 3.5.21 Windows PowerShell ZIP assembly regression PASS');
