import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {chromium} from "playwright";

const root=resolve(import.meta.dirname,".."),port="39571",url="http://127.0.0.1:"+port;
const srv=spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),
  "preview","--host","127.0.0.1","--port",port,"--strictPort"],{
  cwd:resolve(root,"client"),stdio:"pipe"});
let browser;
try{
  let ready=false;
  for(let i=0;i<70;i++){
    try{const response=await fetch(url);if(response.ok){ready=true;break;}}catch{}
    if(srv.exitCode!==null)break;
    await new Promise(done=>setTimeout(done,200));
  }
  assert.ok(ready,"Vite preview did not launch");
  browser=await chromium.launch({headless:true});
  for(const width of [320,390,820,1440]){
    const page=await browser.newPage({viewport:{width,height:width<500?780:900}});
    await page.goto(url,{waitUntil:"domcontentloaded"});
    const result=await page.evaluate(()=>{
      const root=document.getElementById("root")||document.body;
      const shell=document.createElement("main");
      shell.className="halieus-shell";
      shell.style.cssText="position:relative; min-height:200px; background:#050814";
      const atm=document.createElement("div");
      atm.className="halieus-game-atmosphere halieus-theme-atmosphere";
      atm.dataset.atmosphereEngine="profile";
      atm.dataset.themeAtmosphere="ps2-midnight";
      atm.dataset.atmosphereSource="theme";
      atm.setAttribute("aria-hidden","true");
      ["△","○","×","□","△","○","×","□","✦"].forEach(t=>{
        const element=document.createElement("span");
        element.textContent=t;
        atm.append(element);
      });
      shell.append(atm);
      root.append(shell);
      const extract=()=>[...atm.children].map(el=>({
        color:getComputedStyle(el).color,
        opacity:Number(getComputedStyle(el).opacity),
        pointerEvents:getComputedStyle(el).pointerEvents,
        background:getComputedStyle(el).backgroundColor,
      }));
      const midnight=extract();
      atm.dataset.themeAtmosphere="cream-soda";
      const other=extract();
      const pageOverflow=document.documentElement.scrollWidth-window.innerWidth;
      shell.remove();
      return {midnight,other,pageOverflow};
    });
    const palette=["rgb(107, 191, 132)","rgb(216, 90, 115)","rgb(49, 91, 216)","rgb(155, 121, 206)"];
    for(let i=0;i<8;i++){
      assert.equal(result.midnight[i].color,palette[i%4],"Wrong console symbol colour at "+width+"px / "+i);
      assert.equal(result.midnight[i].pointerEvents,"none","Glyphs must not block clicks");
      assert.ok(result.midnight[i].opacity<=0.21,"Console accents must remain atmospheric not foreground UI");
    }
    assert.equal(result.midnight[8].color,"rgb(121, 137, 168)","Neutral sparkle motif remains distinct");
    assert.notEqual(result.other[0].color,result.midnight[0].color,"Other themes must not inherit PS2 palette");
    assert.ok(result.pageOverflow<=8,"No portrait width overflow on glyph fixture "+width);
    console.log("PASS Emotion Midnight glyph accents at "+width+"px: 4 palette colours, inert background, other profiles preserved");
    await page.close();
  }
}finally{await browser?.close();srv.kill();}
