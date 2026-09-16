import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.equal(version, '3.5.12');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}
assert.match(read('shared/version.ts'), new RegExp(`APP_VERSION = \"${version.replaceAll('.', '\\.') }\"`));

const css = read('client/src/index.css');
assert.match(css, /Mega Board desktop viewport containment/);
assert.match(css, /\.game-page > \.game-layout\.mega-live-layout-v3[\s\S]*?height:auto !important;/, 'Mega live layout no longer forces full-page height below header');
assert.match(css, /\.mega-live-layout-v3 \.board-grid[\s\S]*?width:min\(100%, 100cqh\) !important;/, 'board is capped by actual remaining layout height');
assert.match(css, /\.mega-live-layout-v3 \.mega-live-player-rail[\s\S]*?max-height:100% !important;/, 'player rails remain contained in the same viewport row');

console.log('Halieus Game Room 3.5.12 Mega Board viewport containment regression PASS');
