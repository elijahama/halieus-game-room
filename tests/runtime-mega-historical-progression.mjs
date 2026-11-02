import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const root = await mkdtemp(path.join(tmpdir(),"hgr-historical-honours-"));
process.env.HALIEUS_DATA_DIR = root;
const { createInitialGameState } = await import("../shared/games/mega-board/game-state.ts");
const { readPlayerProgression } = await import("../server/src/platform/progression.ts");
try {
  const sessionsDir=path.join(root,"sessions","finalized");
  await mkdir(sessionsDir,{recursive:true});
  await mkdir(path.join(root,"mega-board"),{recursive:true});
  await writeFile(path.join(root,"mega-board","rankings.json"),JSON.stringify({
    version:1,seasonStartedAt:100000,leaderboard:[],matches:[],preseasonStandings:[]
  }));
  for(let i=0;i<5;i++){
    const state=createInitialGameState("HIST"+i,[{id:"p1",name:"Verified"},{id:"p2",name:"Rival"}]);
    state.phase="finished";state.ranked=true;state.winnerId="p1";state.gameStartedAt=1000+i*1000;
    state.players[0].progressionIdentity={accountId:"account-a",beta:false,activePlayMs:0};
    state.players[1].isBankrupt=true;
    Object.assign(state.playerStats.p1,{
      peakProperties:12,rentPaid:1001,finishPosition:1,
      history:[{turnNumber:2,at:1500+i*1000,cash:100,properties:4,developments:0,netWorth:300}],
    });
    state.rankedResults=[{playerId:"p1",ratingBefore:900},{playerId:"p2",ratingBefore:1200}];
    await writeFile(path.join(sessionsDir,"record-"+i+".json"),JSON.stringify({
      sessionId:"historic-"+i,game:"mega-board",status:"completed",
      finalisedAt:15000+i*1000,state,
    }));
  }
  // Other users and Beta records are never allowed to earn historical honours.
  const beta=createInitialGameState("BETA",[{id:"p1",name:"Beta"},{id:"p2",name:"Other"}]);
  beta.phase="finished";beta.ranked=true;beta.winnerId="p1";beta.gameStartedAt=2000;
  beta.players[0].progressionIdentity={accountId:"account-b",beta:true,activePlayMs:0};
  await writeFile(path.join(sessionsDir,"beta.json"),JSON.stringify({
    sessionId:"beta",game:"mega-board",status:"completed",finalisedAt:21000,state:beta,
  }));
  const first=await readPlayerProgression("account-a");
  const again=await readPlayerProgression("account-a");
  const required=[
    "mega:property-empire","mega:rent-survivor","mega:comeback-victory",
    "mega:rising-contender","mega:consistency","mega:underdog","mega:preseason-podium",
  ];
  for(const id of required){
    assert(first.awards.some(x=>x.id===id),"Missing retro honour "+id);
    assert.equal(first.awards.filter(x=>x.id===id).length,1,"Duplicate award "+id);
  }
  assert.deepEqual(again.awards,first.awards,"Idempotent rebuild must not grant points twice.");
  assert.equal(again.gamerScore,first.gamerScore);
  assert(first.played===5 && first.wins===5,"Verified matches count normally.");
  const stranger=await readPlayerProgression("account-b");
  assert.equal(stranger.played,0,"Beta match excluded.");
  assert(!stranger.awards.some(x=>required.includes(x.id)),"No Beta honours.");
  const unknown=await readPlayerProgression("account-nonexistent");
  assert.equal(unknown.gamerScore,0,"Never award on names alone.");
  console.log("PASS historical Mega Board awards: archive backfill, account proof, Beta exclusion, seven unique achievements and idempotence");
} finally {
  await rm(root,{recursive:true,force:true});
}
