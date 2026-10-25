import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(root, "client/src/index.css"), "utf8");
const temp = mkdtempSync(join(tmpdir(), "hgr-react-auction-"));
let browser;
try {
  const bundle = join(temp, "auction-real.js");
  await build({
    entryPoints: [resolve(root, "tests/fixtures/mega-mobile-auction-real.tsx")],
    bundle: true, platform: "browser", format: "iife", outfile: bundle,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
  for (const viewport of [
    { width: 320, height: 568 }, { width: 360, height: 740 },
    { width: 390, height: 844 }, { width: 430, height: 932 },
    { width: 820, height: 780 },
  ]) {
    const page = await browser.newPage({ viewport });
    try {
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#08111b;color:white"><main id="hgr-root"><div class="board-frame" style="width:300px;height:300px;overflow:hidden;transform:translateZ(0);container-type:size"></div></main></body></html>');
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ path: bundle });
      const panel = page.locator(".mega-mobile-auction-sheet > .auction-presentation");
      await panel.waitFor({ state: "visible" });
      const players = page.locator(".auction-player-list > div");
      assert.equal(await players.count(), 8, "Actual React auction must render all eight seats");
      assert.match(await panel.innerText(), /LIVE TIMED AUCTION/);
      assert.match(await panel.innerText(), /Leading: Atlas/);
      assert.match(await panel.innerText(), /Bids increase only by £10, £50 or £100/);
      assert.match(await players.nth(3).innerText(), /Lagz[\s\S]*Cash £2,500/);
      assert.match(await players.nth(1).innerText(), /Milo[\s\S]*Cash private/);
      const measures = await page.evaluate(() => {
        const panel = document.querySelector(".mega-mobile-auction-sheet > .auction-presentation");
        const list = document.querySelector(".auction-player-list");
        const bids = Array.from(panel.querySelectorAll("button")).filter(b => b.textContent.includes("+£"));
        const withdraw = Array.from(panel.querySelectorAll("button")).find(b => b.textContent.trim() === "Withdraw");
        const box = x => { const r = x.getBoundingClientRect(); return { top: r.top, left: r.left, bottom: r.bottom, right: r.right, height: r.height }; };
        const out = {
          sheet: box(panel), list: box(list), bids: bids.map(box), withdraw: box(withdraw),
          scrolling: list.scrollHeight > list.clientHeight,
          scrollCSS: getComputedStyle(list).overflowY,
        };
        list.scrollTop = list.scrollHeight;
        out.lastVisible = list.lastElementChild.getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom + 3;
        return out;
      });
      assert.ok(measures.sheet.top >= 0 && measures.sheet.bottom <= viewport.height+1, JSON.stringify({viewport, measures}));
      assert.ok(measures.sheet.left >= 0 && measures.sheet.right <= viewport.width+1, JSON.stringify({viewport, measures}));
      assert.ok(measures.list.height >= 35, JSON.stringify({viewport, measures}));
      assert.equal(measures.scrollCSS, "auto");
      assert.ok(measures.lastVisible, "Final bidder must be reachable: "+JSON.stringify({viewport, measures}));
      for(const button of [...measures.bids, measures.withdraw]) {
        assert.ok(button.top >= 0 && button.bottom <= viewport.height && button.left >= 0 && button.right <= viewport.width+1, "Action offscreen: "+JSON.stringify({viewport, measures}));
      }
      await page.getByRole("button", {name:"+£10",exact:true}).click();
      assert.equal(await page.evaluate(()=>window.hgrAuctionActions.bid),160,"Real React onBid must receive current bid plus selected increment");
      await page.getByRole("button", {name:"Withdraw"}).click();
      assert.equal(await page.evaluate(()=>window.hgrAuctionActions.withdrew),true,"Real React withdraw handler must run");
      console.log(`PASS real React AuctionPanel ${viewport.width}×${viewport.height}: 8 seats, privacy, handlers, visible actions and roster reachability`);
    } finally { await page.close(); }
  }
} finally {
  if (browser) await browser.close();
  rmSync(temp, { recursive: true, force: true });
}
