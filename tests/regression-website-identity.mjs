import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const bytes = p => readFileSync(resolve(root, p));
const version = read('VERSION').trim();
const versionRe = version.replaceAll('.', '\\.');
const path = 'M13 16H28L25 20V30H39V20L36 16H51L48 20V44L51 48H36L39 44V35H25V44L28 48H13L16 44V20Z';

const iconSetGlyph = read('assets/branding/icon-sets/glyphs/hgr-h.svg');
assert.ok(iconSetGlyph.includes(path), 'Canonical icon-set H glyph must contain the approved H geometry');
for (const file of ['shared/platform/brand.ts', 'client/index.html', 'client/public/halieus-mark.svg', 'client/public/app-icon.svg', 'client/public/halieus-app-icon.svg']) {
  assert.ok(read(file).includes(path), `${file}: canonical launcher-family H required`);
}
for (const file of ['client/src/platform/components/HomeScreen.tsx', 'client/src/platform/accounts/AccountPortal.tsx', 'client/src/platform/components/HalieusIntro.tsx']) {
  assert.match(read(file), /HalieusBrandMark/);
}

const app = read('client/src/App.tsx');
assert.match(app, /favicon\.href = game\.icon/);
assert.match(app, /document\.title = `\$\{game\.name\} · Halieus Game Room`/);
assert.match(app, new RegExp(`favicon\\.href = "\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h6"`), 'HGR home/tab favicon must use the canonical current web mark');
assert.doesNotMatch(app, /makeHalieusTabGlyph/, 'Runtime must not redraw the HGR favicon');

