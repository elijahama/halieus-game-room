import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const currentVersion = read('VERSION').trim();

assert.equal(currentVersion.split('.').slice(0,2).join('.'), '3.5');
assert.ok(Number(currentVersion.split('.')[2]) >= 7, '3.5.7 WHOT/mobile guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, currentVersion, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.') }\"`));

const whot = read('client/src/games/whot/WhotScreen.tsx');
assert.match(whot, /WHOT_SEAT_PRESETS/, 'WHOT uses deliberate approved seat presets');
assert.match(whot, /7:\s*\[/, 'WHOT defines the full seven-opponent layout');
assert.match(whot, /whot357-table/, 'WHOT uses the approved 3.5.7 table surface');
assert.match(whot, /whot357-room-dock/, 'room activity is docked directly under WHOT');
assert.match(whot, /whot357-room-info/, 'WHOT dock includes compact room information');
const catalog = read('client/src/platform/games/catalog.ts');
assert.match(catalog, /id: "whot"[\s\S]*?icon: "\/game-icons\/whot\.svg"/, 'WHOT uses the approved two-card icon');
assert.equal(existsSync(resolve(root, 'client/public/game-icons/whot.svg')), true, 'approved WHOT SVG exists');

const accountPanel = read('client/src/platform/accounts/AccountPanel.tsx');
assert.match(accountPanel, /revealedInviteCodes/, 'invite history tracks deliberate code reveals');
assert.match(accountPanel, /Invite codes/, 'owner has a dedicated invite-code view');
assert.match(accountPanel, /Copy code/, 'owner can copy a recovered invite code');
const accountsServer = read('server/src/platform/accounts.ts');
assert.match(accountsServer, /revealCode\?: string \| null/, 'active invite codes have a revealable private server copy');
assert.match(accountsServer, /\/admin\/invites\/:inviteId\/code/, 'admin-only reveal endpoint exists');
assert.match(accountsServer, /revealCode\?: string \| null/, 'invite history retains a private reveal-copy field when available');
assert.doesNotMatch(accountsServer.match(/function adminSnapshot\(\)[\s\S]*?\n\}/)?.[0] ?? '', /revealCode:\s*invite\.revealCode/, 'admin snapshot does not bulk expose full invite codes');

const css = read('client/src/index.css');
assert.match(css, /3\.5\.7 — approved WHOT table lock-in \+ mobile shell polish/);
assert.match(css, /\.halieus-mobile-brand[\s\S]*?background:transparent !important/, 'mobile brand no longer looks like a grey browser button');
assert.match(css, /\.account-invite-code-row/, 'invite reveal controls have compact mobile-safe styling');
assert.match(css, /\.whot357-room-dock/, 'WHOT room dock styling exists');

for (const path of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd','Close Halieus Game Room.cmd']) {
  assert.doesNotMatch(read(path), /localhost/i, `${path} remains production-site only`);
}

console.log('Halieus Game Room 3.5.7 WHOT/mobile/invite UI regression PASS');
