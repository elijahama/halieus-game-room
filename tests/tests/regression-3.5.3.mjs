import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const currentVersion=read('VERSION').trim();
assert.match(currentVersion,/^3\.5\.\d+$/);
assert.ok(Number(currentVersion.split('.')[2]) >= 3,'3.5.3 guarantees must remain in later 3.5.x builds');
for (const p of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) assert.equal(json(p).version,currentVersion,`${p} version`);
assert.match(read('shared/version.ts'),new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.') }\"`));

for (const p of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd','Close Halieus Game Room.cmd']) {
  const text=read(p);
  assert.doesNotMatch(text,/localhost/i,`${p} must be website-only`);
  assert.doesNotMatch(text,/http:\/\/halieus\.remotewire\.net/i,`${p} must not downgrade to HTTP`);
}
assert.equal(existsSync(resolve(root,'dev-tools/Local Development')),false,'localhost control folder removed from owner workspace');
const shortcutScript=read('launcher-shortcuts.ps1');
assert.match(shortcutScript,/Close Halieus Game Room\.cmd/);
assert.match(shortcutScript,/Close Halieus Game Room\.lnk/);

const html=read('client/index.html');
assert.match(html,/id="halieus-first-paint"/,'inline first-paint CSS must exist before bundled CSS');
assert.match(html,/html\[data-theme="light"\] body/);
assert.match(html,/#root \{ min-height: 100vh; \}/);
assert.doesNotMatch(html,/v=3\.5\.2/);

const app=read('client/src/App.tsx');
const loading=app.slice(app.indexOf('if (!guestAccessRequested && !authStatus)'), app.indexOf('if (!guestAccessRequested && authStatus'));
assert.match(loading,/account-loading-screen/);
assert.doesNotMatch(loading,/app-icon-192/,'normal auth bridge must not show a pseudo-intro logo');
// 3.5.6 makes the normal auth bridge fully textless again and moves continuity
// into the static HTML curtain, so hosted latency cannot surface technical copy.
assert.doesNotMatch(app,/authBridgeVisible/,'delayed technical access bridge must remain retired');
assert.doesNotMatch(loading,/Checking player access/,'normal access resolution must never be user-facing copy');
assert.match(loading,/Halieus couldn’t connect/,'actual account errors remain visible');
assert.match(loading,/>Try again</,'actual account errors remain retryable');

const css=read('client/src/index.css');
assert.match(css,/\.account-loading-screen \{\s*min-height:100vh;/s);
assert.match(css,/transition-duration:820ms !important/,'theme timing remains synchronized');

console.log('Halieus Game Room 3.5.3 website-only launcher + first-paint guarantees preserved (3.5.6 static curtain supersession acknowledged).');
