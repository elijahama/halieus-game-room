import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = async file => readFile(new URL("../" + file, import.meta.url), "utf8");
const [finalizer, deploy, cloudAgent, sourceControl] = await Promise.all([
  read("scripts/windows/control-update-finalize.ps1"),
  read("tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1"),
  read("server/src/control-cloud-agent.ts"),
  read("server/src/platform/control-cloud-server-preload.ts"),
]);
// A stalled post-update Control restart must produce an honest failure receipt,
// not leave the UI on 98% forever, and not clobber newer results.
assert.match(finalizer, /\$refresh\.WaitForExit\(180000\)/);
assert.doesNotMatch(finalizer, /WindowStyle Hidden -Wait -PassThru/);
assert.match(finalizer, /if \(-not \$refresh\.WaitForExit\(180000\)\)\s*\{[\s\S]*?\$refresh\.Kill\(\)/);
assert.match(finalizer, /marker ownership changed; stale finalizer/);
assert.match(finalizer, /\$current\.startedAt -ne \[string\]\$script:startedAt/);
assert.match(finalizer, /\$current\.operationId -ne \[string\]\$script:operationId/);
assert.match(finalizer, /"failed"[\s\S]*?"Update finalization failed"/);
assert.match(finalizer, /"succeeded"[\s\S]*?progress = 100/);
// Bound the distinct final SSH health probe without modifying install workflow,
// preserving fail-closed exact release identity checks.
const health=deploy.slice(deploy.indexOf("Verifying exact release on Oracle..."));
assert.ok(health.length > 50);
for(const option of ["ConnectTimeout=10", "ConnectionAttempts=1", "ServerAliveInterval=6", "ServerAliveCountMax=2"]) {
  assert.ok(health.includes(option), "Missing bounded SSH option: " + option);
}
assert.match(health, /ssh @healthSshArgs \$target "curl --connect-timeout 4 --max-time 8/);
assert.match(health, /\$actualVersion -ne \$expectedVersion -or \$actualFingerprint -ne \$expectedFingerprint/);
assert.doesNotMatch(health, /curl -fsS -H/);
assert.match(cloudAgent, /Retry the \*receipt\*, never the completed Windows command/);
assert.match(sourceControl, /start.*restart.*close/s);
console.log("PASS 4.5.6: bounded SSH receipt, isolated Control restart timeout and operation-owned terminal receipts");
