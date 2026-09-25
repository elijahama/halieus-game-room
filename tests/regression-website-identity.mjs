import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const path = 'M12 15H27L24 19V28H40V19L37 15H52L49 19V46L52 50H37L31 54Q23 59 23 50H12L15 46V19ZM27 35Q25 34 25 37V50Q25 53 28 51L38 44Q41 42 38 40Z';
const sources = ['shared/platform/brand.ts', 'client/index.html', 'client/public/halieus-mark.svg', 'client/public/halieus-app-icon.svg', 'client/public/app-icon.svg'];
for (const file of sources) {
  assert.ok(read(file).includes(path), `${file}: canonical play-cut H required`);
  assert.ok(!read(file).includes('M12 12h17v5h-4'), `${file}: launcher slab must not enter website identity`);
}
for (const file of ['client/src/platform/components/HomeScreen.tsx', 'client/src/platform/accounts/AccountPortal.tsx', 'client/src/platform/components/HalieusIntro.tsx']) assert.match(read(file), /HalieusBrandMark/);
assert.match(read('client/src/App.tsx'), /favicon\.href = game\.icon/);
assert.match(read('client/src/App.tsx'), /document\.title = `\$\{game\.name\} · Halieus Game Room`/);
assert.match(read('client/src/App.tsx'), /d="\$\{HGR_H_PATH\}"/);
const fixture = JSON.parse(read('tests/fixtures/pre2b-website-assets.json'));
for (const [file, expected] of Object.entries(fixture)) {
  let bytes = readFileSync(resolve(root, file));
  if (file.endsWith('.svg')) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${file}: website raster or contextual game artwork changed`);
}
const manifest = JSON.parse(read('client/public/site.webmanifest'));
assert.ok(manifest.icons.every(i => i.src.includes('4.5.1-canonical-h')), 'PWA identities must invalidate prior artwork URLs');
assert.ok(manifest.icons.some(i => i.src.startsWith('/halieus-app-icon.svg')));
const generator = read('scripts/generate-platform-icons.mjs');
assert.doesNotMatch(generator, /assets\/branding/, 'Website generator must be independent of launcher assets');
assert.match(generator, /client\/public/);
console.log('PASS website block H, boot/tab/PWA consumers, raster exports and separate M/P artwork');

for(const name of ['brand-default','mono-light','mono-dark','light-mode','start','restart','close','update','powershell','openshard']) {
 const folder=['brand-default','mono-light','mono-dark','light-mode'].includes(name)?'flat':'launcher';
 const svg=read(`client/public/brand/${folder}/${name}.svg`);
 assert.ok(svg.includes(path),`${name} must reuse canonical geometry`);
 assert.match(svg,/fill-rule="evenodd"/);
 assert.match(svg,/viewBox="0 0 1024 1024"/);
}
assert.match(read('client/public/brand/glyphs/H.svg'),/fill="currentColor"/);
assert.match(read('client/public/brand/flat/mono-dark.svg'),/--logo-glyph,#000000/);
assert.match(read('client/public/brand/flat/mono-light.svg'),/--logo-glyph,#ffffff/);
for(const game of ['anagrams-race','ayo']) assert.equal(read(`client/public/game-icons/${game}.svg`),read(`client/src/assets/game-icons/${game}.svg`));
