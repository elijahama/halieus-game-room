import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const port = "39564";
const base = "http://127.0.0.1:" + port;
const preview = spawn(process.execPath, [resolve(root,"node_modules/vite/bin/vite.js"),
  "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"], {
  cwd: resolve(root, "client"), stdio: "pipe",
});
let browser;
try {
  let ready = false;
  for (let attempt=0; attempt<65; attempt++) {
    if (preview.exitCode !== null) throw new Error("Vite preview terminated early");
    try {
      const response = await fetch(base);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((done) => setTimeout(done, 200));
  }
  assert.ok(ready, "The built HGR site did not start");
  browser = await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE || undefined});
  for(const viewport of [{width:1440,height:900},{width:820,height:1100},{width:390,height:844}]) {
    const page = await browser.newPage({viewport, deviceScaleFactor:1});
    const fontRequests = [];
    page.on("response", (response) => {
      if(response.url().includes("unbounded") && response.url().includes(".woff2"))
        fontRequests.push({status:response.status(),url:response.url()});
    });
    await page.goto(base,{waitUntil:"domcontentloaded"});
    const result = await page.evaluate(async () => {
      // Unbounded is now an individual owner Beta preview, not the normal mixed baseline.
      document.documentElement.dataset.betaFont = "unbounded";
      await document.fonts.load('400 16px "Unbounded Variable"');
      await document.fonts.ready;
      const span = document.createElement("span");
      span.textContent = "Mortgage Property";
      span.className = "board-space-name";
      document.body.append(span);
      const computed = {
        root:getComputedStyle(document.documentElement).fontFamily,
        body:getComputedStyle(document.body).fontFamily,
        board:getComputedStyle(span).fontFamily,
        loaded:document.fonts.check('400 16px "Unbounded Variable"'),
        pageOverflow:document.documentElement.scrollWidth - window.innerWidth
      };
      span.remove();
      return computed;
    });
    console.log("FONT DIAGNOSTIC", JSON.stringify({viewport,result,fontRequests}));
    assert.match(result.root,/Unbounded Variable/,JSON.stringify({viewport,result}));
    assert.match(result.body,/Unbounded Variable/,JSON.stringify({viewport,result}));
    assert.equal(result.loaded,true,JSON.stringify({viewport,result}));
    assert.ok(!result.board.startsWith('"Unbounded Variable"'),"Specialist board labels should keep their explicit narrow font");
    assert.ok(fontRequests.some((request)=>request.status===200 && request.url.startsWith(base+"/assets/")),"Self-hosted Unbounded font must load successfully: "+JSON.stringify({viewport,fontRequests}));
    assert.ok(result.pageOverflow <= 8,"Global horizontal overflow at "+viewport.width+"px: "+JSON.stringify(result));
    await page.close();
    console.log("PASS HGR Unbounded font loaded locally at "+viewport.width+"px; board specialist retained; overflow="+result.pageOverflow);
  }
} finally {
  await browser?.close();
  preview.kill();
}
