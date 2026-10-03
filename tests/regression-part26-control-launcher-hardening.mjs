import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
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
const controlCloud = readBinary("client/public/control/control-icon.png");
const historicalControlSheet = readBinary("assets/branding/references/HGR Control.png");
const controlSourceRecord = read("assets/branding/references/HGR_CONTROL_LAUNCHER_SOURCE.md");
const cloudControlHtml = read("client/public/control/index.html");
const cloudControlManifest = read("client/public/control/manifest.webmanifest");
const cloudControlWorker = read("client/public/control/sw.js");
const privateControlHtml = read("server/control-ui/index.html");
const privateControlManifest = read("server/control-ui/manifest.webmanifest");
const adminControlLauncher = read("client/src/platform/control/AdminControlLauncher.tsx");

// Source artwork protection: a launcher export must be square before it is ever
// resized. This prevents a reference/model sheet from silently becoming a .lnk icon.
assert.match(generator, /function Assert-HgrLauncherSource/, "Launcher generator must validate source artwork before export");
assert.match(
  generator,
  /\$probe\.Width -ne \$probe\.Height -or \$probe\.Width -lt 64/,
  "Launcher source guard must reject non-square/model-sheet artwork",
);
assert.match(generator, /HGR Control Launcher\.png/, "HGR Control must map to its dedicated approved square launcher PNG");
assert.doesNotMatch(generator, /control\s*=\s*Join-Path \$ReferenceRoot 'HGR Control\.png'/, "Legacy HGR Control reference sheet must never be mapped to a launcher");
assert.match(generator, /Remove-Item -Force -ErrorAction Stop/, "Stale runtime launcher exports must be removed before rebuild");

const authoritySize = pngSize(controlAuthority);
assert.equal(authoritySize.width, authoritySize.height, "Approved HGR Control launcher source must be square");
assert.ok(authoritySize.width >= 192, "Approved HGR Control launcher source must be at least 192px for PWA/install delivery");
assert.deepEqual(controlPwa, controlAuthority, "Private Control PWA icon must use the approved launcher authority exactly");
assert.deepEqual(controlCloud, controlAuthority, "Cloud Control hub icon must use the approved launcher authority exactly");
assert.notDeepEqual(controlAuthority, historicalControlSheet, "Approved square Control artwork must not be the historical model/reference sheet");
assert.match(controlSourceRecord, /generic\/slab-serif H[^\n]*prohibited/i, "Control source record must explicitly prohibit the rejected generic/slab-serif H");
assert.match(controlSourceRecord, /integrated blue cog outline/i, "Control source record must preserve the owner-approved integrated cog treatment");

