import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const referenceRoot = resolve(root, "assets/branding/references");
const launcherRoot = resolve(root, "assets/branding/launchers");
const referenceNames = readdirSync(referenceRoot);
const launcherNames = readdirSync(launcherRoot);

assert.ok(
  referenceNames.includes("HGR ICON - CONTROL UPDATE"),
  "Current HGR icon-system reference must remain in assets/branding/references",
);
assert.ok(
  referenceNames.includes("HGR_LOGO_SYSTEM_REFERENCE.md"),
  "Canonical HGR logo-system reference must remain present",
);

const referenceH = "M18 15H26V28H38V15H46V49H38V36H26V49H18Z";
const logoReference = read("assets/branding/references/HGR_LOGO_SYSTEM_REFERENCE.md");
assert.match(logoReference,/HGR ICON - CONTROL UPDATE/i,"Brand reference must preserve the saved CONTROL UPDATE H");
assert.match(logoReference, /HGR Control — royal control blue `#4F7BFE`/);
assert.match(logoReference, /Update — light blue `#38BDF8`/);
assert.match(logoReference, /OpenShard — purple `#A855F7`/);

const launcherSources = [
  ["Start Halieus Game Room.svg", "#22C55E"],
  ["Restart Halieus Game Room.svg", "#F59E0B"],
  ["Close Halieus Game Room.svg", "#EF4444"],
  ["Update Halieus Website.svg", "#38BDF8"],
  ["HGR PowerShell.svg", "#64748B"],
  ["HGR OpenShard TUI.svg", "#A855F7"],
  ["HGR Control.svg", "#4F7BFE"],
];

for (const [name, colour] of launcherSources) {
  assert.ok(launcherNames.includes(name), `Canonical launcher source is missing: ${name}`);
  const source = read(`assets/branding/launchers/${name}`);
  assert.ok(source.includes(referenceH), `${name} must use the canonical CONTROL UPDATE block H`);
  assert.ok(source.includes(colour), `${name} must retain its semantic role colour ${colour}`);
}

for (const binary of [
  "Start Halieus Game Room.ico",
  "Restart Halieus Game Room.ico",
  "Close Halieus Game Room.ico",
  "Update Halieus Website.ico",
  "HGR PowerShell.ico",
]) {
  assert.ok(
    existsSync(resolve(launcherRoot, binary)),
    `Legacy compatibility launcher asset is missing: ${binary}`,
  );
}

const generator = read("scripts/windows/generate-launcher-icons.ps1");
assert.match(generator, /server\\data\\runtime\\launcher-icons/);
assert.match(generator, /main = '#F4C430'/);
assert.match(generator, /control = '#4F7BFE'/);
assert.match(generator, /openshard = '#A855F7'/);
assert.match(generator, /update = '#38BDF8'/);
assert.doesNotMatch(
  generator,
  /assets\\branding\\launchers\\generated-preview/,
  "Runtime launcher generator must no longer target the obsolete preview folder",
);

const shortcuts = read("scripts/windows/launcher-shortcuts.ps1");
assert.match(shortcuts, /RuntimeLauncherIconRoot/);
assert.match(shortcuts, /HGR - Control Mobile\.lnk/);
assert.match(shortcuts, /& \$IconGenerator/);

console.log(
  `PASS canonical branding: ${referenceNames.length} references, ${launcherSources.length} launcher SVG sources`,
);
