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
assert.equal(getSparLiveRoomSummaries()[0].maximumPlayers,8);
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
assert.equal(w.hand.length,0,"Spectators never acquire a participant hand");
assert.deepEqual(w.spectatorHands,{host:a.hand,guest:b.hand});
assert.equal(a.spectatorHands,undefined);assert.equal(b.spectatorHands,undefined);
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
 assert.equal(latest.get("watch").hand.length,0,"Observer must never receive a participant hand");
 assert.equal(latest.get("host").spectatorHands,undefined);assert.equal(latest.get("guest").spectatorHands,undefined);
 for(const p of latest.get("watch").players)assert.equal(latest.get("watch").spectatorHands[p.id].length,p.handCount);
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
assert.equal(returned.state.spectatorHands,undefined,"Recovered participant cannot receive observer hands");
assert.equal(returned.state.spectatorCount,0,"Recovery clears former spectator role");
assert.equal(returned.state.currentTurnPlayerId,"returning");
assert.equal((await call("guest","spar:bra",{code:"SPAR02"})).ok,false,"Replaced socket loses authority");
assert.equal((await call("host","spar:reconnect",{code:"SPAR02",reconnectToken:second.reconnectToken})).ok,true);
assert.equal((await call("host","spar:end-game",{code:"SPAR02"})).ok,true);
assert.equal(getSparRoomCount(),0);
assert.equal(closeAllSparRooms(),0);
console.log("PASS Spar live 2-seat room: authenticated Bra/plays, private hands, spectator, last trick stones and finish");

// Full eight-human table: capacity, unique private hands, every seat in every trick.
const eight=Array.from({length:8},(_,i)=>`eight-${i}`);
for(const id of [...eight,"ninth"])registerSparHandlers(io,socket(id));
const code="SPAR08";
assert.equal((await call(eight[0],"spar:create",{code,playerName:eight[0]})).ok,true);
for(const id of eight.slice(1))assert.equal((await call(id,"spar:join",{code,playerName:id})).ok,true);
assert.equal(getSparLiveRoomSummaries()[0].maximumPlayers,8);
assert.equal(getSparLiveRoomSummaries()[0].joinable,false);
assert.equal((await call("ninth","spar:join",{code,playerName:"Ninth"})).ok,false);
assert.equal((await call(eight[0],"spar:add-ai",{code,difficulty:"hard"})).ok,false);
assert.equal((await call("watch","spar:spectate",{code})).ok,true);
assert.equal((await call(eight[0],"spar:start",{code})).ok,true);
const allCards=eight.flatMap(id=>{const v=latest.get(id);assert.equal(v.hand.length,5);return v.hand;});
assert.equal(new Set(allCards).size,40);
assert.equal(latest.get("watch").hand.length,0);
assert.equal((await call(eight[1],"spar:bra",{code})).ok,true);
for(let trick=1;trick<=5;trick++){
 const seats=new Set();
 for(let i=0;i<8;i++){
  const id=latest.get(eight[0]).currentTurnPlayerId;
  assert.ok(eight.includes(id));assert.ok(!seats.has(id));seats.add(id);
  const view=latest.get(id), lead=view.plays.length?sparSuit(view.plays[0].card):null;
  assert.equal(view.trickNumber,trick);
  assert.equal((await call(id,"spar:play",{code,card:legalSparCards(view.hand,lead)[0]})).ok,true);
  assert.equal(latest.get("watch").hand.length,0);
 }
 assert.equal(seats.size,8);
 if(trick<5){assert.equal(latest.get(eight[0]).lastTrick.plays.length,8);assert.equal(latest.get(eight[0]).stonesRemaining,5);}
}
assert.equal(latest.get(eight[0]).lastAward.hand,1);
assert.ok(latest.get(eight[0]).lastAward.awarded>0);
assert.equal((await call(eight[0],"spar:end-game",{code})).ok,true);
assert.equal(closeAllSparRooms(),0);
// Mixed table admits CPUs to the same cap and refuses a ninth seat.
assert.equal((await call(eight[0],"spar:create",{code:"SPARAI",playerName:"Host"})).ok,true);
for(let i=0;i<7;i++)assert.equal((await call(eight[0],"spar:add-ai",{code:"SPARAI",difficulty:"normal"})).ok,true);
assert.equal(latest.get(eight[0]).players.length,8);
assert.equal((await call(eight[0],"spar:add-ai",{code:"SPARAI",difficulty:"hard"})).ok,false);
assert.equal((await call("ninth","spar:join",{code:"SPARAI",playerName:"Ninth"})).ok,false);
assert.equal((await call(eight[0],"spar:start",{code:"SPARAI"})).ok,true);
assert.equal(latest.get(eight[0]).hand.length,5);
closeAllSparRooms();
console.log("PASS Spar eight-seat variant: 40 unique cards, eight turns per trick, private hands, CPU capacity and ninth-seat rejection");

