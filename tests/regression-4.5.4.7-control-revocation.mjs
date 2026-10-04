import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [serverRelay, cloudUi, cloudDoc] = await Promise.all([
  readFile(resolve(root, "server/src/platform/control-cloud-server-preload.ts"), "utf8"),
  readFile(resolve(root, "client/public/control/cloud-update.js"), "utf8"),
  readFile(resolve(root, "docs/HGR_CONTROL_CLOUD.md"), "utf8"),
]);

assert.match(serverRelay, /handleRevoke\(request: IncomingMessage, response: ServerResponse, deviceId: string\)/, "Cloud relay must have an explicit enrollment revocation handler");
assert.ok(
  serverRelay.includes('const revoke = path.match(/^\\/control\\/cloud\\/devices\\/([A-Za-z0-9._-]{8,96})\\/revoke$/);'),
  "Cloud relay must expose only the bounded device revoke route",
);
assert.match(serverRelay, /const actor = requireAdmin\(request, response\);[\s\S]*?device\.approval = "revoked"/, "Revocation must remain owner\/admin authenticated and same-origin protected");
assert.match(serverRelay, /Finish the active owner-PC Control operation before revoking this enrollment/, "Revocation must refuse to orphan an active Control operation");
assert.match(serverRelay, /if \(confirmation\.deviceId === deviceId\) confirmations\.delete\(key\)/, "Revocation must invalidate outstanding one-time confirmations for the device");
assert.match(serverRelay, /device\.approval !== "revoked" && deviceOnline\(device\)/, "Revoked devices must not continue to present as online");
assert.doesNotMatch(serverRelay, /node:child_process|execFile|spawn\(/, "Enrollment revocation must not add a remote execution path");

assert.match(cloudUi, /Revoke cloud access/);
assert.match(cloudUi, /Reject enrollment/);
assert.match(cloudUi, /\/control\/cloud\/devices\/\$\{encodeURIComponent\(device\.deviceId\)\}\/revoke/);
assert.match(cloudUi, /window\.confirm/);
assert.match(cloudUi, /Owner-PC enrollment revoked/);
assert.doesNotMatch(cloudUi, /actions\/(start|restart|close)/, "4.5.4.7 must not quietly enable later Cloud Control actions");

assert.match(cloudDoc, /revocation/i, "Cloud Control documentation must describe enrollment revocation");
assert.match(cloudDoc, /fresh owner-PC enrollment/i, "Docs must explain that revoked credentials are not silently re-approved");

console.log("PASS 4.5.4.7: Cloud Control owner-PC enrollment can be explicitly revoked without adding remote execution");
