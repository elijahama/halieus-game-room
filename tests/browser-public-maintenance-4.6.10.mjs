import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { renderPublicClosedPage } from "../server/src/platform/publicAccess.ts";

const root=resolve(import.meta.dirname,"..");
const css=await readFile(resolve(root,"client/public/control/control.css"),"utf8");
const controlHtml=await readFile(resolve(root,"client/public/control/index.html"),"utf8");
const panel=controlHtml.match(/<article id="publicAccessCard"[\s\S]*?<\/article>/)?.[0];
assert(panel,"Control contains dedicated public site panel");
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
 for(const viewport of [{width:320,height:568},{width:360,height:740},
   {width:390,height:844},{width:820,height:1024},{width:1440,height:900}]){
  const page=await browser.newPage({viewport});
  await page.setContent(renderPublicClosedPage("Planned maintenance: <test> & repair"));
  const visitor=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth>window.innerWidth+1,
   title:document.title,control:document.querySelector('a[href="/control/"]')?.textContent,
   username:!!document.querySelector('[name="username"]'),
   password:!!document.querySelector('[name="password"][type="password"]'),
   shownText:document.querySelector('main p')?.textContent,
  }));
  assert(!visitor.scroll,"Visitor maintenance page fits "+viewport.width+"px");
  assert(visitor.title.includes("temporarily closed"));
  assert(visitor.username&&visitor.password,"Owner sign in remains usable");
  assert(visitor.shownText.includes("<test>"),"Escaped visitor reason remains legible");
  assert.equal(await page.locator("test").count(),0,"Visitor reason cannot create markup");
  await page.locator("summary").click();
  assert(await page.locator('button[type="submit"]').isVisible());
  const formButton=await page.locator('button[type="submit"]').boundingBox();
  assert(formButton.height>=44,"Owner sign-in touch target fits");
  await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#0d1522;color:#fff;padding:12px}.control-section{max-width:840px;margin:0 auto}</style><section class="control-section" data-panel="operations">'+panel.replace(' hidden','')+'</section>');
  await page.addStyleTag({content:css});
  const card=page.locator("#publicAccessCard");
  assert(await card.isVisible());
  await page.locator("#publicAccessToggle").evaluate(b=>{b.disabled=false;b.dataset.state="closed";b.textContent="Reopen Public Game Room"});
  const layout=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   btn:document.querySelector("#publicAccessToggle").getBoundingClientRect(),
   card:document.querySelector("#publicAccessCard").getBoundingClientRect(),
  }));
  assert(!layout.overflow,"Control public-access panel fits "+viewport.width+"px");
  assert(layout.btn.width>100&&layout.btn.width<=layout.card.width,"Reopen button usable on mobile");
  assert(layout.btn.height>=44,"Control Reopen touch target");
  await page.close();
 }
 console.log("PASS 4.6.10 public maintenance visitor/owner Control layouts at 320,360,390,820,1440; no horizontal overflow and accessible controls");
} finally {await browser.close();}
