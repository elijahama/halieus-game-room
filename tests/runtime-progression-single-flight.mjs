import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { perAccountSingleFlight } from "../server/src/platform/perAccountSingleFlight.ts";

const calls = [];
const pending = new Map();
const single = perAccountSingleFlight(accountId => {
  calls.push(accountId);
  return new Promise((resolve,reject) => pending.set(accountId,{resolve,reject}));
});
const a = single("account-a");
const again = single("account-a");
const b = single("account-b");
assert.strictEqual(a,again,"same-account concurrent reads share one verified rebuild");
assert.notStrictEqual(a,b,"independent accounts cannot inherit one queue promise");
await Promise.resolve();
assert.deepEqual(calls,["account-a","account-b"],"different accounts start without waiting for a predecessor");
pending.get("account-b").resolve("B");
assert.equal(await b,"B","B must finish even while A remains unresolved");
pending.get("account-a").resolve("A");
assert.equal(await a,"A");
const newA=single("account-a");
assert.notStrictEqual(newA,a,"completed calculations must not become a stale cache");
await Promise.resolve();
pending.get("account-a").resolve("A2");
assert.equal(await newA,"A2");

const c=single("account-c");
await Promise.resolve();
pending.get("account-c").reject(new Error("temporary"));
await assert.rejects(c,/temporary/);
const retry=single("account-c");
assert.notStrictEqual(retry,c,"a failed rebuild must permit a fresh retry");
await Promise.resolve();
pending.get("account-c").resolve("retry-ok");
assert.equal(await retry,"retry-ok");

const original=process.env.HALIEUS_DATA_DIR;
const root=await mkdtemp(join(tmpdir(),"hgr-progression-flight-"));
try {
  process.env.HALIEUS_DATA_DIR=root;
  const dir=join(root,"sessions","finalized");
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,"verified.json"),JSON.stringify({
    sessionId:"verified-a",finalisedAt:123456,status:"completed",game:"connect-four",
    state:{started:true,winnerPlayerId:"p1",players:[
      {id:"p1",name:"One",isAi:false,progressionIdentity:{accountId:"account-a",activePlayMs:60000}},
      {id:"p2",name:"Two",isAi:false,progressionIdentity:{accountId:"another-person",activePlayMs:0}}
    ]}
  }));
  const {readPlayerProgression}=await import("../server/src/platform/progression.ts");
  const first=readPlayerProgression("account-a");
  const repeated=readPlayerProgression("account-a");
  assert.strictEqual(first,repeated,"real authenticated progression scans must coalesce by account");
  const unrelated=readPlayerProgression("not-present");
  assert.notStrictEqual(first,unrelated);
  const [owned,empty]=await Promise.all([first,unrelated]);
  assert.equal(owned.played,1,"matching actual account receives exactly one completed match");
  assert.equal(owned.wins,1);
  assert.equal(empty.played,0,"another account cannot receive the owner's session");
  assert.equal(empty.gamerScore,0);
  const saved=JSON.parse(await readFile(join(root,"accounts","progression",Buffer.from("account-a").toString("hex")+".json"),"utf8"));
  assert.deepEqual(saved,JSON.parse(JSON.stringify(owned)),"durable JSON snapshot matches verified rebuilt progression");
  assert.deepEqual(await readPlayerProgression("account-a"),owned,"retry is idempotent");
} finally {
  if(original===undefined) delete process.env.HALIEUS_DATA_DIR;
  else process.env.HALIEUS_DATA_DIR=original;
  await rm(root,{recursive:true,force:true});
}
console.log("PASS per-account Gamer Score single-flight: no cross-user queue, retries, no leaked awards, verified durable snapshots");
