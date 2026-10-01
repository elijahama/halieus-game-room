import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const version = read('VERSION').trim();
const versionRe = version.replaceAll('.', '\\.');
const path = 'M14 12H31V17H27V28H37V17H33V12H50V17H45V47H50V52H33V47H37V36H27V47H31V52H14V47H19V17H14Z';
const iconSetGlyph = read('assets/branding/icon-sets/glyphs/hgr-h.svg');
assert.ok(iconSetGlyph.includes(path), 'Canonical icon-set H glyph must contain the approved H geometry');
const sources = ['shared/platform/brand.ts', 'client/index.html', 'client/public/halieus-mark.svg', 'client/public/app-icon.svg'];
for (const file of sources) {
  assert.ok(read(file).includes(path), `${file}: canonical launcher-family H required`);
}
for (const file of ['client/src/platform/components/HomeScreen.tsx', 'client/src/platform/accounts/AccountPortal.tsx', 'client/src/platform/components/HalieusIntro.tsx']) assert.match(read(file), /HalieusBrandMark/);
const app = read('client/src/App.tsx');
assert.match(app, /favicon\.href = game\.icon/);
assert.match(app, /document\.title = `\$\{game\.name\} · Halieus Game Room`/);
assert.match(app, new RegExp(`favicon\\.href = "\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h5"`), 'HGR home/tab favicon must use the canonical CONTROL UPDATE web mark');
assert.doesNotMatch(app, /makeHalieusTabGlyph/, 'Runtime must not redraw the HGR favicon');
const fixture = JSON.parse(read('tests/fixtures/pre2b-website-assets.json'));
for (const [file, expected] of Object.entries(fixture)) {
  let bytes = readFileSync(resolve(root, file));
  if (file.endsWith('.svg')) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${file}: website raster or contextual game artwork changed`);
}
const manifest = JSON.parse(read('client/public/site.webmanifest'));
assert.ok(manifest.icons.every(i => i.src.includes(`?v=${version}`)), `PWA identities must invalidate prior artwork URLs for ${version}`);
assert.deepEqual(manifest.icons.map(i => i.src.split("?")[0]), ['/halieus-app-icon.png'], 'Installed Halieus PWA must use the original approved PNG');
assert.ok(manifest.icons.every(i => i.type === 'image/png'), 'Installed Halieus identity must use the rendered PNG artwork');
assert.ok(manifest.icons.every(i => i.sizes === '1024x1024'), 'Installed Halieus PNG must declare its original square size');
assert.ok(manifest.icons.every(i => !/app-icon-reference|app-icon-(?:192|512)\.png/.test(i.src)), 'Historical raster thumbnails must not override the approved install identity');
const approvedPwaBytes = readFileSync(resolve(root, 'assets/branding/references/HGR Main.png'));
const installedPwaBytes = readFileSync(resolve(root, 'client/public/halieus-app-icon.png'));
assert.equal(createHash('sha256').update(installedPwaBytes).digest('hex'), createHash('sha256').update(approvedPwaBytes).digest('hex'), 'Installed PWA icon must be byte-identical to the approved HGR Main reference PNG');
const indexHtml = read('client/index.html');
assert.match(indexHtml, new RegExp(`id="halieus-dynamic-favicon"[^>]*href="\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h5"`), 'Initial browser favicon must use the canonical CONTROL UPDATE web mark');
assert.match(indexHtml, new RegExp(`rel="shortcut icon"[^>]*href="\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h5"`), 'Shortcut favicon must use the canonical CONTROL UPDATE web mark');
assert.doesNotMatch(indexHtml, /apple-touch-icon[^>]+app-icon-180\.png/, 'Legacy Apple-touch raster must not compete with the new install identity');
assert.doesNotMatch(indexHtml, /app-icon-reference\.png/, 'Historical install reference must not remain in live HTML');
const pwaCopy = read('scripts/copy-approved-pwa-icon.mjs');
assert.match(pwaCopy,/rm\(resolve\(publicDir, "app-icon-reference\.png"\), \{ force: true \}\)/,'Client prebuild must remove the stale historical install thumbnail');
assert.match(pwaCopy,/copyFile\(approvedMainIcon, installedMainIcon\)/,'Client prebuild must copy the approved rendered PNG without redrawing it');
const clientPackage = JSON.parse(read('client/package.json'));
assert.equal(clientPackage.scripts.prebuild,'node ../scripts/copy-approved-pwa-icon.mjs','Client prebuild must prepare current PWA assets before Vite runs');

const flatGenerator = read('scripts/generate-flat-brand.mjs');
assert.match(flatGenerator,/assets\/branding\/icon-sets\/glyphs\/hgr-h\.svg/,'Web brand generator must source H geometry from icon sets');
const generator = read('scripts/generate-platform-icons.mjs');
assert.doesNotMatch(generator, /assets\/branding/, 'Website generator must be independent of launcher assets');
assert.match(generator, /client\/public/);
console.log('PASS website launcher-family H, boot/tab/PWA consumers, raster exports and separate M/P artwork');

for(const name of ['brand-default','mono-gold','mono-light','mono-dark','light-mode','inverted','outline']) {
 const svg=read(`client/public/brand/flat/${name}.svg`);
 assert.ok(svg.includes(path),`${name} must reuse canonical launcher-family geometry`);
 assert.match(svg,/viewBox="0 0 64 64"/);
}
assert.doesNotMatch(flatGenerator,/brand\/launcher|root, 'launcher'/,'Website flat-brand generation must not manufacture launcher artwork');
assert.match(read('client/public/brand/glyphs/H.svg'),/fill="currentColor"/);
assert.match(read('client/public/brand/glyphs/H-black.svg'),/fill="#000000"/);
assert.match(read('client/public/brand/glyphs/H-white.svg'),/fill="#FFFFFF"/);
assert.match(read('client/public/brand/glyphs/H-gold.svg'),/fill="#F4C430"/);
for(const game of ['anagrams-race','ayo']) assert.equal(read(`client/public/game-icons/${game}.svg`),read(`client/src/assets/game-icons/${game}.svg`));


assert.match(indexHtml, new RegExp(`property="og:image" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-original-png1"`), 'Social share metadata must use the approved original HGR PNG');
assert.match(indexHtml, new RegExp(`property="og:image:secure_url" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-original-png1"`), 'Social share image must expose the approved PNG over a secure URL');
assert.match(indexHtml, new RegExp(`name="twitter:image" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-original-png1"`), 'Twitter/social fallback must use the approved original HGR PNG');
assert.doesNotMatch(indexHtml, /(?:og:image|twitter:image)[^>]+app-icon-reference\.png/, 'Social previews must never use the installed-app reference sheet');
