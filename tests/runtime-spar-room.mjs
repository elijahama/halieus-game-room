import assert from "node:assert/strict";
import { registerSparHandlers, getSparRoomCount, getSparLiveRoomSummaries, getSparChatIdentity, closeAllSparRooms } from "../server/src/games/spar/handlers.ts";
import { legalSparCards, sparSuit } from "../shared/games/spar/rules.ts";
const handlers = new Map();
const latest = new Map();
const socket = (id) => ({
  id,
  on(event, fn) { handlers.set(id+":"+event,fn); },
});
const io = {
  to(id){return {emit(event,value){if(event==="spar:state")latest.set(id,value)}}},
  emit(){},
};
for(const id of ["host","guest","watch"])registerSparHandlers(io,socket(id));
async function call(id,event,payload={}){
 const fn=handlers.get(id+":"+event);
 assert.ok(fn,"handler "+id+":"+event);
 let result;
 fn(payload,r=>result=r);
 assert.ok(result,"ack missing for "+event);
 return result;
}
let response=await call("host","spar:create",{code:"SPAR01",playerName:"Host"});
assert.equal(response.ok,true);
assert.equal(response.state.phase,"lobby");
assert.equal(getSparRoomCount(),1);
const hostToken=response.reconnectToken;
response=await call("guest","spar:join",{code:"SPAR01",playerName:"Guest"});
assert.equal(response.ok,true);
const guestToken=response.reconnectToken;
assert.equal(getSparLiveRoomSummaries()[0].maximumPlayers,4);
await call("watch","spar:spectate",{code:"SPAR01",playerName:"Observer"});
assert.equal(getSparChatIdentity("SPAR01","watch")?.role,"spectator");
assert.equal(getSparChatIdentity("SPAR01","host")?.role,"player");

assert.equal((await call("guest","spar:start",{code:"SPAR01"})).ok,false,"Only host starts");
assert.equal((await call("host","spar:start",{code:"SPAR01"})).ok,true);
let a=latest.get("host"),b=latest.get("guest"),w=latest.get("watch");
assert.equal(a.phase,"bra");
assert.equal(a.hand.length,5);
assert.equal(b.hand.length,5);
assert.equal(w.hand.length,0,"Spectator cannot see hands");
assert.equal(w.players[0].handCount,5);
assert.equal(JSON.stringify(w).includes(hostToken),false,"Reconnect tokens are private");
assert.equal(JSON.stringify(w).includes(guestToken),false);
assert.equal(JSON.stringify(w).includes('"deck"'),false);
assert.equal((await call("host","spar:bra",{code:"SPAR01"})).ok,false,"Only nondealer calls Bra");
assert.equal((await call("guest","spar:bra",{code:"SPAR01"})).ok,true);
assert.equal(latest.get("host").phase,"playing");

// First card in guest's hand must not be played by the host out of turn.
const randomCard=latest.get("host").hand[0];
assert.equal((await call("host","spar:play",{code:"SPAR01",card:randomCard})).ok,false);
assert.equal((await call("guest","spar:play",{code:"SPAR01",card:"2S"})).ok,false);
let tries=0;
let observedProgress=false;
while(latest.get("host").phase!=="finished" && tries++<250){
 const state=latest.get("host");
 if(state.phase==="bra"){
   const caller=state.currentTurnPlayerId;
   assert.ok(caller==="host"||caller==="guest");
   assert.equal((await call(caller,"spar:bra",{code:"SPAR01"})).ok,true);
   continue;
 }
 const id=state.currentTurnPlayerId;
 assert.ok(id==="host"||id==="guest");
 const view=latest.get(id);
 const leading=view.plays.length ? sparSuit(view.plays[0].card) : null;
 const legal=legalSparCards(view.hand,leading);
 assert.ok(legal.length>0);
 const before=view.stonesRemaining;
 const oldTrick=view.trickNumber;
 assert.equal((await call(id,"spar:play",{code:"SPAR01",card:legal[0]})).ok,true);
 const after=latest.get(id);
 assert.ok(after.stonesRemaining<=before);
 if(after.stonesRemaining<before){
   assert.equal(oldTrick,5,"Only trick five awards stones");
   observedProgress=true;
 }
 assert.equal(latest.get("watch").hand.length,0,"Public state cannot leak an opponent hand after play");
}
assert.ok(observedProgress);
assert.equal(latest.get("host").phase,"finished");
assert.ok(latest.get("host").winnerPlayerId);
assert.equal(getSparRoomCount(),0,"Finished table must not block HGR maintenance");
assert.equal((await call("guest","spar:play",{code:"SPAR01",card:randomCard})).ok,false);
assert.equal(closeAllSparRooms(),0);
console.log("PASS Spar live 2-seat room: authenticated Bra/plays, private hands, spectator, last trick stones and finish");
