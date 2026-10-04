import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [
  serverRelay,
  uiRelay,
  ownerBridge,
  cloudUi,
  startCmd,
  stopCmd,
  updateBridge,
  service,
  contract,
] = await Promise.all([
  read("server/src/platform/control-cloud-server-preload.ts"),
  read("server/src/platform/control-cloud-ui-preload.ts"),
  read("server/src/control-cloud-agent.ts"),
  read("client/public/control/cloud-update.js"),
  read("Start HGR Control.cmd"),
  read("Stop HGR Control.cmd"),
  read("scripts/windows/control-update.ps1"),
  read("deploy/oracle/halieus-game-room.service"),
  read("shared/platform/control-cloud.ts"),
]);

assert.match(contract, /"update"/);
assert.match(serverRelay, /\/control\/cloud\/actions\/update\/confirm/);
assert.match(serverRelay, /\/control\/cloud\/actions\/update/);
assert.match(serverRelay, /exactKeys\(body, \["deviceId", "confirmationId"\]\)/);
assert.match(serverRelay, /Cross-origin Control requests are not accepted/);
assert.match(serverRelay, /Owner or administrator access is required/);
assert.doesNotMatch(serverRelay, /node:child_process|execFile|spawn\(/, "Cloud relay must never execute owner-PC commands itself");
assert.doesNotMatch(serverRelay, /body\.(command|path|args|executable|shell)/, "Cloud requests must not accept free-form command fields");

assert.match(ownerBridge, /https:\/\/halieus\.remotewire\.net/);
assert.match(ownerBridge, /\/api\/confirm/);
assert.match(ownerBridge, /\/api\/actions\/update/);
assert.match(ownerBridge, /action: "update"/);
assert.doesNotMatch(ownerBridge, /node:child_process|execFile|spawn\(/, "Outbound bridge must delegate to the existing fixed local Control Agent");
assert.doesNotMatch(ownerBridge, /actions\/(start|restart|close)/, "4.5.4.5 cloud bridge exposes Update only");

assert.match(startCmd, /start-control\.ps1/);
assert.match(startCmd, /start-control-cloud\.ps1/);
assert.match(stopCmd, /stop-control-cloud\.ps1/);
assert.match(stopCmd, /stop-control\.ps1/);
assert.match(updateBridge, /hgr-control-update-result\.json/);
assert.match(updateBridge, /HGR_UPDATE_NONINTERACTIVE/);

assert.match(service, /--import \/opt\/halieus-game-room\/server\/dist\/server\/src\/platform\/control-cloud-server-preload\.js/);
assert.match(service, /--import \/opt\/halieus-game-room\/server\/dist\/server\/src\/platform\/control-cloud-ui-preload\.js/);
assert.match(uiRelay, /\/control\/control\.js/);
assert.match(uiRelay, /cloud-update\.js/);
assert.match(uiRelay, /\/control\/operation-status/);

assert.match(cloudUi, /Approve owner PC/);
assert.match(cloudUi, /Cloud Update ready/);
assert.match(cloudUi, /\/control\/cloud\/actions\/update\/confirm/);
assert.match(cloudUi, /\/control\/cloud\/actions\/update/);
assert.match(cloudUi, /window\.confirm/);
assert.doesNotMatch(cloudUi, /actions\/(start|restart|close)/, "Cloud UI must not quietly enable later remote actions in this batch");

console.log("PASS 4.5.4.5: Cloud Update stays owner/admin-authenticated, confirmed, outbound-only and fixed-action");
