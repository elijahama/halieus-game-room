import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Reproduce the approved desktop spectator layout: active game header, banner,
// square board, then six live player portfolios. No server/client state involved.
const root = resolve(import.meta.dirname, "..");
const main = await readFile(resolve(root, "client/src/main.tsx"), "utf8");
const paths = [...main.matchAll(/import "([^"]+\.css)";/g)]
  .map((m) => m[1]).filter((p) => p.startsWith("./"));
const hotfix = "./styles/hgr-mega-portfolio-clipping-hotfix.css";
assert.equal(paths.filter((p) => p === hotfix).length, 1);
const stylesheets = await Promise.all(paths.map((p) => readFile(resolve(root, "client/src", p), "utf8")));
const cards = Array.from({ length: 6 }, (_, i) =>
  '<article class="player-rail-card" data-seat="' + (i + 1) + '">' +
    '<div class="player-rail-main-row"><strong>Live player ' + (i + 1) + '</strong></div>' +
    '<div class="player-property-strip"><div class="player-property-count">Owned · 6</div>' +
    Array.from({ length: 4 }, (_, j) =>
      '<section class="player-property-group"><div class="player-property-group-heading">' +
      '<strong>Colour group ' + (j + 1) + '</strong><small>2/3</small></div>' +
      '<div class="player-property-group-chips"><span class="player-property-chip">' +
      '<span class="player-property-chip-name">Wellington Road and the Market Square</span>' +
      '</span></div></section>'
    ).join("") + '</div></article>'
).join("");

const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>html,body,#root{margin:0;min-height:100%;--hgr-surface:#101827;--mm-surface-1:#111827;' +
      '--hgr-text:#fff;--hgr-border:#667085;color:#fff;background:#101827;}*,*::before,*::after{box-sizing:border-box;}</style>' +
      '</head><body><div id="root"><main class="game-page mega-live-page mega-spectator-mode">' +
      '<header class="game-header mega-active-header" style="min-height:70px"><div>Ranked · 6 players · Connected</div></header>' +
      '<div class="mega-spectator-banner">Spectating · Read-only</div>' +
      '<div class="game-layout mega-live-layout-v3 mega-spectator-layout">' +
      '<section class="board-frame"><div class="board-grid" style="background:#c8dec9">' +
      '<div class="board-centre">Mega Board</div></div></section>' +
      '<aside class="mega-live-player-rail mega-spectator-player-rail player-rail">' +
      '<header class="player-rail-header"><div><h2>Live players</h2></div></header>' +
      '<div class="player-rail-list">' + cards + '</div></aside>' +
      '<div class="right-game-stack"></div></div></main></div></body></html>');
    for (const css of stylesheets) await page.addStyleTag({ content: css });
    const m = await page.evaluate(() => {
      const host = document.querySelector(".mega-spectator-mode");
      const board = document.querySelector(".mega-spectator-layout > .board-frame");
      const rail = document.querySelector(".mega-spectator-player-rail");
      const list = rail.querySelector(".player-rail-list");
      const last = rail.querySelector('[data-seat="6"]');
      return {
        overflow: getComputedStyle(host).overflowY,
        boardWidth: board.getBoundingClientRect().width,
        boardHeight: board.getBoundingClientRect().height,
        pageScrollHeight: host.scrollHeight,
        pageHeight: host.clientHeight,
        railOverflow: getComputedStyle(rail).overflowY,
        listOverflow: getComputedStyle(list).overflowY,
        railHeight: rail.getBoundingClientRect().height,
        playerCount: list.children.length,
        lastPlayerName: last.textContent,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    assert.equal(m.overflow, "auto", "Spectator page must be scrollable instead of clipping live players");
    assert.ok(m.boardWidth >= viewport.height * 0.70,
      "Board must be legible rather than thumbnail-sized " + JSON.stringify({ viewport, m }));
    assert.ok(Math.abs(m.boardWidth - m.boardHeight) <= 3, "Keep approved square board geometry");
    assert.equal(m.playerCount, 6);
    assert.ok(m.pageScrollHeight > m.pageHeight + 100,
      "All six full portfolios must remain reachable with vertical scrolling");
    assert.equal(m.railOverflow, "visible", "Player rail must not crop the cards");
    assert.equal(m.listOverflow, "visible", "Roster must not crop the cards");
    assert.ok(m.railHeight > 250, "Player cards must have a natural-height roster");
    assert.ok(m.horizontalOverflow <= 2, "No horizontal page overflow");

    await page.evaluate(() => {
      const host = document.querySelector(".mega-spectator-mode");
      host.scrollTop = host.scrollHeight;
    });
    const lastPlayer = await page.locator('[data-seat="6"]');
    assert.ok(await lastPlayer.isVisible(), "Bottom seat remains in the visible, scrollable page");
    console.log("PASS spectator board size + full six-seat roster accessible at " + viewport.width + "x" + viewport.height);
    await page.close();
  }
} finally {
  await browser.close();
}