// 4.5.4 identity: private and cloud Control both advertise the approved blue
// Control artwork, with a new URL revision so stale installed icons cannot win.
assert.match(cloudControlHtml, /rel="manifest" href="\/control\/manifest\.webmanifest\?v=4\.5\.4-control-approved3"/, "Cloud Control must expose its own install manifest");
assert.match(cloudControlHtml, /\/control\/control-icon\.png\?v=4\.5\.4-control-approved3/, "Cloud Control favicon/brand must render the current approved Control artwork revision");
assert.match(cloudControlHtml, /serviceWorker\.register\("\/control\/sw\.js\?v=4\.5\.4-control-pwa1"/, "Cloud Control must register its scoped PWA worker");
assert.doesNotMatch(cloudControlHtml, /<span class="control-brand-mark">H<\/span>/, "Cloud Control must not synthesize a replacement H in its brand mark");
assert.doesNotMatch(cloudControlHtml, /<span class="access-icon">H<\/span>/, "Cloud Control access state must not synthesize a replacement H");
const cloudManifest = JSON.parse(cloudControlManifest);
assert.equal(cloudManifest.id, "/control/");
assert.equal(cloudManifest.start_url, "/control/");
assert.equal(cloudManifest.scope, "/control/");
assert.equal(cloudManifest.icons?.[0]?.src, "/control/control-icon.png?v=4.5.4-control-approved3");
assert.match(cloudControlWorker, /hgr-cloud-control-shell-v1/);
assert.match(cloudControlWorker, /\/control\/control-icon\.png\?v=4\.5\.4-control-approved3/);

assert.match(privateControlHtml, /\/control-icon\.png\?v=4\.5\.4-control-approved3/, "Private Control favicon/brand must use the new approved revision");
const privateManifest = JSON.parse(privateControlManifest);
assert.equal(privateManifest.icons?.[0]?.src, "/control-icon.png?v=4.5.4-control-approved3");
assert.match(adminControlLauncher, /<img className="hgr-admin-control-mark" src="\/control\/control-icon\.png\?v=part26-control-approved2"/, "Admin Control launcher must use the approved image instead of a text H");

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
assert.match(stopControl, /scripts\\windows\\stop-control\.ps1/, "Canonical Stop Control wrapper must preserve the existing internal stop implementation");

console.log("HGR Part 26 Control launcher hardening regression: PASS");

function verifyPng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const { width, height } = pngSize(bytes);
  const idat = [];
  let ended = false;
  let hasPalette = false;
  let hasTransparency = false;
  for (let pos = 8; pos < bytes.length;) {
    const size = bytes.readUInt32BE(pos);
    assert.ok(pos + size + 12 <= bytes.length, "Truncated PNG chunk");
    const chunk = bytes.subarray(pos + 4, pos + 8 + size);
    let crc = 0xffffffff;
    for (const byte of chunk) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    assert.equal((crc ^ 0xffffffff) >>> 0, bytes.readUInt32BE(pos + 8 + size), "PNG chunk checksum must be valid");
    const type = chunk.subarray(0, 4).toString();
    if (type === "IDAT") idat.push(chunk.subarray(4));
    if (type === "PLTE") hasPalette = true;
    if (type === "tRNS") hasTransparency = true;
    if (type === "IEND") ended = true;
    pos += size + 12;
  }
  assert.ok(ended && idat.length, "PNG must contain image data and end marker");
  assert.equal(bytes[24], 8, "Approved export uses 8-bit channels/indexes");
  const colorType = bytes[25];
  assert.ok(colorType === 3 || colorType === 6, `Unsupported approved Control PNG color type: ${colorType}`);
  if (colorType === 3) {
    assert.ok(hasPalette, "Indexed approved Control PNG must include a palette");
    assert.ok(hasTransparency, "Indexed approved Control PNG must preserve transparent exterior pixels");
  }
  const rowBytes = colorType === 6 ? width * 4 : width;
  assert.equal(inflateSync(Buffer.concat(idat)).length, (rowBytes + 1) * height, "PNG image data must decompress to the expected scanline size");
}
verifyPng(controlAuthority);
verifyPng(controlPwa);
verifyPng(controlCloud);
const corrupt = Buffer.from(controlAuthority);
corrupt[45] ^= 1;
assert.throws(() => verifyPng(corrupt), "Corrupt PNG must fail even with a square IHDR");
assert.equal(
  createHash("sha256").update(controlAuthority).digest("hex"),
  "90fb5be18b805841df83ef8e0b2c62ce59184336de1876befab48edf2a076ff4",
  "Control must retain the owner-approved 3 October integrated-cog artwork",
);
console.log("PASS Control approved artwork, PNG checksums, transparency and decompression");

const approval = JSON.parse(read("assets/branding/references/control-artwork.json"));
assert.equal(approval.sha256, createHash("sha256").update(controlAuthority).digest("hex"));
assert.match(generator, /controlAuthorityHash -ne \$approvedControl.sha256/);
assert.match(shortcuts, /cacheProcess.ExitCode -ne 0/);
if (process.platform === "win32") {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "psmodulepath"));
  const result = spawnSync("powershell.exe", ["-NoProfile", "-File", "tests/runtime-launcher-exports.ps1"], { encoding: "utf8", env });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log(result.stdout.trim());
} else {
  console.log("Windows COM/cache runtime acceptance requires Windows; source contracts validated here.");
}
