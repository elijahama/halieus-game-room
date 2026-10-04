import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const version = read("VERSION").trim();

const manifest = JSON.parse(read("client/public/site.webmanifest"));
const iconSources = (manifest.icons || []).map((icon) => icon.src);
assert.deepEqual(iconSources, [
  `/app-icon-192.png?v=${version}-install-h3`,
  `/app-icon-512.png?v=${version}-install-h3`,
], "Main HGR PWA must install from the canonical generated H icon sizes with release-versioned cache busting");
assert.equal(manifest.x_hgr_legacy_reference, "/halieus-app-icon.png", "Legacy rendered icon may remain reference-only, never install authority");

for (const file of ["client/public/app-icon-180.png", "client/public/app-icon-192.png", "client/public/app-icon-512.png", "client/public/favicon-32.png"]) {
  assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} must exist`);
  assert.ok(statSync(new URL(`../${file}`, import.meta.url)).size > 0, `${file} must not be empty`);
}

const identityGuard = read("client/src/platform/identity/IdentityAssetGuard.tsx");
assert.match(identityGuard, /install-h3/, "Browser identity guard must bump favicon\/manifest revision");
assert.match(identityGuard, /halieus-mark\.svg/, "Browser favicon must use the canonical HGR web mark");
assert.match(identityGuard, /app-icon-180\.png/, "Apple touch identity must use the canonical generated icon");
assert.match(identityGuard, /site\.webmanifest/, "Manifest link must be refreshed with the identity revision");

const mobileIdentityCss = read("client/src/styles/hgr-4.5.4-identity.css");
assert.match(mobileIdentityCss, /@media \(max-width: 520px\)/, "Portrait identity rule must be phone scoped");
assert.match(mobileIdentityCss, /\.halieus-mobile-brand strong[\s\S]*display:\s*block\s*!important/, "Portrait header must keep Halieus Game Room wording visible");

const main = read("client/src/main.tsx");
assert.match(main, /IdentityAssetGuard/, "Main entry must mount the browser identity guard");
assert.match(main, /hgr-4\.5\.4-identity\.css/, "Main entry must load the portrait identity override last");

const sw = read("client/public/sw.js");
assert.match(sw, /install-h3/, "Service worker shell must refresh install identity revision");
assert.match(sw, /IDENTITY_PATHS/, "Service worker must treat identity assets separately from cache-first shell files");
assert.match(sw, /cache:\s*'reload'/, "Identity assets must bypass stale browser HTTP cache when refreshed");

console.log("HGR 4.5.4 identity/PWA Batch 1 regression PASS");
