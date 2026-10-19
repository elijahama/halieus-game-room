import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {chromium} from "playwright";

const root=resolve(import.meta.dirname,".."),port=39573,url="http://127.0.0.1:"+port;
const preview=spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),
  "preview","--host","127.0.0.1","--port",String(port),"--strictPort"],
  {cwd:resolve(root,"client"),stdio:"pipe"});
let browser;
try {
  let ready=false;
  for(let i=0;i<75;i++){
    try { if((await fetch(url)).ok){ready=true;break;} } catch {}
    if(preview.exitCode!==null) break;
    await new Promise(done=>setTimeout(done,180));
  }
  assert.ok(ready,"Client preview did not launch");
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,430,820,1440]){
    const page=await browser.newPage({viewport:{width,height:width<500?780:900}});
    await page.goto(url,{waitUntil:"domcontentloaded"});
    const result=await page.evaluate(()=>{
      const container=document.createElement("section");
      container.style.cssText="box-sizing:border-box;width:100%;padding:12px;max-width:100vw";
      container.className="halieus-shell";
      container.innerHTML='<button class="achievement-bar" type="button" style="max-width:100%;box-sizing:border-box"><span class="achievement-bar-score"><strong>250</strong><small>Gamer Score</small></span><span class="achievement-bar-progress"><strong>Getting Settled</strong><small>3 / 5 · Complete 5 verified matches · +20 GS</small><progress value="3" max="5"></progress></span></button><section class="achievement-next"><strong>Getting Settled</strong><p>Build a small history across HGR.</p><span>Complete 5 verified matches</span></section>';
      document.body.append(container);
      const get=sel=>{const node=container.querySelector(sel),style=getComputedStyle(node);return {family:style.fontFamily,size:parseFloat(style.fontSize),weight:style.fontWeight};};
      const balanced={
        scoreLabel:get(".achievement-bar-score > small"),
        title:get(".achievement-bar-progress > strong"),
        description:get(".achievement-bar-progress > small"),
        detailTitle:get(".achievement-next > strong"),
        detailDescription:get(".achievement-next > p"),
        scrollOverflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
        barOverflow:Math.max(0,container.querySelector(".achievement-bar").scrollWidth-container.querySelector(".achievement-bar").clientWidth),
      };
      document.documentElement.dataset.betaFont="righteous";
      const betaTitle=get(".achievement-bar-progress > strong");
      document.documentElement.dataset.betaFont="balanced";
      const restored=get(".achievement-bar-progress > strong");
      delete document.documentElement.dataset.betaFont;
      container.remove();
      return {balanced,betaTitle,restored};
    });
    const a=result.balanced;
    assert.match(a.scoreLabel.family,/Alata/,"Gamer Score label must use Alata");
    assert.match(a.title.family,/Varela Round/,"Getting Settled title must use Varela Round");
    assert.match(a.description.family,/Alata/,"Achievement progress description must use Alata");
    assert.match(a.detailTitle.family,/Varela Round/,"Expanded achievement heading must match");
    assert.match(a.detailDescription.family,/Alata/,"Expanded description must match");
    assert.ok(a.title.size<=15,"Achievement title too large at "+width+": "+a.title.size);
    assert.ok(a.description.size<=11,"Description too large at "+width+": "+a.description.size);
    assert.ok(a.barOverflow<=3,"Achievement bar clips at "+width+": "+a.barOverflow);
    assert.ok(a.scrollOverflow<=12,"Achievement specimen causes page overflow at "+width+": "+a.scrollOverflow);
    assert.match(result.betaTitle.family,/Righteous/,"Single-font Beta preview must still work");
    assert.match(result.restored.family,/Varela Round/,"Balanced preview should restore achievement typography");
    console.log("PASS 4.5.5j achievement typography "+width+"px; Gamer Score Alata, title Varela, descriptions Alata, Beta unchanged");
    await page.close();
  }
} finally {
  await browser?.close();
  preview.kill("SIGTERM");
}
