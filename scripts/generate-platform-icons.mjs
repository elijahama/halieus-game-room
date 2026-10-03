// Website-only raster exports. Never consumes or writes Windows launcher artwork.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'client/public');
const svg = await readFile(resolve(output, 'halieus-app-icon.svg'), 'utf8');
const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  async function render(size) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    return page.screenshot({ omitBackground: true });
  }

  for (const size of [180, 192, 512]) {
    await writeFile(resolve(output, `app-icon-${size}.png`), await render(size));
  }
  await writeFile(resolve(output, 'halieus-app-icon.png'), await render(1024));
  await writeFile(resolve(output, 'favicon-32.png'), await render(32));

  const sizes = [16, 32, 48, 64];
  const pngs = [];
  for (const size of sizes) pngs.push(await render(size));
  const directory = Buffer.alloc(6 + 16 * sizes.length);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(sizes.length, 4);
  let offset = directory.length;
  pngs.forEach((png, i) => {
    const entry = 6 + 16 * i;
    directory[entry] = directory[entry + 1] = sizes[i];
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(resolve(output, 'favicon.ico'), Buffer.concat([directory, ...pngs]));
  console.log('Generated current Halieus favicon and PWA PNG/ICO exports from halieus-app-icon.svg.');
} finally { await browser.close(); }
