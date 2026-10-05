import { access, copyFile, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");
const canonicalGlyph = resolve(root, "assets/branding/icon-sets/glyphs/hgr-h.svg");
const canonicalAppSvg = resolve(publicDir, "halieus-app-icon.svg");
const canonicalInstallRaster = resolve(publicDir, "app-icon-512.png");
const compatibilityPng = resolve(publicDir, "halieus-app-icon.png");
const canonicalPath = "M13 16H28L25 20V30H39V20L36 16H51L48 20V44L51 48H36L39 44V35H25V44L28 48H13L16 44V20Z";

// Historical install artwork must never compete with the current launcher-family H.
await rm(resolve(publicDir, "app-icon-reference.png"), { force: true });

// The canonical H geometry is the authority. Refuse to run the client build if
// either the glyph contract or the app SVG drifts to an invented replacement H.
const [glyphSvg, appSvg] = await Promise.all([
  readFile(canonicalGlyph, "utf8"),
  readFile(canonicalAppSvg, "utf8"),
]);
if (!glyphSvg.includes(canonicalPath) || !appSvg.includes(canonicalPath)) {
  throw new Error("Canonical HGR launcher-family H geometry is missing from the PWA identity sources.");
}

// Chrome/Brave install authority remains the committed canonical 192/512 raster
// exports. The compatibility/social PNG is now an alias of that family instead
// of being overwritten at every build by the superseded historical HGR Main PNG.
await access(canonicalInstallRaster);
await copyFile(canonicalInstallRaster, compatibilityPng);

for (const file of [
  "halieus-mark.svg",
  "app-icon.svg",
  "app-icon-180.png",
  "app-icon-192.png",
  "app-icon-512.png",
  "favicon-32.png",
  "favicon.ico",
]) {
  await access(resolve(publicDir, file));
}

console.log("Prepared canonical launcher-family H favicon/PWA/install identity.");
