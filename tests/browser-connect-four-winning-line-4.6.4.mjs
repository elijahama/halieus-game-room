import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { ConnectFourBoard } from "../client/src/games/connect-four/ConnectFourBoard.tsx";

const root = resolve(import.meta.dirname, "..");
const css = await readFile(resolve(root, "client/src/index.css"), "utf8");
const discs = Array(42).fill(0);
for (const i of [14, 21, 28, 35]) discs[i] = 2;
const html = renderToStaticMarkup(React.createElement(ConnectFourBoard, {
  board: discs, winningCells: [14, 21, 28, 35], review: true, lastDropIndex: 35,
}));
const browser = await chromium.launch({
  headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined,
});
try {
  for (const viewport of [
    { width: 320, height: 568 }, { width: 360, height: 740 },
    { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1200, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await page.setContent(`<!doctype html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>html,body{margin:0;padding:0;--mm-surface-1:#101925;--mm-border:#4d6280;
        --mm-muted:#cbd5e1;color:#f8fafc;background:#101925}
      .test-wrap{width:100%;box-sizing:border-box;padding:8px}</style>
      </head><body><div class="test-wrap">
      <section class="connect-four-final-board"><h2>Final round</h2>${html}</section>
      </div></body></html>`);
    await page.addStyleTag({content:css});
    const result = await page.evaluate(() => {
      const cells = [...document.querySelectorAll(".connect-four-cell.is-winning-cell")];
      const board = document.querySelector(".connect-four-board");
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        width: board.getBoundingClientRect().width,
        cells: cells.length,
        allDisabled: [...board.querySelectorAll("button")].every(b => b.disabled),
        labeled: cells.every(b => b.getAttribute("aria-label")?.includes("part of the winning four")),
        boxShadow: getComputedStyle(cells[0].querySelector("span")).boxShadow,
        animation: getComputedStyle(cells[0].querySelector("span")).animationName,
      };
    });
    assert(!result.overflow, `No horizontal clipping at ${viewport.width}: ${JSON.stringify(result)}`);
    assert(result.width <= viewport.width - 10, "Review board fits viewport");
    assert.equal(result.cells, 4);
    assert(result.allDisabled && result.labeled, "Four accessible, non-interactive winning discs");
    assert.notEqual(result.boxShadow, "none", "Winning disc has a visible outline");
    assert.equal(result.animation, "none", "Reduced motion must disable the glow pulse");
    await page.close();
  }
  console.log("PASS Connect Four 4.6.4 final win highlight at 320/360/390/768/1200; visible rings, accessible cells, no clipping and reduced-motion parity");
} finally {
  await browser.close();
}
