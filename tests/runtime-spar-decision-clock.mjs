import assert from "node:assert/strict";
import {advanceSparDecisionClock,sparDecisionExpired,SPAR_DECISION_MS} from "../shared/games/spar/decisionClock.ts";
import {registerSparHandlers,closeAllSparRooms} from "../server/src/games/spar/handlers.ts";
const first=advanceSparDecisionClock(null,"hand-1",1000,false);
assert.equal(first.deadline,21000);assert.equal(SPAR_DECISION_MS,20000);
assert.equal(advanceSparDecisionClock(first,"hand-1",5000,false).deadline,21000);
const paused=advanceSparDecisionClock(first,"hand-1",6000,true);
assert.equal(paused.deadline,null);assert.equal(paused.remainingMs,15000);
const resumed=advanceSparDecisionClock(paused,"hand-1",100000,false);
assert.equal(resumed.deadline,115000);assert.ok(sparDecisionExpired(resumed,115000));
assert.equal(advanceSparDecisionClock(resumed,"hand-2",115000,false).deadline,135000);
assert.equal(advanceSparDecisionClock(resumed,null,115000,false),null);
const handlers=new Map(),views=new Map();
const io={to(id){return {emit(e,v){if(e==="spar:state")views.set(id,v)}}},emit(){}};
for(const id of ["h","g","w","r"])registerSparHandlers(io,{id,on(e,fn){handlers.set(id+":"+e,fn)}});
function call(id,event,payload={}){let result;handlers.get(id+":spar:"+event)({code:"CLOCK1",...payload},r=>result=r);assert.ok(result?.ok,JSON.stringify(result));return result;}
try{
 const host=call("h","create",{playerName:"Host"});const guest=call("g","join",{playerName:"Guest"});
 call("h","start");const original=views.get("h").decisionDeadline;
 assert.ok(original>=Date.now()+19000&&original<=Date.now()+20000);
 call("w","spectate",{playerName:"Watcher"});assert.equal(views.get("h").decisionDeadline,original);
 call("g","leave");assert.equal(views.get("h").decisionDeadline,original);
 call("r","reconnect",{reconnectToken:guest.reconnectToken});assert.equal(views.get("h").decisionDeadline,original);
 call("r","bra");assert.ok(views.get("h").decisionDeadline>=original);
 call("h","leave");call("r","leave");assert.equal(views.get("w").decisionDeadline,null);assert.equal(views.get("w").decisionPaused,true);
 call("h","reconnect",{reconnectToken:host.reconnectToken});assert.equal(views.get("w").decisionPaused,false);
 call("h","end-game");assert.equal(views.get("w").decisionDeadline,null);
}finally{closeAllSparRooms()}
console.log("PASS Spar decision clock: twenty seconds, stable deadlines, pause/resume, new decision, reconnect and spectator broadcasts");
