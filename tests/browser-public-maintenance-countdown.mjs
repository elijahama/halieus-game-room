import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { renderPublicClosedPage } from "../server/src/platform/publicAccess.ts";

const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
  for (const width of [320,390,820]) {
    const end=Date.now()+3200;
    let opened=false,checks=0;
    const server=createServer((request,response)=>{
      response.setHeader("Cache-Control","no-store");
      const isCheck=(request.url||"").startsWith("/public-access/status?");
      if(isCheck){
        checks++;
        if(Date.now()>=end)opened=true;
        response.writeHead(200,{"content-type":"application/json"});
        response.end(JSON.stringify({closed:!opened,serverNow:Date.now(),reopenAt:opened?null:end}));
        return;
      }
      if(opened){
        response.writeHead(200,{"content-type":"text/html; charset=utf-8"});
        response.end("<!doctype html><html><body><h1>Game Room open again</h1></body></html>");
        return;
      }
      response.writeHead(503,{"content-type":"text/html; charset=utf-8"});
      response.end(renderPublicClosedPage("Scheduled maintenance test",end,"Europe/London"));
    });
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const origin="http://127.0.0.1:"+server.address().port;
    const page=await browser.newPage({viewport:{width,height:760},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",err=>errors.push(err.message));
    try {
      const response=await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
      assert.equal(response.status(),503);
      const timer=page.locator("#maintenanceCountdown");
      assert.equal(await timer.getAttribute("role"),"timer");
      assert.match(await timer.textContent(),/^\d{2}:\d{2}:\d{2}$/);
      assert.equal(await page.locator("a[href='/control/']").count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,
        width+"px public notice must not overflow");
      await page.getByRole("heading",{name:"Game Room open again"}).waitFor({timeout:11000});
      assert(checks>0,"Countdown must independently verify backend before redirecting.");
      assert.deepEqual(errors,[],width+"px unexpected browser errors");
      console.log("PASS "+width+"px server-backed maintenance countdown, 503->200 and verified reopen navigation");
    } finally {await page.close();await new Promise(resolve=>server.close(resolve));}
  }
  const manual=renderPublicClosedPage("Owner intervention needed",null);
  assert(!manual.includes('id="maintenanceCountdown"'),"Manual closure must not invent an end");
  assert(manual.includes("No automatic reopening time"));
  console.log("PASS manual maintenance has no false reopening timer.");
} finally {await browser.close();}
