// Canonical MAIN HGR identity raster exports.
// This script consumes only the approved current H web vector and synchronises
// browser/PWA/social + main desktop/package identity. It NEVER touches the
// role-specific Start/Restart/Close/Update/PowerShell/OpenShard/Control artwork.
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'client/public');
const svgPath = resolve(output, 'halieus-app-icon.svg');
const canonicalGlyphPath = resolve(root, 'assets/branding/icon-sets/glyphs/hgr-h.svg');
const svg = await readFile(svgPath, 'utf8');
const glyph = await readFile(canonicalGlyphPath, 'utf8');
const canonicalPath = glyph.match(/<path\b[^>]*\bd="([^"]+)"/)?.[1];
if (!canonicalPath || !svg.includes(canonicalPath)) {
  throw new Error('Main identity SVG does not contain the canonical HGR launcher-family H.');
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  async function render(size) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    return page.screenshot({ omitBackground: true });
  }

  const rendered = new Map();
  for (const size of [16, 32, 48, 64, 128, 180, 192, 256, 512]) rendered.set(size, await render(size));

  for (const size of [180, 192, 512]) {
    await writeFile(resolve(output, `app-icon-${size}.png`), rendered.get(size));
  }
  await writeFile(resolve(output, 'favicon-32.png'), rendered.get(32));
  await writeFile(resolve(output, 'halieus-app-icon.png'), rendered.get(512));

  function icoFromSizes(sizes) {
    const pngs = sizes.map((size) => rendered.get(size));
    const directory = Buffer.alloc(6 + 16 * sizes.length);
    directory.writeUInt16LE(1, 2);
    directory.writeUInt16LE(sizes.length, 4);
    let offset = directory.length;
    pngs.forEach((png, i) => {
      const size = sizes[i];
      const entry = 6 + 16 * i;
      directory[entry] = size >= 256 ? 0 : size;
      directory[entry + 1] = size >= 256 ? 0 : size;
      directory.writeUInt16LE(1, entry + 4);
      directory.writeUInt16LE(32, entry + 6);
      directory.writeUInt32LE(png.length, entry + 8);
      directory.writeUInt32LE(offset, entry + 12);
      offset += png.length;
    });
    return Buffer.concat([directory, ...pngs]);
  }

  const faviconIco = icoFromSizes([16, 32, 48, 64]);
  const mainIco = icoFromSizes([16, 32, 48, 64, 128, 256]);
  await writeFile(resolve(output, 'favicon.ico'), faviconIco);

  const mainPngTargets = [
    'assets/Halieus Game Room.png',
    'assets/app-icon.png',
    'assets/branding/Halieus Game Room.png',
    'assets/branding/references/HGR Main.png',
    'desktop/assets/Halieus Game Room.png',
    'server/Halieus Game Room.png',
    'server/assets/branding/Halieus Game Room.png',
  ];
  const mainIcoTargets = [
    'assets/Halieus Game Room.ico',
    'assets/branding/Halieus Game Room.ico',
    'desktop/assets/Halieus Game Room.ico',
    'server/Halieus Game Room.ico',
    'server/assets/branding/Halieus Game Room.ico',
  ];
  for (const relative of mainPngTargets) {
    const path = resolve(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, rendered.get(512));
  }
  for (const relative of mainIcoTargets) {
    const path = resolve(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, mainIco);
  }

  const sha256 = (value) => createHash('sha256').update(value).digest('hex');
  const identityRecord = {
    source: 'client/public/halieus-app-icon.svg',
    canonicalGlyph: 'assets/branding/icon-sets/glyphs/hgr-h.svg',
    sourceSvgSha256: sha256(Buffer.from(svg)),
    canonicalGlyphSha256: sha256(Buffer.from(glyph)),
    appIcon512Sha256: sha256(rendered.get(512)),
    favicon32Sha256: sha256(rendered.get(32)),
    faviconIcoSha256: sha256(faviconIco),
    mainIcoSha256: sha256(mainIco),
    generatedFromCanonicalH: true,
  };
  await writeFile(resolve(output, 'identity-artwork.json'), `${JSON.stringify(identityRecord, null, 2)}\n`);

  console.log('Generated favicon/PWA/social/main desktop identity from the canonical current H; utility role artwork untouched.');
} finally {
  await browser.close();
}
