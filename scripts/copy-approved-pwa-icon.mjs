import { createHash } from "node:crypto";
import { access, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");
const canonicalGlyph = resolve(root, "assets/branding/icon-sets/glyphs/hgr-h.svg");
const canonicalAppSvg = resolve(publicDir, "halieus-app-icon.svg");
const identityRecordPath = resolve(publicDir, "identity-artwork.json");
const canonicalPath = "M13 16H28L25 20V30H39V20L36 16H51L48 20V44L51 48H36L39 44V35H25V44L28 48H13L16 44V20Z";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

await rm(resolve(publicDir, "app-icon-reference.png"), { force: true });

const [glyphSvg, appSvg, identityRecordRaw] = await Promise.all([
  readFile(canonicalGlyph, "utf8"),
  readFile(canonicalAppSvg, "utf8"),
  readFile(identityRecordPath, "utf8"),
]);
if (!glyphSvg.includes(canonicalPath) || !appSvg.includes(canonicalPath)) {
  throw new Error("Canonical HGR launcher-family H geometry is missing from the PWA identity sources.");
}

const record = JSON.parse(identityRecordRaw);
if (!record.generatedFromCanonicalH ||
    record.sourceSvgSha256 !== sha256(Buffer.from(appSvg)) ||
    record.canonicalGlyphSha256 !== sha256(Buffer.from(glyphSvg))) {
  throw new Error("Main HGR identity rasters are stale relative to the canonical H. Run node scripts/generate-platform-icons.mjs.");
}

const checks = [
  ["app-icon-512.png", "appIcon512Sha256"],
  ["halieus-app-icon.png", "appIcon512Sha256"],
  ["favicon-32.png", "favicon32Sha256"],
  ["favicon.ico", "faviconIcoSha256"],
];
for (const [file, key] of checks) {
  const bytes = await readFile(resolve(publicDir, file));
  if (sha256(bytes) !== record[key]) {
    throw new Error(`${file} is stale or does not match the canonical generated H identity.`);
  }
}

const canonicalInstall = await readFile(resolve(publicDir, "app-icon-512.png"));
const compatibilityPng = await readFile(resolve(publicDir, "halieus-app-icon.png"));
if (!canonicalInstall.equals(compatibilityPng)) {
  throw new Error("Social/compatibility HGR image must be byte-identical to the canonical 512px install icon.");
}

for (const file of [
  "halieus-mark.svg",
  "app-icon.svg",
  "app-icon-180.png",
  "app-icon-192.png",
  "app-icon-512.png",
  "favicon-32.png",
  "favicon.ico",
]) await access(resolve(publicDir, file));

console.log("Validated canonical current-H favicon/PWA/install/social identity.");
