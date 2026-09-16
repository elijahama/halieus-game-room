import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

assert.match(read('VERSION').trim(),/^(?:3\.7\.0[a-z]?|4\.0\.0)$/);
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version,/^(?:3\.7\.0(?:-[a-z])?|4\.0\.0)$/,`${file} version mismatch`);
}

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

console.log('Halieus Game Room 3.7.0a Oracle SSH key-permission self-repair regression: PASS');
