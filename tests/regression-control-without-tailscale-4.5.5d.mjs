import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
const [start,stop,cloud,refresh,launcher,legacyAlias,cli,site]=await Promise.all([
 "scripts/windows/start-control.ps1",
 "scripts/windows/stop-control.ps1",
 "scripts/windows/start-control-cloud.ps1",
 "scripts/windows/refresh-control-after-update.ps1",
 "Start HGR Control.cmd",
 "Start HGR Control Mobile.cmd",
 "scripts/windows/start-control-mobile.ps1",
 "client/src/platform/control/AdminControlLauncher.tsx",
].map(read));
assert.doesNotMatch(start,/\&\s*\$tailscale|Get-Command tailscale|tailscale\.exe|tailscale serve|\bMagicDNS\b|serve --bg/i,"Control local bootstrap cannot call the Tailscale CLI");
assert.match(start, /\$localPort = 43127/,"Cloud Agent uses established loopback port");
assert.match(start, /\$websiteUrl = "https:\/\/halieus\.remotewire\.net\/control\/"/);
assert.match(start, /\$env:HGR_CONTROL_HOST = "127\.0\.0\.1"/,"Control stays off LAN/public interfaces");
assert.match(start, /\$env:HGR_CONTROL_TOKEN = \$token\.Trim\(\)/,"Control retains bearer authentication");
assert.match(start, /randomBytes\(32\)/,"Use fresh high entropy credentials");
assert.match(start, /if \(\$listener\) \{\s*throw "A listener exists on the Control port with a different PID/,"Cannot hijack another listener");
assert.match(start, /\$existing\.schema -lt 2/,"Legacy live agent must not be disrupted without a guarded migration");
assert.match(start,/\$localTarget\/api\/ping/,"Local Control API must pass before readiness");
assert.match(start,/schema = 2[\s\S]*?httpsPort = 0/,"New state must record no private HTTPS route");
assert.match(start,/no Tailscale client, private Serve route or pairing QR is required/i);
assert.doesNotMatch(start,/Show-HgrControlPairingCard|Copy-HgrControlLink|Pairing card opened/i,"Never open obsolete private client");
assert.match(stop,/if \(\$legacyPrivateServe -and \(Test-Path -LiteralPath \$tailscale\)\)/,"Retire the old Serve route only when migrating legacy state");
assert.match(stop,/Remove-Item -LiteralPath \$tokenPath -Force/,"A true stop revokes the credential");
assert.match(refresh,/\& \$startHelper\s*\n/,"Windows updater must restart Tailscale-free Control helper");
assert.doesNotMatch(refresh,/Private\/Tailscale Control remains available/);
assert.match(cloud,/Get-NetTCPConnection -LocalAddress "127\.0\.0\.1" -LocalPort \$localPort/);
assert.match(cloud,/\.hgr-control-token/);
assert.match(launcher,/start-control-cloud\.ps1/,"Canonical owner Control launcher starts outbound bridge");
assert.match(legacyAlias,/Start HGR Control\.cmd/,"Old mobile launcher is now a Cloud-only compatibility alias");
assert.match(cli,/start-control-cloud\.ps1/,"PowerShell compatibility alias must also start the Cloud bridge");
assert.match(site,/href="\/control\/"/,"Website Control launcher still available");
console.log("PASS 4.5.5d Cloud Control Tailscale-free bootstrap, bridge, legacy cleanup and recovery safety");
