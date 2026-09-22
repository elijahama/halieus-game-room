import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

const displayVersion=read('VERSION').trim();
assert.match(displayVersion,/^(?:3\.7\.0[a-z]?|4\.\d+\.\d+)$/);
const npmVersion=displayVersion.replace(/^(\d+\.\d+\.\d+)([a-z])$/,'$1-$2');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,npmVersion,`${file} version mismatch`);
}

const privateUpdaterUrl=new URL('../update-website.ps1',import.meta.url);
if (existsSync(privateUpdaterUrl)) {
  const updater=read('update-website.ps1');
  assert.match(updater,/function Invoke-OracleSshProbe/,'updater must capture SSH diagnostic output');
  assert.match(updater,/function Test-PrivateKeyPermissionFailure/,'updater must detect Windows OpenSSH ACL refusal');
  assert.match(updater,/UNPROTECTED PRIVATE KEY FILE/,'updater must recognize the OpenSSH private-key warning');
  assert.match(updater,/function Repair-PrivateKeyPermissions/,'updater must contain automatic private-key ACL repair');
  assert.match(updater,/icacls \$PathValue "\/inheritance:r"/,'updater must remove unsafe inherited ACLs');
  assert.match(updater,/icacls \$PathValue "\/grant:r" "\$\{principal\}:\(R\)"/,'updater must re-grant only the current Windows identity');
  assert.match(updater,/Test-OracleSsh \$candidate -RepairKeyPermissions/,'discovered keys must run the ACL repair path');
  assert.match(updater,/Test-OracleSsh \$selected -RepairKeyPermissions/,'manually selected keys must run the ACL repair path');
  assert.match(updater,/The key stays in its current folder/,'repair must explicitly state that key contents are not copied');
  assert.doesNotMatch(updater,/Write-Host[^\n]*\$first/,'updater must not print private-key content');
} else {
  // The owner-only updater is intentionally ignored from the public/portfolio
  // repository. A clean clone must still validate the tracked deployment path.
  const tracked=read('tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
  assert.match(tracked,/Using Oracle SSH key:/,'tracked deploy helper must identify only the selected key path');
  assert.match(tracked,/private key itself was not copied/i,'tracked deploy helper must state that key contents are not copied');
  assert.doesNotMatch(tracked,/Get-Content[^\n]*\.key/i,'tracked deploy helper must never read private-key contents');
}

console.log('Halieus Game Room 3.7.0a Oracle SSH key-permission self-repair regression: PASS');
