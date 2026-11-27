import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve,join} from "node:path";
import {build} from "esbuild";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,".."), temp=mkdtempSync(join(tmpdir(),"hgr-spar-portrait-"));
let browser;
try{
 const bundle=join(temp,"spar.js");
 await build({entryPoints:[resolve(root,"tests/fixtures/spar-portrait-real.tsx")],bundle:true,platform:"browser",format:"iife",jsx:"automatic",outfile:bundle,define:{"import.meta.env":"{}","process.env.NODE_ENV":'"production"'},loader:{".svg":"dataurl",".png":"dataurl",".webp":"dataurl",".woff2":"dataurl"},logLevel:"silent"});
 const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
 const globalCss=[...main.matchAll(/import "\.\/([^"]+\.css)";/g)].map(m=>resolve(root,"client/src",m[1])).filter(existsSync).map(p=>readFileSync(p,"utf8")).join("\n");
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 const cases=[
 // Representative CSS viewports, not fixed hardware resolution assumptions.
 {width:320,height:568,seats:8,device:"compact-phone-portrait"},
 {width:360,height:780,seats:8,next:true,device:"S23-class-portrait"},
 {width:780,height:360,seats:8,device:"S23-class-landscape"},
 {width:390,height:844,seats:2,device:"iPhone-class-portrait"},
 {width:844,height:390,seats:8,device:"iPhone-class-landscape"},
 {width:393,height:852,seats:5,seven:true,device:"iPhone-class-seven"},
 {width:852,height:393,seats:5,seven:true,device:"iPhone-class-landscape-seven"},
 {width:430,height:932,seats:8,spectator:true,device:"large-phone-spectator"},
 {width:932,height:430,seats:8,spectator:true,device:"large-phone-landscape-spectator"},
 {width:320,height:568,seats:5,seven:true,device:"compact-phone-seven"},
 {width:800,height:1280,seats:8,device:"Tab-S7-plus-class-portrait"},
 {width:1280,height:800,seats:8,device:"Tab-S7-plus-class-landscape"},
 {width:768,height:1024,seats:8,device:"iPad-class-portrait"},
 {width:1024,height:768,seats:8,device:"iPad-class-landscape"},
 {width:820,height:1180,seats:5,seven:true,device:"iPad-Air-class-portrait"},
 {width:1180,height:820,seats:5,seven:true,device:"iPad-Air-class-landscape"},
 {width:1024,height:1366,seats:8,device:"iPad-Pro-class-portrait"},
 {width:1366,height:1024,seats:8,device:"iPad-Pro-class-landscape"},
 {width:390,height:844,seats:2,phase:"bra",device:"phone-bra"},
 {width:844,height:390,seats:2,phase:"bra",device:"landscape-bra"},
 {width:1280,height:720,seats:8,device:"desktop"}
 ];
 for(const c of cases){
  const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:"reduce"});
  const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error("Spar fixture page error",JSON.stringify(c),e.message);});
  try{
   // Give the isolated component fixture a private HTTP origin for appearance storage.
   await page.route("http://hgr-fixture.test/**",route=>route.request().url()==="http://hgr-fixture.test/"?route.fulfill({contentType:"text/html",body:"<!doctype html><title>Fixture</title>"}):route.fulfill({status:503,contentType:"application/json",body:"{}"}));await page.goto("http://hgr-fixture.test/");
   await page.setContent('<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>');
   await page.addStyleTag({content:globalCss});
   await page.addStyleTag({path:join(temp,"spar.css")});
   await page.evaluate(c=>window.sparFixture={seats:c.seats,spectator:!!c.spectator,seven:!!c.seven,next:!!c.next,phase:c.phase??"playing"},c);
   await page.addScriptTag({path:bundle});
   const table=page.getByRole("region",{name:"Spar card table"});await table.waitFor({timeout:10000}).catch(e=>{throw new Error("Spar render failed "+JSON.stringify({c,errors}),{cause:e})});
   const actions=page.getByRole("button",{name:/^Actions/}), players=page.getByRole("button",{name:/^Players/}), chat=page.getByRole("button",{name:"Chat",exact:true});
   assert.equal(await page.locator(".spar-table-seat").count(),c.seats);
   assert.equal(await page.locator(".spar-card-count").count(),c.seats);
   const slots=await page.locator(".spar-table-seat").evaluateAll(els=>els.map(e=>e.dataset.ringSlot));
   assert.equal(new Set(slots).size,c.seats,"Every player has a distinct perimeter position");assert.equal(slots[0],"bottom");
   if(c.seats===8)assert.ok(slots.includes("left")&&slots.includes("right"));
   assert.equal(await page.locator(".spar-table-seat[aria-current=true]").count(),1);
   assert.match(await page.locator(".spar-table-seat[aria-current=true]").innerText(),/Turn/);
   assert.equal(await page.locator('.spar-table-seat[data-turn-order="next"]').count(),c.next?1:0);
   if(c.next)assert.match(await page.locator('.spar-table-seat[data-turn-order="next"]').innerText(),/Next/);
   assert.equal(await page.getByLabel("Clockwise play direction").count(),1);
   assert.equal(await page.locator(".spar-card-count").first().getAttribute("aria-label"),(c.seven?7:5)+" cards remaining");
   const trick=await page.locator(".spar-table-centre").boundingBox();
   for(const card of await page.locator(".spar-current-plays .spar-playing-card").all()){
    const b=await card.boundingBox();
    assert.ok(b&&b.width>=18&&b.height>=24&&b.height<=(c.seats>4?81:93)&&b.y>=trick.y-2&&b.y+b.height<=trick.y+trick.height+2&&b.x>=trick.x-2&&b.x+b.width<=trick.x+trick.width+2,JSON.stringify({c,trick,b}));
   }
   const box=await table.boundingBox(), dock=await page.locator(".hgr-card-room-dock").boundingBox(), nav=await page.locator(".spar-side-tabs").boundingBox();
   assert.ok(box.width>100&&box.height>90&&box.x>=-1&&box.x+box.width<=c.width+1,JSON.stringify({c,box,dock,nav}));
   if(c.width<c.height){assert.ok(box.y>=-1&&box.y+box.height<=dock.y+2&&nav.y>=0&&nav.y+nav.height<=c.height+1,JSON.stringify({c,box,dock,nav}));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   else {assert.ok(box.x+box.width<=dock.x+2&&box.y>=-1&&box.y+box.height<=c.height+2&&dock.x+dock.width<=c.width+2&&nav.y>=0&&nav.y+nav.height<=c.height+1,JSON.stringify({c,box,dock,nav}));}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

   if(c.spectator){assert.ok(await actions.isDisabled());assert.equal(await page.locator(".spar-hand-cards").count(),0);assert.equal(await page.locator(".spar-side-players .spar-seat").count(),c.seats);assert.equal(await page.locator(".spar-spectator-hand").count(),c.seats);}
   else {
    assert.equal(await page.locator(".spar-hand-cards .spar-playing-card").count(),c.seven?7:5);
    if(c.phase==="bra"){await page.getByRole("button",{name:/Bra!.*Begin hand/}).click();assert.deepEqual(await page.evaluate(()=>window.sparActions),["bra"]);}
    else{const legal=page.getByRole("button",{name:"Play 6 of hearts",exact:true});await legal.click();assert.deepEqual(await page.evaluate(()=>window.sparActions),["6H"]);if(!c.seven)assert.ok(await page.getByRole("button",{name:"Play 7 of spades",exact:true}).isDisabled());}
    await players.click();assert.equal(await page.locator(".spar-hand-cards").count(),0);assert.equal(await page.locator(".spar-side-players .spar-seat").count(),c.seats);
   }
   await chat.click();await page.getByRole("region",{name:"Fixture chat"}).waitFor();assert.equal(await page.locator(".spar-side-players").count(),0);assert.equal(await page.locator(".spar-hand-cards").count(),0);assert.ok(await table.isVisible());
   if(!c.spectator){await actions.click();assert.equal(await page.locator(".spar-hand-cards .spar-playing-card").count(),c.seven?7:5);}
   if(["compact-phone-portrait","S23-class-landscape","large-phone-spectator","desktop"].includes(c.device)){
    await page.getByRole("button",{name:"Game menu",exact:true}).click();const menu=page.getByRole("dialog",{name:"Game menu",exact:true});await menu.waitFor();const settingsTrigger=menu.getByRole("button",{name:"Settings",exact:true});assert.equal(await menu.locator(".halieus-display-settings").count(),0);const mb=await menu.boundingBox();assert.ok(mb&&mb.y>=-1&&mb.y+mb.height<=c.height+1);
    if(c.spectator){assert.equal(await menu.getByRole("button",{name:/Forfeit Spar|End table/}).count(),0);}
    await settingsTrigger.click();const settings=page.getByRole("dialog",{name:"Settings",exact:true});await settings.waitFor();const sb=await settings.boundingBox();assert.ok(sb&&sb.y>=-1&&sb.y+sb.height<=c.height+1);assert.equal(await settings.getByRole("group",{name:"Core styles"}).getByRole("button").count(),4);const sizes=settings.getByRole("group",{name:"Text size"});await sizes.getByRole("button",{name:"Large",exact:true}).click();assert.equal(await sizes.getByRole("button",{name:"Large",exact:true}).getAttribute("aria-pressed"),"true");await page.keyboard.press("Escape");await settings.waitFor({state:"hidden"});assert.equal(await menu.isVisible(),true);assert.equal(await settingsTrigger.evaluate(el=>document.activeElement===el),true);await settingsTrigger.click();assert.equal(await settings.getByRole("group",{name:"Text size"}).getByRole("button",{name:"Large",exact:true}).getAttribute("aria-pressed"),"true");await settings.getByRole("button",{name:"Back to game menu",exact:true}).first().click();await settings.waitFor({state:"hidden"});await menu.getByRole("button",{name:"Resume game",exact:true}).click();await menu.waitFor({state:"hidden"});assert.ok(await table.isVisible());assert.equal(await page.evaluate(()=>document.body.style.overflow),"");console.log("PASS shared menu settings and resume "+c.device);
   }
   assert.deepEqual(errors,[],"Browser runtime errors");
   console.log("PASS actual Spar room",JSON.stringify(c));
  }finally{await page.close();}
 }
}finally{await browser?.close();rmSync(temp,{recursive:true,force:true});}
