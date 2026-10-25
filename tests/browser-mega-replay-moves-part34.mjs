import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "hgr-move-replay-"));
const css = readFileSync(join(root, "client/src/index.css"),"utf8");
let browser;
try {
  const bundle = join(temp,"moves-bundle.js");
  await build({entryPoints:[join(root,"tests/fixtures/mega-replay-real-part34.tsx")],
    bundle:true,platform:"browser",format:"iife",outfile:bundle,logLevel:"silent",
    define:{"process.env.NODE_ENV":'"production"'}});
  browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
  for (const viewport of [{width:390,height:844},{width:820,height:900},{width:1408,height:900}]) {
    const page=await browser.newPage({viewport,acceptDownloads:true});
    try {
      await page.addInitScript(() => {
        Object.defineProperty(navigator,"clipboard",{configurable:true,value:{
          writeText: async (value) => { window.__hgrCopiedTranscript=value; }
        }});
      });
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#101c2a;color:white"></body></html>');
      await page.evaluate(() => {
        Object.defineProperty(navigator,"clipboard",{configurable:true,value:{
          writeText:async (value) => { window.__hgrCopiedTranscript=value; }
        }});
      });
      await page.addStyleTag({content:css});
      await page.addScriptTag({path:bundle});
      const replay=page.getByLabel("Read-only Mega Board replay and move notation");
      await replay.waitFor();
      assert.equal(await page.locator(".mega-replay-move-list li").count(),3);
      const first=page.locator(".mega-replay-move-list li button").nth(0);
      const second=page.locator(".mega-replay-move-list li button").nth(1);
      const old=page.locator(".mega-replay-move-list li button").nth(2);
      assert.equal(await old.isDisabled(),true,"History lacking retained frame is visibly unavailable");
      await page.getByRole("button",{name:"Copy move list"}).click();
      const clipboard=await page.evaluate(() => window.__hgrCopiedTranscript);
      assert.match(clipboard,/001\. \| T1 \| Ava \| ROLL/);
      assert.match(clipboard,/003\. \| T2 \| Sam \| TRADE/);
      const downloadPromise=page.waitForEvent("download");
      await page.getByRole("button",{name:"Download moves .txt"}).click();
      const download=await downloadPromise;
      assert.match(download.suggestedFilename(),/mega-board-TEST34-moves\.txt/);
      await second.click();
      assert.equal(await second.getAttribute("aria-current"),"step");
      assert.match(await replay.locator(".mega-replay-event").innerText(),/bought The Angel/);
      await first.click();
      assert.equal(await first.getAttribute("aria-current"),"step");
      assert.match(await replay.locator(".mega-replay-event").innerText(),/rolled 2 \+ 3/);
      const m=await page.evaluate(() => ({
        viewport:innerWidth,
        documentWidth:document.documentElement.scrollWidth,
        listScroll:getComputedStyle(document.querySelector(".mega-replay-move-list")).overflowY,
        copyButton:(() => {const r=document.querySelector(".mega-replay-controls button").getBoundingClientRect();return {left:r.left,right:r.right};})(),
      }));
      assert.ok(m.documentWidth<=viewport.width+1,"No horizontal overflow "+JSON.stringify(m));
      assert.equal(m.listScroll,"auto");
      assert.ok(m.copyButton.left>=0 && m.copyButton.right<=viewport.width+1);
      console.log(`PASS HGR move-list browser ${viewport.width}×${viewport.height}: copy, TXT export, move click, no false replay jump, contained layout`);
    } finally {await page.close();}
  }
} finally {
  if (browser) await browser.close();
  rmSync(temp,{recursive:true,force:true});
}
