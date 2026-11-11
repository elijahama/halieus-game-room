import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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
  // Owner manually reopens with NO scheduled deadline. Old page must not
  // wait forever: it polls even without an output countdown, and returns.
  {
    let opened=false,checks=0;
    const server=createServer((request,response)=>{
      response.setHeader("Cache-Control","no-store");
      if((request.url||"").startsWith("/public-access/status?")){
        checks++;
        response.writeHead(200,{"content-type":"application/json"});
        response.end(JSON.stringify({closed:!opened,serverNow:Date.now(),reopenAt:null}));
        return;
      }
      if(opened){
        response.writeHead(200,{"content-type":"text/html; charset=utf-8"});
        response.end("<!doctype html><html><body><h1>Manual reopening succeeded</h1></body></html>");
      }else{
        response.writeHead(503,{"content-type":"text/html; charset=utf-8"});
        response.end(renderPublicClosedPage("Owner can reopen without a deadline",null));
      }
    });
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const origin="http://127.0.0.1:"+server.address().port;
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    try{
      const first=await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
      assert.equal(first.status(),503);
      assert.equal(await page.locator("#maintenanceCountdown").count(),0);
      assert.equal(await page.getByRole("button",{name:"Check reopening status"}).count(),1);
      await page.getByText("The Game Room is still closed", {exact:false}).waitFor({timeout:5000});
      assert.equal(await page.getByRole("heading",{name:"Manual reopening succeeded"}).count(),0,
        "Must never redirect from a closed:true server response");
      opened=true;
      // No click, refresh, countdown or user interaction: routine polling must recover.
      await page.getByRole("heading",{name:"Manual reopening succeeded"}).waitFor({timeout:17000});
      assert(checks>=2,"Manual page must retry the uncached backend after owner reopening");
      assert.deepEqual(errors,[],"Manual reopen must not produce page errors");
      console.log("PASS 390px manually reopened maintenance returns without refresh or countdown");
    }finally{await page.close();await new Promise(resolve=>server.close(resolve))}
  }
  // A phone restores an old countdown tab BEFORE its old advertised deadline:
  // a server reopening (e.g. manual override) must win and the restored page
  // must check immediately rather than wait for the old countdown.
  {
    const end=Date.now()+60000;
    let opened=false,checks=0;
    const server=createServer((request,response)=>{
      response.setHeader("Cache-Control","no-store");
      if((request.url||"").startsWith("/public-access/status?")){
        checks++;
        response.writeHead(200,{"content-type":"application/json"});
        response.end(JSON.stringify({closed:!opened,serverNow:Date.now(),reopenAt:opened?null:end}));
        return;
      }
      response.writeHead(opened?200:503,{"content-type":"text/html; charset=utf-8"});
      response.end(opened?"<!doctype html><html><body><h1>Early reopening succeeded</h1></body></html>":
        renderPublicClosedPage("Scheduled end is later",end,"Europe/London"));
    });
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const origin="http://127.0.0.1:"+server.address().port;
    const page=await browser.newPage({viewport:{width:320,height:700}});
    try {
      assert.equal((await page.goto(origin+"/",{waitUntil:"domcontentloaded"})).status(),503);
      await page.getByText("The Game Room is still closed",{exact:false}).waitFor({timeout:5000});
      opened=true;
      await page.evaluate(()=>window.dispatchEvent(new Event("pageshow")));
      await page.getByRole("heading",{name:"Early reopening succeeded"}).waitFor({timeout:5000});
      assert(checks>=2);
      console.log("PASS old phone tab/pageshow checks early reopening before expired countdown");
    }finally{await page.close();await new Promise(resolve=>server.close(resolve))}
  }
  const manual=renderPublicClosedPage("Owner intervention needed",null);
  assert(!manual.includes('id="maintenanceCountdown"'),"Manual closure must not invent an end");
  assert(manual.includes('id="maintenanceAvailabilityStatus"'));
  assert(manual.includes('id="maintenanceCheckNow"'));
  assert(manual.includes("No automatic reopening time"));
  const sw=await readFile(new URL("../client/public/sw.js",import.meta.url),"utf8");
  assert(sw.includes("fetch(event.request, { cache: 'no-store' })"),"PWA navigations must ignore stale HTTP cached maintenance.");
  assert(sw.includes("url.pathname === '/public-access/status'"),"Maintenance status API must bypass service worker.");
  console.log("PASS manual maintenance has no false reopening timer and PWA nav cache gate.");
} finally {await browser.close();}
