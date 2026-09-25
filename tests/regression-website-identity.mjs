import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const path = 'M17 15h10v12h10V15h10v34H37V36H27v13H17z';
const sources = ['client/src/platform/components/HalieusBrandMark.tsx', 'client/src/App.tsx', 'client/index.html', 'client/public/halieus-mark.svg', 'client/public/halieus-app-icon.svg', 'client/public/app-icon.svg'];
for (const file of sources) {
  assert.ok(read(file).includes(path), `${file}: reference-backed website block H required`);
  assert.ok(!read(file).includes('M12 12h17v5h-4'), `${file}: launcher slab must not enter website identity`);
}
for (const file of ['client/src/platform/components/HomeScreen.tsx', 'client/src/platform/accounts/AccountPortal.tsx', 'client/src/platform/components/HalieusIntro.tsx']) assert.match(read(file), /HalieusBrandMark/);
assert.match(read('client/src/App.tsx'), /favicon\.href = game\.icon/);
assert.match(read('client/src/App.tsx'), /document\.title = `\$\{game\.name\} · Halieus Game Room`/);
const fixture = JSON.parse(read('tests/fixtures/pre2b-website-assets.json'));
for (const [file, expected] of Object.entries(fixture)) {
  let bytes = readFileSync(resolve(root, file));
  if (file.endsWith('.svg')) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${file}: website raster or contextual game artwork changed`);
}
const manifest = JSON.parse(read('client/public/site.webmanifest'));
assert.ok(manifest.icons.every(i => i.src.includes('4.5.0-website-h')), 'PWA identities must invalidate prior artwork URLs');
assert.ok(manifest.icons.some(i => i.src.startsWith('/halieus-app-icon.svg')));
const generator = read('scripts/generate-platform-icons.mjs');
assert.doesNotMatch(generator, /assets\/branding/, 'Website generator must be independent of launcher assets');
assert.match(generator, /client\/public/);
console.log('PASS website block H, boot/tab/PWA consumers, raster exports and separate M/P artwork');
