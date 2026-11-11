import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { spawn } from "node:child_process";
const root = await mkdtemp(join(tmpdir(), "hgr-archive-memory-"));
assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
const final = join(root, "sessions", "finalized");
await mkdir(final, { recursive: true });
const payload = "x".repeat(700000);
try {
  for (let i = 0; i < 192; i++) {
    const record = {sessionId:"memory-"+i,game:"mega-board",roomCode:"TEST",status:"completed",createdAt:1,finalisedAt:100+i,summary:{winner:"One",matchMode:"ranked"},state:{room:{started:true},gameState:{startedAt:1,ranked:true,winnerPlayerId:"p1",players:[{id:"p1",name:"One",isBankrupt:false,progressionIdentity:{accountId:"one",beta:false,activePlayMs:1000}},{id:"p2",name:"Two",isBankrupt:true,progressionIdentity:{accountId:"two",beta:false,activePlayMs:1000}}],playerStats:{p1:{finishPosition:1,history:[{cash:100,turnNumber:2}]}},unusedReplayPayload:payload}}};
    await writeFile(join(final,String(i).padStart(3,"0")+".json"),JSON.stringify(record));
  }
  const code = await new Promise((done,reject) => {
    const child=spawn(process.execPath,["--max-old-space-size=384","--import","tsx","tests/fixtures/archive-memory-child.mjs"],{cwd:process.cwd(),env:{...process.env,HALIEUS_DATA_DIR:root},stdio:"inherit",windowsHide:true,shell:false});
    child.once("error",reject); child.once("exit",done);
  });
  assert.equal(code,0,"Archive memory regression failed");
} finally { await rm(root,{recursive:true,force:true}); }
