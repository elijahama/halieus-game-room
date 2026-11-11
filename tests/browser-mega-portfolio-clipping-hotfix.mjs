import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const entry = await readFile(resolve(root, "client/src/main.tsx"), "utf8");
const hotfixName = "./styles/hgr-mega-portfolio-clipping-hotfix.css";
assert.equal(entry.split(hotfixName).length, 2, "Hotfix CSS must be imported exactly once");
assert.ok(entry.lastIndexOf(hotfixName) > entry.lastIndexOf("./styles/hgr-account-workspace.css"),
  "Portfolio hotfix must load after all legacy game style overrides");

const cssPaths = [...entry.matchAll(/import "([^"]+\\.css)";/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith("./"));
assert.ok(cssPaths.includes(hotfixName));
const sheets = await Promise.all(cssPaths.map((name) =>
  readFile(resolve(root, "client/src", name), "utf8")));

const groups = ["Brown", "Light blue", "Pink", "Orange", "Red", "Yellow", "Green", "Dark blue", "Stations", "Utilities"];
const longNames = ["The Extremely Long Property on the North Side", "Wellington Road", "The Metropolitan Station", "Birmingham New Street"];
const portfolio = '<div class="player-property-strip"><span class="player-property-count">Owned · 20</span>' +
  groups.map((group, i) => '<section class="player-property-group"><div class="player-property-group-heading">' +
    '<span class="player-property-group-dot"></span><strong>' + group + '</strong><small>2/3</small></div>' +
    '<div class="player-property-group-chips">' +
    [0, 1].map((j) => '<span class="player-property-chip"><i></i><span class="player-property-chip-name">' +
      longNames[(i + j) % longNames.length] + '</span></span>').join("") + '</div></section>').join("") + '</div>';
const card = (n) => '<article class="player-rail-card" data-player="' + n + '"><div class="player-rail-main-row">' +
  '<strong>Player ' + n + '</strong></div>' + portfolio + '</article>';

const browser = await chromium.launch({headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined});
try {
  for (const viewport of [{width:1280,height:720},{width:1440,height:900},{width:390,height:844},{width:820,height:900}]) {
    const desktop = viewport.width > 1180;
    const page = await browser.newPage({viewport});
    const cls = desktop ? "player-rail-side player-rail-side-left" : "tablet-players-drawer";
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0;--mm-surface-1:#151c26;' +
      '--mm-surface-2:#1e2835;--mm-text:#f7f7fa;--mm-muted:#c6cbd4;--mm-border:#364152;background:#101722;color:#fff}' +
      '.hotfix-test-host{width:' + (desktop ? '210px' : 'min(340px,100vw)') + ';height:460px;' +
      'display:flex;flex-direction:column;min-width:0;max-width:100%;overflow:hidden;position:relative}' +
      '.hotfix-test-host .player-rail-list{flex:1 1 auto;min-height:0;overflow:auto}' +
      '</style></head><body><main class="game-page mega-live-page"><div class="game-layout">' +
      '<aside class="player-rail ' + cls + ' hotfix-test-host"><header class="player-rail-header"><h2>Players</h2></header>' +
      '<div class="player-rail-list">' + card(1) + card(2) + '</div></aside></div></main></body></html>');
    for (const css of sheets) await page.addStyleTag({content:css});
    const read = () => page.evaluate(() => {
      const list = document.querySelector(".player-rail-list");
      const c = document.querySelector(".player-rail-card");
      const strip = c.querySelector(".player-property-strip");
      const chip = c.querySelector(".player-property-chip");
      const name = c.querySelector(".player-property-chip-name");
      const styles = (e) => getComputedStyle(e);
      return {
        listOverflow: styles(list).overflowY,
        listScrollHeight: list.scrollHeight,
        listHeight: list.clientHeight,
        cardHeight: c.getBoundingClientRect().height,
        cardMaxHeight: styles(c).maxHeight,
        cardOverflow: styles(c).overflow,
        stripMaxHeight: styles(strip).maxHeight,
        stripOverflow: styles(strip).overflowY,
        chipWhiteSpace: styles(chip).whiteSpace,
        nameWhiteSpace: styles(name).whiteSpace,
        nameOverflow: styles(name).overflowX,
        nameHeight: name.getBoundingClientRect().height,
        screenWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        groupCount: document.querySelectorAll(".player-property-group").length
      };
    });
    const info = await read();
    assert.equal(info.groupCount, 20, "Complete property group inventory remains in DOM");
    assert.equal(info.stripMaxHeight, "none", "The portfolio strip cannot be capped");
    assert.equal(info.chipWhiteSpace, "normal", "Long property chips must wrap");
    assert.equal(info.nameWhiteSpace, "normal", "Street names must wrap");
    assert.notEqual(info.nameOverflow, "hidden", "Property name must not be ellipsized");
    assert.ok(info.screenWidth <= viewport.width + 2, "No horizontal overflow " + JSON.stringify({viewport,info}));
    assert.ok(info.listScrollHeight > info.listHeight + 80,
      "Overflowing roster is scrollable, rather than losing properties " + JSON.stringify({viewport,info}));
    if (desktop) {
      assert.equal(info.listOverflow, "auto", "Desktop player list scrolls");
      assert.equal(info.cardMaxHeight, "none", "Desktop player card never has a fixed crop");
      assert.equal(info.cardOverflow, "visible", "Desktop player card content is not hidden");
      assert.equal(info.stripOverflow, "visible", "Desktop portfolio is not individually cropped");
    } else {
      assert.equal(info.stripOverflow, "visible", "Mobile drawer uses its list scroller instead of a nested cropped strip");
    }
    console.log("PASS Mega Board portfolio unclipped " + viewport.width + "x" + viewport.height);
    await page.close();
  }
} finally {
  await browser.close();
}
