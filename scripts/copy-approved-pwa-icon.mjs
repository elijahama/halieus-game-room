import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// The installed-app icon intentionally uses approved rendered reference artwork.
// Do not redraw, recolour or regenerate this source through the flat SVG system.
const source = resolve(
  root,
  "assets/branding/references/ChatGPT Image 25 Sept 2026, 18_24_09.png",
);
const publicDir = resolve(root, "client/public");
const destination = resolve(publicDir, "app-icon-reference.png");

await mkdir(publicDir, { recursive: true });
await copyFile(source, destination);

console.log("Copied approved HGR reference PNG to client/public/app-icon-reference.png.");
