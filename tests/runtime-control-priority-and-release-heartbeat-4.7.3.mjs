import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { resolve } from "node:path";

const agent = await readFile(new URL("../server/src/control-cloud-agent.ts", import.meta.url), "utf8");
const oracle = await readFile(new URL("../server/src/platform/control-cloud-server-preload.ts", import.meta.url), "utf8");
const browser = await readFile(new URL("../client/public/control/cloud-update.js", import.meta.url), "utf8");
const frontend = await readFile(new URL("../client/public/control/control.js", import.meta.url), "utf8");
const template = await readFile(new URL("../client/public/control/index.html", import.meta.url), "utf8");
const launcher = await readFile(new URL("../client/src/platform/control/AdminControlLauncher.tsx", import.meta.url), "utf8");

const fn = agent.match(/function localReleaseCheckoutVersion\(\): string \| null \{[\s\S]*?\n\}\n\nfunction findProjectRoot/);
assert.ok(fn, "Source must have an explicit release-checkout reader.");
const context = {
  process: { env: { LOCALAPPDATA: "C:/Users/Test/AppData/Local" } },
  resolve,
  isHgrRepositoryRoot: path => path.includes("Halieus Game Room"),
  readFileSync: path => path.endsWith("VERSION") ? "4.7.3\n" : "",
};
vm.runInNewContext(fn[0].replace("(): string | null", "()").replace(/\n\nfunction findProjectRoot$/, "")
  + "\nglobalThis.readReal = localReleaseCheckoutVersion;", context);
assert.equal(context.readReal(), "4.7.3", "Read the actual local Release Checkout VERSION, not the website.");
context.readFileSync = () => "4.7.2\n";
assert.equal(context.readReal(), "4.7.2", "An older real local checkout must remain independently visible.");
context.readFileSync = () => "Oracle says 4.7.3";
assert.equal(context.readReal(), null, "Reject arbitrary release values.");
context.isHgrRepositoryRoot = () => false;
assert.equal(context.readReal(), null, "Never fabricate a version for a missing or invalid laptop checkout.");

assert.match(agent, /releaseCheckoutVersion: localReleaseCheckoutVersion\(\)/);
assert.match(oracle, /const releaseCheckoutVersion =/);
assert.match(oracle, /device\.releaseCheckoutVersion = releaseCheckoutVersion/);
assert.match(oracle, /releaseCheckoutVersion: device\.releaseCheckoutVersion \?\? null/);
assert.match(browser, /releaseCheckoutVersion/);
assert.match(browser, /Not reported by the current laptop bridge/);
assert.match(browser, /Last reported/);
assert.match(browser, /preserved original source/);
assert.match(frontend, /setOperationCategory\("maintenance"\)/);
assert.match(frontend, /event\.key === "ArrowRight"/);
assert.match(template, /data-operation-tab="maintenance" aria-selected="true"/);
assert.match(template, /data-operation-tab="update" aria-selected="false"/);
assert.match(template, /data-operation-tab="laptop" aria-selected="false"/);
assert.equal((template.match(/data-operation="(?:start|restart|close|update)"/g)||[]).length,4);
assert.match(launcher, /account\.role === "owner" \? "OWNER CONTROLS" : "ADMIN CONTROLS"/);
console.log("PASS HGR 4.7.3: actual independent Release Checkout VERSION with safe unknown fallback; 3 ordered Controls tabs, original source and action identity preserved.");
