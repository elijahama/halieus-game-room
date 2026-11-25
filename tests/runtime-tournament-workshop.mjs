import assert from "node:assert/strict";
import {buildWorkshop} from "../shared/platform/tournamentWorkshop.ts";
const entrants=["A","B","C","D"];
const run=(kind,double,choices)=>buildWorkshop(kind,double,entrants,choices);
for(const double of [false,true]){
 let paths=0;
 function explore(choices,losses={A:0,B:0,C:0,D:0}){
  const state=run("solo",double,choices);
  const next=state.plan.find(m=>m.homeId&&!m.notRequired&&!state.receipts.some(r=>r.id===m.id));
  if(!next){assert.ok(state.champion);for(const a of entrants)assert.ok(a===state.champion?losses[a]<(double?2:1):losses[a]===(double?2:1));paths++;return;}
  for(const winnerId of [next.homeId,next.awayId]){
   const loser=winnerId===next.homeId?next.awayId:next.homeId;
   explore([...choices,{matchId:next.id,board:0,winnerId}],{...losses,[loser]:losses[loser]+1});
  }
 }
 explore([]);assert.equal(paths,double?96:8);
}
const pick=(matchId,board,winnerId)=>({matchId,board,winnerId});
let choices=[pick("semi-1",0,"A"),pick("semi-1",1,"D")];
let s=run("guild",true,choices);assert.equal(s.receipts.length,0);assert.equal(s.plan.find(m=>m.id==="winners-final").homeId,null);
choices.push(pick("semi-1",2,"A"));assert.equal(run("guild",true,choices).receipts[0].winnerId,"A");
function sweep(id,w){choices.push(pick(id,0,w),pick(id,1,w));}
sweep("semi-2","B");sweep("winners-final","A");sweep("losers-1","D");sweep("losers-final","B");sweep("grand-final","B");
s=run("guild",true,choices);assert.equal(s.champion,null);assert.equal(s.plan.find(m=>m.id==="reset-final").homeId,"A");
sweep("reset-final","A");assert.equal(run("guild",true,choices).champion,"A");
assert.equal(run("guild",true,choices.slice(0,-1)).champion,null);
assert.throws(()=>run("guild",true,[pick("semi-1",0,"A"),pick("semi-1",1,"A"),pick("semi-1",2,"D")]),/Unavailable/);
assert.throws(()=>run("solo",false,[pick("final",0,"A")]),/Unavailable/);
assert.throws(()=>run("guild",true,[pick("semi-1",0,"B")]),/Unavailable/);
console.log("PASS Workshop: all 8 single and 96 double Solo paths, Guild split/decider and reset, invalid results rejected");
