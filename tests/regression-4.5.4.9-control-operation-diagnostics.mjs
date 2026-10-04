import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [uiRelay, cloudUi, baseUi] = await Promise.all([
  read("server/src/platform/control-cloud-ui-preload.ts"),
  read("client/public/control/cloud-update.js"),
  read("client/public/control/control.js"),
]);

assert.match(uiRelay, /\/control\/operation-history/);
assert.match(uiRelay, /serveOperationHistory/);
assert.match(uiRelay, /hasAdmin\(request\)/);
assert.match(uiRelay, /operations: history\.map\(\(entry\) => publicOperation\(entry\)\)/);
assert.match(uiRelay, /updatedAt: entry\.updatedAt/);
assert.match(uiRelay, /localOperationId: entry\.localOperationId \|\| null/);
assert.match(uiRelay, /reason: entry\.reason/);
assert.doesNotMatch(uiRelay, /secretHash|\.secret\b|deviceId:/, "Public Control operation diagnostics must not expose device credentials or device identity fields");

assert.match(cloudUi, /\/control\/operation-history/);
assert.match(cloudUi, /Owner-PC operation history/);
assert.match(cloudUi, /Failure reason/);
assert.match(cloudUi, /Operation ID/);
assert.match(cloudUi, /controlOperationReason/);
assert.match(cloudUi, /Reason: \$\{reasonText\}/);
assert.match(cloudUi, /operation\.localOperationId/);
assert.match(cloudUi, /renderOperationDiagnostics\(operation\)/);
assert.match(cloudUi, /renderOperationHistory\(operationHistory\.operations\)/);

assert.match(baseUi, /state\.snapshot\?\.audit \|\| \[\]/, "Existing administrative audit history must remain intact");

console.log("PASS 4.5.4.9: Control exposes bounded operation diagnostics without secrets while preserving administrative audit history");
