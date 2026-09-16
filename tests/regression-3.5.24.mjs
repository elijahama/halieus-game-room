import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const version = read('VERSION').trim();

assert.equal(version, '3.5.24');
for (const path of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(path).version, version, `${path} version`);
}

const css = read('client/src/index.css');
const marker = css.lastIndexOf('3.5.24 — Mega Board Autopilot/header isolation');
assert.ok(marker >= 0, '3.5.24 autopilot/header isolation marker must exist');
const patch = css.slice(marker);
assert.match(patch, /@media \(min-width:1181px\)[\s\S]*?\.mega-active-header[\s\S]*?position:relative !important/, 'Mega header must own the desktop autopilot anchor');
assert.match(patch, /\.mega-game-meta \.halieus-autopilot-control[\s\S]*?position:absolute !important[\s\S]*?right:0/, 'desktop Autopilot must be out of normal header flow');
assert.match(patch, /grid-column:auto !important/, 'desktop Autopilot must not span the metadata grid');
assert.match(patch, /@media \(max-width:1180px\)[\s\S]*?position:static !important/, 'tablet/mobile Autopilot must return to normal flow');
assert.match(read('client/index.html'), new RegExp(`favicon\\.ico\\?v=${version.replace(/\./g, '\\.')}`), 'browser cache-buster must match release');
assert.equal(read('shared/version.ts').match(/APP_VERSION = "([^"]+)"/)?.[1], version, 'shared app version must match release');

console.log('Halieus Game Room 3.5.24 Mega Board Autopilot/header isolation regression PASS');
