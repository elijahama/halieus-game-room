import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";

const root=resolve(import.meta.dirname,"..");
const pub=resolve(root,"client/public");
const original=await readFile(resolve(pub,"control/index.html"),"utf8");
const html=original.replace(/<script\b[^>]*src=[^>]*><\/script>/gi,"");
const script=await readFile(resolve(pub,"control/control.js"),"utf8");
const exposed=script.replace("  void initialise();","  globalThis.__mobileControlAudit = { bindUi, setSection, closeMobileMore };");
assert.notEqual(exposed,script,"must expose only the real handler functions, never run network initialization");
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1");
  const path=url.pathname;
  if(path==="/control/"||path==="/control"){
    res.setHeader("Content-Type","text/html; charset=utf-8");res.end(html);return;
  }
  if(!/^\/(?:control\/(?:control(?:-core)?\.css|mobile-layout\.css|fonts\/[\w-]+\.woff2)|control-navigation\.css)$/.test(path)){
    res.statusCode=404;res.end();return;
  }
  try{
    const bytes=await readFile(resolve(pub,path.slice(1)));
    res.setHeader("Content-Type",extname(path)===".css"?"text/css":"font/woff2");
    res.end(bytes);
  }catch{res.statusCode=404;res.end();}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
const targetNames=["overview","live","games","operations"];
const moreNames=["players","performance","development","audit"];
try{
  for(const [label,width,height] of [
    ["tiny",320,760],["phone",360,800],["android",390,844],
    ["tablet",820,1180],["tablet-wide",960,768],["desktop-compact",1024,768],
    ["desktop",1440,900]
  ]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(origin+"/control/",{waitUntil:"load"});
    await page.addScriptTag({content:exposed});
    await page.evaluate(()=>{
      document.getElementById("accessState").hidden=true;
      window.__mobileControlAudit.bindUi();
      const full=document.getElementById("controlFullscreen");
      full.hidden=false;full.textContent="Full Screen";
      document.getElementById("publicAccessCard").hidden=false;
    });
    const snapshot=await page.evaluate(()=>{
      const nav=document.querySelector(".control-mobile-nav");
      const header=document.querySelector(".control-topbar");
      const rail=document.querySelector(".control-rail");
      const button=document.querySelector("#controlFullscreen");
      const body=document.querySelector(".control-main");
      const r=nav.getBoundingClientRect();
      const b=button.getBoundingClientRect();
      return {
        navVisible:getComputedStyle(nav).display!=="none",
        railVisible:getComputedStyle(rail).display!=="none",
        navItems:[...nav.querySelectorAll("button")].map(x=>x.dataset.section||x.id),
        navFixed:getComputedStyle(nav).position==="fixed",
        navBottom:Math.round(innerHeight-r.bottom),
        navRects:[...nav.querySelectorAll("button")].map(x=>{const s=x.getBoundingClientRect();return {width:s.width,height:s.height,x:s.x,right:s.right};}),
        fullscreenRect:{width:b.width,height:b.height,x:b.x,right:b.right},
        brandVisible:getComputedStyle(document.querySelector(".control-mobile-headmark")).display!=="none",
        headlineTop:header.getBoundingClientRect().top,
        mainPaddingBottom:parseFloat(getComputedStyle(body).paddingBottom),
        overflows:document.documentElement.scrollWidth>innerWidth+1,
        icons:[...nav.querySelectorAll("svg")].length
      };
    });
    assert.equal(snapshot.overflows,false,label+": horizontal document overflow");
    if(width<=960){
      assert.equal(snapshot.navVisible,true,label+": fixed bottom nav visible");
      assert.equal(snapshot.railVisible,false,label+": desktop rail hidden");
      assert.equal(snapshot.navFixed,true);
      assert.deepEqual(snapshot.navItems,[...targetNames,"controlMobileMoreButton"],label+": five useful destinations");
      assert.equal(snapshot.icons,5,label+": line icons");
      assert.equal(snapshot.brandVisible,true,label+": canonical Control mark visible");
      assert.ok(snapshot.mainPaddingBottom>=90,label+": safe fixed-nav bottom clearance");
      for(const b of snapshot.navRects){
        assert.ok(b.width>=45&&b.height>=44&&b.x>=0&&b.right<=width+1,label+": bottom tab touch target");
      }
      assert.ok(snapshot.fullscreenRect.height>=44&&snapshot.fullscreenRect.right<=width+1,
        label+": fullscreen control visible in topbar");
      for(const section of targetNames){
        await page.locator('.control-mobile-nav [data-section="'+section+'"]').click();
        assert.equal(await page.locator('[data-panel="'+section+'"]').evaluate(e=>e.classList.contains("is-active")),true);
        assert.equal(await page.locator('.control-mobile-nav [data-section="'+section+'"]').getAttribute("aria-current"),"page");
      }
      await page.locator("#controlMobileMoreButton").click();
      assert.equal(await page.locator("#controlMobileMore").isVisible(),true,label+": More opens");
      assert.equal(await page.locator("#controlMobileMoreButton").getAttribute("aria-expanded"),"true");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#controlMobileMore").isVisible(),false,label+": Escape closes");
      for(const section of moreNames){
        await page.locator("#controlMobileMoreButton").click();
        const panel=page.locator("#controlMobileMore");
        assert.equal(await panel.isVisible(),true);
        const bounds=await panel.boundingBox();
        assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+1,label+": More sheet fits viewport");
        await panel.locator('[data-section="'+section+'"]').click();
        assert.equal(await panel.isVisible(),false,label+": More closes after choosing "+section);
        assert.equal(await page.locator('[data-panel="'+section+'"]').evaluate(e=>e.classList.contains("is-active")),true);
        assert.equal(await page.locator("#controlMobileMoreButton").getAttribute("aria-current"),"page");
      }
      await page.locator("#controlMobileMoreButton").click();
      await page.locator("#controlMobileMoreClose").click();
      assert.equal(await page.locator("#controlMobileMore").isVisible(),false);
      await page.locator("#controlMobileMoreButton").click();
      await page.locator('.control-mobile-nav [data-section="overview"]').click({force:true});
      assert.equal(await page.locator("#controlMobileMore").isVisible(),false);
      await page.evaluate(()=>{document.getElementById("controlReleaseNotice").hidden=false;});
      assert.equal(await page.locator("#controlReleaseNotice").isVisible(),true,"release alert remains in normal flow");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,
        label+": no overflow with release notice");
    }else{
      assert.equal(snapshot.navVisible,false,label+": mobile bar hidden on desktop");
      assert.equal(snapshot.railVisible,true,label+": desktop rail preserved");
    }
    assert.deepEqual(errors,[],label+": page errors");
    await page.close();
  }
  console.log("PASS LP-inspired HGR Control mobile shell: 320/360/390 phone, 820/960 tablet, 1024/1440 desktop, 5 fixed tabs, More access to all sections, keyboard, fullscreen, safe area and no horizontal overflow");
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
