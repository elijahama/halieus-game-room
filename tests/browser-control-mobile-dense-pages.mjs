import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";

const root=resolve(import.meta.dirname,"..");
const pub=resolve(root,"client/public");
const baseHtml=await readFile(resolve(pub,"control/index.html"),"utf8");
assert.match(baseHtml,/mobile-layout\.css\?v=lp-layout-mobile-2/,"Updated PWA mobile CSS URL must invalidate an older browser style cache.");
const html=baseHtml.replace(/<script\b[^>]*src=[^>]*><\/script>/gi,"");
const mainScript=await readFile(resolve(pub,"control/control.js"),"utf8");
const script=mainScript.replace("  void initialise();",
  "  globalThis.__denseControlTest={bindUi,setSection};");
assert.notEqual(script,mainScript);
const server=createServer(async(req,res)=>{
  const p=new URL(req.url,"http://127.0.0.1").pathname;
  if(p==="/control/"){res.setHeader("Content-Type","text/html");res.end(html);return;}
  if(!/^\/(?:control\/(?:control(?:-core)?\.css|mobile-layout\.css|fonts\/[\w-]+\.woff2)|control-navigation\.css)$/.test(p)){
    res.statusCode=404;res.end();return;
  }
  try{
    const data=await readFile(resolve(pub,p.slice(1)));
    res.setHeader("Content-Type",extname(p)===".css"?"text/css":"font/woff2");
    res.end(data);
  }catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
const longTitle="Development results, scoped Control release verification, and fully audited source contributions — ".repeat(3);
const longToken="hgr-control-cloud-development-evidence-4-8-"+"a".repeat(120);
const noOverflow=async(page,label)=>{
  const x=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(x.scroll<=x.width+1&&x.body<=x.width+1,label+": no horizontal overflow "+JSON.stringify(x));
};
try{
  for(const [name,width,height] of [["small",320,760],["phone",360,800],["android",390,844],["tablet",820,1180]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(origin+"/control/",{waitUntil:"load"});
    await page.addScriptTag({content:script});
    await page.evaluate(()=>{
      document.getElementById("accessState").hidden=true;
      document.getElementById("publicAccessCard").hidden=false;
      document.getElementById("controlFullscreen").hidden=false;
      window.__denseControlTest.bindUi();
      window.__denseControlTest.setSection("operations");
    });
    await page.locator("#operationTabMaintenance").click();
    assert.equal(await page.locator("#operationPanelMaintenance").isVisible(),true);
    await noOverflow(page,name+" maintenance");
    const initial=await page.evaluate(()=>{
      const fs=[...document.querySelectorAll(".hgr-maintenance-times fieldset")];
      const controls=[...document.querySelectorAll(".hgr-maintenance-times input"),document.querySelector("#publicAccessReason")];
      return {
        fieldsets:fs.map(e=>{let r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}}),
        controls:controls.map(e=>{let r=e.getBoundingClientRect();let s=getComputedStyle(e);return {id:e.id,height:r.height,font:parseFloat(s.fontSize),width:r.width,left:r.left,right:r.right}}),
        actions:[...document.querySelectorAll(".hgr-maintenance-schedule-actions button")].map(e=>e.getBoundingClientRect().height),
        nav:getComputedStyle(document.querySelector(".control-mobile-nav")).display
      };
    });
    assert.equal(initial.fieldsets.length,2);
    for(const c of initial.controls) {
      assert.ok(c.height>=44,name+": field target >=44px "+c.id);
      assert.ok(c.left>=0&&c.right<=width+1,name+": field fits "+c.id);
      if(width<=700) assert.ok(c.font>=16,name+": input font avoids iOS zoom "+c.id);
    }
    if(width<=700){
      assert.ok(initial.fieldsets[1].left>=0&&initial.fieldsets[1].right<=width+1);
      assert.ok(initial.fieldsets[1].width>250||width<350,name+": mobile form step usable");
      const before=await page.locator("#publicAccessStartZone").inputValue();
      await page.locator("#publicAccessStartZone").focus();
      assert.equal(await page.locator(".control-mobile-nav").isVisible(),false,
        name+": hide bottom nav for focused maintenance input");
      const shrunk=Math.max(400,height-340);
      await page.setViewportSize({width,height:shrunk});
      await page.locator("#publicAccessStartZone").scrollIntoViewIfNeeded();
      const keyboard=await page.locator("#publicAccessStartZone").boundingBox();
      assert.ok(keyboard&&keyboard.y>=0&&keyboard.y+keyboard.height<=shrunk+1,
        name+": focused field visible in reduced keyboard-sized viewport");
      await noOverflow(page,name+" keyboard-size");
      assert.equal(await page.locator("#publicAccessStartZone").inputValue(),before,
        "layout should never change maintenance values");
      await page.locator("#publicAccessStartZone").evaluate(e=>e.blur());
      assert.equal(await page.locator(".control-mobile-nav").isVisible(),true,
        name+": bottom nav restored after field loses focus");
      await page.setViewportSize({width,height});
    }
    // Test long evidence and audit receipts using synthetic read-only content, never write user data.
    await page.evaluate(({longTitle,longToken})=>{
      window.__denseControlTest.setSection("audit");
      const host=document.getElementById("auditList");
      for(let i=0;i<6;i++){
        const row=document.createElement("article");row.className="audit-entry";
        const time=document.createElement("time");time.textContent="03 November 2026 10:15:42 GMT";
        const content=document.createElement("div");
        const title=document.createElement("strong");title.textContent=longTitle;
        const description=document.createElement("small");description.textContent=longToken;
        content.append(title,description);row.append(time,content);host.append(row);
      }
    },{longTitle,longToken});
    await noOverflow(page,name+" audit long");
    const audit=await page.locator(".audit-entry").last().evaluate(e=>{
      const time=e.querySelector("time");
      const title=e.querySelector("strong");const detail=e.querySelector("small");
      return {width:e.getBoundingClientRect().width,font:parseFloat(getComputedStyle(detail).fontSize),
        timeFont:parseFloat(getComputedStyle(time).fontSize),titleFont:parseFloat(getComputedStyle(title).fontSize)};
    });
    assert.ok(audit.width<=width-20,name+": audit card fits");
    if(width<=960){
      assert.ok(audit.font>=11&&audit.titleFont>=12&&audit.timeFont>=10,name+": readable audit typography");
    }
    await page.evaluate(({longTitle,longToken})=>{
      window.__denseControlTest.setSection("development");
      const host=document.getElementById("developmentPulls");
      for(let i=0;i<6;i++){
        const row=document.createElement("div");row.className="development-entry";
        const wrap=document.createElement("div");wrap.className="development-entry-copy";
        const strong=document.createElement("strong");strong.textContent=longTitle;
        const status=document.createElement("small");status.textContent="Draft source; no public deployment";
        wrap.append(strong,status);
        const link=document.createElement("a");link.className="development-source-link";
        link.href="https://github.com/elijahama/halieus-game-room/pull/236";
        link.textContent=longToken;
        row.append(wrap,link);host.append(row);
      }
    },{longTitle,longToken});
    await noOverflow(page,name+" development long");
    if(width<=960){
      const links=await page.locator("#developmentPulls .development-source-link").evaluateAll(es=>es.map(e=>({height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)})));
      assert.ok(links.every(x=>x.height>=44),name+": real development links retain touch targets");
    }
    assert.deepEqual(errors,[],name+": no browser errors");
    await page.close();
  }
  // Headless Chrome CDP does not reliably emulate an installed PWA display
  // mode. Verify the real manifest and CSS contract instead; owner Android
  // and Brave device acceptance remains an explicit separate gate.
  const manifest=JSON.parse(await readFile(resolve(pub,"control/manifest.webmanifest"),"utf8"));
  const layoutCss=await readFile(resolve(pub,"control/mobile-layout.css"),"utf8");
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.start_url,"/control/?installed=1");
  assert.equal(manifest.scope,"/control/");
  assert.match(layoutCss,/@media\(display-mode:standalone\) and \(max-width:960px\)/);
  assert.match(layoutCss,/env\(safe-area-inset-bottom\)/);
  console.log("PASS HGR mobile Control dense page and keyboard-size simulation: 320/360/390/820 maintenance form labels/steps and safe focus, reduced viewport, long audit/development entries, PWA manifest and standalone CSS contract; physical phone acceptance remains open");
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
