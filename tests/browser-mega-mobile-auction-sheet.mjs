import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root,"client/src/games/mega-board/components/GameBoard.tsx"), "utf8");
const auction = readFileSync(resolve(root,"client/src/games/mega-board/components/AuctionPanel.tsx"), "utf8");
const css = readFileSync(resolve(root,"client/src/index.css"), "utf8");
assert.match(source, /mobileAuctionSheet && auctionPanel && createPortal\(/, "Mobile auctions must render outside square board");
assert.match(source, /document\.fullscreenElement \?\? document\.body/, "Fullscreen and ordinary mobile roots must be handled");
assert.match(source, /\(gameState\.pendingAuction && !mobileAuctionSheet\)/, "Mobile auction must not retain an empty board-layer overlay");
assert.match(source, /Roll dice to begin your turn/, "Do not tell the active player to wait for themselves");
assert.match(source, /gameState\.turnPhase === "roll"/, "Roll prompt must only apply in roll phase");
assert.match(auction, /className="auction-player-list"/, "Roster needs its own scroll target");
assert.match(css, /\.mega-mobile-auction-layer\s*\{/, "Viewport auction style missing");
const browser = await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE || undefined});
try {
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:820,height:780}]) {
    const page = await browser.newPage({viewport});
    const rows = Array.from({length:8},(_,i)=>`<div style="display:flex;align-items:center;gap:8px;min-width:0;padding:8px;border:1px solid #53606d;border-radius:9px;background:#101d29"><span style="display:grid;place-items:center;width:28px;height:28px;flex-shrink:0;border-radius:50%;background:#145a9a">P</span><div style="min-width:0"><strong>Player ${i+1}</strong><small style="display:block">Cash private</small></div></div>`).join("");
    await page.setContent(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#06111e;color:white">
      <div class="mega-live-page"><div class="board-frame" style="width:350px;height:350px;overflow:hidden;transform:translateZ(0);container-type:size"></div></div>
      <div class="mega-mobile-auction-layer" role="dialog" aria-modal="true" aria-label="Mega Board auction">
       <div class="mega-mobile-auction-sheet"><section class="auction-presentation" style="display:grid;gap:12px;width:390px;padding:18px;border:3px solid #e6b94f;background:#0a1d29;box-sizing:border-box">
         <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><small>LIVE AUCTION</small><h3 style="margin:4px 0">The Angel, Islington</h3></div><span>🔨</span></div>
         <div style="display:grid;justify-items:center;padding:12px;border:1px solid #566;border-radius:10px"><small>Time left</small><strong style="font-size:28px">8s</strong><small>Every valid bid resets the timer to 8 seconds.</small><div style="width:100%;height:5px;background:#446"></div></div>
         <div style="display:grid;justify-items:center;gap:3px;padding:12px;border:1px solid #566"><small>Current bid</small><strong>£150</strong><small>Leading: Atlas</small></div>
         <div class="auction-player-list" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;max-height:190px;overflow-y:auto">${rows}</div>
         <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px"><button>+£10</button><button>+£50</button><button>+£100</button></div>
         <small style="text-align:center">Bids increase only by £10, £50 or £100.</small>
         <div style="display:grid;grid-template-columns:1fr 1fr"><button data-action="withdraw">Withdraw</button></div>
       </section></div>
      </div>
    </body></html>`);
    await page.addStyleTag({content:css});
    const metrics = await page.evaluate(()=>{
      const layer=document.querySelector(".mega-mobile-auction-layer");
      const panel=document.querySelector(".mega-mobile-auction-sheet > .auction-presentation");
      const list=document.querySelector(".auction-player-list");
      const bidButton=panel.querySelector("button");
      const withdraw=panel.querySelector('[data-action="withdraw"]');
      const last=list.lastElementChild;
      const r=e=>{const x=e.getBoundingClientRect();return {top:x.top,bottom:x.bottom,left:x.left,right:x.right,height:x.height}};
      const m={layer:r(layer),panel:r(panel),list:r(list),bid:r(bidButton),withdraw:r(withdraw),scrollable:list.scrollHeight>list.clientHeight};
      list.scrollTop=list.scrollHeight;
      m.lastReachable=last.getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom+2;
      return m;
    });
    assert.ok(metrics.panel.top>=0 && metrics.panel.bottom<=viewport.height+1,JSON.stringify({viewport,metrics}));
    assert.ok(metrics.panel.left>=0 && metrics.panel.right<=viewport.width+1,JSON.stringify({viewport,metrics}));
    assert.ok(metrics.bid.top>=0 && metrics.bid.bottom<=viewport.height,JSON.stringify({viewport,metrics}));
    assert.ok(metrics.withdraw.top>=0 && metrics.withdraw.bottom<=viewport.height,JSON.stringify({viewport,metrics}));
    assert.ok(metrics.list.height>=40,JSON.stringify({viewport,metrics}));
    assert.ok(metrics.lastReachable,JSON.stringify({viewport,metrics}));
    assert.ok(metrics.layer.height>=viewport.height-1,JSON.stringify({viewport,metrics}));
    console.log(`PASS Mega Board auction sheet ${viewport.width}x${viewport.height}: full viewport, actions visible, 8-player scrolling`);
    await page.close();
  }
} finally {await browser.close();}
