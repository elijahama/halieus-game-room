// Flat/runtime brand exports generated from the one canonical H geometry.
// Rendered PWA artwork may add a restrained gradient, but geometry and role
// colours remain shared across website, Control and Windows launcher surfaces.
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../client/public/brand');
const canonicalGlyph = await readFile(resolve(import.meta.dirname, '../assets/branding/icon-sets/glyphs/hgr-h.svg'), 'utf8');
const HGR_H_PATH = canonicalGlyph.match(/<path\b[^>]*\bd="([^"]+)"/)?.[1];
if (!HGR_H_PATH) throw new Error('Canonical icon-set H path missing.');

for (const relative of [
  'client/public/halieus-mark.svg',
  'client/public/halieus-app-icon.svg',
  'client/public/app-icon.svg',
  'client/index.html',
]) {
  const file = resolve(import.meta.dirname, '..', relative);
  const text = await readFile(file, 'utf8');
  const updated = text.replace(/(<path[^>]*?d=")[^"]*(")/, `$1${HGR_H_PATH}$2`);
  await writeFile(file, updated);
}

const flatPresets = {
  'brand-default': ['#F4C430', '#000000'],
  'mono-gold': ['none', '#F4C430'],
  'mono-light': ['none', '#FFFFFF'],
  'mono-dark': ['none', '#000000'],
  'light-mode': ['#FFFFFF', '#000000'],
  inverted: ['#080B10', '#F4C430'],
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });

  async function render(folder, name, svg, writeIco = false) {
    await mkdir(folder, { recursive: true });
    await writeFile(resolve(folder, name + '.svg'), svg + '\n');
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:256px;height:256px}</style>${svg}`);
    const png = await page.screenshot({ omitBackground: true });
    await writeFile(resolve(folder, name + '.png'), png);
    if (writeIco) {
      const h = Buffer.alloc(22);
      h.writeUInt16LE(1, 2);
      h.writeUInt16LE(1, 4);
      h.writeUInt16LE(1, 10);
      h.writeUInt16LE(32, 12);
      h.writeUInt32LE(png.length, 14);
      h.writeUInt32LE(22, 18);
      await writeFile(resolve(folder, name + '.ico'), Buffer.concat([h, png]));
    }
  }

  for (const [name, [bg, fg]] of Object.entries(flatPresets)) {
    const rect = bg === 'none' ? '' : `<rect x="3" y="3" width="58" height="58" rx="15" fill="${bg}"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${rect}<path d="${HGR_H_PATH}" fill="${fg}"/></svg>`;
    await render(resolve(root, 'flat'), name, svg);
  }

  const outline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="3.5" y="3.5" width="57" height="57" rx="14.5" fill="none" stroke="#F4C430" stroke-width="2"/><path d="${HGR_H_PATH}" fill="none" stroke="#F4C430" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
  await render(resolve(root, 'flat'), 'outline', outline);

  const glyphs = resolve(root, 'glyphs');
  await mkdir(glyphs, { recursive: true });
  await writeFile(resolve(glyphs, 'H.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="currentColor" d="${HGR_H_PATH}"/></svg>\n`);
  await copyFile(resolve(root, 'flat/mono-light.png'), resolve(glyphs, 'H-white.png'));
  await copyFile(resolve(root, 'flat/mono-dark.png'), resolve(glyphs, 'H-black.png'));
  await copyFile(resolve(root, 'flat/mono-gold.png'), resolve(glyphs, 'H-gold.png'));
} finally {
  await browser.close();
}
