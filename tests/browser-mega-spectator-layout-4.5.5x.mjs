import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root=resolve(import.meta.dirname,"..");
// Load the real app's CSS order to catch later theme/board overrides.
const cssPaths=[
  "client/src/index.css",
  "client/src/styles/hgr-theme.css",
  "client/src/styles/hgr-design-v1.css",
  "client/src/styles/hgr-game-surfaces-v45.css",
  "client/src/styles/hgr-part17.css",
  "client/src/styles/hgr-4.5.1.css",
  "client/src/styles/hgr-4.5.4-identity.css",
  "client/src/styles/hgr-4.5.4.6-feature-rail.css",
  "client/src/styles/hgr-4.5.5-mobile-hub.css",
  "client/src/styles/hgr-4.5.5-part28-authority.css",
  "client/src/styles/hgr-4.5.5-mega-board-portfolio.css",
  "client/src/styles/hgr-4.5.5-unbounded.css",
  "client/src/styles/hgr-4.5.5c-type-hierarchy.css",
  "client/src/styles/hgr-4.5.5h-friends.css",
  "client/src/styles/hgr-4.5.5i-emotion-midnight.css",
  "client/src/styles/hgr-4.5.5j-achievement-type.css",
  "client/src/styles/hgr-4.5.5l-library-view.css",
  "client/src/styles/hgr-4.5.5p-social-lists.css",
  "client/src/styles/hgr-4.5.5r-invitation-dropdown.css",
  "client/src/styles/hgr-4.5.5s-guild-message-notices.css",
];
const css=await Promise.all(cssPaths.map(path=>readFile(resolve(root,path),"utf8")));
const tsx=await readFile(resolve(root,"client/src/App.tsx"),"utf8");

