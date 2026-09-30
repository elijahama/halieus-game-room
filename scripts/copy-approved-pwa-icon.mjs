import { access, copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "client/public");
const approvedMainIcon = resolve(root, "assets/branding/references/HGR Main.png");
const installedMainIcon = resolve(publicDir, "halieus-app-icon.png");

// Old experimental install thumbnail must never compete with the approved icon.
await rm(resolve(publicDir, "app-icon-reference.png"), { force: true });

// PWA/install identity is the approved rendered reference PNG byte-for-byte.
// This step copies; it does not redraw, recolour, crop or regenerate the H.
await access(approvedMainIcon);
await copyFile(approvedMainIcon, installedMainIcon);

// Themeable browser glyphs remain separate website assets.
for (const file of [
  "halieus-mark.svg",
  "app-icon.svg",
]) {
  await access(resolve(publicDir, file));
}

console.log("Prepared original approved Halieus PNG as PWA/install identity.");
