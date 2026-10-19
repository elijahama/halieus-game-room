import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,".."),port=39574,url="http://127.0.0.1:"+port;
const preview=spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),
  "preview","--host","127.0.0.1","--port",String(port),"--strictPort"],
  {cwd:resolve(root,"client"),stdio:"pipe"});
let browser;
try {
  let ready=false;
  for(let i=0;i<75;i++) {
    try {if((await fetch(url)).ok){ready=true;break;}}catch{}
    if(preview.exitCode!==null) break;
    await new Promise(done=>setTimeout(done,180));
  }
  assert.ok(ready,"Client preview unavailable");
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,430,820]) {
    const page=await browser.newPage({viewport:{width,height:width<500?780:900},hasTouch:width<500,isMobile:width<500});
    await page.goto(url,{waitUntil:"domcontentloaded"});
    const result=await page.evaluate(()=>{
      const section=document.createElement("section");
      section.className="halieus-shell";
      section.style.cssText="position:relative;width:100%;max-width:100%;box-sizing:border-box;padding:12px";
      section.innerHTML='<div class="halieus-friends-access"><form class="halieus-add-friend"><label for="handle">Add someone by their exact @handle</label><div><input id="handle" value="@player-name" placeholder="@handle" /><button type="submit" class="button-primary">Send request</button></div><small>People only appear after accepting.</small></form><div class="halieus-friend-requests"><h3>Requests for you</h3><article><span><strong>Example Player Name</strong><small>@longish-username</small></span><div><button type="button">Accept</button><button type="button">Decline</button></div></article></div></div>';
      document.body.append(section);
      const box=sel=>{const n=section.querySelector(sel);const r=n.getBoundingClientRect();return {height:r.height,width:r.width,left:r.left,right:r.right};};
      const result={
        form:box(".halieus-add-friend"),
        input:box(".halieus-add-friend input"),
        button:box(".halieus-add-friend button"),
        request:box(".halieus-friend-requests"),
        accept:box(".halieus-friend-requests button"),
        bodyOverflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
        formOverflow:section.querySelector(".halieus-add-friend").scrollWidth-section.querySelector(".halieus-add-friend").clientWidth,
      };
      section.remove();
      return result;
    });
    assert.ok(result.bodyOverflow<=8,"Page overflow at "+width+": "+JSON.stringify(result));
    assert.ok(result.formOverflow<=2,"Form internal overflow at "+width+": "+JSON.stringify(result));
    assert.ok(result.button.height>=40,"Phone add-friend tap target is undersized: "+JSON.stringify(result));
    assert.ok(result.accept.height>=36,"Friend accept tap target is undersized: "+JSON.stringify(result));
    console.log("PASS Friends portrait fields/buttons "+width+"px without horizontal overflow");
    await page.close();
  }
}finally{await browser?.close();preview.kill("SIGTERM");}
