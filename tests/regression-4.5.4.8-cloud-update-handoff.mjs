import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [bridge, finalizer, refresh] = await Promise.all([
  readFile(resolve(root, "scripts/windows/control-update.ps1"), "utf8"),
  readFile(resolve(root, "scripts/windows/control-update-finalize.ps1"), "utf8"),
  readFile(resolve(root, "scripts/windows/refresh-control-after-update.ps1"), "utf8"),
]);

assert.match(bridge, /HGR_CONTROL_DEFER_REFRESH\s*=\s*"1"/, "Cloud Update must defer the in-process Control restart");
assert.match(bridge, /control-update-finalize\.ps1/, "Cloud Update must define the independent final handoff script");
assert.match(bridge, /Start-Process[\s\S]*?\$finalizerPath/s, "Final Control restart must run outside the Control Agent process that is about to restart");
assert.match(bridge, /leave hgr-control-update-result\.json in the running state/i, "Bridge must not claim success before the independent finalizer finishes");
assert.doesNotMatch(bridge, /state\s*=\s*"succeeded"/, "The parent Control update wrapper must never authoritatively mark the cloud operation succeeded");

assert.match(finalizer, /HGR_CONTROL_UPDATE_FINALIZER\s*=\s*"1"/, "Finalizer must identify its authoritative restart context");
assert.match(finalizer, /& \$refreshHelper/, "Finalizer must run the normal verified Control refresh helper");
assert.match(finalizer, /state\s*=\s*"succeeded"[\s\S]*?exitCode\s*=\s*0/s, "Only a successful final Control handoff may write the succeeded marker");
assert.match(finalizer, /state\s*=\s*"failed"/, "Finalizer failures must be persisted for Cloud Control instead of hanging indefinitely");

assert.match(refresh, /if \(\$env:HGR_CONTROL_DEFER_REFRESH -eq "1"\)[\s\S]*?exit 0/s, "The updater's in-process refresh must defer before stopping its own Control Agent");
assert.match(refresh, /snapshot intact/i, "Deferred refresh must preserve the pre-update lifecycle snapshot for the finalizer");
assert.match(refresh, /Resolve-InterruptedCloudUpdateAfterManualRecovery/, "A later local update must be able to release an older stranded cloud-operation marker");
assert.match(refresh, /Previous Cloud Update completion handoff was interrupted/, "Interrupted 88% operations must become retryable failures rather than remain running forever");
assert.match(refresh, /HGR_CONTROL_UPDATE_FINALIZER -eq "1"/, "The authoritative finalizer must not be mistaken for stale-operation recovery");

for (const source of [bridge, finalizer, refresh]) {
  assert.doesNotMatch(source, /Invoke-Expression|\biex\b/i, "4.5.4.8 must not add arbitrary PowerShell execution");
}

console.log("PASS 4.5.4.8: Cloud Update final Control restart survives the agent handoff and can reach a terminal result");