assert.match(tsx,/viewerIsSpectator \? "mega-spectator-mode"/,"Only spectator views opt into vertical layout");
assert.match(tsx,/viewerIsSpectator && \(\s*<PlayerRail[\s\S]*?className="mega-live-player-rail mega-spectator-player-rail"/,"Real spectator roster is rendered");
assert.match(tsx,/!viewerIsSpectator && <PlayerRail/,"Active players retain separate rails");
assert.match(tsx,/!viewerIsSpectator && playersDrawerOpen/,"Spectator roster does not require a drawer");
assert.match(tsx,/className="mega-spectator-banner"/,"Spectating bar must be visible");

const browsers = await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
  for(const viewport of [{width:360,height:780},{width:390,height:844},{width:820,height:900},{width:1280,height:720},{width:1408,height:900},{width:1536,height:900}]){
    const page=await browsers.newPage({viewport});
    const players=Array.from({length:8},(_,i)=>
      '<article class="player-rail-card" data-player="'+i+'"><div class="player-rail-main-row">'+
      '<span class="player-rail-token">P</span><div class="player-rail-copy"><strong>Player '+(i+1)+
      '</strong><small>Watching current location</small></div></div>'+
      '<div class="player-property-strip"><span class="player-property-count">Owned 12</span>'+
      Array.from({length:12},(_,j)=>'<span class="player-property-chip">Property '+(j+1)+'</span>').join("")+
      '</div></article>').join("");
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>html,body{margin:0;--hgr-page:#101722;--hgr-surface:#202a38;--hgr-brand:#6386e8;'+
      '--hgr-border:#415169;--hgr-text:#f0f5ff;--hgr-muted:#b2bed0;}'+
      '.board-grid{background:#24384b;border:2px solid #456;box-sizing:border-box;}'+
      '.board-space{position:absolute;top:8px;left:8px;} .player-rail-card{padding:8px;}</style></head><body>'+
      '<main class="game-page mega-live-page mega-spectator-mode">'+
      '<header class="game-header card-game-header mega-active-header"><div class="card-game-brand-lockup mega-game-brand-lockup">Mega Board</div><div class="card-game-meta mega-game-meta"><span><small>Room</small><strong>ABCD</strong></span><span class="mega-turn-timer" data-timer-status="paused"><small>Turn timer</small><strong>Paused</strong></span></div></header>'+
      '<div class="mega-spectator-banner" role="status"><strong>Spectating</strong><span>Live Mega Board - Room ABCD - Read-only view</span></div>'+
      '<div class="game-layout mega-live-layout-v3 mega-spectator-layout">'+
      '<div class="board-frame"><div class="board-grid"><div class="board-space">BOARD</div></div></div>'+
      '<aside class="player-rail player-rail-single mega-live-player-rail mega-spectator-player-rail" aria-label="Players and owned properties">'+
      '<header class="player-rail-header"><div><h2>Live players</h2></div></header><div class="player-rail-list">'+players+'</div></aside>'+
      '<div class="right-game-stack"></div></div></main></body></html>');
    for(const sheet of css) await page.addStyleTag({content:sheet});
    const info=await page.evaluate(()=>{
      const rect=s=>document.querySelector(s).getBoundingClientRect();
      const style=s=>getComputedStyle(document.querySelector(s));
      const body=rect(".mega-live-page");
      const banner=rect(".mega-spectator-banner"), board=rect(".board-grid");
      const rail=rect(".mega-spectator-player-rail");
      const frame=rect(".mega-spectator-layout > .board-frame"); const layout=rect(".mega-spectator-layout");
      const computedFrame=style(".mega-spectator-layout > .board-frame"); const computedGrid=style(".board-grid");
      const first=rect(".player-rail-card");
      return {
        banner:{top:banner.top,bottom:banner.bottom},
        board:{top:board.top,bottom:board.bottom,width:board.width,height:board.height},
        rail:{top:rail.top,bottom:rail.bottom},frame:{top:frame.top,bottom:frame.bottom,height:frame.height,display:computedFrame.display,gridRow:computedFrame.gridRow,overflow:computedFrame.overflow,position:computedFrame.position},layout:{top:layout.top,bottom:layout.bottom,display:style(".mega-spectator-layout").display,gridRows:style(".mega-spectator-layout").gridTemplateRows}, boardCss:{position:computedGrid.position,alignSelf:computedGrid.alignSelf,transform:computedGrid.transform,margin:computedGrid.margin,height:computedGrid.height},
        first:{top:first.top,left:first.left,right:first.right},
        cardCount:document.querySelectorAll(".mega-spectator-player-rail .player-rail-card").length,
        rosterDisplay:style(".mega-spectator-player-rail").display,
        gridColumns:style(".mega-spectator-layout").gridTemplateColumns,
        scroller:style(".mega-spectator-player-rail .player-rail-list").overflowY,
        pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
        bodyHeight:body.height,
        documentHeight:document.scrollingElement.scrollHeight,
        viewportHeight:innerHeight,
        railListClientHeight:document.querySelector(".mega-spectator-player-rail .player-rail-list").clientHeight,
        railListScrollHeight:document.querySelector(".mega-spectator-player-rail .player-rail-list").scrollHeight,
        railListBottom:rect(".mega-spectator-player-rail .player-rail-list").bottom,
        lastCardBottom:rect(".mega-spectator-player-rail .player-rail-card:last-child").bottom,
        lastCardRight:rect(".mega-spectator-player-rail .player-rail-card:last-child").right,
        headerCellAlign:style(".mega-game-meta > span").textAlign,
        pageOverflowY:style(".mega-live-page").overflowY,
      };
    });
    assert.ok(info.banner.bottom <= info.board.top+1,"Spectating banner must precede board "+JSON.stringify({viewport,info}));
    assert.ok(info.board.bottom <= info.rail.top+1,"Board must precede player strip "+JSON.stringify({viewport,info}));
    assert.ok(Math.abs(info.board.width-info.board.height)<3,"Board square distorted "+JSON.stringify({viewport,info}));
    assert.ok(info.board.width>150 && info.board.width<=viewport.width,"Board should fit viewport "+JSON.stringify({viewport,info}));
    assert.ok(info.first.top>=info.board.bottom && info.first.left>=-1 && info.first.right<=viewport.width+1,"Player must be under board, not clipped "+JSON.stringify({viewport,info}));
    assert.ok(info.first.top<viewport.height-40,"First player should be visible at bottom of first screen "+JSON.stringify({viewport,info}));
    assert.equal(info.cardCount,8,"All eight players remain in the roster");
    if(viewport.width>=1181){
      assert.equal(info.pageOverflowY,"hidden","Desktop spectator page must not scroll "+JSON.stringify({viewport,info}));
      assert.ok(info.bodyHeight<=viewport.height+2 && info.documentHeight<=viewport.height+2,"Desktop spectator page must fit the viewport "+JSON.stringify({viewport,info}));
      assert.ok(info.rail.bottom<=viewport.height+1,"All player controls stay inside viewport "+JSON.stringify({viewport,info}));
      assert.ok(info.railListScrollHeight>info.railListClientHeight+1 || info.lastCardBottom<=info.railListBottom+1,"Every player is visible or reachable by internal roster scrolling "+JSON.stringify({viewport,info}));
      assert.equal(info.scroller,"auto","Roster scroll remains accessible");
      assert.equal(info.headerCellAlign,"center","Header metadata text is centred");
    }
    assert.notEqual(info.rosterDisplay,"none","Spectator player list must display even on phone/tablet");
    assert.equal(info.pageOverflow,false,"No horizontal page overflow "+JSON.stringify({viewport,info}));
    console.log("PASS Mega Board spectator "+viewport.width+"x"+viewport.height+
      ": banner > square board > "+info.cardCount+" players without overlap, page scrolling or horizontal clipping");
    await page.close();
  }
}finally{await browsers.close();}
