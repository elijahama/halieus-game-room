import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [handlers, state, panel, css] = await Promise.all([
  read("server/src/games/mega-board/handlers/tradeHandlers.ts"),
  read("shared/games/mega-board/game-state.ts"),
  read("client/src/games/mega-board/components/TradePanel.tsx"),
  read("client/src/index.css"),
]);

assert.match(state, /\| "trade-declined"[\s\S]*?\| "trade-cancelled"/,
  "Rejections and cancellations need separate typed notice kinds.");
assert.match(handlers, /kind: "trade-declined"[\s\S]*?recordActivity\(gameState, message, "trade", recipient\.id\)/,
  "Immediate reject-all must announce an auto-declined proposal.");
assert.match(handlers, /kind: wasCancelled \? "trade-cancelled" : "trade-declined"[\s\S]*?recordActivity\(gameState, activityMessage, "trade", actor\?\.id\)/,
  "Player decline and proposer cancellation need explicit event notices.");
assert.match(handlers, /title: "Deal declined"[\s\S]*?recordActivity\(gameState, message, "trade", player\.id\)/,
  "Decline-all during pending negotiations must announce to the room.");
assert.match(panel, /className=\{\x60trade-result-banner is-\$\{lastTradeResult.status\}\x60\}[\s\S]*?Deal rejected/,
  "Trade panel must retain rejection result for participants.");
assert.match(css, /\.global-game-notice\.is-trade-declined\s*\{[^}]+\}/,
  "Dedicated declined notice must use visual warning styling.");
assert.match(css, /\.trade-result-banner\s*\{[^}]*text-align:\s*center;[^}]*justify-items:\s*center;/,
  "Trade result heading and description must be centred.");
assert.match(css, /\.global-game-notice\.is-single-line\s*>\s*span\s*\{[^}]*text-align:\s*center;/,
  "Mobile game notice text must be centred within its container.");

