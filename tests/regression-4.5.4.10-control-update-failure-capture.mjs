import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [bridge, cloudAgent, controlAgent, updaterCmd] = await Promise.all([
  read("scripts/windows/control-update.ps1"),
  read("server/src/control-cloud-agent.ts"),
  read("server/src/control-agent.ts"),
  read("Update HGR GitHub.cmd"),
]);

assert.ok(bridge.includes("hgr-control-update.out.log"));
assert.ok(bridge.includes("function Get-HgrUpdateFailureReason"));
assert.ok(bridge.includes("Tee-Object -FilePath $updateOutputLog"));
assert.match(bridge, /\^\\\[\(STOPPED\|ERROR\)\\\]\\s\+/, "Control failure parser must anchor terminal STOPPED/ERROR lines");
assert.ok(bridge.includes("npm ERR!"));
assert.ok(bridge.includes("AssertionError"));
assert.match(bridge, /\$assertions = @\([\s\S]*AssertionError/,"Control must explicitly prioritize AssertionError summaries");
assert.match(bridge, /\$stopped = @\([\s\S]*\^\\\[\(STOPPED\|ERROR\)\\\]/,"Control must only treat anchored STOPPED/ERROR output as terminal updater messages");
assert.match(bridge, /\$_ -notmatch '\\\\r\\\\n'/,"Serialized assertion source payloads must be excluded from failure summaries");
assert.match(bridge, /\$_ -notmatch '\(\?i\)\\becho\\s\+\\\[\(STOPPED\|ERROR\)\\\]'/,"Batch source lines such as echo [STOPPED] must not be presented as runtime failures");
assert.match(bridge, /\$assertions \| Select-Object -Last 1/,"One actual assertion message should win over source dumps");
assert.ok(bridge.includes("TS\\d{4}"));
assert.ok(bridge.includes("<HGR_ROOT>"));
assert.ok(bridge.includes("authorization:\\s*bearer"));
assert.ok(bridge.includes("token|secret|credential"));
assert.ok(bridge.includes("$detail.Length -gt 900"));
assert.ok(bridge.includes("reason = $failureReason"));
assert.ok(bridge.includes("Get-HgrUpdateFailureReason -Path $updateOutputLog -ExitCode $exitCode"));
assert.ok(bridge.includes("$cmdExe = (Get-Command cmd.exe -ErrorAction Stop).Source"), "Control Update must invoke the batch launcher through cmd.exe");
assert.ok(bridge.includes("& $cmdExe /d /s /c $cmdCommand"), "cmd.exe must own execution of the approved updater");
assert.ok(bridge.includes('$cmdCommand = "call `"$escapedLauncher`" 2>&1"'), "stderr must be merged inside cmd.exe rather than by PowerShell");
assert.doesNotMatch(bridge, /& \$updateLauncher 2>&1/, "PowerShell must not directly execute the batch file with PowerShell-owned stderr redirection");
assert.notEqual(updaterCmd.charCodeAt(0), 0xfeff, "Update HGR GitHub.cmd must not carry a UTF-8 BOM before @echo off");
assert.match(updaterCmd, /^@echo off/, "Windows updater must begin directly with @echo off");
assert.match(controlAgent, /async function updateMarkerFailureReason\(operationId: string\)/);
assert.match(controlAgent, /await updateMarkerFailureReason\(operation\.id\)/, "Control audit should prefer the clean updater marker reason over PowerShell throw formatting");

assert.ok(
  cloudAgent.includes("detailedReason || marker.reason"),
  "Cloud bridge must retain marker failure detail when local audit lookup is unavailable",
);

console.log("PASS 4.5.4.10 + Part 28: Control Update uses safe cmd.exe execution and surfaces one clean bounded failure instead of serialized source dumps");
