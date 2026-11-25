import assert from "node:assert/strict";
import {createInitialGameState} from "../shared/games/mega-board/game-state.ts";
import {getAwardBonusForPlayer,MINIMUM_RANKED_RATING} from "../shared/games/mega-board/ranked.ts";
import {auditRankedMatchAwards} from "../server/src/games/mega-board/utils/ranked-award-audit.ts";
const state=createInitialGameState("QA",[{id:"a",name:"A"},{id:"b",name:"B"}]);
state.ranked=true;state.phase="finished";state.rankedMatchId="ranked-test";state.winnerId="a";
for(const p of state.players){p.isAi=false;state.playerStats[p.id].peakUtilityRentWithAllUtilities=0;}
state.playerStats.a.peakUtilityRentWithAllUtilities=201;
const ledger={matchId:"ranked-test",roomCode:"QA",completedAt:1000,players:state.players.map((p,i)=>{const award=getAwardBonusForPlayer(state,p.id);const bonus= i===0?Math.max(0,award.bonus-7):award.bonus;return {playerId:p.id,playerName:p.name,finishPosition:i+1,ratingBefore:1000,placementDelta:0,performanceBonus:0,awardBonus:bonus,ratingDelta:bonus,ratingAfter:1000+bonus,awards:award.awards.filter(x=>i!==0||x!=="Obaseki Award")};})};
const before=JSON.stringify({state,ledger});
const report=auditRankedMatchAwards(state,ledger);
assert.equal(report.status,"audited");assert.equal(report.rows[0].awardDelta,7);assert.equal(report.rows[0].localRatingDelta,7);
assert.equal(JSON.stringify({state,ledger}),before);
assert.deepEqual(auditRankedMatchAwards(state,ledger),report);
delete state.playerStats.b.peakUtilityRentWithAllUtilities;
assert.equal(auditRankedMatchAwards(state,ledger).status,"missing-evidence");
assert.deepEqual(auditRankedMatchAwards(state,ledger).rows,[]);
assert.throws(()=>auditRankedMatchAwards({...state,ranked:false},ledger),/finished Ranked/);
console.log("PASS read-only Ranked award audit, canonical points, missing evidence, no mutation");
