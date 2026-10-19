import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname,"..");
const base = "http://127.0.0.1:39565";
const choices = [
  ["unbounded","Unbounded Variable"],["righteous","Righteous"],["alata","Alata"],
  ["fredoka","Fredoka Variable"],["varela-round","Varela Round"]
];
const server = spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),
  "preview","--host","127.0.0.1","--port","39565","--strictPort"], {
    cwd:resolve(root,"client"),stdio:"pipe"
  });
let browser;
try {
  let alive=false;
  for(let i=0;i<80;i++){try{const r=await fetch(base);if(r.ok){alive=true;break}}catch{}
    if(server.exitCode!==null)break;
    await new Promise(done=>setTimeout(done,200));
  }
  assert.ok(alive,"Preview server did not start");
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,820,1440]){
    const page=await browser.newPage({viewport:{width,height:844}});
    const responses=[];
    page.on("response",r=>{if(/\.woff2(?:\?|$)/.test(r.url())) responses.push({url:r.url(),status:r.status()});});
    await page.goto(base,{waitUntil:"domcontentloaded"});
    for(const [id,family] of choices){
      const computed=await page.evaluate(async ({id,family})=>{
        document.documentElement.dataset.betaFont=id;
        await document.fonts.load('400 16px "'+family+'"');
        await document.fonts.ready;
        const span=document.createElement("span");
        span.className="board-space-name";
        span.textContent="Mediterranean Avenue";
        document.body.appendChild(span);
        const result={
          font:getComputedStyle(document.body).fontFamily,
          boardFont:getComputedStyle(span).fontFamily,
          loaded:Array.from(document.fonts).some(face=>face.family.includes(family) && face.status==="loaded"),
          overflow:document.documentElement.scrollWidth-innerWidth
        };
        span.remove();return result;
      },{id,family});
      assert.ok(computed.font.includes(family),JSON.stringify({width,id,computed}));
      assert.ok(computed.loaded,"Font is not loaded: "+JSON.stringify({width,id,computed}));
      assert.ok(!computed.boardFont.includes(family),"Board microtext replaced by preview "+id);
      assert.ok(computed.overflow<=8,"Horizontal overflow: "+JSON.stringify({width,id,computed}));
      assert.ok(responses.some(v=>v.url.includes(id.split("-")[0])&&v.status===200),"Self-hosted font absent for "+id+" at "+width);
    }
    const unbounded=await page.evaluate(()=>{
      document.documentElement.removeAttribute("data-beta-font");
      return getComputedStyle(document.documentElement).fontSize;
    });
    assert.equal(unbounded,width<=360?"14px":"15px");
    await page.close();
    console.log("PASS five self-hosted HGR fonts at "+width+"px; default Unbounded "+unbounded);
  }
}finally{
  await browser?.close();server.kill();
}
