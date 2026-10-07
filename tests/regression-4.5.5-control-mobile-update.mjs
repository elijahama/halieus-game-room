import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [controlAgent, bridge, finalizer, cloudAgent, html, ui, css, integrity] = await Promise.all([
  read("server/src/control-agent.ts"),
  read("scripts/windows/control-update.ps1"),
  read("scripts/windows/control-update-finalize.ps1"),
  read("server/src/control-cloud-agent.ts"),
  read("client/public/control/index.html"),
  read("client/public/control/control.js"),
  read("client/public/control/control.css"),
  read("scripts/release-integrity.mjs"),
]);

assert.match(controlAgent, /"-OperationId", operation\.id/);
assert.match(bridge, /ValidateNotNullOrEmpty\(\)\]\[string\]\$OperationId/);
assert.match(bridge, /operationId = \$script:OperationId/);
assert.match(bridge, /operationId = \$OperationId/);
assert.match(bridge, /progressMarkers[\s\S]*STEP 9 - Publishing the validated HGR release[\s\S]*Progress = 88/);
assert.match(bridge, /Update-HgrProgressFromLine/);
assert.match(bridge, /Tee-Object -FilePath \$updateOutputLog[\s\S]*ForEach-Object/);
assert.match(bridge, /progress = \$script:currentProgress[\s\S]*phase = \$script:currentPhase/);
assert.match(bridge, /Finalizing Control handoff/);
assert.doesNotMatch(bridge, /Invoke-Expression|\biex\b/i);

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

assert.match(html, /id="operationToastMinimize"/);
assert.match(ui, /hgr-control-operation-toast-minimized/);
assert.match(ui, /hgr-control-operation-toast-corner/);
assert.match(ui, /setOperationToastMinimized/);
assert.match(ui, /pointerdown/);
assert.match(ui, /setOperationToastCorner/);
assert.match(css, /HGR 4\.5\.5 Batch 1/);
assert.match(css, /\.operation-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /\.operation-toast\.is-minimized/);
assert.match(css, /data-corner\^="bottom"/);
assert.match(css, /bottom:calc\(84px \+ env\(safe-area-inset-bottom\)\)/);

console.log("PASS 4.5.5 Batch 1: durable Control update progress and compact movable mobile status");
