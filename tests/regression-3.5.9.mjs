import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const currentVersion = read('VERSION').trim();

assert.equal(currentVersion.split('.').slice(0,2).join('.'), '3.5');
assert.ok(Number(currentVersion.split('.')[2]) >= 9, '3.5.9 Invite Codes guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, currentVersion, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.') }\"`));

const panel = read('client/src/platform/accounts/AccountPanel.tsx');
assert.match(panel, /type AdminTab = [^;]*"codes"/, 'owner panel has a dedicated Invite Codes tab');
assert.match(panel, /<strong>Invite codes<\/strong><small>View & copy full codes<\/small>/, 'Invite Codes is a first-class admin tab');
assert.match(panel, /adminTab === "codes"/, 'Invite Codes tab has its own panel');
assert.match(panel, /Every invitation code Halieus can still recover is shown here in full/, 'codes tab explicitly promises a direct code view');
assert.match(panel, /Promise\.all\(available\.map/, 'opening the codes tab resolves all recoverable codes');
assert.match(panel, /Copy code/, 'codes tab supports direct code copy');
assert.match(panel, /Copy link/, 'codes tab supports direct invite-link copy');
assert.match(panel, /Legacy code unavailable/, 'legacy hash-only codes remain explained');
assert.match(panel, /View full code →/, 'history links directly to the codes tab rather than requiring inline toggles');
assert.doesNotMatch(panel.match(/account-invite-history[\s\S]*?\{adminTab === "players"/)?.[0] ?? '', />Show code</, 'history no longer makes the owner hunt through per-row reveal toggles');

const server = read('server/src/platform/accounts.ts');
assert.match(server, /\/admin\/invites\/:inviteId\/code/, 'admin-only code retrieval endpoint remains available');
assert.match(server, /if \(!requireAdmin\(request, response\)\) return;/, 'code retrieval remains admin protected');
assert.doesNotMatch(server.match(/function adminSnapshot\(\)[\s\S]*?\n\}/)?.[0] ?? '', /revealCode:\s*invite\.revealCode/, 'bulk snapshot still does not expose all plaintext invite codes');

const css = read('client/src/index.css');
assert.match(css, /3\.5\.9 — dedicated owner Invite Codes tab/);
assert.match(css, /\.account-invite-codes-list/);
assert.match(css, /@media\(max-width:760px\)/, 'codes tab has a phone layout');

console.log('Halieus Game Room 3.5.9 dedicated Invite Codes tab regression PASS');
