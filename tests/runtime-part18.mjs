import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { customThemeVariables, THEME_PROFILES, colourLuminance } from "../client/src/platform/theme.ts";
const contrast=(a,b)=>{a=colourLuminance(a);b=colourLuminance(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
for(const theme of [...THEME_PROFILES.map(p=>p.theme),...Array.from({length:256},(_,n)=>({page:'#ffffff',surface:'#'+n.toString(16).padStart(2,'0').repeat(3),accent:'#888888',secondary:'#000000'}))]) {
 const v=customThemeVariables(theme);
 for(const ink of ['--hgr-text','--hgr-text-soft','--hgr-muted'])for(const bg of ['--hgr-surface','--hgr-surface-raised','--hgr-surface-soft','--hgr-surface-strong'])assert.ok(contrast(v[ink],v[bg])>=4.5,`${theme.surface}: ${ink} on ${bg}`);
 assert.ok(contrast(v['--hgr-page-text'],v['--hgr-page'])>=4.5);
 assert.ok(contrast(v['--hgr-action-ink'],v['--hgr-action-bg'])>=4.5);
}
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const {matchBoardAppearance}=await import('../client/src/platform/boardAppearance.ts');
assert.equal(matchBoardAppearance(null,'classic-board'),'classic-board');
assert.equal(matchBoardAppearance('room:1','classic-board'),'classic-board');
assert.equal(matchBoardAppearance('room:1','tycoon-board'),'classic-board');
assert.equal(matchBoardAppearance('room:2','tycoon-board'),'tycoon-board');
console.log('PASS all retro palettes + 256 custom greys: 4.5:1 surface/page/action contrast; per-match appearance lock');

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
