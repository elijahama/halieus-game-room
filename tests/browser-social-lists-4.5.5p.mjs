import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const port = 39577;
const base = "http://127.0.0.1:" + port;
const preview = spawn(process.execPath, [
  resolve(root, "node_modules/vite/bin/vite.js"),
  "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort",
], { cwd: resolve(root, "client"), stdio: "pipe" });
let browser;
try {
  let ready = false;
  for (let i=0; i<90; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    if (preview.exitCode !== null) break;
    await new Promise(done => setTimeout(done, 180));
  }
  assert.ok(ready, "HGR preview server did not start");
  browser = await chromium.launch({headless:true});
  for (const [width,height] of [[320,720],[360,780],[375,812],[390,844],[412,915],[430,932],[820,1180],[1440,900]]) {
    const page = await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
    await page.goto(base, {waitUntil:"domcontentloaded"});
    const measure = await page.evaluate(async () => {
      await document.fonts.ready;
      const shell = document.createElement("main");
      shell.className = "halieus-shell";
      shell.style.cssText = "position:relative;width:100%;max-width:100%;box-sizing:border-box;padding:12px";
      shell.innerHTML = `
        <section class="halieus-view view-players">
          <div class="halieus-social-roster-switch">
            <div class="halieus-social-roster-tabs" role="group" aria-label="Choose social list">
              <button type="button" aria-pressed="true" class="is-active">Friends <span>3</span></button>
              <button type="button" aria-pressed="false">Guild contacts <span>4</span></button>
            </div>
            <p>People who have accepted your friendship. Guild membership alone never adds them here.</p>
          </div>
          <div class="halieus-player-directory is-social-list" aria-label="Accepted friends">
            <div class="halieus-player-identity is-compact"><span class="halieus-player-identity-avatar">AA</span><span class="halieus-player-identity-copy"><strong>Player Alpha</strong><small>@player-alpha</small></span></div>
            <div class="halieus-player-identity is-compact"><span class="halieus-player-identity-avatar">BB</span><span class="halieus-player-identity-copy"><strong>Player Beta</strong><small>@player-beta</small></span></div>
            <div class="halieus-player-identity is-compact"><span class="halieus-player-identity-avatar">CC</span><span class="halieus-player-identity-copy"><strong>Player Gamma</strong><small>@player-gamma</small></span></div>
          </div>
        </section>`;
      document.body.append(shell);
      const area = shell.querySelector(".halieus-social-roster-tabs");
      const buttons = [...area.querySelectorAll("button")];
      const list = shell.querySelector(".halieus-player-directory");
      const bound = node => {const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};};
      const result = {
        shell: bound(shell), switch:bound(area),
        controls: buttons.map(button => ({...bound(button),pressed:button.getAttribute("aria-pressed"),font:getComputedStyle(button).fontFamily})),
        list: bound(list), rows:[...list.children].map(bound),
        columnDefinition:getComputedStyle(list).gridTemplateColumns,
        overflow: Math.max(0, document.documentElement.scrollWidth-window.innerWidth),
      };
      shell.remove();
      return result;
    });
    assert.ok(measure.switch.right <= width + 2, "Social switch overflows "+width+"px: "+JSON.stringify(measure));
    assert.ok(measure.overflow <= 8, "New social layout causes horizontal overflow "+width+"px: "+JSON.stringify(measure));
    assert.equal(measure.controls.length,2);
    for(const control of measure.controls){
      assert.ok(control.height>=44, "Social switch has undersized touch target at "+width+": "+JSON.stringify(control));
      assert.ok(control.left >= -2 && control.right <= width+2, "Social control clipped at "+width+": "+JSON.stringify(control));
      assert.match(control.font,/Varela Round/);
    }
    assert.equal(measure.rows.length,3);
    for(const row of measure.rows){
      assert.ok(row.width >= measure.list.width - 2, "Social directory is still laid out as large multi-column tiles at "+width+": "+JSON.stringify(measure));
      assert.ok(row.height>=60, "Compact friend row is too short at "+width);
    }
    console.log("PASS 4.5.5p Friends/Guild contacts list dimensions and usable controls at "+width+"px");
    await page.close();
  }
} finally {
  await browser?.close();
  preview.kill("SIGTERM");
}
