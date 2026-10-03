import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const referenceRoot = resolve(root, "assets/branding/references");
const referenceNames = readdirSync(referenceRoot);

for (const name of [
  "HGR Main.png",
  "HGR Start.png",
  "HGR Restart.png",
  "HGR Close.png",
  "HGR Update.png",
  "HGR PowerShell.png",
  "HGR OpenShard.png",
  "HGR Control.png",
  "HGR_ICON_PALETTE.md",
  "HGR_LOGO_SYSTEM_REFERENCE.md",
]) {
  assert.ok(referenceNames.includes(name), `Approved branding reference is missing: ${name}`);
}

const palette = read("assets/branding/references/HGR_ICON_PALETTE.md");
for (const [role, colour] of [
  ["Main Halieus", "#F4C430"],
  ["Start", "#22C55E"],
  ["Restart", "#F59E0B"],
  ["Close", "#EF4444"],
  ["Update", "#38BDF8"],
  ["PowerShell", "#64748B"],
  ["OpenShard", "#A855F7"],
  ["HGR Control", "#4F7BFE"],
]) {
  assert.ok(palette.includes(role), `${role} must remain documented in the icon palette`);
  assert.ok(palette.includes(colour), `${role} palette contract must retain ${colour}`);
}

const generator = read("scripts/windows/generate-launcher-icons.ps1");
const controlIcon = readFileSync(resolve(root, "server/control-ui/control-icon.png"));
const legacyControlSheet = readFileSync(resolve(root, "assets/branding/references/HGR Control.png"));
const controlWidth = controlIcon.readUInt32BE(16);
const controlHeight = controlIcon.readUInt32BE(20);
assert.match(generator, /assets\\branding\\references/, "Launcher exporter must source approved reference PNGs");
assert.match(generator, /HGR Start\.png/, "Launcher exporter must map Start to its approved PNG");
assert.match(generator, /server\\control-ui\\control-icon\.png/, "Launcher exporter must map Control to the dedicated approved Control PNG");
assert.doesNotMatch(generator, /control\s*=\s*Join-Path \$ReferenceRoot 'HGR Control\.png'/, "Legacy Control model/reference sheet must never be a launcher source");
assert.equal(controlWidth, controlHeight, "Approved Control launcher PNG must be square rather than a full model sheet");
assert.equal(controlWidth, 192, "Approved 3 October source is 192px; runtime export is independently validated at 256px");
assert.notDeepEqual(controlIcon, legacyControlSheet, "Dedicated Control launcher PNG must not be the legacy full reference sheet");
assert.match(generator, /control-stop\.ico/, "Stop Control must have a distinct exported icon");
assert.doesNotMatch(generator, /Draw-HalieusH|Draw-HgrBadge|New-RoundedRectanglePath|Mix-HgrColour/i, "Launcher exporter must not redraw approved H artwork");

assert.ok(!existsSync(resolve(root, "assets/branding/icon-sets/reference-faithful")), "Deprecated reconstructed launcher family must stay removed");
assert.ok(!existsSync(resolve(root, "assets/branding/icon-sets/alternate-work-generated")), "Deprecated work-generated launcher family must stay removed");
assert.ok(!existsSync(resolve(root, "assets/branding/launchers")), "Duplicate tracked launcher-art folder must stay removed");
assert.ok(!existsSync(resolve(root, "client/public/brand/launcher")), "Generated web launcher duplicate folder must stay removed");

console.log(`PASS reference-PNG launcher authority: ${referenceNames.length} reference files`);
