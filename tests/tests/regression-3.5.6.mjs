import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const currentVersion = read('VERSION').trim();

assert.equal(currentVersion.split('.').slice(0,2).join('.'), '3.5');
assert.ok(Number(currentVersion.split('.')[2]) >= 6, '3.5.6 first-paint guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, currentVersion, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.') }\"`));

const html = read('client/index.html');
assert.match(html, /id="halieus-boot-curtain"/, 'static boot curtain ships in HTML before React');
assert.match(html, /class="halieus-boot-mark">H</, 'boot curtain has an immediate Halieus mark');
assert.match(html, /html\[data-theme="light"\] #halieus-boot-curtain/, 'curtain respects saved light theme');
assert.match(html, /#halieus-boot-curtain\.is-leaving/, 'curtain has a deliberate exit transition');
assert.match(html, /prefers-reduced-motion: reduce/, 'boot motion respects reduced-motion');
assert.match(html, /themeMeta\?\.setAttribute/, 'browser theme colour follows saved palette before paint');

const app = read('client/src/App.tsx');
assert.doesNotMatch(app, /authBridgeVisible/, 'delayed auth bridge state removed');
assert.doesNotMatch(app, /Checking player access/, 'technical access copy removed from normal flow');
assert.doesNotMatch(app, /setTimeout\(\(\) => setAuthBridgeVisible/, 'no latency threshold can reveal auth internals');
assert.match(app, /document\.getElementById\("halieus-boot-curtain"\)/, 'React owns curtain dismissal once intentional UI is ready');
assert.match(app, /const appReady = (?:introReady \|\| )?guestAccessRequested \|\| Boolean\(authStatus\) \|\| Boolean\(authLoadError\)/, 'curtain remains until real app state exists; later builds may deliberately keep it through intro until auth resolves');
assert.match(app, /Halieus couldn’t connect\./, 'real auth failures still receive intentional error UI');
assert.match(app, /<HalieusIntro/, 'full intro remains intact');

const css = read('client/src/index.css');
assert.match(css, /3\.5\.6 — hosted first-paint \/ authentication continuity/);
assert.doesNotMatch(css, /\.account-access-bridge\s*\{/, 'retired bridge CSS removed');
assert.match(css, /transition-duration:820ms !important/, 'normal theme transitions stay coordinated');

for (const path of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd','Close Halieus Game Room.cmd']) {
  assert.doesNotMatch(read(path), /localhost/i, `${path} remains production website only`);
}

console.log('Halieus Game Room 3.5.6 hosted first-paint/auth continuity regression PASS');
