import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const source=await readFile(new URL("../tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1",import.meta.url),"utf8");
assert.match(source,/Invoke-HgrBoundedProbeWorker -WorkerScript \$workerScript -TimeoutSeconds 35/);
assert.match(source,/\$worker\.WaitForExit\(\$TimeoutSeconds \* 1000\)/);
assert.match(source,/\$info\.CreateNoWindow = \$true/);
assert.match(source,/\$stopInfo\.CreateNoWindow = \$true/);
assert.match(source,/\$actualVersion -ne \$expectedVersion -or \$actualFingerprint -ne \$expectedFingerprint/);
assert.match(source,/\$probe\.ExitCode -ne 0 -or -not \$healthRaw/);
assert.match(source,/Release identity is unconfirmed/);
if(process.platform==="win32"){
 const worker=source.slice(source.indexOf("function Invoke-HgrBoundedProbeWorker("),source.indexOf("function Get-HalieusPublicHealth("));
 assert.ok(worker.length>500);
 const script=worker+"\n"+[
  '$ok = Invoke-HgrBoundedProbeWorker -WorkerScript \'Write-Output "probe-ok"; exit 0\' -TimeoutSeconds 15',
  'if ($ok.ExitCode -ne 0 -or $ok.Output.Trim() -ne "probe-ok") { throw "Success receipt not returned" }',
  '$bad = Invoke-HgrBoundedProbeWorker -WorkerScript \'Write-Output "probe-failed"; exit 7\' -TimeoutSeconds 15',
  'if ($bad.ExitCode -ne 7) { throw "Failed child must stay failed" }',
  '$timer=[Diagnostics.Stopwatch]::StartNew(); $timedOut=$false',
  'try { Invoke-HgrBoundedProbeWorker -WorkerScript "Start-Sleep -Seconds 60" -TimeoutSeconds 1 | Out-Null } catch { if ($_.Exception.Message -notmatch "timed out") { throw }; $timedOut=$true }',
  'if (-not $timedOut -or $timer.Elapsed.TotalSeconds -gt 20) { throw "Worker did not enforce its wall-clock deadline" }',
  'Write-Output "PASS Windows read-only probe worker: success, nonzero exit and bounded timeout"'
 ].join("\n");
 const result=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-EncodedCommand",Buffer.from('$ErrorActionPreference="Stop"\n'+script,"utf16le").toString("base64")],{encoding:"utf8",windowsHide:true,timeout:55000});
 assert.equal(result.status,0,result.error?.message??result.stderr??"worker test failed");
 assert.match(result.stdout,/PASS Windows read-only probe worker/);
}
console.log("PASS Control health watchdog: exact verification retained, bounded hidden worker, no false success");
