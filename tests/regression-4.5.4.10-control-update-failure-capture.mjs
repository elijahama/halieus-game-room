import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [bridge, cloudAgent] = await Promise.all([
  read("scripts/windows/control-update.ps1"),
  read("server/src/control-cloud-agent.ts"),
]);

assert.match(bridge, /hgr-control-update\.out\.log/);
assert.match(bridge, /function Get-HgrUpdateFailureReason/);
assert.match(bridge, /Tee-Object -FilePath \$updateOutputLog/);
assert.match(bridge, /\[STOPPED\\\]/);
assert.match(bridge, /npm ERR!/);
assert.match(bridge, /AssertionError/);
assert.match(bridge, /TS\\d\{4\}/);
assert.match(bridge, /<HGR_ROOT>/);
assert.match(bridge, /authorization:\\s\*bearer/);
assert.match(bridge, /token\|secret\|credential/);
assert.match(bridge, /\$detail\.Length -gt 900/);
assert.match(bridge, /reason = \$failureReason/);
assert.match(bridge, /Get-HgrUpdateFailureReason -Path \$updateOutputLog -ExitCode \$exitCode/);

assert.match(cloudAgent, /detailedReason \|\| marker\.reason/, "Cloud bridge must retain marker failure detail when local audit lookup is unavailable");

console.log("PASS 4.5.4.10: Control Update preserves bounded, redacted updater failure detail while keeping live progress output");
