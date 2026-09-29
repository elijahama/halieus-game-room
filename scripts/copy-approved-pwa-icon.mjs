import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");

// Legacy filename retained so existing build hooks keep working. The old
// rendered reference is deliberately no longer copied into public output:
// Chromium/Brave must install the canonical HGR mark generated from the live
// app-icon source, not a historical reference thumbnail.
const staleReference = resolve(publicDir, "app-icon-reference.png");
await rm(staleReference, { force: true });

for (const file of [
  "app-icon-180.png",
  "app-icon-192.png",
  "app-icon-512.png",
  "halieus-app-icon.svg",
]) {
  await access(resolve(publicDir, file));
}

console.log("Prepared canonical HGR PWA icons and removed stale install reference.");
