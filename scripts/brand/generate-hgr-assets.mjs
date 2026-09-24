import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BRAND_ROOT = path.join(ROOT, "assets", "branding");
const LAUNCHER_ROOT = path.join(BRAND_ROOT, "launchers", "matte");
const PUBLIC_ROOT = path.join(ROOT, "client", "public");

const H_PATH = "M12 12h17v5h-4v12h14V17h-4v-5h17v5h-5v30h5v5H35v-5h4V35H25v12h4v5H12v-5h5V17h-5z";

const colours = {
  brand: "#daa017",
  start: "#4e7f5d",
  restart: "#e67e22",
  close: "#b44b4b",
  update: "#4b78bb",
  powershell: "#64748b",
  openshard: "#8b5bd6",
};

const launchers = [
  { id: "start", file: "Start Halieus Game Room", colour: colours.start, glyph: "play" },
  { id: "restart", file: "Restart Halieus Game Room", colour: colours.restart, glyph: "restart" },
  { id: "close", file: "Close Halieus Game Room", colour: colours.close, glyph: "close" },
  { id: "update", file: "Update Halieus Website", colour: colours.update, glyph: "globe" },
  { id: "powershell", file: "HGR PowerShell", colour: colours.powershell, glyph: "terminal" },
  { id: "openshard", file: "HGR OpenShard TUI", colour: colours.openshard, glyph: "receipt" },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function badgeGlyph(kind) {
  const common = 'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
  switch (kind) {
    case "play":
      return '<path d="M26 22 43 32 26 42Z" fill="currentColor"/>';
    case "restart":
      return `<path d="M42 24a14 14 0 1 0 1 14" ${common}/><path d="M42 16v10h-10" ${common}/>`;
    case "close":
      return `<circle cx="32" cy="34" r="13" ${common}/><path d="m27 29 10 10m0-10L27 39" ${common}/>`;
    case "globe":
      return `<circle cx="32" cy="34" r="13" ${common}/><path d="M19 34h26M32 21c4 4 6 8 6 13s-2 9-6 13c-4-4-6-8-6-13s2-9 6-13Z" ${common}/>`;
    case "terminal":
      return `<rect x="19" y="21" width="27" height="25" rx="6" fill="#111318" stroke="rgba(255,255,255,.22)" stroke-width="1.4"/><path d="m25 28 6 6-6 6M34 40h7" ${common}/>`;
    case "receipt":
      return `<path d="M23 19h20v29l-4-3-4 3-4-3-4 3-4-3V19Z" fill="#111318" stroke="rgba(255,255,255,.22)" stroke-width="1.4"/><path d="M28 27h10M28 33h10M28 39h7" ${common}/>`;
    default:
      throw new Error(`Unknown glyph: ${kind}`);
  }
}

function glyphSvg(colour, title = "Halieus Game Room") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(title)}">
  <path fill="${colour}" stroke="#111318" stroke-width="0.8" paint-order="stroke fill" d="${H_PATH}"/>
</svg>`;
}

function iconSvg({ colour, glyph = null, title = "Halieus Game Room" }) {
  const badge = glyph
    ? `<g class="badge" color="#111318">${badgeGlyph(glyph)}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${colour}"/>
      <stop offset="1" stop-color="${mixWithBlack(colour, 0.14)}"/>
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#tile)"/>
  <rect x="4.2" y="4.2" width="55.6" height="55.6" rx="13.8" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.2"/>
  <path fill="#111318" d="${H_PATH}"/>
  ${badge}
</svg>`;
}

function mixWithBlack(hex, amount) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * (1 - amount)).toString(16).padStart(2, "0")).join("")}`;
}

async function ensureDirs() {
  await Promise.all([
    mkdir(BRAND_ROOT, { recursive: true }),
    mkdir(LAUNCHER_ROOT, { recursive: true }),
    mkdir(PUBLIC_ROOT, { recursive: true }),
  ]);
}

async function writeSources() {
  const master = iconSvg({ colour: colours.brand, title: "Halieus Game Room" });
  await writeFile(path.join(BRAND_ROOT, "Halieus Game Room.svg"), master);
  await writeFile(path.join(PUBLIC_ROOT, "halieus-mark.svg"), glyphSvg(colours.brand));

  for (const launcher of launchers) {
    await writeFile(
      path.join(LAUNCHER_ROOT, `${launcher.file}.svg`),
      iconSvg({ colour: launcher.colour, glyph: launcher.glyph, title: launcher.file }),
    );
  }
}

async function rasterizeSvg(browser, svgPath, size) {
  const svg = await readFile(svgPath, "utf8");
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent;width:${size}px;height:${size}px;overflow:hidden"><div id="asset" style="width:${size}px;height:${size}px">${svg}</div><style>svg{display:block;width:100%;height:100%}</style></body></html>`);
  const buffer = await page.locator("#asset").screenshot({ omitBackground: true });
  await page.close();
  return buffer;
}

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.buffer.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.buffer)]);
}

async function renderOutputs() {
  const browser = await chromium.launch({ headless: true });
  try {
    const masterSvg = path.join(BRAND_ROOT, "Halieus Game Room.svg");
    const publicSizes = [
      [32, "favicon-32.png"],
      [180, "app-icon-180.png"],
      [192, "app-icon-192.png"],
      [512, "app-icon-512.png"],
    ];
    for (const [size, file] of publicSizes) {
      await writeFile(path.join(PUBLIC_ROOT, file), await rasterizeSvg(browser, masterSvg, size));
    }

    const faviconImages = [];
    for (const size of [16, 32, 48, 64, 128, 256]) {
      faviconImages.push({ size, buffer: await rasterizeSvg(browser, masterSvg, size) });
    }
    await writeFile(path.join(PUBLIC_ROOT, "favicon.ico"), createIco(faviconImages));

    const baseIcoImages = [];
    for (const size of [32, 48, 64, 128, 256]) {
      baseIcoImages.push({ size, buffer: await rasterizeSvg(browser, masterSvg, size) });
    }
    await writeFile(path.join(BRAND_ROOT, "Halieus Game Room.ico"), createIco(baseIcoImages));

    for (const launcher of launchers) {
      const svgPath = path.join(LAUNCHER_ROOT, `${launcher.file}.svg`);
      const icoImages = [];
      for (const size of [32, 48, 64, 128, 256]) {
        icoImages.push({ size, buffer: await rasterizeSvg(browser, svgPath, size) });
      }
      await writeFile(path.join(LAUNCHER_ROOT, `${launcher.file}.ico`), createIco(icoImages));
      await writeFile(path.join(LAUNCHER_ROOT, `${launcher.file}.png`), await rasterizeSvg(browser, svgPath, 512));
    }
  } finally {
    await browser.close();
  }
}

await ensureDirs();
await writeSources();

if (!process.argv.includes("--source-only")) {
  await renderOutputs();
}

console.log("HGR brand assets generated from the canonical matte utility family.");
