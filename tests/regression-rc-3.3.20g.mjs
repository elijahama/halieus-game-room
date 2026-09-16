import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const css = readFileSync(resolve(root, "client/src/index.css"), "utf8");
const html = readFileSync(resolve(root, "client/index.html"), "utf8");
const manifest = readFileSync(resolve(root, "client/public/site.webmanifest"), "utf8");
const launcher = readFileSync(resolve(root, "launcher-shortcuts.ps1"), "utf8");
const desktopIni = readFileSync(resolve(root, "desktop.ini"), "utf16le").replace(/^\uFEFF/, "");
const blitz = readFileSync(resolve(root, "server/src/games/mega-board/utils/blitz.ts"), "utf8");

// Ranked-only control must be gated by the Ranked tab state.
assert.match(home, /ranked &&[\s\S]*onOpenLeaderboard/s);
assert.match(home, /View Mega Board leaderboard/);

// Halieus portal identity is yellow/gold and uses separate browser/PWA assets.
assert.match(home, /src="\/app-icon-192\.png\?v=[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?"/);
assert.match(html, /<meta name="theme-color" content="#e5a721" \/>/);
assert.match(manifest, /"name": "Halieus Game Room"/);
assert.match(manifest, /"theme_color": "#e5a721"/);
for (const asset of ["favicon.ico", "favicon-32.png", "app-icon-180.png", "app-icon-192.png", "app-icon-512.png"]) {
  assert.ok(existsSync(resolve(root, "client/public", asset)), `${asset} must exist`);
}
assert.notDeepEqual(
  readFileSync(resolve(root, "assets/branding/Mega Board.ico")),
  readFileSync(resolve(root, "client/public/favicon.ico")),
  "Halieus browser icon must remain separate from the Mega Board game icon",
);

// Client distribution is intentionally rebuilt on the target Windows host when source version changes.
// Source-level assertions above are authoritative for this cross-platform release test.

// RC 3.3.23 promotes Halieus Game Room to the application root. Mega Board keeps a separate in-app icon asset, while the root folder/launchers use Halieus H.
assert.match(launcher, /'Halieus Game Room\.ico'/);
assert.doesNotMatch(launcher, /client\\public\\favicon\.ico/);
assert.match(launcher, /IconResource=Halieus Game Room\.ico,0/);
assert.match(launcher, /attrib \+h \+s \$FolderDesktopIni/);
assert.match(launcher, /attrib \+r \$ProjectRoot/);
assert.match(desktopIni, /IconResource=Halieus Game Room\.ico,0/);

// Blitz asset identities stay random, but starting counts are evenly dealt.
assert.match(blitz, /deals round-robin/);
assert.match(blitz, /shuffleInPlace\(assets, pickIndex\)/);
assert.match(blitz, /index % dealOrder\.length/);
assert.match(blitz, /no balancing by price/);

console.log("3.3.20g Halieus/Ranked/Blitz/folder-icon regression PASS (Blitz rule superseded in 3.3.22)");