assert.match(panel, /className="mega-trade-card-header"/, "Trade must reuse the Player Details header structure");
assert.match(panel, /className="mega-trade-section"/, "Trade must use grouped, titled sections");
assert.match(panel, /mega-trade-recipient-card/, "Selectable players need proper visual cards");
assert.match(panel, /mega-trade-party-heading/, "Offer editor must show player identity");
assert.match(panel, /mega-trade-asset-row/, "Transfer rows must use compact asset cards");
assert.match(panel, /mega-trade-submit/, "Final send button must have a dedicated action area");
assert.match(panel, /Counter offer/, "Recipient must have a visible option to counter pending terms.");
assert.match(panel, /Back to original offer/, "Counter editor must offer an explicit cancel without declining the original.");
assert.match(panel, /isCountering \|\|/, "A human counter must be editable while not the active turn.");
assert.match(panel, /isCountering \|\| atLimit/, "Countering cannot silently replace the approved participant set.");
const designCss = css.slice(css.lastIndexOf("/* Mega Board Trade: shared Player Details visual structure"));
assert(designCss.startsWith("/* Mega Board Trade:"), "Scoped Player Details reference CSS must exist");
const bannerCss = css.match(/\.trade-result-banner\s*\{[^}]*\}/)?.[0] ?? "";
const singleCss = css.match(/\.global-game-notice\.is-single-line\s*>\s*span\s*\{[^}]*\}/)?.[0] ?? "";
const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
try {
  for (const width of [320,390,820]) {
    const page = await browser.newPage({ viewport: {width,height:760}, reducedMotion: "reduce" });
    try {
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>*{box-sizing:border-box}body{margin:0;padding:12px;background:#161b24;color:#fff;font:14px system-ui}
      ${bannerCss}${singleCss}
      .trade-result-banner{width:min(100%,480px);min-height:80px;margin:0 auto}
      .global-game-notice.is-single-line{display:flex;align-items:center;justify-content:center;width:min(100%,480px);padding:12px;margin:18px auto;border:1px solid #555}
      </style></head><body>
      <div class="trade-result-banner is-declined"><strong>✕ Deal rejected</strong><span>Another player declined the deal.</span></div>
      <div class="global-game-notice is-trade-declined is-single-line"><span>Another player declined the deal.</span></div>
      </body></html>`);
      const alignment=await page.evaluate(()=>{
        const panel=document.querySelector(".trade-result-banner");
        const heading=panel.querySelector("strong");
        const explanation=panel.querySelector("span");
        const notice=document.querySelector(".global-game-notice");
        const text=notice.querySelector("span");
        const centre=box=>box.getBoundingClientRect().x+box.getBoundingClientRect().width/2;
        return { bannerHeadingOffset:Math.abs(centre(panel)-centre(heading)),
          bannerExplanationOffset:Math.abs(centre(panel)-centre(explanation)),
          noticeTextAlign:getComputedStyle(text).textAlign,
          viewportOverflow:document.documentElement.scrollWidth>innerWidth+1 };
      });
      assert(alignment.bannerHeadingOffset<2,`Heading aligned at ${width}px: ${JSON.stringify(alignment)}`);
      assert(alignment.bannerExplanationOffset<2,`Explanation aligned at ${width}px: ${JSON.stringify(alignment)}`);
      assert.equal(alignment.noticeTextAlign,"center");
      assert.equal(alignment.viewportOverflow,false,`No horizontal overflow at ${width}px`);
      console.log("PASS "+width+"px centred trade rejection text and global notice");

      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>:root{--mm-text:#f7f7f7;--mm-muted:#bababa;--mm-border:#616161;--mm-surface:#141a1e;--mm-surface-2:#242b32;--hgr-brand:#ba8c23}
        *{box-sizing:border-box}body{margin:0;padding:8px;background:var(--mm-surface);color:var(--mm-text);font:14px system-ui}
        ${designCss}</style></head><body>
        <section class="mega-trade-panel" style="display:grid;width:min(100%,850px);margin:0 auto">
          <header class="mega-trade-card-header"><span class="mega-trade-card-emblem">↔</span>
            <div class="mega-trade-card-heading"><small>MEGA BOARD · TRADE</small><h3>Make a deal</h3><p>Choose players and terms</p></div>
            <span class="mega-trade-header-status">1/3 selected</span></header>
          <section class="mega-trade-section"><div class="mega-trade-section-title"><strong>Choose players</strong><small>1 selected</small></div>
            <div class="mega-trade-recipient-grid"><label class="mega-trade-recipient-card is-selected">
              <span class="mega-trade-player-token">A</span><span class="mega-trade-recipient-copy"><strong>Long sample player name for layout test</strong><small>Connected</small></span>
              <input type="checkbox" aria-label="Select sample player" checked></label>
              <label class="mega-trade-recipient-card"><span class="mega-trade-player-token">B</span>
              <span class="mega-trade-recipient-copy"><strong>Second player</strong><small>Connected</small></span>
              <input type="checkbox" aria-label="Select second player"></label></div></section>
          <section class="mega-trade-section"><div class="mega-trade-section-title"><strong>Build the offer</strong><small>Select cash and assets</small></div>
            <div class="mega-trade-offer-grid"><div class="mega-trade-party-editor" style="display:grid">
              <header class="mega-trade-party-heading"><span class="mega-trade-player-token">A</span>
              <div><small>YOUR OFFER</small><strong>My deal</strong></div><span class="mega-trade-asset-count">3 assets</span></header>
              <label class="mega-trade-cash-field" style="display:grid"><span>Cash to another player</span><input type="number" value="100"></label>
              <div class="mega-trade-asset-row"><span class="mega-trade-asset-name">Long property name with development level and mortgage interest</span>
              <select class="mega-trade-destination-select"><option>Give to Player B</option></select></div>
            </div></div></section>
          <div class="mega-trade-submit"><button type="button">Send trade proposal</button><small>Everyone must accept.</small></div>
        </section></body></html>`);
      const design=await page.evaluate(()=>{
        const recipient=document.querySelector(".mega-trade-recipient-grid");
        const asset=document.querySelector(".mega-trade-asset-row");
        const rect=asset.getBoundingClientRect();
        const viewport=window.innerWidth;
        return {
          over:document.documentElement.scrollWidth>viewport+1,
          recipientColumns:getComputedStyle(recipient).gridTemplateColumns.split(" ").length,
          assetOverflow:rect.right>viewport+1,
          checkbox:document.querySelector(".mega-trade-recipient-card input").getBoundingClientRect().width,
          headerOverflow:document.querySelector(".mega-trade-card-header").getBoundingClientRect().right>viewport+1
        };
      });
      assert.equal(design.over,false,"Trade redesign must fit "+width+"px");
      assert.equal(design.assetOverflow,false,"Asset rows must fit "+width+"px");
      assert.equal(design.headerOverflow,false,"Header must fit "+width+"px");
      assert.equal(design.recipientColumns,width<=720?1:2,"Responsive recipient columns "+width+"px");
      assert(design.checkbox>=18,"Checkbox must remain tappable "+width+"px");
      console.log("PASS "+width+"px Player Details-derived trade layout and responsive asset rows");
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log("PASS server-confirmed trade rejection/cancellation event coverage; participant panel remains.");
