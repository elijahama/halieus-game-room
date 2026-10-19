import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const temp=await mkdtemp(join(tmpdir(),"hgr-daily-ledger-"));
process.env.HALIEUS_DATA_DIR=temp;
const { existingDailyWordAttempt, reserveDailyWordAttempt }=await import("../server/src/platform/dailyWordAttempt.ts");
try {
  const account="account-a", rival="account-b", day="2026-10-19", nextDay="2026-10-20";
  assert.equal(existingDailyWordAttempt(account,day),null);
  assert.equal(reserveDailyWordAttempt(account,day,"A:R1"),true);
  assert.equal(existingDailyWordAttempt(account,day),"A:R1");
  assert.equal(reserveDailyWordAttempt(account,day,"A:R1"),true,"same room may continue after reconnect");
  assert.equal(reserveDailyWordAttempt(account,day,"A:R2"),false,"new room cannot claim the same day");
  assert.equal(reserveDailyWordAttempt(rival,day,"B:R1"),true,"another account gets its own attempt");
  assert.equal(reserveDailyWordAttempt(account,nextDay,"A:R3"),true,"next UTC day resets eligibility");

  const claimDir=join(temp,"accounts","word-game-daily-attempts",day);
  const path=join(claimDir,createHash("sha256").update(account).digest("hex")+".json");
  const claim=JSON.parse(await readFile(path,"utf8"));
  assert.equal(claim.accountHash,createHash("sha256").update(account).digest("hex"));
  assert.equal(claim.roomAttemptId,"A:R1");
  assert.ok(!JSON.stringify(claim).includes("account-a"),"the claim path and content should not expose private account IDs");
  assert.throws(()=>reserveDailyWordAttempt(account,"../../outside","bad"),/Invalid daily/);
  await writeFile(path,"{corrupt","utf8");
  assert.throws(()=>reserveDailyWordAttempt(account,day,"A:R4"),"bad ledger data must fail closed, not permit duplicate scores");
  console.log("PASS 4.5.5e atomic per-account/date claim: reconnect, duplicate rejection, UTC rollover, corrupt-data fail closed");
} finally { await rm(temp,{recursive:true,force:true}); }
