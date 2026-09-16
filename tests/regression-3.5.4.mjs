import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

const currentVersion=read('VERSION').trim();
assert.equal(currentVersion.split('.').slice(0,2).join('.'),'3.5');
assert.ok(Number(currentVersion.split('.')[2]) >= 4,'3.5.4 showcase guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, currentVersion, `${path} version`);
}
assert.match(read('shared/version.ts'),new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.') }\"`));

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /halieus-showcase/,'Home must use the Immersive Showcase surface');
assert.match(home, /Game night starts here\./,'showcase headline');
assert.match(home, /Join with code/,'explicit join action');
assert.match(home, /Watch a game/,'explicit watch action');
assert.match(home, /joinIntent/,'join and watch modes share one room-code workflow');
assert.match(home, /WATCH GAME/,'watch intent has dedicated copy');
assert.match(home, /Watch \{selected\.name\}/,'watch mode makes spectator action primary');
assert.match(home, /halieus-library-status/,'library cards expose availability state');
assert.match(home, /Create room →/,'library card action is concrete');

const css = read('client/src/index.css');
assert.match(css, /3\.5\.4 — Game Room immersive showcase/);
assert.match(css, /\.halieus-showcase \{/);
assert.match(css, /\.halieus-showcase-status/);
assert.match(css, /\.halieus-library-status/);
assert.match(css, /prefers-reduced-motion:reduce/,'showcase motion must respect reduced-motion');

const html = read('client/index.html');
assert.match(html,new RegExp(`v=${currentVersion.replaceAll('.', '\\.')}`),'current web metadata/icons use the current cache stamp');

for (const path of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd','Close Halieus Game Room.cmd']) {
  assert.doesNotMatch(read(path), /localhost/i, `${path} remains website-only`);
}
assert.equal(existsSync(resolve(root, 'dev-tools/Local Development')), false, 'retired localhost launcher folder stays removed');

console.log('Halieus Game Room 3.5.4 Game Room showcase regression PASS');
