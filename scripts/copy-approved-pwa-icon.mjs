import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");

// Historical rendered thumbnails are not install identity. Keep this cleanup
// because older workspaces may still contain the former copied reference.
await rm(resolve(publicDir, "app-icon-reference.png"), { force: true });

for (const file of [
  "halieus-app-icon.svg",
  "halieus-mark.svg",
  "app-icon.svg",
]) {
  await access(resolve(publicDir, file));
}

console.log("Prepared canonical SVG Halieus PWA identity.");
