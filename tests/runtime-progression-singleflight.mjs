import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Use a disposable archive root: never read or modify real account progression.
const previous=process.env.HALIEUS_DATA_DIR;
const previousAccount=process.env.HALIEUS_ACCOUNT_DATA_DIR;
const root=await mkdtemp(join(tmpdir(),"hgr-gamerscore-"));
process.env.HALIEUS_DATA_DIR=root;
delete process.env.HALIEUS_ACCOUNT_DATA_DIR;
try {
  const { readPlayerProgression }=await import("../server/src/platform/progression.ts");
  const same1=readPlayerProgression("test-player-a");
  const same2=readPlayerProgression("test-player-a");
  const other=readPlayerProgression("test-player-b");
  assert.strictEqual(same1,same2,"same account requests must share a single in-flight archive rebuild");
  assert.notStrictEqual(same1,other,"unrelated accounts must not queue behind the same calculation");
  const [a,b]=await Promise.all([same1,other]);
  assert.equal(a.gamerScore,0);
  assert.equal(b.gamerScore,0);
  assert.equal(a.played,0);
  assert.equal(b.played,0);
  await Promise.resolve();
  const again=readPlayerProgression("test-player-a");
  assert.notStrictEqual(again,same1,"completed reads must not retain a stale entitlement result");
  assert.equal((await again).gamerScore,0);
  const snapshot=join(root,"accounts","progression",Buffer.from("test-player-a").toString("hex")+".json");
  assert.equal(JSON.parse(await readFile(snapshot,"utf8")).gamerScore,0,
    "authoritative per-account snapshot remains persisted");
  console.log("PASS Gamer Score: same-account single-flight, cross-account independent, renewed authoritative read and durable snapshot");
} finally {
  if(previous===undefined) delete process.env.HALIEUS_DATA_DIR;
  else process.env.HALIEUS_DATA_DIR=previous;
  if(previousAccount===undefined) delete process.env.HALIEUS_ACCOUNT_DATA_DIR;
  else process.env.HALIEUS_ACCOUNT_DATA_DIR=previousAccount;
  await rm(root,{recursive:true,force:true});
}
