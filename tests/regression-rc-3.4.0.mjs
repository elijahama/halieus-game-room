import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const app = read('client/src/App.tsx');
const portal = read('client/src/platform/accounts/AccountPortal.tsx');
const panel = read('client/src/platform/accounts/AccountPanel.tsx');
const accounts = read('server/src/platform/accounts.ts');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);
assert.match(app, /AccountPortal/);
assert.match(app, /directGuestRoute/);
assert.match(portal, /Permanent accounts are invite-only/);
assert.match(portal, /Account invite code/);
assert.match(portal, /OWNER SETUP CODE\.txt/);
assert.match(panel, /Player management/);
assert.match(panel, /Sign out all/);
assert.match(panel, /Make admin/);
assert.match(accounts, /scrypt/);
assert.match(accounts, /HttpOnly; SameSite=Lax/);
assert.match(accounts, /registration: "invite-only"/);
assert.match(accounts, /ownerBootstrapHash/);
assert.match(accounts, /account\.created\.invite/);
assert.match(accounts, /access-request\.approved/);
assert.match(accounts, /password-reset/);
assert.doesNotMatch(accounts, /app\.post\("\/auth\/register"/);
assert.match(accounts, /OWNER SETUP CODE\.txt/);

// Blackjack is restored as a selectable live module rather than the staged tile.
assert.match(catalog, /id: "blackjack"/);
assert.match(catalog, /name: "Blackjack"/);
assert.doesNotMatch(home, /is-blackjack is-paused/);
assert.doesNotMatch(app, /selectedGame=\{selectedGame === "blackjack" \? "whot" : selectedGame\}/);

console.log('RC 3.4.0 private-account and Blackjack restoration regression passed.');
