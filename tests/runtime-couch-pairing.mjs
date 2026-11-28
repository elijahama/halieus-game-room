import assert from "node:assert/strict";
import { CouchPairingRegistry } from "../server/src/platform/couchPairing.mjs";

function exercise(Registry, assert) {
  let now = 1000, serial = 0;
  const registry = new Registry({now:()=>now,generateCode:()=> (++serial).toString(16).toUpperCase().padStart(10,"0"),ttlMs:50,maxPending:2});
  const a=registry.create("host");
  assert(a.code==="0000000001" && a.expiresAt===1050, "create");
  assert(registry.create("host")===null && registry.create("")===null, "duplicate/empty host");
  assert(!registry.request(a.code,"host") && !registry.request(a.code,"") && !registry.request("invalid","guest"),"invalid claims");
  assert(registry.approve(a.code,"host")===null,"no guest yet");
  assert(registry.request(a.code,"guest") && registry.request(a.code,"guest"),"guest claim retry");
  assert(!registry.request(a.code,"other") && registry.create("guest")===null,"no takeover or duplicate");
  assert(registry.inspect(a.code,"other")===null && registry.approve(a.code,"guest")===null && !registry.cancel(a.code,"other"),"host authority");
  const snapshot=registry.inspect(a.code,"host"); snapshot.guestAccountId="other";
  assert(registry.inspect(a.code,"host").guestAccountId==="guest","copy isolation");
  const b=registry.create("host2");
  assert(registry.create("host3")===null && !registry.request(b.code,"guest"),"bounded and exclusive pending");
  const pair=registry.approve(a.code,"host");
  assert(pair.hostAccountId==="host" && pair.guestAccountId==="guest" && pair.game==="connect-four","approval");
  assert(registry.approve(a.code,"host")===null && !registry.request(a.code,"guest"),"single-use");
  assert(registry.request(b.code,"guest") && registry.cancel(b.code,"guest") && registry.inspect(b.code,"host2")===null,"guest withdrawal");
  const c=registry.create("host");
  assert(registry.request(c.code,"guest"),"claim before expiry");
  now=1050;
  assert(registry.approve(c.code,"host")===null && registry.inspect(c.code,"host")===null && !registry.request(c.code,"guest"),"expiry boundary");
  const d=registry.create("host");
  assert(d && registry.cancel(d.code,"host"),"host cancellation and reclaim capacity");
  const collision=new Registry({generateCode:()=> "AAAAAAAAAA"});
  assert(collision.create("a") && collision.create("b")===null,"collision fail closed");
}
exercise(CouchPairingRegistry, (ok, label) => assert.ok(ok, label));
const production = new CouchPairingRegistry();
assert.match(production.create("real-host").code, /^[A-F0-9]{10}$/);
console.log("Couch pairing foundation passed");
