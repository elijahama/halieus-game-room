import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";
const root=resolve(import.meta.dirname,".."),base="http://127.0.0.1:39566";
const server=spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),"preview","--host","127.0.0.1","--port","39566","--strictPort"],{cwd:resolve(root,"client"),stdio:"pipe"});
let browser;
try {
  let ready=false;
  for(let i=0;i<70;i++){
    try{if((await fetch(base)).ok){ready=true;break}}catch{}
    if(server.exitCode!==null)break;
    await new Promise(r=>setTimeout(r,180));
  }
  assert.ok(ready,"Vite preview missing");
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,820,1440]){
    const page=await browser.newPage({viewport:{width,height:844}});
    await page.goto(base,{waitUntil:"domcontentloaded"});
    const out=await page.evaluate(async()=>{
      const aside=document.createElement("aside");
      aside.className="halieus-maintenance-banner is-restarting";
      aside.innerHTML='<span class="halieus-maintenance-icon">•</span><span class="halieus-maintenance-status">SERVER RESTARTING</span><div class="halieus-maintenance-ticker"><strong class="is-scrolling">Updating HGR: your game and account records are preserved while the new release is activated and prepared.</strong></div><b class="halieus-maintenance-timing">Reconnecting</b><button class="halieus-maintenance-dismiss" aria-label="Dismiss update ribbon">×</button>';
      document.body.append(aside);
      await new Promise(done=>setTimeout(done,260)); // allow the brief entrance motion to settle
      const rect=aside.getBoundingClientRect();
      const icon=aside.querySelector(".halieus-maintenance-icon");
      const ticker=aside.querySelector(".halieus-maintenance-ticker strong");
      const info={left:rect.left,right:rect.right,top:rect.top,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,motion:getComputedStyle(icon).animationName,tickerMotion:getComputedStyle(ticker).animationName};
      aside.remove();
      return info;
    });
    assert.ok(Math.abs(out.left)<=2 && Math.abs(out.right-width)<=2,JSON.stringify({width,out}));
    assert.equal(out.top,0);
    assert.ok(out.scrollWidth <= width+8,"Ribbon overflow "+JSON.stringify({width,out}));
    assert.ok(!out.motion.includes("spin"),JSON.stringify(out));
    assert.ok(out.tickerMotion.includes("hgr-ribbon-scroll"),JSON.stringify(out));
    await page.emulateMedia({reducedMotion:"reduce"});
    const reduced=await page.evaluate(()=>{
      const el=document.createElement("div");
      el.className="halieus-maintenance-banner is-restarting";
      el.innerHTML='<span class="halieus-maintenance-icon">•</span><div class="halieus-maintenance-ticker"><strong class="is-scrolling">Important changes to the game</strong></div>';
      document.body.append(el);
      const result=[getComputedStyle(el.querySelector(".halieus-maintenance-icon")).animationName,getComputedStyle(el.querySelector(".halieus-maintenance-ticker strong")).animationName];
      el.remove();return result;
    });
    assert.deepEqual(reduced,["none","none"]);
    await page.close();
    console.log("PASS update ribbon "+width+"px: no clipping and reduced motion respected");
  }
}finally{await browser?.close();server.kill()}
