import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const root=new URL("../",import.meta.url);
const html=(await readFile(new URL("client/public/control/index.html",root),"utf8"))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"")
  .replace("</head>",'<script src="/control/release-notice.js" defer></script></head>');
const css=await readFile(new URL("client/public/control/control.css",root),"utf8");
const coreCss=await readFile(new URL("client/public/control/control-core.css",root),"utf8");
const script=await readFile(new URL("client/public/control/release-notice.js",root),"utf8");
let current={ok:true,status:"current",installedVersion:"4.7.13",candidateVersion:"4.7.13"};
let status=200;
let hits=0;
const server=createServer((req,res)=>{
  const path=new URL(req.url,"http://127.0.0.1").pathname;
  if(path==="/control/release-availability"){
    hits++;
    res.setHeader("Content-Type","application/json");
    res.setHeader("Cache-Control","no-store");
    res.statusCode=status;res.end(JSON.stringify(current));return;
  }
  if(path==="/control/"||path==="/"){
    res.setHeader("Content-Type","text/html; charset=utf-8");res.end(html);return;
  }
  if(path==="/control/control.css"){res.setHeader("Content-Type","text/css");res.end(css);return;}
  if(path==="/control/control-core.css"){res.setHeader("Content-Type","text/css");res.end(coreCss);return;}
  if(path==="/control/release-notice.js"){
    res.setHeader("Content-Type","text/javascript");res.end(script);return;
  }
  res.statusCode=404;res.end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
  const base="http://127.0.0.1:"+server.address().port;
  for(const width of [390,1440]){
    hits=0;
    const page=await browser.newPage({viewport:{width,height:850}});
    await page.goto(base+"/control/");
    const notice=page.locator("#controlReleaseNotice");
    assert.equal(await notice.isVisible(),false,"must not announce before verified auth");
    assert.equal(hits,0,"must not query release endpoint before an admin session");
    await page.evaluate(()=>{
      document.querySelector('[data-section="operations"]').addEventListener("click",()=>{
        document.querySelector('[data-panel="operations"]').classList.add("is-active");
      });
      document.getElementById("operationTabUpdate").addEventListener("click",()=>{
        document.getElementById("operationPanelUpdate").hidden=false;
      });
      window.dispatchEvent(new Event("hgr-control-authorized"));
    });
    await page.waitForFunction(()=>document.getElementById("controlReleaseNotice")?.hidden===true);
    assert.equal(await notice.isVisible(),false,"same installed version should not display a banner");
    current={ok:true,status:"available",installedVersion:"4.7.13",candidateVersion:"4.7.14"};
    await page.evaluate(()=>window.dispatchEvent(new Event("hgr-control-authorized")));
    await notice.waitFor({state:"visible",timeout:7000});
    assert.match(await notice.innerText(),/UPDATE AVAILABLE/);
    assert.match(await notice.innerText(),/HGR 4\.7\.14 is ready/);
    assert.match(await notice.innerText(),/Public website: 4\.7\.13/);
    assert.equal(await page.locator("#operationTabUpdate").evaluate(n=>n.classList.contains("has-release")),true);
    const bounds=await notice.boundingBox();
    assert.ok(bounds && bounds.x>=0 && bounds.x+bounds.width <= width+1,"notice must fit viewport "+width);
    await page.locator("#controlReleaseReview").click();
    assert.equal(await page.locator('[data-panel="operations"]').evaluate(n=>n.classList.contains("is-active")),true);
    assert.equal(await page.locator("#operationPanelUpdate").evaluate(n=>!n.hidden),true);
    assert.equal(await notice.isVisible(),true,"review navigation must never dismiss the release notice");

    current={ok:true,status:"unverified",installedVersion:"4.7.13",candidateVersion:"4.7.13"};
    await page.evaluate(()=>window.dispatchEvent(new Event("hgr-control-authorized")));
    await page.waitForFunction(()=>document.getElementById("controlReleaseNotice")?.hidden===true);
    assert.equal(await notice.isVisible(),false,"same-version fingerprint divergence not a confirmed update");
    current={ok:false};
    status=503;
    await page.evaluate(()=>window.dispatchEvent(new Event("hgr-control-authorized")));
    await page.waitForTimeout(100);
    assert.equal(await notice.isVisible(),false,"unavailable GitHub source cannot invent update");
    current={ok:true,status:"current",installedVersion:"4.7.13",candidateVersion:"4.7.13"};
    status=200;
    await page.close();
  }
  console.log("PASS Control in-app release notification: auth gate, current/unverified/unavailable hidden, newer release visible on 390px and 1440px, read-only Review update navigation, no overflow");
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
