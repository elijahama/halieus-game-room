import { CORE_THEME_IDS, THEME_REQUIREMENTS, themeEntitlements, themeIsAvailable } from "../shared/platform/themeProgression.ts";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { customThemeVariables, THEME_PROFILES, colourLuminance } from "../client/src/platform/theme.ts";
assert.deepEqual(Object.keys(THEME_REQUIREMENTS).sort(),THEME_PROFILES.map(p=>p.id).sort());
const emptyProgress={gamerScore:0,activePlayMs:0,played:0,wins:0,awards:[],byGame:{}};
assert.deepEqual(themeEntitlements(emptyProgress),CORE_THEME_IDS);
assert.ok(CORE_THEME_IDS.includes("minimal-mono"),"Mono Minimal is an optional core website theme");
assert.equal(themeIsAvailable("cube-indigo",CORE_THEME_IDS,false),false,"normal mode keeps earned themes locked");
assert.equal(themeIsAvailable("cube-indigo",CORE_THEME_IDS,true),true,"beta mode exposes progression-gated themes without changing entitlements");
assert.ok(!themeEntitlements({...emptyProgress,wins:1000,rating:9999}).includes('cube-indigo'),'Elo/wins are not a theme achievement');
assert.ok(themeEntitlements({...emptyProgress,gamerScore:40}).includes('lavender-16bit'));
assert.ok(themeEntitlements({...emptyProgress,played:5}).includes('grey-disc'));
assert.ok(themeEntitlements({...emptyProgress,awards:[{id:'five-games'}]}).includes('cube-indigo'));
const contrast=(a,b)=>{a=colourLuminance(a);b=colourLuminance(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
for(const theme of [...THEME_PROFILES.map(p=>p.theme),...Array.from({length:256},(_,n)=>({page:'#ffffff',surface:'#'+n.toString(16).padStart(2,'0').repeat(3),accent:'#888888',secondary:'#000000'}))]) {
 const v=customThemeVariables(theme);
 for(const ink of ['--hgr-text','--hgr-text-soft','--hgr-muted'])for(const bg of ['--hgr-surface','--hgr-surface-raised','--hgr-surface-soft','--hgr-surface-strong'])assert.ok(contrast(v[ink],v[bg])>=4.5,`${theme.surface}: ${ink} on ${bg}`);
 assert.ok(['#000000','#ffffff'].includes(v['--hgr-logo-ink']));
 assert.ok(contrast(v['--hgr-logo-ink'],v['--hgr-logo-bg'])>=4.5);
 assert.ok(['#000000','#ffffff'].includes(v['--hgr-logo-light-ink']));
 assert.ok(contrast(v['--hgr-page-text'],v['--hgr-page'])>=4.5);
 assert.ok(contrast(v['--hgr-action-ink'],v['--hgr-action-bg'])>=4.5);
}
console.log('PASS all retro palettes + 256 custom greys: 4.5:1 surface/page/action contrast');

const data=await mkdtemp(resolve(tmpdir(),'hgr-part18-'));process.env.HALIEUS_DATA_DIR=data;
const {rooms}=await import('../server/src/games/mega-board/state/rooms.ts');
const {createInitialGameState}=await import('../shared/games/mega-board/game-state.ts');
const {registerGameplayHandlers}=await import('../server/src/games/mega-board/handlers/gameplayHandlers.ts');
const io={to:()=>({emit:()=>{}})};const handlers={};registerGameplayHandlers(io,{id:'host',on:(name,fn)=>handlers[name]=fn});
const random=Math.random;
try {
 for(const [chain,faces,stage,position=0] of [[0,[.2,.2],1],[1,[.2,.2],2],[2,[.2,.2],3],[2,[.2,.4],0],[2,[.2,.2,.2],0],[0,[.2,.2],1,32]]) {
  const state=createInitialGameState('DEBUG1',[{id:'host',name:'Host'},{id:'guest',name:'Guest'}]);
  Object.assign(state,{phase:'playing',turnPhase:'roll',consecutiveDoubles:chain});
  state.players[0].position=position;
  rooms.set('DEBUG1',{code:'DEBUG1',hostId:'host',players:[],started:true,gameState:state,createdAt:Date.now(),updatedAt:Date.now()});
  let i=0;Math.random=()=>faces[i++]??.4;let result;
  handlers['game:roll']({code:'DEBUG1'},r=>result=r);Math.random=random;
  assert.equal(result.ok,true,result.reason);assert.equal(state.lastDiceRoll.doublesStage,stage);
  if(stage===3){assert.equal(state.players[0].inJail,true);assert.equal(state.consecutiveDoubles,0);assert.equal(state.currentPlayerIndex,1);}
  if(position===32)assert.equal(state.players[0].inJail,true,'Go To Jail after first double must not become third-double warning');
  if(stage===0)assert.equal(state.consecutiveDoubles,0);
 }
 console.log('PASS real server roll handler: first/second/third doubles, jail/turn transition and non-double reset');
}finally{Math.random=random;rooms.clear();const {flushRoomSave}=await import('../server/src/games/mega-board/utils/persistence.ts');await flushRoomSave();await rm(data,{recursive:true,force:true});}

// Host-only Room Style, server entitlement gates, start locking and persistence.
{

 // The earlier test initialized the persistence module; use its configured temporary path.
 const {registerLobbyHandlers}=await import('../server/src/games/mega-board/handlers/lobbyHandlers.ts');
 const {toPublicGameRoom}=await import('../server/src/games/mega-board/utils/room-view.ts');
 const events=[];const io={to:()=>({emit:(event,value)=>events.push([event,value])})};
 const handlersFor=id=>{const handlers={};registerLobbyHandlers(io,{id,request:{headers:{}},connected:true,join:()=>{},on:(name,fn)=>handlers[name]=fn});return handlers;};
 const host=handlersFor('host'),guest=handlersFor('guest');
 let reply;const ack=r=>reply=r;
 try {
  await host['game:create']({code:'STYLE1',playerName:'Host',ranked:false},ack);assert.equal(reply.ok,true,reply.reason);
  const room=rooms.get('STYLE1');assert.equal(reply.room.boardStyle,'classic-board');
  await guest['game:set-board-style']({code:'STYLE1',style:'classic-board'},ack);assert.equal(reply.ok,false);
  await host['game:set-board-style']({code:'STYLE1',style:'tycoon-board'},ack);assert.equal(reply.ok,false,'unearned style rejected');
  await host['game:set-board-style']({code:'STYLE1',style:'arbitrary-css'},ack);assert.equal(reply.ok,false);
  await host['game:set-board-style']({code:'STYLE1',style:'muted-tournament-board'},ack);assert.equal(reply.ok,true);assert.equal(events.at(-1)[1].boardStyle,'muted-tournament-board');
  guest['game:join']({code:'STYLE1',playerName:'Guest'},ack);assert.equal(reply.room.boardStyle,'muted-tournament-board');
  host['game:start']({code:'STYLE1'},ack);assert.equal(reply.ok,true,reply.reason);assert.equal(room.gameState.boardStyle,'muted-tournament-board');
  await host['game:set-board-style']({code:'STYLE1',style:'muted-tournament-board'},ack);assert.equal(reply.ok,false,'started match locks room style');
  assert.equal(toPublicGameRoom(room).boardStyle,room.gameState.boardStyle);
  const {flushRoomSave,loadRoomsFromDisk}=await import('../server/src/games/mega-board/utils/persistence.ts');
  await flushRoomSave();rooms.clear();await loadRoomsFromDisk();assert.equal(rooms.get('STYLE1').gameState.boardStyle,'muted-tournament-board');
  console.log('PASS shared room style: host-only, catalog/entitlement validation, broadcast, join, start lock, disk recovery');
 }finally{rooms.clear();const {flushRoomSave}=await import('../server/src/games/mega-board/utils/persistence.ts');await flushRoomSave();await rm(data,{recursive:true,force:true});}
}
