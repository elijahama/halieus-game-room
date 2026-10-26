import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const root=resolve(import.meta.dirname,".."),temp=mkdtempSync(join(tmpdir(),"hgr-admin-notice-"));
let browser;
try {
 const bundle=join(temp,"notice.js");
 await build({entryPoints:[join(root,"tests/fixtures/admin-feedback-notice.tsx")],bundle:true,platform:"browser",format:"iife",outfile:bundle,jsx:"automatic",logLevel:"silent",loader:{".svg":"dataurl"},
   define:{"process.env.NODE_ENV":'"production"',"import.meta.env.VITE_SERVER_URL":'""'}});
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 for(const viewport of [{width:390,height:844},{width:820,height:900},{width:1440,height:900}]){
  const page=await browser.newPage({viewport});
  const errors=[];page.on("pageerror",e=>{errors.push(e.message); console.error(e.message);});
  let count=1;
  let entry={id:"feedback-test",submittedAt:Date.now(),source:"profile",category:"Bug",details:"The test feedback requires a reply.",gameId:null,gameName:null,roomCode:null,submitterDisplayName:"Player",submitterUsername:"player",appVersion:"4.6.1",status:"open",ownerReply:null};
  await page.route("http://feedback.test/**",async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==="/admin/feedback/notifications")return route.fulfill({json:{count,firstId:count?entry.id:null}});
   if(url.pathname==="/admin/feedback")return route.fulfill({json:{ok:true,feedback:[entry]}});
   if(url.pathname.endsWith("/reply")){
    count=0;entry={...entry,status:"answered",ownerReply:{message:"Fixed, thank you.",at:Date.now(),responderDisplayName:"Owner",responderAccountId:"owner"}};
    return route.fulfill({json:{ok:true,feedback:entry}});
   }
   if(url.pathname==="/admin/snapshot")return route.fulfill({json:{accounts:[],onlineAccountIds:[],invites:[],accessRequests:[],audit:[]}});
   if(url.pathname==="/feedback/mine")return route.fulfill({json:{feedback:[]}});
   if(url.pathname.startsWith("/accounts/"))return route.fulfill({json:{stats:null}});
   if(url.pathname.startsWith("/admin/"))return route.fulfill({json:{activeRooms:0}});
   return route.fulfill({contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="root"></main></body></html>'});
  });
  await page.goto("http://feedback.test/");
  await page.addStyleTag({content:readFileSync(join(root,"client/src/index.css"),"utf8")});
  await page.addStyleTag({path:bundle.replace(/\.js$/,".css")});
  await page.addScriptTag({path:bundle});
  const notice=page.getByLabel("Admin feedback notification");
  await notice.waitFor();
  assert.match(await notice.innerText(),/1 feedback item needs a response/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole("button",{name:"Review feedback",exact:true}).click();
  const item=page.locator("#admin-feedback-test");
  await item.waitFor({timeout:5000}).catch(async e=>{console.error(await page.locator("body").innerText());throw e;});
  assert(await page.getByRole("heading",{name:"Feedback inbox",exact:true}).isVisible());
  await item.locator("textarea").fill("Fixed, thank you.");
  await item.getByRole("button",{name:"Send reply"}).click();
  await notice.waitFor({state:"detached"});
  assert.match(await item.innerText(),/Fixed, thank you/);
  assert.equal(await item.locator("select").inputValue(),"answered");
  await page.getByRole("button",{name:"Close account panel"}).click();
  count=1;
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await notice.waitFor();
  assert.deepEqual(errors,[]);
  console.log("PASS admin feedback browser "+viewport.width+": actionable count, actual inbox deep link, reply clears notification, focus refresh and no overflow");
  await page.close();
 }
} finally {if(browser)await browser.close();rmSync(temp,{recursive:true,force:true});}
