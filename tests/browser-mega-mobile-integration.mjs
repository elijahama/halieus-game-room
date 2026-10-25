import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {resolve,join} from "node:path";
import {tmpdir} from "node:os";
import {createServer} from "node:http";
import {build} from "esbuild";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,".."),temp=mkdtempSync(join(tmpdir(),"hgr-mobile-integration-"));
const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
const css=["index.css",...Array.from(main.matchAll(/import "\.\/styles\/([^"]+\.css)";/g),m=>"styles/"+m[1])].map(p=>readFileSync(resolve(root,"client/src",p),"utf8")).join("\n");
let browser,server;
try{
 await build({entryPoints:[resolve(root,"tests/fixtures/mega-mobile-integration-real.tsx")],loader:{".svg":"dataurl",".png":"dataurl"},bundle:true,platform:"browser",format:"iife",outfile:join(temp,"bundle.js"),define:{"import.meta.env":"{}","process.env.NODE_ENV":'"production"'},plugins:[{name:"local-transport-only",setup(b){b.onResolve({filter:/network\/sockets$/},()=>({path:resolve(root,"tests/fixtures/mobile-chat-socket.ts")}));}}],logLevel:"silent"});
 server=createServer((req,res)=>{if(req.url==="/bundle.js"){res.setHeader("content-type","text/javascript");res.end(readFileSync(join(temp,"bundle.js")));}else if(req.url==="/styles.css"){res.setHeader("content-type","text/css");res.end(css);}else if(req.url?.startsWith("/accounts")){res.setHeader("content-type","application/json");res.end('{"stats":{"played":0,"wins":0,"winRate":0,"byGame":[],"recent":[]}}');}else{res.setHeader("content-type","text/html");res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="fixture"></div><script src="/bundle.js"></script>');}});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:820,height:900}]){
  const page=await browser.newPage({viewport});const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error(e.message);});
  try{
   await page.goto(url);await page.locator(".mega-poker-lobby-actions").waitFor();
   const end=page.getByRole("button",{name:"End room",exact:true});await end.scrollIntoViewIfNeeded();await end.click();assert.equal(await page.evaluate(()=>window.hgrEnded),true);
   assert.equal(await page.locator(".mega-poker-player-list .poker-player-list-card").count(),8);
   await page.getByRole("button",{name:"Start game",exact:true}).click();
   await page.getByRole("button",{name:"Open Players",exact:true}).click();
   assert.equal(await page.locator(".tablet-players-drawer .player-rail-card").count(),8);
   assert.match(await page.locator(".spectator-rail-section").innerText(),/Observer/);
   await page.locator(".tablet-players-drawer .player-rail-card").last().click();
   assert.equal(await page.evaluate(()=>window.hgrSelected),"player-7");
   for(const panel of ["Properties","Trade"]){
    await page.getByRole("button",{name:"Open "+panel,exact:true}).click();
    await page.getByRole("dialog",{name:panel,exact:true}).waitFor();
    assert.equal(await page.locator(".room-chat-shell").evaluate(e=>getComputedStyle(e).visibility),"hidden");
    if(panel==="Properties"){const buttons=page.getByRole("button",{name:/^Mortgage/});assert.ok(await buttons.count()>0);await buttons.last().click();assert.equal(await page.evaluate(()=>window.hgrMortgage),true);}
    await page.evaluate(id=>window.hgrMessage(id),panel);
    await page.getByRole("button",{name:"Close panel",exact:true}).click();
    await page.locator(".room-chat-trigger").waitFor({state:"visible"});
   }
   assert.equal(await page.locator(".room-chat-trigger b").textContent(),"2");
   await page.locator(".room-chat-trigger").click();
   assert.match(await page.locator(".room-chat-panel").innerText(),/Message Properties/);
   assert.match(await page.locator(".room-chat-panel").innerText(),/Message Trade/);
   await page.locator(".room-chat-panel input").fill("Local integration message");await page.locator(".room-chat-panel form button").click();
   assert.equal(await page.evaluate(()=>window.hgrSent),"Local integration message");
   // Cover an already open chat; unseen messages must not be cleared as read.
   await page.evaluate(()=>document.querySelector("nav button:nth-child(3)").click());
   await page.getByRole("dialog",{name:"Trade",exact:true}).waitFor();
   await page.waitForFunction(()=>document.querySelector(".room-chat-shell").getAttribute("aria-hidden")==="true"); await page.evaluate(()=>window.hgrMessage("covered")); await page.waitForFunction(()=>document.querySelector(".room-chat-trigger b")?.textContent==="1");
   assert.equal(await page.locator(".room-chat-trigger b").textContent(),"1");
   await page.getByRole("button",{name:"Close panel",exact:true}).click();
   await page.getByRole("button",{name:"Close room activity"}).click();
   await page.getByRole("button",{name:"Enter fullscreen",exact:true}).click();
   await page.waitForFunction(()=>!!document.fullscreenElement);
   await page.getByRole("button",{name:"Open Players",exact:true}).click();
   assert.equal(await page.locator(".tablet-players-backdrop").evaluate(e=>e.parentElement===document.fullscreenElement),true);
   await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>document.querySelector(".tablet-players-backdrop")?.parentElement===document.body);
   await page.setViewportSize({width:viewport.height,height:viewport.width});
   await page.getByRole("button",{name:"Close players",exact:true}).click();
   await page.getByRole("button",{name:"Open Trade",exact:true}).click();await page.getByRole("button",{name:"Close panel",exact:true}).click();
   await page.getByRole("button",{name:/Roll Dice/}).click(); assert.equal(await page.evaluate(()=>window.hgrRolled),true);
   assert.deepEqual(errors,[],"Browser runtime errors");
   console.log("PASS real Lobby/Players/Properties/Trade/chat/unread/fullscreen/rotation "+viewport.width+"x"+viewport.height);
  }finally{await page.close();}
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});}
