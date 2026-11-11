import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const launcher=read("scripts/windows/launcher-shortcuts.ps1");
const cloudUi=read("client/public/control/cloud-update.js");
const repair=read("scripts/windows/recover-control-cloud.ps1");
const wrapper=read("Reconnect HGR Cloud Bridge.cmd");
const bridge=read("server/src/control-cloud-agent.ts");
const start=read("scripts/windows/start-control-cloud.ps1");
const doc=read("docs/HGR_CONTROL_TAILSCALE_RETIREMENT.md");
assert.match(launcher,/StartMenuCloudRecoveryShortcut/, "Start Menu shortcut survives launcher refresh.");
assert.match(launcher,/New-HalieusShortcut -ShortcutPath \$StartMenuCloudRecoveryShortcut/, "Uses canonical shortcut creation.");
assert.match(launcher,/Assert-HalieusShortcutCommandScript -ShortcutPath \$StartMenuCloudRecoveryShortcut/, "Shortcut target audited.");
assert.match(launcher,/\$CreatedShortcuts\.Count -ne 12/, "Six original launcher roles remain exactly unchanged.");
assert.match(launcher,/\$PowerShellIconPath/, "Use existing approved PowerShell-family art.");
assert.match(wrapper,/recover-control-cloud\.ps1/);
assert.doesNotMatch(wrapper,/^pause\s*$/m, "Hidden recovery must never wait for keyboard input.");
assert.match(wrapper,/-WindowStyle Hidden/, "Recovery remains hidden even if called directly.");
assert.match(repair,/Get-LocalStatus/, "Authenticated loopback Control status is checked.");
assert.match(repair,/Is-UpdateBusy \$local/, "No bridge interruption while an operation is running.");
assert.match(repair,/Get-BridgeProcess/, "Only PID + process started identity can be considered owned.");
assert.match(repair,/\$p\.StartTime\.ToUniversalTime\(\)\.Ticks/, "PID reuse must not lead to killing another program.");
assert.match(repair,/\$health\.state -eq 'connected'/, "Actual cloud heartbeat is distinguished from merely running PID.");
assert.match(repair,/\$health\.state -eq 'revoked'/, "Revoked devices require owner re-enrolment, not secret reset.");
assert.match(repair,/Run-Helper \$cloudStop/, "Restart uses existing verified stop helper, not arbitrary process killing.");
assert.match(repair,/Run-Helper \$cloudStart/, "Restart uses approved cloud bridge starter.");
assert.match(repair,/if \(\$bridge -and \$Automatic -and -not \$health\)/,
  "Old bridges without a health marker are never unexpectedly stopped by automated checks.");
assert.doesNotMatch(repair,/(?:Start-Process|Stop-Process|Remove-Item).*hgr-control-cloud-device/i,
  "Recovery must never reset the registered cloud device secret.");
assert.doesNotMatch(repair,/(?:\/api\/actions\/(?:update|restart|close|start)|Update HGR GitHub\.cmd)/i,
  "Bridge recovery must never invoke mutable Game Room actions.");
assert.match(bridge,/recordCloudHealth\("connected", Boolean\(status\), heartbeatResponse\.status\)/,
  "Connected state must only follow approved authenticated heartbeat.");
assert.match(bridge,/heartbeatResponse\.ok/, "Cloud rejected heartbeat cannot claim connected state.");
assert.match(bridge,/recordCloudHealth\("disconnected", Boolean\(status\)\)/, "Network failures written locally.");
assert.match(bridge,/const healthPath = resolve\(runtimeDirectory, "hgr-control-cloud-health.json"\)/);
assert.doesNotMatch(bridge,/atomicJson\(healthPath,\s*\{[^}]*secret/s,"Diagnostic must never persist cloud identity secrets.");
assert.match(start,/hgr-control-cloud-bridge-state\.json/,"Existing ownership state retained.");
assert.match(doc,/No inbound PC port, private Tailscale Serve route/i);
const chooseDeviceSource = cloudUi.match(/function chooseDevice\(devices\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(chooseDeviceSource, "Cloud Control must retain the approved device selector.");
const chooseDevice = vm.runInNewContext("(" + chooseDeviceSource + ")");
const staleApproved = {deviceId:"old-approved",approval:"approved",online:false};
const livePending = {deviceId:"lagz-pending",approval:"pending",online:true};
const liveApproved = {deviceId:"live-approved",approval:"approved",online:true};
assert.equal(chooseDevice([staleApproved,livePending]).deviceId,"lagz-pending",
  "Pending live Lagz must be shown for approval instead of the old disconnected record.");
assert.equal(chooseDevice([livePending,liveApproved]).deviceId,"live-approved",
  "A real connected and approved owner machine remains first preference.");
assert.equal(chooseDevice([staleApproved,{deviceId:"pending-stale",approval:"pending",online:false}]).deviceId,"old-approved",
  "Offline fallback must remain deterministic.");
assert.match(cloudUi,/showApproveButton\(device\)/,
  "Pending enrollment must expose the existing authenticated owner approval button.");
console.log("PASS HGR Cloud bridge recovery: real-heartbeat diagnosis, PID/operation guards, canonical Start Menu shortcut and no Tailscale or secret reset.");
