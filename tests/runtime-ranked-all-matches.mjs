import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
const root = await mkdtemp(path.join(tmpdir(),"hgr-ranked-full-"));
const dir = path.join(root,"finalized");
await mkdir(dir,{recursive:true});
const { createRankedMatchHistory, registerRankedMatchHistoryRoutes } = await import("../server/src/platform/ranked-match-history.ts");
const baseAt = Date.UTC(2026,9,1);
const twoPlayers=[
  { id:"seat-a",name:"Alpha",isAi:false,progressionIdentity:{accountId:"a"}},
  { id:"seat-b",name:"Bravo",isAi:false,progressionIdentity:{accountId:"b"}},
];
function record(i,game="connect-four",modifications={}){
  return {
    game,sessionId:`id-${game}-${i}`,roomCode:`ROOM${i}`,
    status:"completed", finalisedAt:baseAt+i*60000,
    state:{ matchMode:"ranked",players:twoPlayers,winnerPlayerId:i%2?"seat-a":"seat-b", ...modifications },
  };
}
try {
  for(let i=0;i<56;i++){
    await writeFile(path.join(dir,`ranked-${String(i).padStart(3,"0")}.json`),
      JSON.stringify(record(i,i<35?"connect-four":"ludo")));
  }
  // Repeated immutable match/duplicate must not appear more than once.
  await writeFile(path.join(dir,"duplicate.json"),JSON.stringify(record(15)));
  await writeFile(path.join(dir,"casual.json"),JSON.stringify(record(66,"connect-four",{matchMode:"casual"})));
  await writeFile(path.join(dir,"ai.json"),JSON.stringify(record(67,"ludo",{players:[twoPlayers[0],{...twoPlayers[1],isAi:true}]})));
  await writeFile(path.join(dir,"beta.json"),JSON.stringify(record(68,"connect-four",{players:[twoPlayers[0],{...twoPlayers[1],progressionIdentity:{accountId:"b",beta:true}}]})));
  await writeFile(path.join(dir,"unverified.json"),JSON.stringify({...record(69),status:"incomplete"}));
  await writeFile(path.join(dir,"missing-time.json"),JSON.stringify({...record(70),finalisedAt:null}));
  await writeFile(path.join(dir,"malformed.json"),"{broken");
  const ledger = [
    {matchId:"legacy-ranked-old",roomCode:"PAST",completedAt:baseAt-60000,players:[
      {playerId:"a",playerName:"Historical A",finishPosition:1,ratingDelta:22},
      {playerId:"b",playerName:"Historical B",finishPosition:2,ratingDelta:-18},
    ]},
    {matchId:"legacy-ranked-old",roomCode:"PAST",completedAt:baseAt-60000,players:[
      {playerId:"a",playerName:"Historical A",finishPosition:1,ratingDelta:22},
      {playerId:"b",playerName:"Historical B",finishPosition:2,ratingDelta:-18},
    ]},
  ];
  const history = createRankedMatchHistory(dir,()=>ledger);
  const page0 = await history.list();
  assert.equal(page0.total,57,"All 56 verified archives plus one retained historical Mega match.");
  assert.equal(page0.matches.length,25);
  assert.equal(page0.nextOffset,25);
  const page1=await history.list(25);
  const page2=await history.list(50);
  assert.equal(page2.matches.length,7);
  assert.equal(page2.nextOffset,null);
  assert.equal([...page0.matches,...page1.matches,...page2.matches].length,57);
  assert.equal(new Set([...page0.matches,...page1.matches,...page2.matches].map(x=>x.game+":"+x.id)).size,57,"No duplicates.");
  assert.equal(page2.matches.at(-1).id,"legacy-ranked-old","Oldest stored match must be accessible.");
  assert.equal(page2.matches.at(-1).players[0].ratingDelta,22,"Existing rating changes retained.");
  assert.equal((await history.list(0,"connect-four")).total,35);
  assert.equal((await history.list(0,"ludo")).total,21);
  assert.equal((await history.list(0,"mega-board")).total,1);
  assert.equal((await history.list(0,"ayo")).total,0);
  await assert.rejects(history.list(-1),/Invalid/);
  await assert.rejects(history.list(0,"other"),/Invalid/);
  const app = express();
  registerRankedMatchHistoryRoutes(app,req=>req.headers["x-test-account"]?{id:"test-account"}:null,history);
  const server = app.listen(0,"127.0.0.1");
  await new Promise(ok=>server.once("listening",ok));
  try{
    const addr=`http://127.0.0.1:${server.address().port}`;
    const fetchPage=(query,auth=true)=>fetch(addr+`/ranked/matches`+query,{headers:auth?{"x-test-account":"1"}:{}});
    assert.equal((await fetchPage("?offset=0",false)).status,401);
    assert.equal((await fetchPage("?offset=-1")).status,400);
    assert.equal((await fetchPage("?offset=1.5")).status,400);
    assert.equal((await fetchPage("?game=invalid")).status,400);
    const response=await fetchPage("?game=connect-four&offset=25");
    assert.equal(response.status,200);
    assert.equal(response.headers.get("cache-control"),"no-store");
    const json=await response.json();
    assert.equal(json.total,35);
    assert.equal(json.matches.length,10);
    assert.equal(json.nextOffset,null);
    const encoded=JSON.stringify(json);
    for(const secret of ["progressionIdentity","accountId","seat-a","reconnectToken","password","secret"]){
      assert(!encoded.includes(secret),"Secret/raw archive field leaked: "+secret);
    }
  }finally{await new Promise(ok=>server.close(ok));}
  const ui=readFileSync(new URL("../client/src/platform/components/RankedMatchHistory.tsx",import.meta.url),"utf8");
  const home=readFileSync(new URL("../client/src/platform/components/HomeScreen.tsx",import.meta.url),"utf8");
  const rankings=readFileSync(new URL("../server/src/games/mega-board/utils/rankings.ts",import.meta.url),"utf8");
  assert.match(home,/view === "rankings"[\s\S]*?<RankedMatchHistory accountId=/,"Archive embedded on actual Rankings page.");
  assert.match(ui,/Load older Ranked matches/);
  assert.match(ui,/All games/);
  assert.match(ui,/Showing \{matches.length.toLocaleString\(\)\} of \{total.toLocaleString\(\)\}/);
  assert.doesNotMatch(rankings,/matches:[^\n]*slice\(0, 500\)/,"No future 500-entry pruning.");
  console.log("PASS full Ranked history: 57 verified records, 25-page pagination, per-game filtering, replay duplicates, Beta/AI/incomplete exclusion, historical ledger, privacy and auth.");
}finally{await rm(root,{recursive:true,force:true});}
