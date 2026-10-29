import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const pub = resolve(root, "client/public");
const original = await readFile(resolve(pub, "control/index.html"), "utf8");
const html = original.replace(/<script\b[^>]*src=[^>]*><\/script>/gi, "");
const control = await readFile(resolve(pub, "control/control.js"), "utf8");
const launcher = await readFile(resolve(root, "client/src/platform/control/AdminControlLauncher.tsx"), "utf8");
const launcherCss = await readFile(resolve(root, "client/src/platform/control/admin-control-launcher.css"), "utf8");
assert.match(original, /4\.7\.3-control-mobile-ops/);
assert.match(launcher, /control-icon\.png\?v=part26-control-approved2/, "Do not change approved Control H artwork.");
assert.match(launcher, /OWNER CONTROLS/);
assert.match(launcherCss, /color-scheme:dark/);
const exposed = control.replace("  void initialise();",
  "  globalThis.__auditOps = { setOperationCategory, bindUi };");
assert.notEqual(exposed,control);
const server = createServer(async (req,res)=>{
  const p = new URL(req.url,"http://localhost").pathname;
  if(p==="/control/"){res.writeHead(200,{"content-type":"text/html"});res.end(html);return;}
  if(p==="/test-owner-theme"){
    res.writeHead(200,{"content-type":"text/html"});
    res.end('<!doctype html><html><head><link rel="stylesheet" href="/launcher.css"/></head><body><div id="host" style="--hgr-surface-raised:red;--hgr-text:yellow;--hgr-border:green"><a class="hgr-admin-control-launcher" href="/control/"><img class="hgr-admin-control-mark" src="/control/control-icon.png?v=part26-control-approved2"/><span><small>OWNER CONTROLS</small><strong>HGR Control</strong><em>Independent control theme</em></span></a></div></body></html>');return;
  }
  if(p==="/launcher.css"){res.writeHead(200,{"content-type":"text/css"});res.end(launcherCss);return;}
  if(!/^\/control\/(?:control(?:-core)?\.css|fonts\/[a-z0-9-]+\.woff2)$/.test(p)&&p!=="/control-navigation.css"){res.writeHead(404);res.end();return;}
  try{
    const data=await readFile(resolve(pub,p.slice(1)));
    res.writeHead(200,{"content-type":extname(p)===".css"?"text/css":"font/woff2"});res.end(data);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
  for(const [label,width,height] of [["small-phone",320,760],["phone",390,844],["tablet",820,1180],["desktop",1440,900]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(origin+"/control/",{waitUntil:"load"});
    await page.addScriptTag({content:exposed});
    const state=await page.evaluate(()=>{
      document.querySelector('[data-panel="overview"]')?.classList.remove("is-active");
      document.querySelector('[data-panel="operations"]')?.classList.add("is-active");
      document.querySelector("#accessState").hidden=true;
      document.querySelector("#publicAccessCard").hidden=false;
      window.__auditOps.bindUi();
      return {
        tabIds:[...document.querySelectorAll("[data-operation-tab]")].map(t=>t.dataset.operationTab),
        panels:[...document.querySelectorAll("[data-operation-panel]")].filter(p=>!p.hidden).map(p=>p.dataset.operationPanel),
        overflows:document.documentElement.scrollWidth>innerWidth+1,
        tabBoxes:[...document.querySelectorAll("[data-operation-tab]")].map(t=>{const r=t.getBoundingClientRect();return{x:r.x,width:r.width,height:r.height};}),
        rows:[...document.querySelectorAll(".infrastructure-list > div strong")].map(t=>t.textContent.trim())
      };
    });
    assert.deepEqual(state.tabIds,["maintenance","update","laptop"],label);
    assert.deepEqual(state.panels,["maintenance"],label+": maintenance must be default");
    assert.equal(state.overflows,false,label+": page overflow");
    assert.deepEqual(state.rows,["HGR Cloud","Owner PC","Public website","Laptop release checkout","Original laptop development checkout"]);
    for(const r of state.tabBoxes) assert(r.height>=44&&r.width>0&&r.x>=0&&r.x+r.width<=width+1,label+": tab target");
    await page.locator('[data-operation-tab="update"]').click();
    assert.deepEqual(await page.locator('[data-operation-panel]:visible').evaluateAll(xs=>xs.map(x=>x.dataset.operationPanel)),["update"]);
    assert.equal(await page.locator('[data-operation="update"]').isVisible(),true);
    assert.equal(await page.locator('[data-operation="start"]').isVisible(),false);
    await page.locator('[data-operation-tab="update"]').press("ArrowRight");
    assert.deepEqual(await page.locator('[data-operation-panel]:visible').evaluateAll(xs=>xs.map(x=>x.dataset.operationPanel)),["laptop"]);
    assert.equal(await page.locator('[data-operation="start"]').isVisible(),true);
    assert.equal(await page.locator('#publicAccessToggle').isVisible(),false);
    assert.equal(await page.locator('[data-operation-tab="laptop"]').getAttribute("aria-selected"),"true");
    assert.deepEqual(errors,[],label+" unexpected errors");
    console.log("PASS "+label+": maintenance-first tabs, keyboard access, isolated commands, honest version rows");
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(origin+"/test-owner-theme",{waitUntil:"load"});
  async function theme(){return page.locator(".hgr-admin-control-launcher").evaluate(el=>{
    const s=getComputedStyle(el),head=getComputedStyle(el.querySelector("strong"));
    return {background:s.backgroundImage,color:s.color,heading:head.color,font:head.fontFamily};
  });}
  const before=await theme();
  await page.locator("#host").evaluate(el=>el.setAttribute("style","--hgr-surface-raised:lime;--hgr-text:red;--hgr-border:purple"));
  const after=await theme();
  assert.deepEqual(after,before,"Owner Control shortcut must ignore user-selected game theme");
  assert.match(after.font,/Righteous|Varela Round/);
  await page.close();
  console.log("PASS owner Game Room Control launcher: theme-independent, canonical icon retained.");
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
