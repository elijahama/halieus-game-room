import assert from "node:assert/strict";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";
import { rooms } from "../server/src/games/mega-board/state/rooms.ts";
import { registerTradeHandlers } from "../server/src/games/mega-board/handlers/tradeHandlers.ts";
import { draftFromTradeOffer } from "../client/src/games/mega-board/types/trade.ts";

let serial = 0;
function setup(count=2) {
  const code = "CT" + (++serial);
  const ids = ["p1","p2","p3","p4"].slice(0,count);
  const state = createInitialGameState(code,ids.map(id=>({id,name:id})));
  state.phase="playing"; state.turnPhase="optional-actions"; state.currentPlayerIndex=0;
  for(const player of state.players){player.cash=1500;player.isAi=false;player.isBankrupt=false;}
  const room={code,hostId:"p1",started:true,gameState:state,createdAt:Date.now()-1000,updatedAt:Date.now(),
    ranked:false,blitz:false,players:ids.map(id=>({id,name:id,isAi:false,isConnected:true})),hostDisconnectDeadline:null};
  rooms.set(code,room);
  const events=[];
  const io={to(roomCode){return {emit(event,payload){events.push({roomCode,event,payload});}};},emit(event,payload){events.push({event,payload});}};
  const byPlayer=new Map();
  for(const id of ids){
    const handlers=new Map();
    registerTradeHandlers(io,{id,on(event,callback){handlers.set(event,callback);}});
    byPlayer.set(id,handlers);
  }
  function call(id,event,payload) {
    let result=null;
    const handler=byPlayer.get(id)?.get(event);
    assert(handler,"No "+event+" handler for "+id);
    handler({code,...payload},response=>result=response);
    assert(result,"No acknowledgement for "+event);
    return result;
  }
  function origin(participantIds=ids.slice(0,2)){
    return {id:"origin-"+serial,proposerId:"p1",recipientId:"p2",participantIds:participantIds.length>2?participantIds:undefined,
      acceptedPlayerIds:participantIds.length>2?["p1"]:undefined,
      multiParty:participantIds.length>2 || undefined,
      transfers:participantIds.length>2?[{fromPlayerId:"p1",toPlayerId:"p2",cash:100,propertyIds:[],busTicketIds:[],jailCardIds:[]}]:undefined,
      proposerCash:participantIds.length>2?0:100,recipientCash:0,
      proposerPropertyIds:[],recipientPropertyIds:[],proposerBusTicketIds:[],recipientBusTicketIds:[],
      proposerJailCardIds:[],recipientJailCardIds:[],proposerMortgageInterest:0,recipientMortgageInterest:0,
      status:"pending",createdAt:Date.now()};
  }
  return {code,ids,state,room,events,call,origin,cleanup(){rooms.delete(code)}};
}
function counterPayload(tradeId, recipientIds, cashTransfers) {
  return { tradeId, recipientId:recipientIds[0], recipientIds, cashTransfers,
    propertyRecipients:{},busTicketRecipients:{},jailCardRecipients:{},
    proposerCash:0,recipientCash:0,proposerPropertyIds:[],recipientPropertyIds:[],
    proposerBusTicketIds:[],recipientBusTicketIds:[],proposerJailCardIds:[],recipientJailCardIds:[] };
}
{
  const t=setup();
  try{
    const original=t.origin();
    t.state.pendingTrade=original;
    const draft=draftFromTradeOffer(original,"p2");
    assert.deepEqual(draft.recipientIds,["p1"]);
    assert.equal(draft.cashTransfers["p1->p2"],100,"Existing original offer must be copied as editable terms.");
    const preCash=t.state.players.map(p=>p.cash);
    assert.equal(t.call("p1","game:trade-counter",counterPayload(original.id,["p2"],{"p1->p2":10})).ok,false,
      "The proposer cannot counter their own offer.");
    assert.equal(t.call("p2","game:trade-counter",counterPayload(original.id,["p1","p3"],{"p1->p2":10})).ok,false,
      "Cannot add players.");
    assert.equal(t.call("p2","game:trade-counter",counterPayload(original.id,["p1"],{"p1->p2":999999})).ok,false,
      "Cannot counter with money players lack.");
    assert.equal(t.state.pendingTrade.id,original.id,"Invalid counter preserves the original pending offer.");
    assert.deepEqual(t.state.players.map(p=>p.cash),preCash);
    const response=t.call("p2","game:trade-counter",counterPayload(original.id,["p1"],{"p1->p2":200}));
    assert.equal(response.ok,true,response.reason);
    const next=t.state.pendingTrade;
    assert(next&&next.id!==original.id);
    assert.equal(next.counterOfTradeId,original.id);
    assert.equal(next.proposerId,"p2","The prior recipient becomes counter proposer.");
    assert.equal(next.multiParty,true,"Two-player counters use the established atomic leg engine.");
    assert.deepEqual(next.participantIds,["p2","p1"]);
    assert.deepEqual(next.acceptedPlayerIds,["p2"],"Prior approvals must reset.");
    assert.equal(t.state.currentPlayerIndex,0,"Countering out of turn does not move the turn.");
    assert.equal(original.status,"declined");
    assert.deepEqual(t.state.players.map(p=>p.cash),preCash,"No money moves before new acceptance.");
    assert.equal(t.call("p2","game:trade-counter",counterPayload(original.id,["p1"],{"p1->p2":200})).ok,false,
      "The superseded original cannot be countered again.");
    const accept=t.call("p1","game:trade-accept",{tradeId:next.id});
    assert.equal(accept.ok,true,accept.reason);
    assert.equal(t.state.pendingTrade,null);
    assert.equal(t.state.players[0].cash,1300);
    assert.equal(t.state.players[1].cash,1700);
    assert.equal(t.call("p1","game:trade-accept",{tradeId:next.id}).ok,false,"Duplicate accept cannot pay twice.");
    assert(t.events.some(e=>e.event==="game:state"),"New offer must be broadcast to the room.");
    assert(t.state.activityLog.some(e=>/counter offer/i.test(e.message)),"History records counter negotiation.");
  }finally{t.cleanup();}
}
{
  const t=setup(3);
  try{
    const original=t.origin(["p1","p2","p3"]);
    t.state.pendingTrade=original;
    const draft=draftFromTradeOffer(original,"p2");
    assert.deepEqual(draft.recipientIds,["p1","p3"]);
    assert.equal(draft.cashTransfers["p1->p2"],100);
    const no=t.call("p3","game:trade-counter",counterPayload(original.id,["p3","p1"],{"p1->p2":100}));
    assert.equal(no.ok,false,"Cannot target yourself or omit the original proposer-first order.");
    const result=t.call("p2","game:trade-counter",counterPayload(original.id,["p1","p3"],
      {"p1->p2":50,"p3->p2":25}));
    assert.equal(result.ok,true,result.reason);
    const counter=t.state.pendingTrade;
    assert.deepEqual(counter.participantIds,["p2","p1","p3"]);
    assert.deepEqual(counter.acceptedPlayerIds,["p2"]);
    assert.equal(t.call("p1","game:trade-accept",{tradeId:counter.id}).ok,true);
    assert(t.state.pendingTrade,"One approval must not settle a three-player counter.");
    assert.equal(t.state.players[1].cash,1500);
    assert.equal(t.call("p3","game:trade-accept",{tradeId:counter.id}).ok,true);
    assert.equal(t.state.pendingTrade,null);
    assert.equal(t.state.players[0].cash,1450);
    assert.equal(t.state.players[1].cash,1575);
    assert.equal(t.state.players[2].cash,1475);
  }finally{t.cleanup();}
}
{
  const t=setup();
  try{
    const original=t.origin();t.state.pendingTrade=original;
    t.state.players[0].isAi=true;
    assert.equal(t.call("p2","game:trade-counter",counterPayload(original.id,["p1"],{"p1->p2":10})).ok,false,
      "AI counter acceptance is not silently assumed.");
    t.state.players[0].isAi=false;
    t.state.tradeRejectAllTurnByPlayerId={p1:t.state.turnNumber};
    assert.equal(t.call("p2","game:trade-counter",counterPayload(original.id,["p1"],{"p1->p2":10})).ok,false,
      "Reject-all preferences remain authoritative.");
    assert.equal(t.state.pendingTrade.id,original.id);
  }finally{t.cleanup();}
}
assert.throws(()=>draftFromTradeOffer({proposerId:"p1",recipientId:"p2"},"outsider"));
console.log("PASS HGR counteroffers: prefilled original, exact stale-ID guard, participant restrictions, out-of-turn replacement, no early transfers, final approvals, multi-party, AI and reject-all protections.");
