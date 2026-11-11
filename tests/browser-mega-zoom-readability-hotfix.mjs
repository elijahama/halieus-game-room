import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const main = await readFile(resolve(root, "client/src/main.tsx"), "utf8");
const hotfixName = "./styles/hgr-mega-zoom-readability-hotfix.css";
assert.equal(main.split(hotfixName).length, 2, "Readability CSS loaded exactly once");
assert.ok(main.lastIndexOf(hotfixName) > main.lastIndexOf("./styles/hgr-account-workspace.css"),
  "Readability layer must load after legacy UI styles");
const paths = [...main.matchAll(/import "([^"]+\.css)";/g)]
  .map((match) => match[1])
  .filter((p) => p.startsWith("./"));
assert.ok(paths.includes(hotfixName));
const sheets = await Promise.all(paths.map((p) =>
  readFile(resolve(root, "client/src", p), "utf8")));
const hotfix = sheets[paths.indexOf(hotfixName)];
assert.doesNotMatch(hotfix, /(?:^|[;{\s])zoom\s*:/m,
  "Do not use page zoom to compensate for unreadable labels");
assert.doesNotMatch(hotfix, /transform\s*:\s*scale\s*\(/m,
  "Do not transform the interactive board or player rail");
const board = await readFile(resolve(root, "client/src/games/mega-board/components/GameBoard.tsx"), "utf8");
assert.match(board, /onClick=\{isInteractiveSpace \? activateSpace/,
  "Full-size board space details must remain accessible by click/tap");
assert.match(board, /setSelectedDeedSpaceId\(space\.id\)/,
  "Full-size property deeds must remain available");

const browser = await chromium.launch({headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined});
try {
  for (const width of [390, 820, 1280, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>html,body{margin:0;--mm-surface-1:#121b2b;--mm-surface-2:#253043;--mm-text:#f3f4fb;--mm-muted:#cbd5e1;--mm-border:#64748b;color:#fff;background:#0c1523}</style>' +
      '</head><body><main class="game-page mega-live-page"><div class="board-frame"><div class="board-grid">' +
      '<button class="board-space"><span class="board-space-name">Coventry Street</span><span class="board-space-price">£220</span></button>' +
      '<button class="board-space is-corner"><span class="board-space-name">Free Parking</span></button>' +
      '</div></div><aside class="player-rail player-rail-side"><div class="player-rail-list"><article class="player-rail-card">' +
      '<div class="player-property-strip"><span class="player-property-count">Owned · 6</span>' +
      '<section class="player-property-group"><div class="player-property-group-heading"><strong>Stations</strong><small>2/4</small>' +
      '<span class="player-property-group-set">Majority set</span></div><div class="player-property-group-chips">' +
      '<span class="player-property-chip"><span class="player-property-chip-name">King\'s Cross Station</span></span>' +
      '</div></section></div><div class="player-held-cards"><span>1 Bus Ticket</span></div>' +
      '</article></div></aside></main></body></html>');
    for (const css of sheets) await page.addStyleTag({content: css});
    const metrics = await page.evaluate(() => {
      const px = (selector) => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
      return {
        boardName: px(".board-space-name"),
        cornerName: px(".board-space.is-corner .board-space-name"),
        boardPrice: px(".board-space-price"),
        property: px(".player-property-chip"),
        heldCard: px(".player-held-cards > span"),
        group: px(".player-property-group-heading"),
        count: px(".player-property-count"),
        groupSmall: px(".player-property-group-heading small"),
        set: px(".player-property-group-set"),
      };
    });
    assert.ok(metrics.boardName >= 6.49, JSON.stringify({width, metrics}));
    assert.ok(metrics.cornerName >= 6.99, JSON.stringify({width, metrics}));
    assert.ok(metrics.boardPrice >= 5.99, JSON.stringify({width, metrics}));
    assert.ok(metrics.property >= 9.99, JSON.stringify({width, metrics}));
    assert.ok(metrics.heldCard >= 10.49, JSON.stringify({width, metrics}));
    assert.ok(metrics.group >= 11.49, JSON.stringify({width, metrics}));
    assert.ok(metrics.count >= 10.99, JSON.stringify({width, metrics}));
    assert.ok(metrics.groupSmall >= 9.99, JSON.stringify({width, metrics}));
    assert.ok(metrics.set >= 9.99, JSON.stringify({width, metrics}));
    console.log("PASS Mega Board readable text floors at " + width + "px: " + JSON.stringify(metrics));
    await page.close();
  }
} finally {
  await browser.close();
}
