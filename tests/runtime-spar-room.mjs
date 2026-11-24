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
for(const id of ["host","guest","watch","returning"])registerSparHandlers(io,socket(id));
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
assert.equal((await call("guest","spar:join",{code:"SPAR01",playerName:"Duplicate"})).ok,false,"One socket cannot occupy two seats");
assert.equal((await call("guest","spar:reconnect",{code:"SPAR01",reconnectToken:hostToken})).ok,false,"A seated socket cannot take another seat");
assert.equal((await call("guest","spar:spectate",{code:"SPAR01"})).ok,false,"A seated player cannot also receive spectator state");
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
 // A documented tied pool may replenish three stones; no other increase is allowed.
 if(after.stonesRemaining>before){
   assert.equal(oldTrick,5);
   assert.equal(after.stonesRemaining,3);
   assert.equal(after.lastAward.awarded,before);
   const scores=after.players.map(p=>p.stones), highest=Math.max(...scores);
   assert.ok(scores.filter(n=>n===highest).length>1,"Only tied leaders trigger overtime");
   observedProgress=true;
 }
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
// A second match verifies the all-offline maintenance guard and private return.
const second=await call("host","spar:create",{code:"SPAR02",playerName:"Host"});
const secondGuest=await call("guest","spar:join",{code:"SPAR02",playerName:"Guest"});
await call("guest","spar:leave",{code:"SPAR02"});
assert.equal((await call("host","spar:start",{code:"SPAR02"})).ok,false,"Cannot deal to offline human");
assert.equal((await call("guest","spar:reconnect",{code:"SPAR02",reconnectToken:secondGuest.reconnectToken})).ok,true);
assert.equal((await call("host","spar:start",{code:"SPAR02"})).ok,true);
const originalHand=[...latest.get("guest").hand];
await call("host","spar:leave",{code:"SPAR02"});
await call("guest","spar:leave",{code:"SPAR02"});
assert.equal(getSparRoomCount(),1,"All-offline active hand must block idle deployment");
assert.equal(getSparLiveRoomSummaries()[0].code,"SPAR02");
assert.equal((await call("guest","spar:bra",{code:"SPAR02"})).ok,false,"Offline seat cannot act without recovery");
await call("returning","spar:spectate",{code:"SPAR02"});
const returned=await call("returning","spar:reconnect",{code:"SPAR02",reconnectToken:secondGuest.reconnectToken});
assert.equal(returned.ok,true);
assert.deepEqual(returned.state.hand,originalHand,"Original private hand survives return");
assert.equal(returned.state.spectatorCount,0,"Recovery clears former spectator role");
assert.equal(returned.state.currentTurnPlayerId,"returning");
assert.equal((await call("guest","spar:bra",{code:"SPAR02"})).ok,false,"Replaced socket loses authority");
assert.equal((await call("host","spar:reconnect",{code:"SPAR02",reconnectToken:second.reconnectToken})).ok,true);
assert.equal((await call("host","spar:end-game",{code:"SPAR02"})).ok,true);
assert.equal(getSparRoomCount(),0);
assert.equal(closeAllSparRooms(),0);
console.log("PASS Spar live 2-seat room: authenticated Bra/plays, private hands, spectator, last trick stones and finish");
