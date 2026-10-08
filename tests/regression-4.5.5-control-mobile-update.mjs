import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [controlAgent, bridge, finalizer, cloudAgent, html, ui, cloudUi, css, integrity] = await Promise.all([
  read("server/src/control-agent.ts"),
  read("scripts/windows/control-update.ps1"),
  read("scripts/windows/control-update-finalize.ps1"),
  read("server/src/control-cloud-agent.ts"),
  read("client/public/control/index.html"),
  read("client/public/control/control.js"),
  read("client/public/control/cloud-update.js"),
  read("client/public/control/control.css"),
  read("scripts/release-integrity.mjs"),
]);

assert.match(controlAgent, /"-OperationId", operation\.id/);
assert.match(bridge, /ValidateNotNullOrEmpty\(\)\]\[string\]\$OperationId/);
assert.match(bridge, /operationId = \$script:OperationId/);
assert.match(bridge, /operationId = \$OperationId/);
assert.match(bridge, /progressMarkers[\s\S]*STEP 9 - Publishing the validated HGR release[\s\S]*Progress = 88/);
assert.match(bridge, /Update-HgrProgressFromLine/);
assert.match(bridge, /\[AllowEmptyString\(\)\]\[string\]\$Line/,"Control progress parser must accept blank CMD output lines");
assert.match(bridge, /if \(\[string\]::IsNullOrWhiteSpace\(\$Line\)\) \{ return \}/,"Blank updater output must be ignored before marker matching");
assert.match(bridge, /Tee-Object -FilePath \$updateOutputLog[\s\S]*ForEach-Object/);
assert.match(bridge, /progress = \$script:currentProgress[\s\S]*phase = \$script:currentPhase/);
assert.match(bridge, /Finalizing Control handoff/);
assert.doesNotMatch(bridge, /Invoke-Expression|\biex\b/i);
assert.match(bridge, /Get-Command cmd\.exe -ErrorAction Stop/,"Remote Update must execute the approved batch file through cmd.exe");
assert.match(bridge, /& \$cmdExe \/d \/s \/c \$cmdCommand/,"cmd.exe must own updater stderr merging and exit status");
assert.doesNotMatch(bridge, /& \$updateLauncher 2>&1/,"Direct PowerShell batch invocation must not return");

assert.match(finalizer, /progress = 100[\s\S]*phase = "Update complete"/);
assert.match(finalizer, /phase = "Restarting Control after update"/);
assert.match(finalizer, /phase = "Update finalization failed"/);
assert.match(finalizer, /operationId = \$operationId/);
assert.match(integrity, /scripts\/windows\/control-update-finalize\.ps1/);

