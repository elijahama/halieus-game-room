import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFile } from "node:fs/promises";
import {
  validateRelaySnapshot, validateRelayUpload, storeRelaySnapshot, readOwnerRelay,
  RELAY_MAX_EVENTS, RELAY_STALE_MS,
} from "../server/src/platform/control-development-relay.ts";

const root = mkdtempSync(join(tmpdir(), "hgr-relay-test-"));
const relayFile = join(root, "control-cloud", "development-relay.json");
const stateFile = join(root, "control-cloud", "state.json");
const deviceId = "device-test-1234";
const secret = "PRIVATETOKEN_SHOULD_NEVER_APPEAR_IN_STORED_EVIDENCE";
const privatePrompt = "This raw instruction is confidential and should never leave the PC";
const now = Date.parse("2026-10-25T06:42:00.000Z");
const at = "2026-10-25T06:40:00.000Z";
const event = {
  at, source: "bridge", kind: "prompt", status: "prompt", id: "journal-1", taskId: null,
};
const receipt = {
  at: "2026-10-25T06:39:00.000Z",
  source: "openshard", kind: "receipt", status: "not-verified",
  id: "receipt-1", taskId: null, changedFiles: 0,
};
const snapshot = { source: "available", latestAt: at, events: [event, receipt] };
const makeUpload = (sentAt = new Date(now).toISOString(), nonce = "a".repeat(32), source = snapshot) =>
  ({ sentAt, nonce, snapshot: source });
const deviceState = (approval) => JSON.stringify({version:1, devices:[{deviceId,approval}]});
try {
  mkdirSync(join(root, "control-cloud"), {recursive:true});
  writeFileSync(stateFile, deviceState("approved"));
  assert.deepEqual(validateRelaySnapshot(snapshot), snapshot);
  assert.ok(validateRelayUpload(makeUpload(), now));
  assert.equal(validateRelaySnapshot({...snapshot, privatePrompt}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:[{...event,message:privatePrompt}]}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:[{...event,status:"verification-passed"}]}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:[{...receipt,status:"milestone-reported"}]}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:[{...event,id:"<script>"}]}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:[{...event,changedFiles:1}]}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:Array(RELAY_MAX_EVENTS+1).fill(event)}), null);
  assert.equal(validateRelaySnapshot({...snapshot, events:[receipt,event]}), null, "Must sort by timestamp");
  assert.equal(validateRelayUpload(makeUpload(new Date(now-121000).toISOString()),now),null);
  assert.equal(validateRelayUpload(makeUpload(new Date(now+121000).toISOString()),now),null);
  assert.equal(validateRelayUpload(makeUpload(new Date(now).toISOString(),"bad nonce"),now),null);
  assert.equal(await storeRelaySnapshot(deviceId,makeUpload(),now,relayFile),"accepted");
  let stored = await readFile(relayFile,"utf8");
  assert.ok(!stored.includes(secret) && !stored.includes(privatePrompt));
  assert.equal(await storeRelaySnapshot(deviceId,makeUpload(),now+1000,relayFile),"replay");
  assert.equal(await storeRelaySnapshot(deviceId,makeUpload(new Date(now-1000).toISOString(),"b".repeat(32)),now,relayFile),"replay");
  assert.equal(await storeRelaySnapshot(deviceId,makeUpload(new Date(now+1000).toISOString(),"c".repeat(32),{
    ...snapshot, rawText: privatePrompt
  }),now+1000,relayFile),"invalid");
  assert.equal(await storeRelaySnapshot(deviceId,makeUpload(new Date(now+1000).toISOString(),"c".repeat(32)),now+1000,relayFile),"accepted");
  assert.equal((await readOwnerRelay(now+1000,relayFile,stateFile)).state,"fresh");
  const displayed = await readOwnerRelay(now+1000,relayFile,stateFile);
  assert.deepEqual(displayed.snapshot?.events, snapshot.events);
  assert.ok(!JSON.stringify(displayed).includes(privatePrompt));
  assert.equal((await readOwnerRelay(now+1000+RELAY_STALE_MS+1,relayFile,stateFile)).state,"stale");
  writeFileSync(stateFile,deviceState("revoked"));
  assert.equal((await readOwnerRelay(now+1000,relayFile,stateFile)).state,"unavailable");
  writeFileSync(stateFile,deviceState("pending"));
  assert.equal((await readOwnerRelay(now+1000,relayFile,stateFile)).snapshot,null);
  writeFileSync(stateFile,deviceState("approved"));
  writeFileSync(relayFile,"CORRUPTED");
  assert.equal((await readOwnerRelay(now+1000,relayFile,stateFile)).state,"unavailable");
  const agent = readFileSync(new URL("../server/src/control-cloud-agent.ts",import.meta.url),"utf8");
  const cloud = readFileSync(new URL("../server/src/platform/control-cloud-server-preload.ts",import.meta.url),"utf8");
  const ui = readFileSync(new URL("../server/src/platform/control-cloud-ui-preload.ts",import.meta.url),"utf8");
  const browser = readFileSync(new URL("../client/public/control/development.js",import.meta.url),"utf8");
  assert.match(agent, /HGR_DEVELOPMENT_TIMELINE_SYNC === "1"/);
  assert.match(agent, /destination\.protocol !== "https:"/);
  assert.match(agent, /destination\.hostname !== "halieus\.remotewire\.net"/);
  assert.match(agent, /if \(!heartbeatResponse\.ok \|\| !heartbeat\?\.approved\) return/);
  assert.match(cloud, /path === "\/control\/cloud\/agent\/development-evidence"/);
  assert.match(cloud, /const auth = await authenticatedAgent\(body\)/);
  assert.match(ui, /account\.role !== "owner"/);
  assert.match(ui, /readOwnerRelay/);
  assert.match(browser, /Owner-PC timeline stale/);
  console.log("PASS Control outbound development evidence: explicit opt-in, approved device, schema/privacy, replay, revocation, freshness and stale/offline states");
} finally {rmSync(root,{recursive:true,force:true});}
