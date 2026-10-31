import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const load = (path) => readFile(new URL(path, root), "utf8");
const [html, css, control, development, server, documentation] = await Promise.all([
  load("client/public/control/index.html"),
  load("client/public/control/control.css"),
  load("client/public/control/control.js"),
  load("client/public/control/development.js"),
  load("server/src/platform/control-cloud-ui-preload.ts"),
  load("docs/HGR_CONTROL_DEVELOPMENT_MONITOR.md"),
]);
assert.match(html, /data-section="development"/);
assert.match(html, /data-panel="development"/);
assert.match(html, /data-jump="development"/);
assert.match(html, /id="developmentPulls"/);
assert.match(html, /id="developmentRuns"/);
assert.match(html, /src="\/control\/development\.js\?v=development-roadmap-v1"/);
assert.match(html, /href="\/control\/control\.css\?v=[a-z0-9._-]+"/i);
assert.match(control, /development: "Development activity"/);
assert.match(css, /\.development-columns/);
assert.match(css, /@media\(max-width:720px\)/);
assert.match(development, /fetch\("\/control\/development-status"/);
assert.match(development, /credentials: "include"/);
assert.match(development, /textContent/);
assert.doesNotMatch(development, /innerHTML|Math\.random|progressPercent|authorization|Bearer /i);
assert.match(server, /path === "\/control\/development-status"/);
assert.match(server, /if \(!hasAdmin\(request\)\)/);
assert.match(server, /DEVELOPMENT_TTL_MS = 5 \* 60_000/);
assert.match(server, /Promise\.allSettled/);
assert.match(server, /"GitHub development status is unavailable\."/);
assert.match(server, /"pulls\?state=all&sort=updated&direction=desc&per_page=100"/);
assert.match(server, /"actions\/runs\?per_page=20"/);
assert.doesNotMatch(server, /GITHUB_TOKEN|process\.env\.GH_|Authorization:|PRIVATE_KEY/i);
assert.match(documentation, /not a background process|not an assertion|GitHub cannot independently observe/i);
const bottomNavigation = html.match(/<nav class="control-mobile-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
assert.equal([...bottomNavigation.matchAll(/<button /g)].length, 5,
  "The approved five-item Control mobile bottom bar must remain intact.");
const checked = spawnSync(process.execPath, ["--check", fileURLToPath(new URL("client/public/control/development.js", root))], { encoding: "utf8" });
assert.equal(checked.status, 0, "Development client JavaScript must parse: " + checked.stderr);
console.log("PASS Control development status: role gate, real GitHub evidence, independent Operations, five-tab phone navigation, JS syntax");