assert.match(cloudAgent, /progress\?: number/);
assert.match(cloudAgent, /phase\?: string/);
assert.match(cloudAgent, /marker\?\.state === "running"/);
assert.match(cloudAgent, /Number\(marker\?\.progress\)/);
assert.match(cloudAgent, /marker\.phase\.trim\(\)/);
assert.match(cloudAgent, /operationId\?: string/);
assert.match(cloudAgent, /marker\?\.operationId === localOperationId/);
assert.match(cloudAgent, /if \(await reportProgress\(identity, requestId, "running", markerProgress, markerPhase/,"Running marker progress must advance local acknowledgement state only after cloud delivery");
assert.match(cloudAgent, /terminalObserved = true[\s\S]*if \(await reportProgress\(identity, requestId, "succeeded"/,"Terminal success must be retried until the cloud acknowledges it");
assert.match(cloudAgent, /if \(stopping \|\| terminalObserved\) return false/,"A locally observed terminal result must never be rewritten as a timeout");

assert.match(html, /id="operationStateIcon"/);
assert.match(html, /data-operation="update" data-update-state="idle"[\s\S]*operation-action-icon/);
assert.match(html, /control\.css\?v=4\.5\.5-force-live-1/,"Cloud Control CSS URL must move when status visuals change");
assert.match(html, /control\.js\?v=4\.5\.5-force-live-1/,"Cloud Control script URL must move with the progress retry release");
assert.match(cloudUi, /update\.dataset\.updateState = busy \? "running" : "idle"/);
assert.doesNotMatch(cloudUi, /terminalState/,"Update action tile must not duplicate terminal status");
assert.match(css, /@keyframes control-operation-spin/);
assert.match(css, /data-state="running"[\s\S]*operation-icon::before[\s\S]*border-top-color:#8da8ff/);
assert.match(css, /data-state="succeeded"[\s\S]*operation-icon::before[\s\S]*content:"✓"/);
assert.match(css, /operation-toast:not\(\[data-state="running"\]\) \.operation-icon,[\s\S]*animation:none!important[\s\S]*transform:none!important/,"Only the running ring may animate; terminal glyphs must be static");
assert.match(css, /data-update-state="running"[\s\S]*operation-action-icon::before/);
assert.doesNotMatch(css, /data-update-state="succeeded"|data-update-state="failed"|data-update-state="rejected"/,"Update action tile must return to idle after terminal state");
assert.match(html, /id="operationToastMinimize"/);
assert.match(ui, /hgr-control-operation-toast-minimized/);
assert.match(ui, /hgr-control-operation-toast-corner/);
assert.match(ui, /setOperationToastMinimized/);
assert.match(ui, /const minimized = Boolean\(value\);/,"Global operation status must minimize on desktop and mobile");
assert.doesNotMatch(ui, /const minimized = Boolean\(value\) && operationToastIsMobile\(\)/,"Desktop must not be blocked from minimizing the operation status");
assert.match(ui, /reason: String\(value\.reason \|\| ""\)\.trim\(\)/,"Captured owner-PC failure reason must survive global status normalization");
assert.match(ui, /terminalReason \|\| operation\.phase/,"Terminal global status must surface the bounded failure reason");
assert.match(ui, /pointerdown/);
assert.match(ui, /setOperationToastCorner/);
assert.match(css, /HGR Part 28 — compact global operation status/);
assert.match(css, /\.operation-toast-minimize\{display:grid;place-items:center/,"Minimize control must be available globally");
assert.match(css, /\.operation-toast\.is-minimized\[data-corner\^="bottom"\]\{top:auto;bottom:14px\}/,"Desktop minimized status must snap away from content");
assert.match(css, /data-state="failed"[\s\S]*border-color:rgba\(115,145,255,\.28\)/,"Failed status must keep neutral card chrome");
assert.doesNotMatch(css, /data-state="failed"[\s\S]{0,180}border-color:#df7373/,"Failed status must not paint the whole card red");
assert.match(css, /data-state="failed"[\s\S]*operation-icon,[\s\S]*data-state="rejected"[\s\S]*operation-icon\{background:transparent;color:#ff9d9d[\s\S]*animation:none!important/,"Failed/rejected status glyph must stay unhighlighted and static");
assert.match(css, /@media\(max-width:720px\)[\s\S]*\.profile-chip\{width:40px;height:40px;padding:2px;justify-content:center;border-radius:12px/,"Mobile profile frame must hug the avatar rather than keep desktop chip padding");
assert.match(css, /\.operation-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /\.operation-toast\.is-minimized/);
assert.match(css, /data-corner\^="bottom"/);
assert.match(css, /button\[data-operation\]:not\(:disabled\)\{background:#151d29;border-color:#344052;border-top-color:var\(--action-color\);color:#fff;box-shadow:none\}/,"Available operation cards must stay restrained instead of looking permanently highlighted");
assert.doesNotMatch(css, /button\[data-operation\]:not\(:disabled\)\{background:#204779/,"The old blue-filled available-operation highlight must not return");
assert.match(css, /HGR 4\.5\.5 — forced live Control authority/,"4.5.5 must carry a final Control authority layer");
assert.match(css, /background:#151d29!important/,"Final Control authority must defeat legacy highlighted operation fills");
assert.match(css, /bottom:calc\(84px \+ env\(safe-area-inset-bottom\)\)/);

console.log("PASS 4.5.5 Batch 1 + Part 28: retryable update progress, fresh Control assets, static terminal glyphs, neutral failure status and tight mobile profile frame");
