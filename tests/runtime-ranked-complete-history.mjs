import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {readFileSync} from "node:fs";
import {createRankedHistoryReader} from "../server/src/platform/rankedHistory.ts";
const root=await mkdtemp(join(tmpdir(),"hgr-ranked-all-history-"));
const dir=join(root,"sessions","finalized"),mega=join(root,"mega-board");
await mkdir(dir,{recursive:true});await mkdir(mega,{recursive:true});
const player=(id,name)=>({id,name,isAi:false});
const record=(n,game="connect-four",mode="ranked",status="completed")=>({
  schemaVersion:1,sessionId:`archive-${n}`,roomCode:`R${n}`,game,status,
  finalisedAt:1_800_000_000_000+n*60_000,
  state:{matchMode:mode,startedAt:1_700_000_000_000+n*60_000,
    players:[player("a","Alice"),player("b","Bob")],winnerPlayerId:"a",
    recoveryCode:"DO-NOT-LEAK",hiddenRole:"DO-NOT-LEAK"},
});
try{
 for(let i=0;i<64;i++)await writeFile(join(dir,`ranked-${i}.json`),JSON.stringify(record(i)));
 await writeFile(join(dir,"casual.json"),JSON.stringify(record(70,"ludo","casual")));
 await writeFile(join(dir,"incomplete.json"),JSON.stringify(record(71,"ayo","ranked","incomplete")));
 await writeFile(join(dir,"ai.json"),JSON.stringify({...record(72,"poker"),state:{...record(72).state,players:[player("a","Alice"),{id:"bot",name:"Bot",isAi:true}]}}));
 await writeFile(join(dir,"beta.json"),JSON.stringify({...record(73,"ludo"),state:{...record(73).state,betaTournamentTest:true}}));
 await writeFile(join(dir,"broken.json"),"{no");
 const megaRecord={...record(91,"mega-board"),roomCode:"MEGA",state:{
   ...record(91).state,ranked:true,rankedMatchId:"ranked-MEGA-1710",gameStartedAt:1710,
   rankedResults:[{playerId:"a",finishPosition:1,ratingDelta:15},{playerId:"b",finishPosition:2,ratingDelta:-15}]
 }};
 await writeFile(join(dir,"megagame.json"),JSON.stringify(megaRecord));
 const legacy=[
   {matchId:"ranked-MEGA-1710",roomCode:"MEGA",completedAt:megaRecord.finalisedAt,
    players:[{playerName:"Alice",finishPosition:1,ratingDelta:15},{playerName:"Bob",finishPosition:2,ratingDelta:-15}]},
   {matchId:"ranked-MEGA-1711",roomCode:"MEGA",completedAt:megaRecord.finalisedAt+1500,
    players:[{playerName:"Bob",finishPosition:1,ratingDelta:12},{playerName:"Alice",finishPosition:2,ratingDelta:-12}]},
 ];
 await writeFile(join(mega,"rankings.json"),JSON.stringify({version:1,matches:legacy}));
 const list=createRankedHistoryReader({sessionDirectories:[dir],megaBoardDirectory:mega});
 const first=await list({limit:25});
 assert.equal(first.total,66,"64 archived + 1 archived Mega + 1 genuinely separate legacy Mega");
 assert.equal(first.matches.length,25);
 assert.equal(first.nextOffset,25);
 assert(first.matches.every((match,index,all)=>index===0||all[index-1].completedAt>=match.completedAt),
   "Most recent first");
 const second=await list({offset:25,limit:25});
 const third=await list({offset:50,limit:25});
 assert.equal(second.nextOffset,50);
 assert.equal(third.matches.length,16);
 assert.equal(third.nextOffset,null);
 assert.equal(new Set([...first.matches,...second.matches,...third.matches].map(m=>m.id)).size,66,"No duplicate or skipped history rows");
 const filtered=await list({game:"mega-board"});
 assert.equal(filtered.total,2,"Distinct quick consecutive room games retained, same archival game not doubled");
 assert(filtered.matches.some(m=>m.id==="archive-91" && m.players[0].ratingDelta===15));
 assert(filtered.matches.some(m=>m.id==="ranked-MEGA-1711"));
 assert.equal((await list({game:"ludo"})).total,0,"Casual/Beta results must not be mislabeled Ranked");
 assert.equal((await list({game:"poker"})).total,0,"AI matches cannot pollute verified human Ranked history");
 assert.equal((await list({game:"connect-four"})).total,64);
 await assert.rejects(list({offset:-1}),RangeError);
 await assert.rejects(list({game:"../../../secrets"}),RangeError);
 await assert.rejects(list({limit:501}),RangeError);
 const encoded=JSON.stringify(first);
 assert(!encoded.includes("DO-NOT-LEAK"),"No private fields from full archives may reach Rankings UI.");
 const code=readFileSync(new URL("../server/src/platform/accounts.ts",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../client/src/platform/components/HomeScreen.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../client/src/index.css",import.meta.url),"utf8");
 assert.match(code,/app.get\("\/accounts\/ranked\/matches"/,"Authenticated paging endpoint is registered.");
 assert.match(code,/const auth = currentSession\(request\)/);
 assert.match(ui,/All Ranked matches/);
 assert.match(ui,/Load older Ranked matches/);
 assert.match(ui,/rankedHistoryNextOffset/);
 assert.match(ui,/setRankedHistoryGame/);
 assert.match(css,/\.halieus-ranked-history-match/);
 console.log("PASS Ranked all-match history: 66 actual retained games, 25-row paging, game filters, old ledger fallback, exact dedupe, no AI/Beta/casual/incomplete, no secrets or fabricated results.");
} finally { await rm(root,{recursive:true,force:true}); }
