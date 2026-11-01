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
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log("PASS server-confirmed trade rejection/cancellation event coverage; participant panel remains.");
