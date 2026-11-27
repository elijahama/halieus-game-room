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
 for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:820,height:900},{width:1097,height:500},{width:1463,height:680}]){
  const page=await browser.newPage({viewport});const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error(e.message);});
  try{
   if([320,390,1097].includes(viewport.width)){
    for(const role of ["host","guest","spectator","paused"]){await page.goto(url+"?menu="+role);const menu=page.getByRole("dialog",{name:"Game menu",exact:true});await menu.waitFor();assert.equal(await menu.getByText("FIXTURE-ONLY-KEY",{exact:true}).count(),0);assert.equal(await menu.getByRole("button",{name:/Copy Match Report/}).count(),0);assert.equal(await menu.getByRole("button",{name:/Pause match|Resume match/}).count(),role==="host"||role==="paused"?1:0);assert.equal(await menu.getByRole("button",{name:/Forfeit match/}).count(),role==="spectator"?0:1);await menu.getByRole("button",{name:"Room information",exact:true}).click();const info=page.getByRole("dialog",{name:"Room information",exact:true});await info.waitFor();assert.equal(await info.getByText("FIXTURE-ONLY-KEY",{exact:true}).count(),role==="spectator"?0:1);assert.match(await info.innerText(),/45 sec/);await page.keyboard.press("Escape");await info.waitFor({state:"hidden"});await menu.getByRole("button",{name:"Match records",exact:true}).click();const records=page.getByRole("dialog",{name:"Match records",exact:true});await records.waitFor();await records.getByRole("button",{name:/Copy Match Report/}).click();await records.getByText(/Match report copied/).waitFor();assert.equal(await page.locator("body").getAttribute("data-menu-action"),"copy");await records.getByRole("button",{name:/Export Match Report/}).click();assert.equal(await page.locator("body").getAttribute("data-menu-action"),"export");await records.getByRole("button",{name:/Recent Replay/}).click();const replay=page.getByRole("dialog",{name:"Recent Replay",exact:true});await replay.waitFor();await replay.getByRole("button",{name:"Back to game menu",exact:true}).click();await menu.waitFor();await menu.getByRole("button",{name:"Match records",exact:true}).click();await records.getByRole("button",{name:/Match History/}).click();await menu.waitFor({state:"hidden"});assert.equal(await page.locator("body").getAttribute("data-menu-action"),"history");await page.getByRole("button",{name:"Open game menu",exact:true}).click();await menu.waitFor();await menu.getByRole("button",{name:role==="paused"?/View paused board/:/Resume game/}).click();await menu.waitFor({state:"hidden"});assert.equal(await page.evaluate(()=>document.body.style.overflow),"");console.log("PASS Mega menu grouping "+role+" "+viewport.width);}
   }
   await page.goto(url);await page.locator(".mega-poker-lobby-actions").waitFor();
   const mode=page.getByRole("group",{name:"Match mode",exact:true});
   const casual=mode.getByRole("button",{name:/Casual/}),ranked=mode.getByRole("button",{name:/Ranked/}),blitz=mode.getByRole("button",{name:/Blitz/});
   assert.equal(await casual.getAttribute("aria-pressed"),"true");assert.equal(await ranked.getAttribute("aria-disabled"),"true","Ranked locked while AI remain");
   await ranked.focus();await page.keyboard.press("Enter");assert.match(await page.locator(".mega-mode-picker-feedback").innerText(),/Remove AI/);
   await blitz.click();assert.equal(await blitz.getAttribute("aria-pressed"),"true");
   await casual.click();assert.equal(await casual.getAttribute("aria-pressed"),"true");
   assert.equal(await page.locator(".mega-lobby-activity .room-chat-shell.is-embedded").count(),1);
   assert.equal(await page.locator(".room-chat-shell.is-floating").count(),0);
   const end=page.getByRole("button",{name:"End room",exact:true});await end.scrollIntoViewIfNeeded();
   if(viewport.width<=680){const start=await page.getByRole("button",{name:"Start game",exact:true}).boundingBox();const finish=await end.boundingBox();assert.ok(Math.abs(start.width-finish.width)<=1,"Host action widths match");}
   if(viewport.width>=981&&viewport.height<=780){
    const lobby=page.locator(".mega-lobby-poker-standard");const layout=await lobby.evaluate(e=>({height:e.clientHeight,content:e.scrollHeight,overflow:getComputedStyle(e).overflowY}));assert.equal(layout.overflow,"auto");
    const actions=await end.boundingBox();assert.ok(actions.x>=0&&actions.x+actions.width<=viewport.width+1&&actions.y>=0&&actions.y+actions.height<=viewport.height+1,"End room reachable at scaled viewport");
    if(layout.content>layout.height+2){await lobby.evaluate(e=>e.scrollTop=0);await lobby.hover();await page.mouse.wheel(0,600);await page.waitForFunction(()=>document.querySelector(".mega-lobby-poker-standard").scrollTop>0);}
   }
   await end.click();assert.equal(await page.evaluate(()=>window.hgrEnded),true);
   assert.equal(await page.locator(".mega-poker-player-list .poker-player-list-card").count(),8);
   await page.getByRole("button",{name:"Start game",exact:true}).click();
   await page.locator(".mega-live-page").waitFor();
   // Desktop uses its own in-flow player rail, not the tablet-only drawer.
   if(viewport.width>1180){
    await page.goto(url+"?humans");const humanRanked=page.getByRole("group",{name:"Match mode",exact:true}).getByRole("button",{name:/Ranked/});await humanRanked.click();assert.equal(await humanRanked.getAttribute("aria-pressed"),"true");
    assert.deepEqual(errors,[],"Browser runtime errors");
    console.log("PASS real desktop lobby actions, scroll, mode selection and start "+viewport.width+"x"+viewport.height);
    continue;
   }
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
   await page.setViewportSize(viewport);
   await page.goto(url+"?humans");const humanRanked=page.getByRole("group",{name:"Match mode",exact:true}).getByRole("button",{name:/Ranked/});await humanRanked.click();assert.equal(await humanRanked.getAttribute("aria-pressed"),"true");
   if(viewport.height>=viewport.width){
   await page.goto(url+"?compact=participant");await page.locator(".mega-mobile-participant-player-rail .player-rail-list").waitFor();
   const gallery=await page.locator(".mega-mobile-participant-player-rail .player-rail-list").evaluate(el=>{const cards=[...el.children];return {columns:getComputedStyle(el).gridTemplateColumns.split(" ").length,first:cards[0].getBoundingClientRect().toJSON(),second:cards[1].getBoundingClientRect().toJSON(),width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}});
   assert.equal(gallery.columns,2,JSON.stringify(gallery));assert.ok(gallery.second.x>gallery.first.x&&Math.abs(gallery.second.top-gallery.first.top)<=2,"Portrait players side by side");assert.ok(gallery.scroll<=gallery.width+1,"No horizontal overflow");
   for(const role of ["participant","spectator"])for(const theme of ["dark","light"]){
    await page.goto(url+"?compact="+role+"&portfolio=1"+(theme==="light"?"&light=1":""));
    const rail=page.locator(role==="participant"?".mega-mobile-participant-player-rail":".mega-spectator-player-rail");await rail.waitFor();
    const cards=rail.locator(".player-rail-card");assert.equal(await cards.count(),8);
    const first=cards.first(),strip=first.locator(".player-property-strip");
    assert.equal(await strip.evaluate(e=>getComputedStyle(e).display),"flex");
    assert.match(await strip.getAttribute("aria-label"),/\d+ owned/);
    assert.equal(await first.locator(".player-property-count").isVisible(),false);
    assert.equal(await first.locator(".player-property-group").first().evaluate(e=>Math.abs(e.getBoundingClientRect().left-e.parentElement.getBoundingClientRect().left)<2),true);
    for(const summary of await first.locator(".player-property-group-fold > summary").all()){await summary.click();assert.equal(await summary.evaluate(e=>e.parentElement.open),true);}
    for(const name of ["Northumberland Avenue","Marylebone Station","Knightsbridge","Water Works","Electric Company"])assert.equal(await first.getByText(name,{exact:true}).isVisible(),true,name);
    const result=await first.evaluate(e=>{const strip=e.querySelector(".player-property-strip"),sr=strip.getBoundingClientRect();const visible=[...strip.querySelectorAll(".player-property-chip")].filter(c=>c.getClientRects().length);return {groups:[...strip.querySelectorAll(".player-property-group")].every(c=>{const r=c.getBoundingClientRect();return Math.abs(r.left-sr.left)<2&&Math.abs(r.width-sr.width)<2}),chips:visible.every(c=>{const r=c.getBoundingClientRect(),n=c.querySelector(".player-property-chip-name"),nr=n.getBoundingClientRect();return r.x>=sr.x-1&&r.right<=sr.right+1&&nr.right<=r.right+1&&n.scrollWidth<=n.clientWidth+1&&nr.height<=r.height+1&&parseFloat(getComputedStyle(n).fontSize)>=10}),scroll:strip.scrollHeight,client:strip.clientHeight};});
    assert.ok(result.groups&&result.chips&&result.scroll<=result.client+2,JSON.stringify(result));
    assert.equal(await cards.nth(1).locator(".player-rail-cash").textContent(),role==="participant"?"£••••":"£2,500");
    assert.equal(await first.locator(".player-rail-cash").textContent(),"£2,500");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    console.log("PASS portrait portfolio "+role+" "+theme+" "+viewport.width);
   }
   await page.goto(url+"?compact=participant");
   await page.getByRole("button",{name:"Open Trade",exact:true}).click();const deal=page.getByRole("dialog",{name:"Trade",exact:true});await deal.waitFor();
   const bounds=await deal.boundingBox();assert.ok(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,"Portrait Trade fits viewport "+JSON.stringify({viewport,bounds}));
   const inner=deal.locator(".turn-actions-popup-scroll");assert.equal(await inner.evaluate(el=>getComputedStyle(el).overflowY),"auto");
   await page.getByRole("button",{name:"Close panel",exact:true}).click();
   }
   assert.deepEqual(errors,[],"Browser runtime errors");
   console.log("PASS real Lobby/Players/Properties/Trade/chat/unread/fullscreen/rotation "+viewport.width+"x"+viewport.height);
  }finally{await page.close();}
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});}