// Dedicated 1v1 format: exactly two seats, both human and CPU opponents allowed.
const duelCode="SPAR1V";
assert.equal((await call(eight[0],"spar:create",{code:duelCode,playerName:"Host",tableFormat:"invalid"})).ok,false);
assert.equal(getSparRoomCount(),0);
let duel=await call(eight[0],"spar:create",{code:duelCode,playerName:"Host",tableFormat:"duel"});
assert.equal(duel.ok,true);assert.equal(duel.state.tableFormat,"duel");assert.equal(duel.state.maximumPlayers,2);
assert.equal((await call(eight[0],"spar:start",{code:duelCode})).ok,false);
assert.equal((await call(eight[1],"spar:join",{code:duelCode,playerName:"Opponent"})).ok,true);
assert.equal(getSparLiveRoomSummaries()[0].maximumPlayers,2);
assert.equal(getSparLiveRoomSummaries()[0].joinable,false);
assert.equal((await call("ninth","spar:join",{code:duelCode,playerName:"Extra"})).ok,false);
assert.equal((await call(eight[0],"spar:add-ai",{code:duelCode})).ok,false);
assert.equal((await call(eight[0],"spar:start",{code:duelCode})).ok,true);
for(const id of eight.slice(0,2)){const view=latest.get(id);assert.equal(view.hand.length,5);assert.equal(view.tableFormat,"duel");assert.equal(view.maximumPlayers,2);assert.ok(view.hand.every(card=>card!=="AS"&&!card.startsWith("5")));}
assert.equal((await call(eight[0],"spar:end-game",{code:duelCode})).ok,true);
closeAllSparRooms();
duel=await call(eight[0],"spar:create",{code:duelCode,playerName:"Host",tableFormat:"duel"});
assert.equal(duel.ok,true);
assert.equal((await call(eight[0],"spar:add-ai",{code:duelCode,difficulty:"hard"})).ok,true);
assert.equal((await call(eight[0],"spar:add-ai",{code:duelCode})).ok,false);
assert.equal((await call(eight[1],"spar:join",{code:duelCode,playerName:"Extra"})).ok,false);
assert.equal((await call(eight[0],"spar:start",{code:duelCode})).ok,true);
assert.equal(latest.get(eight[0]).players.length,2);
closeAllSparRooms();
console.log("PASS Spar 1v1: strict two-seat human/CPU duel and traditional deck");

