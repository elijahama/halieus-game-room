import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const version = read('VERSION').trim();
const versionRe = version.replaceAll('.', '\\.');
const path = 'M13 16H28L25 20V30H39V20L36 16H51L48 20V44L51 48H36L39 44V35H25V44L28 48H13L16 44V20Z';
const iconSetGlyph = read('assets/branding/icon-sets/glyphs/hgr-h.svg');
assert.ok(iconSetGlyph.includes(path), 'Canonical icon-set H glyph must contain the approved H geometry');
const sources = ['shared/platform/brand.ts', 'client/index.html', 'client/public/halieus-mark.svg', 'client/public/app-icon.svg', 'client/public/halieus-app-icon.svg'];
for (const file of sources) {
  assert.ok(read(file).includes(path), `${file}: canonical launcher-family H required`);
}
for (const file of ['client/src/platform/components/HomeScreen.tsx', 'client/src/platform/accounts/AccountPortal.tsx', 'client/src/platform/components/HalieusIntro.tsx']) assert.match(read(file), /HalieusBrandMark/);
const app = read('client/src/App.tsx');
assert.match(app, /favicon\.href = game\.icon/);
assert.match(app, /document\.title = `\$\{game\.name\} · Halieus Game Room`/);
assert.match(app, new RegExp(`favicon\\.href = "\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h9"`), 'HGR home/tab favicon reset must use the canonical HGR web mark');
assert.doesNotMatch(app, /makeHalieusTabGlyph/, 'Runtime must not redraw the HGR favicon');
const fixture = JSON.parse(read('tests/fixtures/pre2b-website-assets.json'));
for (const [file, expected] of Object.entries(fixture)) {
  let bytes = readFileSync(resolve(root, file));
  if (file.endsWith('.svg')) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${file}: website raster or contextual game artwork changed`);
}
const manifest = JSON.parse(read('client/public/site.webmanifest'));
assert.ok(manifest.icons.every(i => i.src.includes(`?v=${version}-install-h5`)), `PWA identities must invalidate prior H artwork URLs for ${version}`);
assert.deepEqual(manifest.icons.map(i => i.src.split("?")[0]), ['/app-icon-192.png', '/app-icon-512.png'], 'Installed Halieus PWA must use the canonical generated H icon sizes');
assert.ok(manifest.icons.every(i => i.type === 'image/png'), 'Installed Halieus identity must use PNG raster exports of the canonical web mark');
assert.deepEqual(manifest.icons.map(i => i.sizes), ['192x192', '512x512'], 'Installed Halieus PNGs must declare their generated square sizes');
assert.ok(manifest.icons.every(i => !/app-icon-reference|halieus-app-icon\.png/.test(i.src)), 'Compatibility/history PNGs must not override canonical PWA install authority');
assert.equal(manifest.x_hgr_canonical_vector, '/halieus-app-icon.svg', 'Manifest must record the canonical H vector authority');
for (const file of ['client/public/app-icon-192.png', 'client/public/app-icon-512.png']) {
  const bytes = readFileSync(resolve(root, file));
  assert.ok(bytes.length > 0, `${file}: canonical PWA raster export must exist`);
}
const canonicalInstallBytes = readFileSync(resolve(root, 'client/public/app-icon-512.png'));
const compatibilityPwaBytes = readFileSync(resolve(root, 'client/public/halieus-app-icon.png'));
assert.equal(createHash('sha256').update(compatibilityPwaBytes).digest('hex'), createHash('sha256').update(canonicalInstallBytes).digest('hex'), 'Compatibility/social HGR PNG must alias the canonical launcher-family install raster after generation');
const identityArtwork = JSON.parse(read('client/public/identity-artwork.json'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(identityArtwork.generatedFromCanonicalH, true, 'Identity artwork record must prove canonical-H generation');
assert.equal(identityArtwork.sourceSvgSha256, sha256(readFileSync(resolve(root, 'client/public/halieus-app-icon.svg'))), 'Identity record must match the current canonical app SVG');
assert.equal(identityArtwork.canonicalGlyphSha256, sha256(readFileSync(resolve(root, 'assets/branding/icon-sets/glyphs/hgr-h.svg'))), 'Identity record must match the current canonical H glyph');
assert.equal(identityArtwork.appIcon512Sha256, sha256(canonicalInstallBytes), 'Identity record must match the generated 512px install raster');
for (const file of [
  'assets/Halieus Game Room.png',
  'assets/app-icon.png',
  'assets/branding/Halieus Game Room.png',
  'assets/branding/references/HGR Main.png',
  'desktop/assets/Halieus Game Room.png',
  'server/Halieus Game Room.png',
  'server/assets/branding/Halieus Game Room.png',
]) {
  assert.equal(sha256(readFileSync(resolve(root, file))), identityArtwork.appIcon512Sha256, `${file}: main app raster must use the current canonical H`);
}
for (const file of [
  'assets/Halieus Game Room.ico',
  'assets/branding/Halieus Game Room.ico',
  'desktop/assets/Halieus Game Room.ico',
  'server/Halieus Game Room.ico',
  'server/assets/branding/Halieus Game Room.ico',
]) {
  assert.equal(sha256(readFileSync(resolve(root, file))), identityArtwork.mainIcoSha256, `${file}: packaged main app ICO must use the current canonical H`);
}
const indexHtml = read('client/index.html');
assert.match(indexHtml, new RegExp(`rel="icon"[^>]*href="\\/favicon-32\\.png\\?v=${versionRe}-install-h5"`), 'Initial PNG favicon fallback must use the canonical generated H export');
assert.match(indexHtml, new RegExp(`rel="apple-touch-icon"[^>]*href="\\/app-icon-180\\.png\\?v=${versionRe}-install-h5"`), 'Apple touch icon must use the canonical generated H export');
assert.match(indexHtml, new RegExp(`id="halieus-dynamic-favicon"[^>]*href="\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h9"`), 'Initial browser favicon must use the canonical HGR web mark with fresh cache identity');
assert.match(indexHtml, new RegExp(`rel="shortcut icon"[^>]*href="\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h9"`), 'Shortcut favicon must use the canonical HGR web mark with fresh cache identity');
assert.match(indexHtml, new RegExp(`rel="manifest"[^>]*href="\\/site\\.webmanifest\\?v=${versionRe}-install-h5"`), 'Manifest discovery must use the fresh install identity revision');
assert.doesNotMatch(indexHtml, /app-icon-reference\.png/, 'Historical install reference must not remain in live HTML');
const pwaCopy = read('scripts/copy-approved-pwa-icon.mjs');
assert.match(pwaCopy,/rm\(resolve\(publicDir, "app-icon-reference\.png"\), \{ force: true \}\)/,'Client prebuild must remove the stale historical install thumbnail');
assert.match(pwaCopy,/canonicalGlyph/,'Client prebuild must validate the canonical launcher-family H authority');
assert.match(pwaCopy,/identity-artwork\.json/,'Client prebuild must validate the generated identity hash record');
assert.match(pwaCopy,/canonicalInstall\.equals\(compatibilityPng\)/,'Client prebuild must reject a social/compatibility PNG that differs from the generated install icon');
assert.doesNotMatch(pwaCopy,/HGR Main\.png/,'Client prebuild must never restore the superseded historical H over current browser/PWA identity');
const clientPackage = JSON.parse(read('client/package.json'));
assert.equal(clientPackage.scripts.prebuild,'node ../scripts/copy-approved-pwa-icon.mjs','Client prebuild must validate and prepare canonical identity before Vite runs');

const flatGenerator = read('scripts/generate-flat-brand.mjs');
assert.match(flatGenerator,/assets\/branding\/icon-sets\/glyphs\/hgr-h\.svg/,'Web brand generator must source H geometry from icon sets');
const generator = read('scripts/generate-platform-icons.mjs');
assert.match(generator, /assets\/branding\/references\/HGR Main\.png/, 'Main identity generator must refresh the approved HGR Main export from the canonical H');
assert.doesNotMatch(generator, /HGR Start\.png|HGR Restart\.png|HGR Close\.png|HGR Update\.png|HGR PowerShell\.png|HGR OpenShard\.png|HGR Control Launcher\.png/, 'Main identity generator must never redraw role-specific utility launcher artwork');
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

assert.match(indexHtml, new RegExp(`property="og:image" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-install-h5"`), 'Social share metadata must use the canonical H compatibility PNG revision');
assert.match(indexHtml, new RegExp(`property="og:image:secure_url" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-install-h5"`), 'Social share image must expose the canonical H compatibility PNG over a secure URL');
assert.match(indexHtml, new RegExp(`name="twitter:image" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-install-h5"`), 'Twitter/social fallback must use the canonical H compatibility PNG');
assert.doesNotMatch(indexHtml, /(?:og:image|twitter:image)[^>]+app-icon-reference\.png/, 'Social previews must never use the historical install reference sheet');
