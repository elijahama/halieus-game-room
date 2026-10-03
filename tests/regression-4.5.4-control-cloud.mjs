import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const url = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

const version = read("VERSION").trim();
const shared = read("shared/platform/control-cloud.ts");
const cloud = read("server/src/platform/controlCloud.ts");
const connector = read("server/src/control-cloud-agent.ts");
const feedback = read("server/src/platform/feedback.ts");
const dataPaths = read("server/src/platform/dataPaths.ts");
const serverPackage = JSON.parse(read("server/package.json"));
const docs = read("docs/HGR_CONTROL_CLOUD.md");

assert.equal(version, "4.5.4", "Cloud Control foundation begins the HGR 4.5.4 line");

for (const action of ["status", "start", "restart", "close", "update", "logs", "open-site", "open-github"]) {
  assert.ok(shared.includes(`"${action}"`), `Cloud protocol must retain allow-listed action ${action}`);
}
assert.match(shared, /HGR_CONTROL_CLOUD_READ_ACTIONS[\s\S]*?"status"[\s\S]*?"logs"/);
assert.match(shared, /HGR_CONTROL_CLOUD_MUTATING_ACTIONS[\s\S]*?"start"[\s\S]*?"restart"[\s\S]*?"close"[\s\S]*?"update"/);

assert.match(cloud, /\/admin\/control\/devices/);
assert.match(cloud, /\/control\/agent\/heartbeat/);
assert.match(cloud, /\/control\/agent\/poll/);
assert.match(cloud, /\/control\/agent\/results/);
assert.match(cloud, /\/admin\/control\/requests/);
assert.match(cloud, /Administrator access is required/);
assert.match(cloud, /randomBytes\(32\)\.toString\("base64url"\)/, "Enrollment must issue a high-entropy device credential");
assert.match(cloud, /createHash\("sha256"\)/, "Only a hash of the device credential may be persisted");
assert.match(cloud, /timingSafeEqual/, "Device credential comparison must be timing safe");
assert.match(cloud, /unexpectedFields[\s\S]*command arguments or arbitrary payloads/, "Relay must reject arbitrary command payloads");
assert.match(cloud, /isReadRelayAction\(action\)/, "Batch 1 relay must gate execution to read actions");
assert.match(cloud, /Mutating actions remain disabled until relay QA is complete/);
assert.doesNotMatch(cloud, /node:child_process|execFile|spawn\(/, "The cloud relay server must never execute owner-PC commands");
assert.match(dataPaths, /HALIEUS_CONTROL_CLOUD_DATA_DIR/);
assert.match(dataPaths, /control-cloud/, "Cloud device registration state needs a dedicated durable data directory");

assert.match(connector, /HGR_CONTROL_CLOUD_URL/);
assert.match(connector, /HGR_CONTROL_DEVICE_ID/);
assert.match(connector, /HGR_CONTROL_DEVICE_TOKEN/);
assert.match(connector, /HTTPS \(HTTP is allowed only for local development\)/);
assert.match(connector, /\["127\.0\.0\.1", "::1", "localhost"\]/, "Cloud connector must only call the loopback Control Agent");
assert.match(connector, /localFetch\("\/api\/status"\)/);
assert.match(connector, /localFetch\("\/api\/logs"\)/);
assert.doesNotMatch(connector, /\/api\/actions\//, "Mutating local Control endpoints must remain unavailable to Batch 1 cloud relay");
assert.doesNotMatch(connector, /node:child_process|execFile|spawn\(/, "Outbound connector must not become a shell executor");
assert.match(connector, /Cloud relay mode: read-only Status \+ Logs/);

assert.match(feedback, /registerControlCloudRoutes\(app, getAccount, hasAdmin\)/, "Cloud Control must reuse canonical HGR account/admin authentication");
assert.equal(serverPackage.scripts["control:cloud:dev"], "tsx src/control-cloud-agent.ts");
assert.equal(serverPackage.scripts["control:cloud:start"], "node dist/server/src/control-cloud-agent.js");

assert.match(docs, /4\.5\.4/);
assert.match(docs, /outbound/i);
assert.match(docs, /Status and Logs/);
assert.match(docs, /Tailscale/i, "Tailscale must remain documented as fallback until cloud acceptance is complete");

console.log("HGR 4.5.4 Control Cloud foundation regression: PASS");
