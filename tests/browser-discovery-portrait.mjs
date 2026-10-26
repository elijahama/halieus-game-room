import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
const root=resolve(import.meta.dirname,"..");
const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
const files=[...main.matchAll(/import "\.\/(.+\.css)";/g)].map(match=>match[1]);
const css=files.map(file=>readFileSync(resolve(root,"client/src",file),"utf8")).join("\n");
const source=readFileSync(resolve(root,"client/src/platform/components/HomeScreen.tsx"),"utf8");
const nav=source.split('<nav className="halieus-discovery-tabs"')[1].split("</nav>")[0];
const labels=[...nav.matchAll(/\["[^"]+", "([^"]+)"\]/g)].map(match=>match[1]);
assert.equal(labels.length,5);
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:820,height:1180},{width:844,height:390},{width:1440,height:900}]) {
  const page=await browser.newPage({viewport});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><section class="halieus-main" style="margin:0;padding:12px;box-sizing:border-box;width:100%;max-width:100%"><nav class="halieus-discovery-tabs" aria-label="Game discovery filters">'+labels.map((label,i)=>'<button type="button" '+(i===0?'class="is-active"':'')+'>'+label+'</button>').join("")+'</nav></section></body></html>');
  await page.addStyleTag({content:css});
  const tabs=page.getByLabel("Game discovery filters");
  const metrics=await tabs.evaluate(nav=>({wrap:getComputedStyle(nav).flexWrap,overflow:getComputedStyle(nav).overflowX,ys:[...nav.children].map(b=>Math.round(b.getBoundingClientRect().top)),height:nav.clientHeight,viewport:innerWidth,docWidth:document.documentElement.scrollWidth}));
  if(viewport.height>viewport.width && viewport.width<=900){
   assert.equal(metrics.wrap,"nowrap");
   assert.equal(metrics.overflow,"auto");
   assert.equal(new Set(metrics.ys).size,1,"All five filters must stay on the same row");
   assert(metrics.docWidth<=viewport.width+1,"No page overflow");
   await tabs.evaluate(nav => { nav.scrollLeft = nav.scrollWidth; });
   await page.waitForFunction(() => { const nav=document.querySelector(".halieus-discovery-tabs"); const last=nav.lastElementChild.getBoundingClientRect(),box=nav.getBoundingClientRect();return last.left>=box.left-1&&last.right<=box.right+1; }, null, {timeout:3000}).catch(async error => {console.error(await tabs.evaluate(nav=>({scroll:nav.scrollLeft,width:nav.clientWidth,total:nav.scrollWidth,box:nav.getBoundingClientRect().toJSON(),last:nav.lastElementChild.getBoundingClientRect().toJSON()})));throw error;});
   const visible=await tabs.evaluate(nav=>{const last=nav.lastElementChild.getBoundingClientRect(),box=nav.getBoundingClientRect();return last.left>=box.left-1&&last.right<=box.right+1;});
   assert(visible,"Horizontal scrolling reveals the last filter");
   await tabs.getByRole("button",{name:"Friends Are Playing",exact:true}).click();
  } else assert.equal(metrics.wrap,"wrap","Nonportrait layout remains unchanged");
  console.log("PASS discovery filter layout "+viewport.width+"x"+viewport.height);
  await page.close();
 }
}finally{await browser.close();}
