import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
const data=await mkdtemp(join(tmpdir(),"hgr-couch-"));
process.env.HALIEUS_DATA_DIR=data;
const {registerConnectFourHandlers,bindConnectFourCouchRoom,withdrawConnectFourCouchConsent,getConnectFourLiveRoomSummaries,closeAllConnectFourRooms}=await import("../server/src/games/connect-four/handlers.ts");
const {registerProgressionIdentity}=await import("../server/src/platform/progression.ts");
const {flushFinalSessionWrites}=await import("../server/src/platform/sessionArchive.ts");
const handlers=new Map(), latest=new Map();
const io={to(id){return {emit(event,state){if(event==="connect-four:state")latest.set(id,state)}}},emit(){}};
const identities=new Map([["host","account-host"],["guest","account-guest"],["returning","account-host"],["other","account-other"]]);
for(const id of ["host","guest","returning","other","watch"]){
 registerProgressionIdentity(id,()=>identities.has(id)?{accountId:identities.get(id),beta:false}:null);
 registerConnectFourHandlers(io,{id,on(event,fn){handlers.set(id+":"+event,fn)}});
}
function call(id,event,payload){let result;handlers.get(id+":connect-four:"+event)(payload,r=>result=r);assert.ok(result);return result}
const pair={hostAccountId:"account-host",guestAccountId:"account-guest",game:"connect-four"};
const names={host:"Red",guest:"Yellow"};
try{
 assert.equal(bindConnectFourCouchRoom("other",pair,names,1),null);
 assert.equal(bindConnectFourCouchRoom("host",{...pair,guestAccountId:pair.hostAccountId},names,1),null);
 const created=bindConnectFourCouchRoom("host",pair,names,1);assert.ok(created);
 const {code,reconnectToken,state}=created;const [red,yellow]=state.players.map(p=>p.id);
 assert.equal(state.playStyle,"couch-coop");assert.equal(state.matchMode,"casual");assert.notEqual(red,yellow);assert.notEqual(red,"host");assert.notEqual(yellow,"guest");
 assert.equal(JSON.stringify(state).includes("account-host"),false);assert.equal(JSON.stringify(state).includes(reconnectToken),false);
 assert.equal(bindConnectFourCouchRoom("host",pair,names,1),null);
 assert.equal(call("other","join",{code,playerName:"Other"}).ok,false);
 assert.equal(call("host","add-ai",{code,difficulty:"easy"}).ok,false);
 assert.equal(call("guest","start",{code}).ok,false);
 assert.equal(call("watch","spectate",{code}).ok,true);
 assert.equal(call("host","start",{code}).ok,true);
 const seq=()=>latest.get("host").actionLog.at(-1).sequence;
 const first=seq();assert.equal(call("guest","drop",{code,column:1,expectedActionSequence:first}).ok,false);
 assert.equal(call("host","drop",{code,column:0,expectedActionSequence:first}).ok,true);
 assert.equal(call("host","drop",{code,column:1,expectedActionSequence:first}).ok,false);
 assert.equal(latest.get("host").currentTurnPlayerId,yellow);
 assert.equal(call("host","drop",{code,column:1.5,expectedActionSequence:seq()}).ok,false);
 assert.equal(call("host","drop",{code,column:1,expectedActionSequence:seq()}).ok,true);
 assert.equal(latest.get("host").currentTurnPlayerId,red);
 assert.equal(latest.get("host").board[35],1);assert.equal(latest.get("host").board[36],2);
 assert.equal(call("other","reconnect",{code,reconnectToken}).ok,false);
 handlers.get("host:disconnect")();
 assert.equal(call("returning","reconnect",{code,reconnectToken}).ok,true);
 assert.deepEqual(latest.get("returning").players.map(p=>p.id),[red,yellow]);
 assert.equal(call("host","drop",{code,column:0,expectedActionSequence:latest.get("returning").actionLog.at(-1).sequence}).ok,false);
 for(const column of [0,1,0,1,0]){
   assert.equal(call("returning","drop",{code,column,expectedActionSequence:latest.get("returning").actionLog.at(-1).sequence}).ok,true);
 }
 assert.equal(latest.get("returning").winnerPlayerId,red);assert.equal(latest.get("returning").phase,"finished");
 assert.equal(JSON.stringify(latest.get("watch")).includes("account-guest"),false);
 assert.equal(call("returning","start",{code}).ok,true);
 assert.equal(withdrawConnectFourCouchConsent(io,code,"account-other"),false);
 assert.equal(withdrawConnectFourCouchConsent(io,code,"account-guest"),true);
 assert.equal(call("returning","start",{code}).ok,false);
 assert.equal(call("returning","reconnect",{code,reconnectToken}).ok,false);
 assert.equal(getConnectFourLiveRoomSummaries().length,0);
 // Existing online room behavior is unchanged.
 assert.equal(call("host","create",{code:"ONL123",playerName:"Online host",matchMode:"ranked"}).ok,true);
 assert.equal(call("guest","join",{code:"ONL123",playerName:"Online guest"}).ok,true);
 assert.equal(call("host","start",{code:"ONL123"}).ok,true);
 assert.equal(call("guest","drop",{code:"ONL123",column:0}).ok,false);
 assert.equal(call("host","drop",{code:"ONL123",column:0}).ok,true);
 assert.equal(call("guest","drop",{code:"ONL123",column:1}).ok,true);
 console.log("Connect Four couch room integration passed");
} finally {
 closeAllConnectFourRooms();
 await delay(350);
 await flushFinalSessionWrites();
 await rm(data,{recursive:true,force:true});
}