// Current tracked browser/PWA install rasters are deliberately rebaselined from
// the canonical web H. Contextual game art remains protected by the same fixture.
const fixture = JSON.parse(read('tests/fixtures/pre2b-website-assets.json'));
for (const [file, expected] of Object.entries(fixture)) {
  let value = bytes(file);
  if (file.endsWith('.svg')) value = Buffer.from(value.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(createHash('sha256').update(value).digest('hex'), expected, `${file}: protected website asset changed unexpectedly`);
}

const manifest = JSON.parse(read('client/public/site.webmanifest'));
assert.ok(manifest.icons.every(i => i.src.includes(`?v=${version}`)), `PWA identities must invalidate prior artwork URLs for ${version}`);
assert.deepEqual(
  manifest.icons.map(i => i.src.split('?')[0]),
  ['/app-icon-192.png', '/app-icon-512.png'],
  'Installed Halieus PWA must use the current canonical H raster exports',
);
assert.deepEqual(manifest.icons.map(i => i.sizes), ['192x192', '512x512']);
assert.ok(manifest.icons.every(i => i.type === 'image/png'));
assert.ok(manifest.icons.some(i => String(i.purpose).includes('maskable')), 'Main PWA must provide a maskable install icon');
assert.ok(manifest.icons.every(i => !/halieus-app-icon|app-icon-reference|HGR Main/i.test(i.src)), 'Legacy/social artwork must not be an install icon source');
assert.equal(manifest._legacy_social_asset, '/halieus-app-icon.png', 'Legacy 1024px raster may remain only as an explicitly non-install social asset');

const retiredMain = bytes('assets/branding/references/HGR Main.png');
const legacySocial = bytes('client/public/halieus-app-icon.png');
assert.equal(
  createHash('sha256').update(legacySocial).digest('hex'),
  createHash('sha256').update(retiredMain).digest('hex'),
  'Legacy social raster remains pinned for backwards compatibility and must not be confused with the new install assets',
);
const pngSize = buffer => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
assert.deepEqual(pngSize(legacySocial), { width: 1024, height: 1024 }, 'Legacy social raster remains 1024px square');
assert.deepEqual(pngSize(bytes('client/public/app-icon-192.png')), { width: 192, height: 192 });
assert.deepEqual(pngSize(bytes('client/public/app-icon-512.png')), { width: 512, height: 512 });
assert.deepEqual(pngSize(bytes('client/public/app-icon-180.png')), { width: 180, height: 180 });
assert.deepEqual(pngSize(bytes('client/public/favicon-32.png')), { width: 32, height: 32 });

const indexHtml = read('client/index.html');
assert.match(indexHtml, new RegExp(`id="halieus-dynamic-favicon"[^>]*href="\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h6"`), 'Initial browser favicon must use the canonical current H mark');
assert.match(indexHtml, new RegExp(`rel="shortcut icon"[^>]*href="\\/halieus-mark\\.svg\\?v=${versionRe}-brand-h6"`), 'Shortcut favicon must use the canonical current H mark');
assert.doesNotMatch(indexHtml, /app-icon-reference\.png/, 'Historical install reference must not remain in live HTML');

const pwaCopy = read('scripts/copy-approved-pwa-icon.mjs');
assert.match(pwaCopy, /rm\(resolve\(publicDir, "app-icon-reference\.png"\), \{ force: true \}\)/, 'Client prebuild must remove the stale historical install thumbnail');
assert.doesNotMatch(pwaCopy, /HGR Main\.png|copyFile\(approvedMainIcon/, 'Client prebuild must never restore the retired main install thumbnail');
for (const file of ['halieus-app-icon.svg', 'app-icon-180.png', 'app-icon-192.png', 'app-icon-512.png', 'favicon-32.png', 'favicon.ico']) {
  assert.ok(pwaCopy.includes(`"${file}"`), `Client prebuild must verify ${file}`);
}
assert.match(pwaCopy, /halieus-app-icon\.png remains only as a legacy social\/reference asset/, 'Prebuild must document that the 1024px legacy raster is not an install source');
const clientPackage = JSON.parse(read('client/package.json'));
assert.equal(clientPackage.scripts.prebuild, 'node ../scripts/copy-approved-pwa-icon.mjs', 'Client prebuild must verify current PWA assets before Vite runs');

const flatGenerator = read('scripts/generate-flat-brand.mjs');
assert.match(flatGenerator, /assets\/branding\/icon-sets\/glyphs\/hgr-h\.svg/, 'Web brand generator must source H geometry from icon sets');
const generator = read('scripts/generate-platform-icons.mjs');
assert.doesNotMatch(generator, /assets\/branding/, 'Website raster generator must remain independent of launcher image assets');
assert.match(generator, /halieus-app-icon\.svg/, 'Platform raster generator must source the canonical current web icon SVG');
assert.doesNotMatch(generator, /writeFile\(resolve\(output, 'halieus-app-icon\.png'/, 'Install raster generator must not overwrite the pinned legacy social asset');
for (const size of [180, 192, 512]) assert.ok(generator.includes(`app-icon-${size}.png`));
assert.match(generator, /favicon-32\.png/);
assert.match(generator, /favicon\.ico/);

for (const name of ['brand-default', 'mono-gold', 'mono-light', 'mono-dark', 'light-mode', 'inverted', 'outline']) {
  const svg = read(`client/public/brand/flat/${name}.svg`);
  assert.ok(svg.includes(path), `${name} must reuse canonical launcher-family geometry`);
  assert.match(svg, /viewBox="0 0 64 64"/);
}
assert.doesNotMatch(flatGenerator, /brand\/launcher|root, 'launcher'/, 'Website flat-brand generation must not manufacture launcher artwork');
assert.match(read('client/public/brand/glyphs/H.svg'), /fill="currentColor"/);
assert.match(read('client/public/brand/glyphs/H-black.svg'), /fill="#000000"/);
assert.match(read('client/public/brand/glyphs/H-white.svg'), /fill="#FFFFFF"/);
assert.match(read('client/public/brand/glyphs/H-gold.svg'), /fill="#F4C430"/);
for (const game of ['anagrams-race', 'ayo']) assert.equal(read(`client/public/game-icons/${game}.svg`), read(`client/src/assets/game-icons/${game}.svg`));

assert.match(indexHtml, new RegExp(`property="og:image" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-original-png1"`), 'Existing social share metadata remains on the pinned legacy social PNG');
assert.match(indexHtml, new RegExp(`property="og:image:secure_url" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-original-png1"`), 'Existing secure social share image remains stable');
assert.match(indexHtml, new RegExp(`name="twitter:image" content="https:\\/\\/halieus\\.remotewire\\.net\\/halieus-app-icon\\.png\\?v=${versionRe}-original-png1"`), 'Twitter/social fallback remains stable while install identity moves independently');
assert.doesNotMatch(indexHtml, /(?:og:image|twitter:image)[^>]+app-icon-reference\.png/, 'Social previews must never use the retired install reference');

console.log('PASS current launcher-family H across website favicon and PWA install exports; legacy social raster isolated');
