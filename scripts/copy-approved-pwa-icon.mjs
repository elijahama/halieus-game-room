import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");

// Old experimental install thumbnail must never compete with the current icon.
await rm(resolve(publicDir, "app-icon-reference.png"), { force: true });

// 4.5.4 browser/install identity follows the same canonical launcher-family H
// used by the live Halieus website. These tracked exports are generated from
// halieus-app-icon.svg by scripts/generate-platform-icons.mjs. The historical
// 1024px halieus-app-icon.png remains only as a legacy social/reference asset
// for backwards compatibility; it is not a favicon or PWA install source.
for (const file of [
  "halieus-mark.svg",
  "halieus-app-icon.svg",
  "app-icon-180.png",
  "app-icon-192.png",
  "app-icon-512.png",
  "favicon-32.png",
  "favicon.ico",
]) {
  await access(resolve(publicDir, file));
}

console.log("Verified current canonical Halieus favicon and PWA install exports.");
