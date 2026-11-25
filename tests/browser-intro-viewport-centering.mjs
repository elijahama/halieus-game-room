import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const entry = await readFile(resolve(root, "client/src/main.tsx"), "utf8");
const hotfix = "./styles/hgr-intro-viewport-hotfix.css";
const styles = [...entry.matchAll(/import "([^"]+\.css)";/g)]
  .map(m => m[1]).filter(p => p.startsWith("./"));
assert.equal(styles.filter(p => p === hotfix).length, 1, "Intro CSS loaded exactly once");
assert.equal(styles.at(-1), hotfix, "Intro layout must override old arrival styles last");
const sheets = await Promise.all(styles.map(p =>
  readFile(resolve(root, "client/src", p), "utf8")));
const introSource = await readFile(resolve(root, "client/src/platform/components/HalieusIntro.tsx"), "utf8");
assert.match(introSource, /<HalieusBrandMark variant="high"\s*\/>/, "Must use canonical HGR brand component");
assert.match(introSource, /const AUTO_ENTER_MS = 3200;/, "Keep automatic intro completion timing");
assert.match(introSource, /const EXIT_MS = 520;/, "Keep intro exit timing");

const browser = await chromium.launch({
  headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined
});
try {
  const sizes = [
    {width:390,height:844,mobile:true},
    {width:768,height:1024},
    {width:820,height:1180},
    {width:1024,height:768},
    {width:1280,height:600},
    {width:1280,height:720},
    {width:1366,height:768},
    {width:1440,height:900},
    {width:1920,height:1080}
  ];
  for (const viewport of sizes) {
    const page = await browser.newPage({viewport});
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>html,body,#root{margin:0;width:100%;height:100%;}*{box-sizing:border-box}</style></head>
      <body><div id="root"><main class="halieus-intro halieus-intro-v4">
      <div class="halieus-intro-grid"></div>
      <button type="button" class="halieus-intro-skip">Skip intro</button>
      <section class="halieus-intro-v4-card">
      <span class="halieus-intro-v4-logo"><span class="halieus-brand-mark is-high"><svg viewBox="0 0 64 64">
      <rect class="halieus-brand-mark-tile" x="3" y="3" width="58" height="58" rx="15"/>
      </svg></span></span>
      <p class="halieus-intro-v4-kicker">WELCOME BACK, PLAYER</p>
      <h1>Welcome to<br>Halieus Game Room</h1>
      <p class="halieus-intro-v4-lede">Your games. Your people. One room.</p>
      <button type="button" class="halieus-intro-v4-enter"><span>Enter Game Room</span><span>→</span></button>
      <div class="halieus-intro-v4-meta"><span>Private multiplayer</span><span>Live rooms</span><span>14 games</span></div>
      <div class="halieus-intro-v4-progress"><span></span></div>
      </section></main></div></body></html>`);
    for (const css of sheets) await page.addStyleTag({content:css});
    await page.evaluate(() => {
      document.querySelector(".halieus-intro-v4-logo::before");
      document.querySelector(".halieus-intro-v4-logo").style.animation = "none";
    });
    const layout = await page.evaluate(() => {
      const intro = document.querySelector(".halieus-intro-v4");
      const card = document.querySelector(".halieus-intro-v4-card");
      const logo = document.querySelector(".halieus-intro-v4-logo");
      const enter = document.querySelector(".halieus-intro-v4-enter");
      const rect = el => el.getBoundingClientRect().toJSON();
      const glow = getComputedStyle(logo, "::before");
      const introCSS = getComputedStyle(intro);
      return {
        intro:rect(intro),card:rect(card),logo:rect(logo),enter:rect(enter),
        overflowY:introCSS.overflowY, scrollHeight:intro.scrollHeight, clientHeight:intro.clientHeight,
        pageWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
        glowTop:glow.top,glowLeft:glow.left,glowTranslate:glow.translate,
        cardHalo:getComputedStyle(card,"::before").content
      };
    });
    assert.ok(layout.pageWidth <= viewport.width+2, "No horizontal intro overflow "+JSON.stringify({viewport,layout}));
    assert.equal(layout.cardHalo,"none","Remove the old upper off-centre halo");
    assert.equal(layout.glowTranslate,"-50% -50%","Glow tracks the canonical logo centre even during breathing animation");
    // Chromium serialises computed percentage offsets as used pixels.
    const centred = (value, dimension) => value === "50%" ||
      Math.abs(Number.parseFloat(value) - dimension / 2) <= 1;
    assert.ok(centred(layout.glowTop, layout.logo.height),
      "Glow must have its centre on the logo's vertical centre");
    assert.ok(centred(layout.glowLeft, layout.logo.width),
      "Glow must have its centre on the logo's horizontal centre");
    if (!viewport.mobile) {
      assert.ok(layout.card.x>=-2 && layout.card.x+layout.card.width<=viewport.width+2,
        "Intro horizontally centred within viewport "+JSON.stringify({viewport,layout}));
      assert.ok(Math.abs(layout.card.x+layout.card.width/2-viewport.width/2)<=3,
        "Intro card must be centred on PC/tablet "+JSON.stringify({viewport,layout}));
      assert.equal(layout.overflowY,"auto","Short screen must scroll when needed");
      // In a normal PC/tablet frame the whole card should be visible. If
      // accessibility zoom makes it taller, the scroll container must expose it.
      if (viewport.height>=600) {
        assert.ok(layout.card.y>=-2 && layout.card.y+layout.card.height<=viewport.height+2,
          "Intro contents must fit a normal PC/tablet viewport "+JSON.stringify({viewport,layout}));
      }
    }
    console.log("PASS HGR intro "+viewport.width+"x"+viewport.height);
    await page.close();
  }
} finally {
  await browser.close();
}
