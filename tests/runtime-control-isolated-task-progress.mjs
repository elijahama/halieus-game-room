import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
const lib=join(root,"scripts/windows/control-update-task-progress.ps1");
const source=readFileSync(join(root,"scripts/windows/control-update-isolated-main.ps1"),"utf8");
const wrapper=readFileSync(join(root,"scripts/windows/control-update.ps1"),"utf8");
const finalizer=readFileSync(join(root,"scripts/windows/control-update-finalize.ps1"),"utf8");
assert.deepEqual([...source.matchAll(/Invoke-Gate (\d+) "/g)].map(m=>Number(m[1])),[1,2,3,4,5,6,7,8,9,10]);
assert.ok(source.indexOf('Write-HgrTaskEvent $Id "passed"')>source.indexOf('$LASTEXITCODE -ne 0'));
assert.match(source,/foreach \(\$id in 3\.\.10\) \{ Write-HgrTaskEvent \$id "skipped" \}/);
assert.match(wrapper,/if \(\$null -ne \$script:taskTelemetry\)[\s\S]*Update-HgrIsolatedTaskProgress/);
assert.match(finalizer,/state = "succeeded"[\s\S]*progress = 100/);
if(process.platform==="win32"){
 const dir=mkdtempSync(join(tmpdir(),"hgr-task-telemetry-"));
 try{
  const f=join(dir,"fixture.ps1");
  writeFileSync(f,[
   '$ErrorActionPreference = "Stop"',
   ". '"+lib.replaceAll("'","''")+"'",
   '$t = New-HgrIsolatedTaskProgress -OperationId "fixture-123"',
   'function Assert-Ok($value) { if (-not $value) { throw "Task assertion failed" } }',
   'Assert-Ok ((Get-HgrIsolatedTaskPercent $t) -eq 0)',
   'Assert-Ok (-not (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] other-123 1 running"))',
   'Assert-Ok (-not (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 1 passed"))',
   'Assert-Ok (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 1 running")',
   'Assert-Ok ((Get-HgrIsolatedTaskPercent $t) -eq 0)',
   'Assert-Ok (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 1 passed")',
   'Assert-Ok ((Get-HgrIsolatedTaskPercent $t) -eq 9)',
   'Assert-Ok (-not (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 3 running"))',
   'Assert-Ok (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 2 running")',
   'Assert-Ok (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 2 passed")',
   'foreach($id in 3..10) { Assert-Ok (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 $id skipped") }',
   'Assert-Ok ((Get-HgrIsolatedTaskPercent $t) -eq 90)',
   'Assert-Ok (-not (Update-HgrIsolatedTaskProgress $t "[HGR-TASK v1] fixture-123 11 passed"))',
   '$f = New-HgrIsolatedTaskProgress -OperationId "fixture-123"',
   'Assert-Ok (Update-HgrIsolatedTaskProgress $f "[HGR-TASK v1] fixture-123 1 running")',
   'Assert-Ok (Update-HgrIsolatedTaskProgress $f "[HGR-TASK v1] fixture-123 1 failed")',
   'Assert-Ok ((Get-HgrIsolatedTaskPercent $f) -eq 0)',
   'Assert-Ok (-not (Update-HgrIsolatedTaskProgress $f "[HGR-TASK v1] fixture-123 2 running"))'
  ].join("\r\n"));
  const result=spawnSync("powershell.exe",["-NoProfile","-NonInteractive","-File",f],{windowsHide:true,encoding:"utf8",timeout:20000});
  assert.equal(result.status,0,result.stdout+result.stderr);
 }finally{rmSync(dir,{recursive:true,force:true})}
}
console.log("PASS isolated update task receipts: exact ordered exit-based progress, explicit no-op skips, failed/foreign/terminal events rejected");
