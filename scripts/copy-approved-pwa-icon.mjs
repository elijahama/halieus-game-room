import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");

// Old experimental install thumbnail must never compete with the current icon.
await rm(resolve(publicDir, "app-icon-reference.png"), { force: true });

// 4.5.4 install/browser identity follows the same canonical launcher-family H
// used by the live Halieus website. These tracked exports are generated from
// halieus-app-icon.svg by scripts/generate-platform-icons.mjs; prebuild only
// verifies them and never substitutes the retired HGR Main rendered thumbnail.
for (const file of [
  "halieus-mark.svg",
  "halieus-app-icon.svg",
  "halieus-app-icon.png",
  "app-icon-180.png",
  "app-icon-192.png",
  "app-icon-512.png",
  "favicon-32.png",
  "favicon.ico",
]) {
  await access(resolve(publicDir, file));
}

console.log("Verified current canonical Halieus favicon/PWA install identity exports.");