// Custom defaults and the selected variants remain non-Ranked.
const customCode="SPARCU";
let custom=await call(eight[0],"spar:create",{code:customCode,playerName:"Host",tableFormat:"multiplayer",matchMode:"custom"});
assert.equal(custom.ok,true);assert.equal(custom.state.matchMode,"custom");assert.equal(custom.state.deckSize,35);
assert.equal(custom.state.maximumPlayers,7);assert.equal(custom.state.handSize,5);assert.equal(custom.state.stonesTotal,10);assert.equal(custom.state.stonesRemaining,10);
assert.equal(custom.state.customSettings.underTen,false);assert.equal(custom.state.customSettings.showBottom,false);assert.equal(custom.state.customSettings.doubleFinish,false);
for(const id of eight.slice(1,7))assert.equal((await call(id,"spar:join",{code:customCode,playerName:id})).ok,true);
assert.equal((await call(eight[7],"spar:join",{code:customCode,playerName:"Extra"})).ok,false);
assert.equal((await call(eight[0],"spar:start",{code:customCode})).ok,true);
assert.equal(new Set(eight.slice(0,7).flatMap(id=>latest.get(id).hand)).size,35);
assert.equal(latest.get(eight[0]).stonesRemaining,10);
closeAllSparRooms();
for(const settings of [{handSize:6},{amount:0},{deck:"invalid"}])assert.equal((await call(eight[0],"spar:create",{code:customCode,playerName:"Host",matchMode:"custom",customSettings:settings})).ok,false);
assert.equal((await call(eight[0],"spar:create",{code:customCode,playerName:"Host",matchMode:"ranked",tableFormat:"duel",customSettings:{amount:10}})).ok,false);
custom=await call(eight[0],"spar:create",{code:customCode,playerName:"Host",tableFormat:"duel",matchMode:"custom",customSettings:{handSize:7,deck:"full",scoring:"target",amount:10,showBottom:true,doubleFinish:true}});
assert.equal(custom.ok,true);assert.equal(custom.state.scoring,"target");
assert.equal((await call(eight[1],"spar:join",{code:customCode,playerName:"Opponent"})).ok,true);
assert.equal((await call("watch","spar:spectate",{code:customCode})).ok,true);
assert.equal((await call(eight[0],"spar:start",{code:customCode})).ok,true);
assert.equal(latest.get(eight[0]).hand.length,7);assert.equal(latest.get(eight[1]).hand.length,7);
assert.equal((await call(eight[1],"spar:bra",{code:customCode})).ok,true);
assert.equal((await call(eight[0],"spar:show-bottom",{code:customCode})).ok,false);
for(let trick=1;trick<=7;trick++){
 if(trick===6){
  assert.equal(latest.get(eight[0]).canShowBottom,true);
  assert.equal((await call("watch","spar:show-bottom",{code:customCode})).ok,false);
  assert.equal((await call(eight[0],"spar:show-bottom",{code:customCode})).ok,true);
  assert.ok(latest.get("watch").bottomCard);
  assert.equal((await call(eight[0],"spar:show-bottom",{code:customCode})).ok,false);
 }
 for(let i=0;i<2;i++){
  const id=latest.get(eight[0]).currentTurnPlayerId,view=latest.get(id);
  assert.equal(view.trickNumber,trick);
  const lead=view.plays.length?sparSuit(view.plays[0].card):null;
  assert.equal((await call(id,"spar:play",{code:customCode,card:legalSparCards(view.hand,lead)[0]})).ok,true);
 }
 if(trick<7)assert.equal(latest.get(eight[0]).players.reduce((a,p)=>a+p.stones,0),0);
}
assert.ok(latest.get(eight[0]).lastAward.awarded>=1);
assert.equal(latest.get("watch").hand.length,0);
assert.equal(latest.get(eight[0]).handNumber,2);
closeAllSparRooms();
console.log("PASS Spar Custom: ten-stone defaults, deck-derived capacity, seven tricks, bottom reveal and target scoring");

// An owned off-suit card played while the player holds the lead suit restarts
// the hand, without advancing the round number or awarding stones. Find a
// playable scenario from genuine server deals; never inject private state.
let exercised=false;
for(let attempt=0;attempt<64&&!exercised;attempt++){
 const code="REVOKE";
 const h=await call("host","spar:create",{code,playerName:"Host",tableFormat:"duel"});
 assert.ok(h.ok);assert.ok((await call("guest","spar:join",{code,playerName:"Guest"})).ok);
 assert.ok((await call("host","spar:start",{code})).ok);
 const host=latest.get("host"),guest=latest.get("guest");
 const lead=guest.hand.find(c=>host.hand.some(d=>sparSuit(c)===sparSuit(d))&&host.hand.some(d=>sparSuit(c)!==sparSuit(d)));
 if(lead){
  assert.ok((await call("guest","spar:bra",{code})).ok);
  assert.ok((await call("guest","spar:play",{code,card:lead})).ok);
  const wrong=host.hand.find(c=>sparSuit(c)!==sparSuit(lead));
  const result=await call("host","spar:play",{code,card:wrong});
  assert.equal(result.ok,false);assert.match(result.reason,/Round restarted/);
  const fresh=latest.get("host");
  assert.equal(fresh.phase,"bra");assert.equal(fresh.handNumber,host.handNumber);
  assert.equal(fresh.trickNumber,1);assert.deepEqual(fresh.plays,[]);
  assert.equal(fresh.dealerPlayerId,host.dealerPlayerId);
  assert.equal(fresh.stonesRemaining,host.stonesRemaining);
  assert.deepEqual(fresh.players.map(p=>p.stones),host.players.map(p=>p.stones));
  assert.equal(fresh.hand.length,5);assert.equal(latest.get("guest").hand.length,5);
  assert.equal(new Set([...fresh.hand,...latest.get("guest").hand]).size,10);
  assert.match(fresh.status,/Round restarted/);
  exercised=true;
 }
 closeAllSparRooms();
}
assert.ok(exercised,"A legal lead with an off-suit violation was exercised");
console.log("PASS Spar follow-suit violation: same round redealt, unchanged score and dealer, no invalid card accepted");
