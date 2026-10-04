import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [bridge, cloudAgent] = await Promise.all([
  read("scripts/windows/control-update.ps1"),
  read("server/src/control-cloud-agent.ts"),
]);

assert.ok(bridge.includes("hgr-control-update.out.log"));
assert.ok(bridge.includes("function Get-HgrUpdateFailureReason"));
assert.ok(bridge.includes("Tee-Object -FilePath $updateOutputLog"));
assert.ok(bridge.includes("\\[STOPPED\\]"));
assert.ok(bridge.includes("npm ERR!"));
assert.ok(bridge.includes("AssertionError"));
assert.ok(bridge.includes("TS\\d{4}"));
assert.ok(bridge.includes("<HGR_ROOT>"));
assert.ok(bridge.includes("authorization:\\s*bearer"));
assert.ok(bridge.includes("token|secret|credential"));
assert.ok(bridge.includes("$detail.Length -gt 900"));
assert.ok(bridge.includes("reason = $failureReason"));
assert.ok(bridge.includes("Get-HgrUpdateFailureReason -Path $updateOutputLog -ExitCode $exitCode"));

assert.ok(
  cloudAgent.includes("detailedReason || marker.reason"),
  "Cloud bridge must retain marker failure detail when local audit lookup is unavailable",
);

console.log("PASS 4.5.4.10: Control Update preserves bounded, redacted updater failure detail while keeping live progress output");
