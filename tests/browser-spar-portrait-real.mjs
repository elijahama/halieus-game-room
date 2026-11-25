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
 await build({entryPoints:[resolve(root,"tests/fixtures/spar-portrait-real.tsx")],bundle:true,platform:"browser",format:"iife",jsx:"automatic",outfile:bundle,define:{"process.env.NODE_ENV":'"production"'},loader:{".svg":"dataurl",".png":"dataurl",".webp":"dataurl",".woff2":"dataurl"},logLevel:"silent"});
 const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
 const globalCss=[...main.matchAll(/import "\.\/([^"]+\.css)";/g)].map(m=>resolve(root,"client/src",m[1])).filter(existsSync).map(p=>readFileSync(p,"utf8")).join("\n");
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 const cases=[
 {width:320,height:568,seats:8},{width:360,height:740,seats:8},{width:390,height:844,seats:2},
 {width:390,height:844,seats:5,seven:true},{width:320,height:568,seats:5,seven:true},
 {width:430,height:932,seats:8,spectator:true},{width:768,height:1024,seats:8},
 {width:390,height:844,seats:2,phase:"bra"},{width:1280,height:720,seats:8}
 ];
 for(const c of cases){
  const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:"reduce"});
  try{
   await page.setContent('<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>');
   await page.addStyleTag({content:globalCss});
   await page.addStyleTag({path:join(temp,"spar.css")});
   await page.evaluate(c=>window.sparFixture={seats:c.seats,spectator:!!c.spectator,seven:!!c.seven,phase:c.phase??"playing"},c);
   await page.addScriptTag({path:bundle});
   const table=page.getByRole("region",{name:"Spar card table"});await table.waitFor();
   const actions=page.getByRole("button",{name:/^Actions/}), players=page.getByRole("button",{name:/^Players/}), chat=page.getByRole("button",{name:"Chat",exact:true});
   assert.equal(await page.locator(".spar-table-seat").count(),c.seats);
   const box=await table.boundingBox(), dock=await page.locator(".hgr-card-room-dock").boundingBox(), nav=await page.locator(".spar-side-tabs").boundingBox();
   assert.ok(box.width>100&&box.height>90&&box.x>=-1&&box.x+box.width<=c.width+1,JSON.stringify({c,box,dock,nav}));
   if(c.width<c.height){assert.ok(box.y>=-1&&box.y+box.height<=dock.y+2&&nav.y>=0&&nav.y+nav.height<=c.height+1,JSON.stringify({c,box,dock,nav}));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   if(c.spectator){assert.ok(await actions.isDisabled());assert.equal(await page.locator(".spar-hand-cards").count(),0);assert.equal(await page.locator(".spar-side-players .spar-seat").count(),c.seats);}
   else {
    assert.equal(await page.locator(".spar-hand-cards .spar-playing-card").count(),c.seven?7:5);
    if(c.phase==="bra"){await page.getByRole("button",{name:/Bra!.*Begin hand/}).click();assert.deepEqual(await page.evaluate(()=>window.sparActions),["bra"]);}
    else{const legal=page.getByRole("button",{name:"Play 6 of hearts",exact:true});await legal.click();assert.deepEqual(await page.evaluate(()=>window.sparActions),["6H"]);if(!c.seven)assert.ok(await page.getByRole("button",{name:"Play 7 of spades",exact:true}).isDisabled());}
    await players.click();assert.equal(await page.locator(".spar-hand-cards").count(),0);assert.equal(await page.locator(".spar-side-players .spar-seat").count(),c.seats);
   }
   await chat.click();await page.getByRole("region",{name:"Fixture chat"}).waitFor();assert.equal(await page.locator(".spar-side-players").count(),0);assert.equal(await page.locator(".spar-hand-cards").count(),0);assert.ok(await table.isVisible());
   if(!c.spectator){await actions.click();assert.equal(await page.locator(".spar-hand-cards .spar-playing-card").count(),c.seven?7:5);}
   console.log("PASS actual Spar room",JSON.stringify(c));
  }finally{await page.close();}
 }
}finally{await browser?.close();rmSync(temp,{recursive:true,force:true});}
