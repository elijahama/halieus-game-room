import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, "..");
const css = await Promise.all([
  "client/src/index.css",
  "client/src/styles/hgr-game-surfaces-v45.css",
  "client/src/styles/hgr-4.5.5-mega-board-portfolio.css",
].map((path) => readFile(resolve(root, path), "utf8")));
const browser = await chromium.launch({headless:true, executablePath:process.env.HGR_BROWSER_EXECUTABLE || undefined});
try {
  for (const viewport of [{width:1536,height:900},{width:860,height:800},{width:390,height:844}]) {
    const page = await browser.newPage({viewport});
    const chips = Array.from({length:26}, (_,i) => `<span class="player-property-chip${i===2?" is-mortgaged":""}"><i></i><span class="player-property-chip-name">Property ${i+1}</span></span>`).join("");
    const debtOptions = Array.from({length:24}, (_,i) => `<article class="debt-property-option">Asset ${i+1}<button>Mortgage</button></article>`).join("");
    // Test the desktop split rail only above 1180px. Tablet/mobile replace it
    // with the Players drawer; testing the hidden desktop rail there is invalid.
    const playerCard = (name, items) => `<article class="player-rail-card"><div class="player-rail-main-row">${name}</div>
      <div class="player-property-strip"><span class="player-property-count">Owned · ${items ? 26 : 1}</span>${items ? chips : '<span class="player-property-chip">Property</span>'}</div></article>`;
    const playerCards = [playerCard("Player 1", true), ...Array.from({length:6}, (_,i)=>playerCard(`Player ${i+2}`,false))].join("");
    const roster = `<div class="player-rail-list">${playerCards}</div>`;
    const railShell = viewport.width > 1180
      ? `<aside class="player-rail player-rail-single player-rail-side mega-live-player-rail">${roster}</aside>`
      : `<div class="tablet-players-backdrop"><aside class="tablet-players-drawer">
          <header class="tablet-players-drawer-header">Players</header>
          <div class="player-rail player-rail-single">${roster}</div>
        </aside></div>`;
    await page.setContent(`<!doctype html><html><head><style>
      html, body { margin:0; }
      .player-rail-side { height:240px; width:238px; display:flex; flex-direction:column; }
      .player-rail-side .player-rail-list { max-height:200px; }
      .tablet-players-drawer { height:min(72dvh,480px); }
      .player-rail-card { min-width:0; }
      .board-grid { width:240px; height:240px; }
      .board-space { width:100px; height:100px; }
    </style></head><body>
      <div class="mega-live-page">
        <div class="board-grid">
          <div class="board-space is-owned-space is-mortgaged-space" data-mortgaged="true"
            style="background:#fff;filter:saturate(.62) brightness(.86)">
            <span class="board-space-number">17</span><strong class="board-space-name">Mortgaged Place</strong><span class="board-space-price">£180</span>
          </div>
        </div>
        ${railShell}
        <div class="right-game-stack">
          <div class="turn-actions-popup-layer has-live-debt is-liquidation">
            <section class="turn-actions-popup" role="dialog">
              <header class="turn-actions-popup-header"><h2>Debt Resolution</h2><button class="turn-actions-popup-close">×</button></header>
              <div class="turn-actions-popup-scroll"><section class="debt-resolution-card"><h3>Liquidate</h3>
                <div class="debt-property-option-list">${debtOptions}</div>
                <button class="debt-action-auto">Auto Liquidate</button>
                <button class="debt-action-manual">Full Property Manager</button>
              </section></div>
            </section>
          </div>
        </div>
      </div>
    </body></html>`);
    for (const text of css) await page.addStyleTag({content:text});
    const result = await page.evaluate(() => {
      const mortgage = document.querySelector('[data-mortgaged="true"]');
      const rail = document.querySelector(".player-property-strip");
      const panel = document.querySelector(".has-live-debt .turn-actions-popup");
      const scroll = document.querySelector(".has-live-debt .turn-actions-popup-scroll");
      const close = document.querySelector(".turn-actions-popup-close");
      const lastAsset = rail.querySelector(".player-property-chip:last-child");
      const allSeats = document.querySelectorAll(".player-rail-card");
      const list = document.querySelector(".player-rail-list");
      const dialogBox = panel.getBoundingClientRect();
      const closeBox = close.getBoundingClientRect();
      return {
        mortgageBackground:getComputedStyle(mortgage).backgroundImage,
        mortgageFilter:getComputedStyle(mortgage).filter,
        mortgageInk:getComputedStyle(mortgage.querySelector(".board-space-name")).color,
        ownedCount:rail.querySelectorAll(".player-property-chip").length,
        allAssetsPresent:Boolean(lastAsset),
        matchSeats:allSeats.length,
        rosterOverflow:getComputedStyle(list).overflowY,
        rosterScrollable:list.scrollHeight > list.clientHeight,
        railOverflow:getComputedStyle(rail).overflowY,
        railScrollable:rail.scrollHeight > rail.clientHeight,
        debtOverflow:getComputedStyle(scroll).overflowY,
        debtScrollable:scroll.scrollHeight > scroll.clientHeight,
        rect:{top:dialogBox.top,bottom:dialogBox.bottom,left:dialogBox.left,right:dialogBox.right},
        close:{top:closeBox.top,bottom:closeBox.bottom},
      };
    });
    assert.match(result.mortgageBackground,/rgb\(185, 28, 28\)/,JSON.stringify({viewport,result}));
    assert.equal(result.mortgageFilter,"none",JSON.stringify({viewport,result}));
    assert.equal(result.mortgageInk,"rgb(255, 255, 255)");
    assert.equal(result.ownedCount,26);
    assert.equal(result.matchSeats,7,"Every match player must exist in desktop rail or tablet drawer");
    assert.equal(result.rosterOverflow,"auto","The match roster itself must be scrollable");
    assert.ok(result.allAssetsPresent);
    assert.equal(result.railOverflow,"auto");
    assert.ok(result.railScrollable,"Every property must be reachable by scrolling "+JSON.stringify({viewport,result}));
    assert.equal(result.debtOverflow,"auto");
    assert.ok(result.debtScrollable,"Debt actions must remain reachable by internal scrolling "+JSON.stringify({viewport,result}));
    assert.ok(result.rect.top >= 0 && result.rect.bottom <= viewport.height + 1 &&
      result.rect.left >= 0 && result.rect.right <= viewport.width + 1,
      "Debt dialog escaped viewport "+JSON.stringify({viewport,result}));
    assert.ok(result.close.top >= 0 && result.close.bottom <= viewport.height,"Close button escaped viewport");
    await page.close();
  }
  console.log("PASS rendered red mortgages, 26 scrollable property chips and compact liquidation dialog at desktop/tablet/mobile");
} finally { await browser.close(); }
