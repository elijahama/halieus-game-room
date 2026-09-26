import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const path = 'M12 15H27L24 19V28H40V19L37 15H52L49 19V46L52 50H37L31 54Q23 59 23 50H12L15 46V19ZM27 35Q25 34 25 37V50Q25 53 28 51L38 44Q41 42 38 40Z';
const iconSetGlyph = read('assets/branding/icon-sets/glyphs/hgr-h.svg');
assert.ok(iconSetGlyph.includes(path), 'Canonical icon-set H glyph must contain the approved H geometry');
const sources = ['shared/platform/brand.ts', 'client/index.html', 'client/public/halieus-mark.svg', 'client/public/halieus-app-icon.svg', 'client/public/app-icon.svg'];
for (const file of sources) {
  assert.ok(read(file).includes(path), `${file}: canonical play-cut H required`);
  assert.ok(!read(file).includes('M12 12h17v5h-4'), `${file}: launcher slab must not enter website identity`);
}
for (const file of ['client/src/platform/components/HomeScreen.tsx', 'client/src/platform/accounts/AccountPortal.tsx', 'client/src/platform/components/HalieusIntro.tsx']) assert.match(read(file), /HalieusBrandMark/);
const app = read('client/src/App.tsx');
assert.match(app, /favicon\.href = game\.icon/);
assert.match(app, /document\.title = `\$\{game\.name\} · Halieus Game Room`/);
assert.match(app, /favicon\.href = "\/halieus-mark\.svg\?v=4\.5\.2-icon-set"/, 'HGR home/tab favicon must use the canonical icon-set web mark');
assert.doesNotMatch(app, /makeHalieusTabGlyph/, 'Runtime must not redraw the HGR favicon');
const fixture = JSON.parse(read('tests/fixtures/pre2b-website-assets.json'));
for (const [file, expected] of Object.entries(fixture)) {
  let bytes = readFileSync(resolve(root, file));
  if (file.endsWith('.svg')) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${file}: website raster or contextual game artwork changed`);
}
const manifest = JSON.parse(read('client/public/site.webmanifest'));
assert.ok(manifest.icons.every(i => i.src.includes('4.5.2')), 'PWA identities must invalidate prior artwork URLs for 4.5.2');
assert.ok(manifest.icons.some(i => i.src.startsWith('/halieus-app-icon.svg')));
assert.equal(manifest.icons[0]?.src.split("?")[0], '/app-icon-reference.png', 'Installed PWA must prefer the approved rendered reference PNG');
const indexHtml = read('client/index.html');
assert.match(indexHtml, /id="halieus-dynamic-favicon"[^>]*href="\/halieus-mark\.svg\?v=4\.5\.2-icon-set"/, 'Initial browser favicon must use the canonical icon-set web mark');
assert.match(indexHtml, /rel="shortcut icon"[^>]*href="\/halieus-mark\.svg\?v=4\.5\.2-icon-set"/, 'Shortcut favicon must use the canonical icon-set web mark');
assert.match(indexHtml, /rel="apple-touch-icon"[^>]*href="\/app-icon-reference\.png\?v=4\.5\.2-approved-reference"/, 'Installed Apple/PWA icon must keep the approved rendered reference artwork');
assert.doesNotMatch(indexHtml, /favicon\.ico|favicon-32\.png|app-icon-180\.png/, 'Stale generated favicon fallbacks must not override the canonical icon-set favicon');
const pwaCopy = read('scripts/copy-approved-pwa-icon.mjs');
assert.match(pwaCopy,/assets\/branding\/references\/ChatGPT Image 25 Sept 2026, 18_24_09\.png/,'PWA icon must come from the approved reference PNG');
assert.match(pwaCopy,/copyFile\(source, destination\)/,'PWA icon source must be copied byte-for-byte rather than redrawn or recoloured');
const clientPackage = JSON.parse(read('client/package.json'));
assert.equal(clientPackage.scripts.prebuild,'node ../scripts/copy-approved-pwa-icon.mjs','Client build must materialise the approved PWA reference before Vite runs');

const flatGenerator = read('scripts/generate-flat-brand.mjs');
assert.match(flatGenerator,/assets\/branding\/icon-sets\/glyphs\/hgr-h\.svg/,'Web brand generator must source H geometry from icon sets');
const generator = read('scripts/generate-platform-icons.mjs');
assert.doesNotMatch(generator, /assets\/branding/, 'Website generator must be independent of launcher assets');
assert.match(generator, /client\/public/);
console.log('PASS website block H, boot/tab/PWA consumers, raster exports and separate M/P artwork');

for(const name of ['brand-default','mono-light','mono-dark','light-mode','start','restart','close','update','powershell','openshard']) {
 const folder=['brand-default','mono-light','mono-dark','light-mode'].includes(name)?'flat':'launcher';
 const svg=read(`client/public/brand/${folder}/${name}.svg`);
 assert.ok(svg.includes(path),`${name} must reuse canonical geometry`);
 assert.match(svg,/fill-rule="evenodd"/);
 // Flat website profiles use the 1024 canvas; approved launcher vectors keep
 // their native 64-unit reference canvas and are separately hash-pinned.
 assert.match(svg,folder==='flat'?/viewBox="0 0 1024 1024"/:/viewBox="0 0 64 64"/);
}
assert.match(read('client/public/brand/glyphs/H.svg'),/fill="currentColor"/);
assert.match(read('client/public/brand/flat/mono-dark.svg'),/--logo-glyph,#000000/);
assert.match(read('client/public/brand/flat/mono-light.svg'),/--logo-glyph,#ffffff/);
for(const game of ['anagrams-race','ayo']) assert.equal(read(`client/public/game-icons/${game}.svg`),read(`client/src/assets/game-icons/${game}.svg`));
