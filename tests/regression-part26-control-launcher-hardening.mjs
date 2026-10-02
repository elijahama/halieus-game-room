import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const url = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");
const readBinary = (path) => readFileSync(url(path));
const pngSize = (buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });

const generator = read("scripts/windows/generate-launcher-icons.ps1");
const shortcuts = read("scripts/windows/launcher-shortcuts.ps1");
const stopControl = read("Stop HGR Control.cmd");
const controlAuthority = readBinary("assets/branding/references/HGR Control Launcher.png");
const controlPwa = readBinary("server/control-ui/control-icon.png");
const historicalControlSheet = readBinary("assets/branding/references/HGR Control.png");

// Source artwork protection: a launcher export must be square before it is ever
// resized. This prevents a reference/model sheet from silently becoming a .lnk icon.
assert.match(generator, /function Assert-HgrLauncherSource/, "Launcher generator must validate source artwork before export");
assert.match(
  generator,
  /\$probe\.Width -ne \$probe\.Height -or \$probe\.Width -lt 64/,
  "Launcher source guard must reject non-square/model-sheet artwork",
);
assert.match(
  generator,
  /HGR Control Launcher\.png/,
  "HGR Control must map to its dedicated approved square launcher PNG",
);
assert.doesNotMatch(
  generator,
  /control\s*=\s*Join-Path \$ReferenceRoot 'HGR Control\.png'/,
  "Legacy HGR Control reference sheet must never be mapped to a launcher",
);
assert.match(generator, /Remove-Item -Force -ErrorAction SilentlyContinue/, "Stale runtime launcher exports must be removed before rebuild");

const authoritySize = pngSize(controlAuthority);
assert.equal(authoritySize.width, authoritySize.height, "Approved HGR Control launcher source must be square");
assert.ok(authoritySize.width >= 256, "Approved HGR Control launcher source must be at least 256px");
assert.deepEqual(controlPwa, controlAuthority, "Control PWA icon must use the same approved square PNG as the Windows launcher");
assert.notDeepEqual(controlAuthority, historicalControlSheet, "Approved square Control artwork must not be the historical model/reference sheet");

// Export validation: generated files are checked, not merely assumed to exist.
assert.match(generator, /function Assert-HgrRuntimeIconExport/, "Launcher generator must validate generated PNG and ICO files");
assert.match(generator, /\$png\.Width -ne 256 -or \$png\.Height -ne 256/, "Generated launcher PNGs must be verified as 256x256");
assert.match(generator, /\$reserved -ne 0 -or \$kind -ne 1 -or \$count -lt 1/, "Generated ICO container headers must be verified");
assert.match(generator, /control-stop\.ico/, "Stop Control must keep its own distinct icon output");

// Naming and shortcut target protection: user-facing launchers stay Control/Stop Control.
assert.match(shortcuts, /\$ControlScript = Join-Path \$ProjectRoot 'Start HGR Control\.cmd'/, "Control launcher must use the canonical Start Control entry point");
assert.match(shortcuts, /\$ControlStopScript = Join-Path \$ProjectRoot 'Stop HGR Control\.cmd'/, "Stop Control launcher must use the canonical Stop Control entry point");
assert.doesNotMatch(shortcuts, /\$ControlStopScript = Join-Path \$ProjectRoot 'Stop HGR Control Mobile\.cmd'/, "Generated Stop Control shortcut must not target obsolete Mobile naming");
assert.match(shortcuts, /Control = 'HGR - Control\.lnk'/, "Launcher family must expose HGR - Control");
assert.match(shortcuts, /ControlStop = 'HGR - Stop Control\.lnk'/, "Launcher family must expose HGR - Stop Control");
assert.doesNotMatch(shortcuts, /ControlMobile\s*=\s*'HGR - Control Mobile\.lnk'/, "HGR - Control Mobile must not return as a generated launcher role");

// Every launcher role is checked against the icon path stored in the .lnk metadata.
assert.match(shortcuts, /\$ShortcutIconChecks = @\(/, "Launcher refresh must build a complete icon-verification set");
for (const iconVar of ["StartIconPath", "RestartIconPath", "CloseIconPath", "UpdateIconPath", "PowerShellIconPath", "OpenShardIconPath", "ControlIconPath", "ControlStopIconPath"]) {
  assert.ok(shortcuts.includes(`Icon = $${iconVar}`), `Launcher icon verification must cover ${iconVar}`);
}
assert.match(shortcuts, /Assert-HalieusShortcutCommandScript/, "Control shortcuts must verify their canonical command targets");
assert.match(shortcuts, /ClearIconCache/, "Launcher refresh must explicitly clear the Windows icon cache after replacement");

// The canonical public wrapper may still call the legacy-named internal helper
// while that helper remains part of the implementation. The obsolete wording
// must not be the generated shortcut target.
assert.match(stopControl, /scripts\\windows\\stop-control-mobile\.ps1/, "Canonical Stop Control wrapper must preserve the existing internal stop implementation");

console.log("HGR Part 26 Control launcher hardening regression: PASS");
