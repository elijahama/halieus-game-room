import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,"..");
const main=await readFile(resolve(root,"client/src/main.tsx"),"utf8");
const cssPaths=[...main.matchAll(/import "\.\/([^"]+\.css)";/g)].map(m=>m[1]);
const sheets=await Promise.all(cssPaths.map(p=>readFile(resolve(root,"client/src",p),"utf8")));
const app=await readFile(resolve(root,"client/src/App.tsx"),"utf8");
assert.match(app,/viewerIsSpectator && \(\s*<PlayerRail[\s\S]*?className="mega-live-player-rail mega-spectator-player-rail"/);
assert.match(app,/viewerIsSpectator \? "mega-spectator-layout" : "mega-mobile-participant-layout"/);
assert.match(app,/!viewerIsSpectator && playersDrawerOpen/);
const profiles=[[320,568],[360,780],[390,844],[393,852],[430,932],[768,1024],[800,1280],[820,1180],[1024,1366]];
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
 for(const [w,h] of profiles){
  const landscape=false;
  const viewport=landscape?{width:h,height:w}:{width:w,height:h};
  const page=await browser.newPage({viewport,hasTouch:true,reducedMotion:"reduce"});
  try{
   const cards=Array.from({length:8},(_,i)=>'<article class="player-rail-card"><div class="player-rail-main-row"><strong>Player '+(i+1)+'</strong></div><div class="player-property-strip">'+Array.from({length:12},(_,j)=>'<span class="player-property-chip">Property '+(j+1)+'</span>').join("")+'</div></article>').join("");
   await page.setContent('<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="game-page mega-live-page mega-spectator-mode"><header class="game-header card-game-header card-game-header-polished mega-active-header"><div class="card-game-brand-lockup mega-game-brand-lockup"><div><p>Halieus Game Room</p><h1>Mega Board</h1></div></div><div class="card-game-meta game-header-details mega-game-meta"><span><small>Room</small><strong>ABCD</strong></span><span><small>Match</small><strong>Casual</strong></span><span><small>Players</small><strong>8</strong></span><span><small>Duration</small><strong>12:31</strong></span><span><small>Turn timer</small><strong>Paused</strong></span><span><small>Status</small><strong>Connected</strong></span></div></header><div class="mega-spectator-banner" role="status"><strong>Spectating</strong><span>Live Mega Board · Read-only view</span><select aria-label="Follow player"><option>All players</option></select></div><div class="game-layout mega-live-layout-v3 mega-spectator-layout"><div class="board-frame"><div class="board-grid" style="background:#24384b"><div class="board-space">Board centre</div></div></div><aside class="player-rail player-rail-single mega-live-player-rail mega-spectator-player-rail"><header class="player-rail-header"><div><h2>Live players</h2></div></header><div class="player-rail-list">'+cards+'</div></aside><div class="right-game-stack"></div></div></main></body></html>');
   for(const content of sheets)await page.addStyleTag({content});
   const m=await page.evaluate(()=>{
    const el=s=>document.querySelector(s),rect=s=>{const r=el(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
    const list=el(".player-rail-list");
    return {board:rect(".board-grid"),rail:rect(".mega-spectator-player-rail"),banner:rect(".mega-spectator-banner"),list:rect(".player-rail-list"),count:list.children.length,overflow:document.documentElement.scrollWidth>innerWidth+1,pointer:matchMedia("(pointer:coarse)").matches,scroll:getComputedStyle(list).overflowY,scrollHeight:list.scrollHeight,clientHeight:list.clientHeight};
   });
   const context=JSON.stringify({viewport,landscape,m});
   assert.ok(Math.abs(m.board.w-m.board.h)<3&&m.board.w>=110&&m.board.right<=viewport.width+1&&m.board.x>=-1,"Square board: "+context);
   assert.ok(m.banner.bottom<=m.board.y+2,"Spectator banner precedes board: "+context);
   assert.equal(m.count,8);assert.equal(m.overflow,false,context);
   assert.ok(m.board.bottom<=m.rail.y+2,"Portrait board precedes roster: "+context);
   await page.locator(".player-rail-card").last().scrollIntoViewIfNeeded();
   const last=await page.locator(".player-rail-card").last().boundingBox();
   assert.ok(last&&last.y<viewport.height&&last.y+last.height>0,"Final portrait seat reachable: "+context);
   const columns=await page.locator(".player-rail-list").evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(" ").length);
   assert.equal(columns,w<600?1:2,"Approved phone single-column and tablet two-column portrait gallery: "+context);
   console.log("PASS Mega Board device spectator",viewport.width+"x"+viewport.height);
  }finally{await page.close()}
 }
}finally{await browser.close()}
