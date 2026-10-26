import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const spectatorTest = await readFile(resolve(root,"tests/browser-mega-spectator-layout-4.5.5x.mjs"),"utf8");
const cssList = spectatorTest.match(/const cssPaths=\[([\s\S]*?)\];/)?.[1];
assert.ok(cssList, "Spectator regression CSS inventory exists");
const paths = [...cssList.matchAll(/"([^"]+\.css)"/g)].map(m=>m[1]);
const css = await Promise.all(paths.map(p=>readFile(resolve(root,p),"utf8")));
const app = await readFile(resolve(root,"client/src/App.tsx"),"utf8");
assert.match(app,/viewerIsSpectator \? "mega-spectator-mode" : "mega-mobile-participant-mode"/,
  "Participant and spectator mode remain separate, with no permission changes");
assert.match(app,/viewerIsSpectator \? "mega-spectator-layout" : "mega-mobile-participant-layout"/);
assert.match(app,/!viewerIsSpectator && \(\s*<PlayerRail\s+className="mega-live-player-rail mega-mobile-participant-player-rail"/,
  "Existing real PlayerRail reused below the interactive board for participant portrait");
assert.match(app,/headerTitle="Players"[\s\S]*?isSpectator=\{false\}/,
  "Active player list must not gain spectator cash visibility");
assert.match(app,/onRollDice=\{handleRollDice\}/,"The active GameBoard retains roll handlers");
assert.match(app,/onOpenActionPanel=\{\(panel\) =>/,"The board retains the real action panel");

const browser = await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
  for (const v of [{width:320,height:568},{width:360,height:780},{width:390,height:844},{width:430,height:932},{width:600,height:960},{width:844,height:390},{width:820,height:900},{width:1440,height:900}]) {
    const portrait = v.width<=600 && v.height>v.width;
    const page=await browser.newPage({viewport:v});
    const cards=Array.from({length:8},(_,i)=>'<article role="button" tabindex="0" class="player-rail-card" data-player="'+i+'"><div class="player-rail-main-row"><strong>Player '+(i+1)+'</strong></div><div class="player-property-strip">'+
      Array.from({length:7},(_,j)=>'<span class="player-property-chip">Property '+(j+1)+'</span>').join("")+
      '</div></article>').join("");
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>html,body{margin:0;--hgr-page:#101722;--hgr-surface:#202a38;--hgr-brand:#6386e8;--hgr-border:#415169;--hgr-text:#f0f5ff;--hgr-muted:#b2bed0;}'+
      '.board-grid{background:#24384b;box-sizing:border-box;} .player-rail-card{padding:8px;} .player-rail-side{min-width:110px}</style></head><body>'+
      '<main class="game-page mega-live-page mega-mobile-participant-mode">'+
      '<div class="mega-game-chrome"><button id="menu-action">Game menu</button></div>'+
      '<header class="game-header card-game-header mega-active-header"><div class="card-game-brand-lockup mega-game-brand-lockup"><h1>Mega Board</h1></div>'+
      '<div class="card-game-meta mega-game-meta"><span><small>Room</small><strong>ABCD</strong></span><span><small>Turn</small><strong>3</strong></span></div></header>'+
      '<button class="tablet-players-trigger" id="drawer-trigger">Players drawer</button>'+
      '<div class="game-layout mega-live-layout-v3 mega-mobile-participant-layout">'+
      '<aside class="player-rail player-rail-side player-rail-side-left"><h2>Side roster</h2></aside>'+
      '<div class="board-frame"><div class="board-grid"><button id="roll-button">Roll dice</button></div></div>'+
      '<aside class="player-rail mega-live-player-rail mega-mobile-participant-player-rail" aria-label="Players and owned properties">'+
      '<header class="player-rail-header"><div><h2>Players</h2></div></header><div class="player-rail-list">'+cards+'</div></aside>'+
      '<aside class="player-rail player-rail-side player-rail-side-right"><h2>Side roster</h2></aside>'+
      '<div class="right-game-stack"></div></div></main>'+
      '<script>window.rollClicks=0;window.cardClicks=0;document.getElementById("roll-button").addEventListener("click",()=>window.rollClicks++);document.querySelectorAll(".mega-mobile-participant-player-rail .player-rail-card").forEach(c=>c.addEventListener("click",()=>window.cardClicks++))</script>'+
      '</body></html>');
    for (const sheet of css) await page.addStyleTag({content:sheet});
    const result=await page.evaluate(()=>{
      const box=s=>document.querySelector(s).getBoundingClientRect();
      const display=s=>getComputedStyle(document.querySelector(s)).display;
      const board=box(".board-grid"), rail=box(".mega-mobile-participant-player-rail"),first=box(".mega-mobile-participant-player-rail .player-rail-card");
      return {board:{x:board.x,top:board.top,bottom:board.bottom,width:board.width,height:board.height},
        rail:{top:rail.top,bottom:rail.bottom},first:{top:first.top,right:first.right},
        cards:document.querySelectorAll(".mega-mobile-participant-player-rail .player-rail-card").length,
        mobileDisplay:display(".mega-mobile-participant-player-rail"),
        sideDisplay:display(".player-rail-side-left"),drawerDisplay:display(".tablet-players-trigger"),
        hasSidebar:!!document.querySelector(".right-game-stack"),
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        lastCard:box(".mega-mobile-participant-player-rail .player-rail-card:last-child").bottom,
        documentHeight:document.scrollingElement.scrollHeight,
        innerHeight
      };
    });
    if (portrait) {
      assert.notEqual(result.mobileDisplay,"none",JSON.stringify({v,result}));
      assert.equal(result.sideDisplay,"none","Split desktop rails must not duplicate roster in portrait");
      assert.equal(result.drawerDisplay,"none","The full roster replaces the Players drawer in portrait");
      assert.ok(Math.abs(result.board.width-result.board.height)<3,"Square board "+JSON.stringify({v,result}));
      assert.ok(result.board.width>=250&&result.board.width<=v.width,"Viewport-fitted board "+JSON.stringify({v,result}));
      assert.ok(result.board.bottom<=result.rail.top+1,"Board precedes roster "+JSON.stringify({v,result}));
      assert.ok(result.first.top>=result.board.bottom-1,"First player follows board "+JSON.stringify({v,result}));
      assert.ok(result.first.top < v.height-15,"First player starts on the initial phone viewport "+JSON.stringify({v,result}));
      assert.ok(result.lastCard<=result.documentHeight+1,"Last player reachable by page scroll");
      assert.equal(result.cards,8,"Entire roster must render");
      assert.equal(result.hasSidebar,true,"Actions panel stays in DOM");
      await page.locator("#roll-button").click();
      await page.locator(".mega-mobile-participant-player-rail .player-rail-card").first().click();
      assert.deepEqual(await page.evaluate(()=>[window.rollClicks,window.cardClicks]),[1,1],
        "Roll action and player-details click both stay interactive");
      await page.evaluate(()=>{
        const popup=document.createElement("div");
        popup.className="turn-actions-popup-layer is-properties";
        popup.innerHTML='<section class="turn-actions-popup"><button id="property-action">Manage property</button></section>';
        document.querySelector(".right-game-stack").append(popup);
        window.propertyClicks=0;
        document.getElementById("property-action").addEventListener("click",()=>window.propertyClicks++);
      });
      await page.locator("#property-action").click({timeout:4500});
      assert.equal(await page.evaluate(()=>window.propertyClicks),1,
        "The Properties/Trade action sheet must stay usable in the spectator-style participant layout");
    } else {
      assert.equal(result.mobileDisplay,"none","Do not alter tablet/landscape/desktop participant layout");
    }
    assert.equal(result.overflow,false,"No horizontal overflow "+JSON.stringify({v,result}));
    console.log("PASS Part36 "+v.width+"x"+v.height+": "+(portrait?"square board > interactive full roster":"existing nonportrait layout")+"; no horizontal clipping");
    await page.close();
  }
} finally { await browser.close(); }
