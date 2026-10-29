import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expireUnreportedUpdates } from "../server/src/platform/control-operation-recovery.ts";
const root = new URL("../", import.meta.url);
const read = p => readFile(new URL(p,root),"utf8");
const [cloud, bridge, ui, local, buttons] = await Promise.all([
  "server/src/platform/control-cloud-server-preload.ts",
  "server/src/control-cloud-agent.ts",
  "client/public/control/cloud-update.js",
  "server/src/control-agent.ts",
  "client/public/control/index.html",
].map(read));
assert.match(cloud,/function requireOwner\([\s\S]*?requireAdmin\(request, response\)[\s\S]*?actor\.role !== "owner"/,
  "Only authenticated same-origin owner can request laptop lifecycle operations");
assert.match(cloud,/const lifecycle = path\.match\(\/\^\\\/control\\\/cloud\\\/actions\\\/\(start\|restart\|close\)/,
  "Cloud lifecycle routes must use explicit action names");
assert.match(cloud,/exactKeys\(body, \["deviceId", "confirmationId"\]\)/,
  "No free-form execution arguments");
assert.match(cloud,/confirmed\.action !== action \|\| confirmed\.deviceId !== deviceId/,
  "Action-bound one-time confirmation");
assert.match(cloud,/confirmed\.actorId !== actor\.id \|\| confirmed\.expiresAt <= Date\.now\(\)/,
  "Confirmation tied to owner and 30 second expiry");
assert.match(cloud,/confirmations\.delete\(key\)/,"Confirmation consumed even when rejected");
assert.match(cloud,/store\.requests\.some\(\(entry\) => entry\.deviceId === deviceId && \(entry\.state === "queued" \|\| entry\.state === "running"\)\)/,
  "Atomic queue rejects concurrent actions");
assert.match(cloud,/\["update", "start", "restart", "close"\]\.includes\(entry\.action\)/,
  "Bridge poll can only get allowlisted cloud operations");
assert.match(cloud,/if \(operation\.state !== "running" && operation\.state !== "queued"\) return \{ found: true, notification: null \}/,
  "Late progress cannot replay a terminal operation");
assert.doesNotMatch(cloud,/node:child_process|execFile\(|spawn\(|body\.(?:command|shell|executable|script|args)/,
  "Cloud must not spawn commands or interpret supplied scripts");
assert.match(bridge,/const LIFECYCLE_ACTIONS = new Set<LifecycleAction>\(\["start", "restart", "close"\]\)/);
assert.match(bridge,/LIFECYCLE_ACTIONS\.has\(poll\.request\.action as LifecycleAction\)/);
assert.match(bridge,/localRequest\(\x60\/api\/actions\/\$\{action\}\x60/, "Only fixed localhost lifecycle endpoint");
assert.match(bridge,/action === "close"[\s\S]*?localRequest\("\/api\/confirm"/,
  "Local Close requires a second localhost confirmation");
assert.match(bridge,/55_000/, "Bound running Windows lifecycle action");
assert.match(bridge,/No automatic retries of mutable commands/, "Failed reply must never be retried automatically");
assert.doesNotMatch(bridge,/node:child_process|execFile\(|spawn\(/);
assert.match(ui,/actorRole !== "owner"/);
assert.match(ui,/window\.confirm\(/);
assert.match(ui,/\x60\/control\/cloud\/actions\/\$\{action\}\/confirm\x60/);
assert.match(ui,/\x60\/control\/cloud\/actions\/\$\{action\}\x60/);
assert.match(ui,/updateInFlight \|\| lastOperation\?\.state === "running"/);
assert.match(local,/\/api\/actions\/start/);
assert.match(local,/\/api\/actions\/restart/);
assert.match(local,/consumeActionConfirmation\(request, "close", body\)/);
for(const action of ["start","restart","close"]){
  assert.match(buttons,new RegExp('data-operation="'+action+'" disabled'));
}
const now=Date.now();
const running=action=>({action,state:"running",updatedAt:new Date(now-4*60_000).toISOString(),phase:"Running",reason:null});
const operations=[running("start"),running("restart"),running("close"),running("update")];
expireUnreportedUpdates(operations,now);
for(const entry of operations.slice(0,3)){
  assert.equal(entry.state,"failed","Timed out lifecycle must not remain infinite running");
  assert.match(entry.reason,/may have run/,"Never falsely claim the owner-PC action did not execute");
}
assert.equal(operations[3].state,"running","Legacy long Oracle Update window must be preserved");
console.log("PASS 4.5.6 lifecycle: owner-only fixed Cloud actions, one-shot confirmations, serial operations, authenticated localhost bridge and no arbitrary commands");
