import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const base = "http://127.0.0.1:39566";
const processPreview = spawn(process.execPath,
  [resolve(root, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1",
    "--port", "39566", "--strictPort"],
  {cwd:resolve(root,"client"),stdio:"pipe"});
let browser;
try {
  let ready = false;
  for(let i=0;i<80;i++){
    try { const res = await fetch(base); if(res.ok){ready=true;break;} } catch {}
    if(processPreview.exitCode !== null) break;
    await new Promise(done=>setTimeout(done,200));
  }
  assert.ok(ready,"HGR production preview server did not start");
  browser=await chromium.launch({headless:true});

  for(const width of [320,360,390,820,1440]){
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
    const responses=[];
    page.on("response",response=>{
      if(response.url().includes(".woff2"))responses.push({url:response.url(),status:response.status()});
    });
    await page.goto(base,{waitUntil:"domcontentloaded"});
    const result=await page.evaluate(async()=>{
      const families=["Varela Round","Unbounded Variable","Righteous","Alata"];
      for(const family of families) await document.fonts.load('400 16px "'+family+'"');
      await document.fonts.ready;

      // A contained DOM specimen exercises the shipped CSS, not a CSS mock.
      const root=document.querySelector("#root") ?? document.body;
      const specimen=document.createElement("section");
      specimen.className="halieus-shell";
      specimen.style.cssText="width:min(290px,calc(100vw - 32px));position:relative;overflow:visible";
      specimen.innerHTML=`
        <article class="halieus-feature-copy-stage"><p>BETA PREVIEW</p><h1>Test the room before game night.</h1><span>Rooms stay separate from your normal record.</span><div class="halieus-showcase-actions"><button>Start Game</button></div><div class="halieus-showcase-status"><span>6 games ready</span></div></article>
        <section class="halieus-main"><h3>Manage your game</h3><p>Varela Round makes everyday text easier to scan.</p>
          <small class="caption">Small compact information and player status.</small>
          <button type="button">Start a game</button></section>
        <div class="mega-live-page"><div class="centre-roll-readout"><span>Waiting for player to roll</span></div>
          <div class="centre-turn-status"><strong>Waiting for the active player to roll</strong></div>
          <span class="board-space-name">Mediterranean Avenue</span></div>`;
      root.append(specimen);
      const get=(selector)=>getComputedStyle(specimen.querySelector(selector)).fontFamily;
      const heading=specimen.querySelector("h1");
      const summary=()=>{
        const computed=getComputedStyle(heading);
        return {body:getComputedStyle(document.body).fontFamily,
          heading:get("h1"),headingSize:parseFloat(computed.fontSize),
          headingClipped:heading.scrollHeight>heading.clientHeight+2,
          hMetrics:{client:heading.clientHeight,scroll:heading.scrollHeight,height:computed.height,maxHeight:computed.maxHeight,minHeight:computed.minHeight,overflow:computed.overflow,display:computed.display,webkitLineClamp:computed.webkitLineClamp,rows:getComputedStyle(heading.parentElement).gridTemplateRows},
          middle:get("h3"),caption:get(".caption"),
          game:get(".centre-roll-readout > span"),
          board:get(".board-space-name"),button:get("button"),
          xOverflow:document.documentElement.scrollWidth-window.innerWidth};
      };
      const normal=summary();
      document.documentElement.dataset.betaFont="balanced";
      const betaBalanced=summary();
      document.documentElement.dataset.betaFont="varela-round";
      const betaVarela=summary();
      document.documentElement.dataset.betaFont="unbounded";
      const betaUnbounded=summary();
      document.documentElement.removeAttribute("data-beta-font");
      specimen.remove();
      return {normal,betaBalanced,betaVarela,betaUnbounded};
    });
    for(const state of [result.normal,result.betaBalanced]){
      assert.match(state.body,/Varela Round/,JSON.stringify({width,state}));
      assert.match(state.heading,/Unbounded Variable/,JSON.stringify({width,state}));
      assert.match(state.middle,/Righteous/,JSON.stringify({width,state}));
      assert.match(state.caption,/Alata/,JSON.stringify({width,state}));
      assert.match(state.button,/Varela Round/,JSON.stringify({width,state}));
      assert.match(state.game,/Varela Round/,JSON.stringify({width,state}));
      assert.match(state.board,/Segoe UI/,JSON.stringify({width,state}));
      assert.equal(state.headingClipped,false,"Hero headline is clipped: "+JSON.stringify({width,state}));
      assert.ok(state.xOverflow<=8,"Page-level overflow: "+JSON.stringify({width,state}));
      assert.ok(state.headingSize<=(width<=360?23:width<=760?31:47),"Headline too large: "+JSON.stringify({width,state}));
    }
    assert.match(result.betaVarela.heading,/Varela Round/,"Single Varela should override mixed headline");
    assert.match(result.betaUnbounded.body,/Unbounded Variable/,"Single Unbounded should remain selectable");
    for(const family of ["varela-round","unbounded","righteous","alata"]){
      assert.ok(responses.some(res=>res.status===200&&res.url.includes(family)),"Missing local Google font asset: "+family+" "+width);
    }
    console.log("PASS HGR 4.5.5c typography "+width+"px: mixed roles, no clipped hero, preserved board labels and beta overrides");
    await page.close();
  }
} finally {
  await browser?.close();
  processPreview.kill();
}
