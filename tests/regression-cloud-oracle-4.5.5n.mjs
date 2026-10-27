import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root=resolve(import.meta.dirname,"..");
const read=(file)=>readFile(resolve(root,file),"utf8");
const [cmd,helper,privateOwnerProtection]=await Promise.all([
  read("Update HGR GitHub.cmd"),
  read("scripts/windows/cloud-oracle-deploy.ps1"),
  read(".gitignore"),
]);
assert.match(cmd,/if \/i "%HGR_UPDATE_NONINTERACTIVE%"=="1" \([\s\S]*cloud-oracle-deploy\.ps1[\s\S]*goto :DEPLOY_DONE/i,
  "Cloud Update must select the canonical credential-first Oracle helper before owner-private scanning");
assert.match(cmd,/if exist "%PRIVATE_UPDATE_PS1%" \(/,
  "Manual owner website updater must remain available without a behavior change");
assert.match(helper,/owner-update\.json/,"Look up only the saved owner key path");
assert.match(helper,/HGR_UPDATE_NONINTERACTIVE/,"Forbid ordinary callers from using the unattended helper");
assert.match(helper,/HGR_CONTROL_DEFER_REFRESH/,"Require Cloud Update deferral so Control cannot stop mid-run");
assert.match(helper,/Get-Content -LiteralPath \$keyPath -TotalCount 1/,"Validate key file marker without printing its contents");
assert.match(helper,/& \$DeployHelperPath -KeyPath \$keyPath/,"Canonical tracked deploy helper receives explicit key");
assert.doesNotMatch(helper,/Get-ChildItem|Read-Host|OpenFileDialog|Start-Process\s+.*filepicker/i,
  "Cloud helper must never scan folders or ask a hidden file picker");
assert.match(privateOwnerProtection,/^update-website\.ps1$/m,
  "The owner-private updater must remain ignored and never be staged");
if (process.platform==="win32") {
  const run=spawnSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",
    resolve(root,"tests/runtime-cloud-oracle-4.5.5n.ps1")],{
    cwd:root,encoding:"utf8",timeout:25000,
  });
  assert.equal(run.status,0,(run.stdout||"")+(run.stderr||""));
  assert.match(run.stdout||"",/PASS 4\.5\.5n/);
}
await import("./runtime-manual-oracle-credentials-4.6.6.mjs");
console.log("PASS 4.5.5n tracked noninteractive Oracle fast path, owner-private updater preserved");
