import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const currentVersion = read('VERSION').trim();

assert.equal(currentVersion.split('.').slice(0,2).join('.'), '3.5');
assert.ok(Number(currentVersion.split('.')[2]) >= 8, '3.5.8 durable invite-history guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, currentVersion, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = "${currentVersion.replaceAll('.', '\\.') }"`));

const shared = read('shared/platform/accounts.ts');
assert.match(shared, /codeRevealAvailable\?: boolean/, 'invite summaries advertise reveal availability without exposing plaintext');

const server = read('server/src/platform/accounts.ts');
assert.match(server, /codeRevealAvailable: Boolean\(revealCode\)/, 'admin snapshot exposes only reveal availability');
assert.doesNotMatch(server, /invite\.usedByAccountId = account\.id; invite\.revealCode = null/, 'using an invite no longer deletes owner history copy');
assert.doesNotMatch(server, /invite\.revokedAt = Date\.now\(\); invite\.revealCode = null/, 'revoking an invite no longer deletes owner history copy');
const revealRoute = server.match(/app\.get\("\/admin\/invites\/:inviteId\/code"[\s\S]*?\n  \}\);/)?.[0] ?? '';
assert.doesNotMatch(revealRoute, /Only active invite codes can be revealed/, 'used/revoked/expired retained codes remain revealable to admin');
assert.match(revealRoute, /original code cannot be recovered/, 'legacy hash-only invites explain why they cannot be revealed');

const panel = read('client/src/platform/accounts/AccountPanel.tsx');
assert.match(panel, /adminTab === \"codes\"/, 'durable invite codes remain reachable through the dedicated codes tab');
assert.match(panel, /Legacy code unavailable/, 'hash-only legacy invites are labelled explicitly');
assert.match(panel, /Invite Codes tab/, 'owner-facing copy points to durable code history');

console.log('Halieus Game Room 3.5.8 durable invite-code history regression PASS');
