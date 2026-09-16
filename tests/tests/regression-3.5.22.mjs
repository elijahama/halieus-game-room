import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 22, '3.5.22 guarantees must remain in later 3.5.x builds');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const css = read('client/src/index.css');
const marker = css.lastIndexOf('3.5.22 — Mega Board desktop composition repair');
assert.ok(marker >= 0, '3.5.22 Mega Board layout repair must exist');
const patch = css.slice(marker);
assert.match(patch, /\.mega-live-page > \.game-layout\.mega-live-layout-v3[\s\S]*?height:auto !important/, 'live play grid must size to the remaining row rather than the full page');
assert.match(patch, /\.mega-live-layout-v3 > \.board-frame[\s\S]*?place-items:start center !important/, 'board must anchor to the top of the usable play area');
assert.match(patch, /\.mega-live-layout-v3 \.board-grid[\s\S]*?height:100% !important[\s\S]*?max-width:100% !important/, 'board must fill available play height while respecting centre width');
assert.match(patch, /player-rail-list[\s\S]*?overflow-y:auto !important/, 'side player rails must own their overflow');
assert.match(read('client/index.html'), new RegExp(`favicon\\.ico\\?v=${version.replace(/\./g, '\\.')}`), 'browser cache-buster must match release');
assert.equal(read('shared/version.ts').match(/APP_VERSION = "([^"]+)"/)?.[1], version, 'shared app version must match release');

console.log('Halieus Game Room 3.5.22 Mega Board desktop composition regression PASS');
