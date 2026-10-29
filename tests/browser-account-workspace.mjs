import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const root=resolve(import.meta.dirname,"..");
const dir=mkdtempSync(join(tmpdir(),"hgr-account-workspace-"));
let browser;
try {
  const bundle=join(dir,"account.js");
  await build({ entryPoints:[join(root,"tests/fixtures/account-workspace.tsx")],
    bundle:true,platform:"browser",format:"iife",outfile:bundle,jsx:"automatic",logLevel:"silent",
    loader:{".svg":"dataurl",".png":"dataurl",".webp":"dataurl",".jpg":"dataurl",".jpeg":"dataurl"},
    define:{"process.env.NODE_ENV":'"production"',"import.meta.env.VITE_SERVER_URL":'""'} });
  browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
  for(const width of [390,820,1280]){
    const page=await browser.newPage({viewport:{width,height:850}});
    const errors=[];
    page.on("pageerror",x=>errors.push(x.message));
    await page.route("http://account.test/**", route=>{
      const path=new URL(route.request().url()).pathname;
      if(path==="/admin/snapshot")return route.fulfill({json:{ok:true,accounts:[],invites:[],onlineAccountIds:[],accessRequests:[],audit:[]}});
      if(path==="/admin/rooms/status")return route.fulfill({json:{ok:true,activeRooms:0}});
      if(path==="/admin/feedback"||path==="/feedback/mine")return route.fulfill({json:{ok:true,feedback:[]}});
      if(path==="/accounts/me/stats")return route.fulfill({json:{ok:true,stats:null}});
      if(path.startsWith("/accounts/push/"))return route.fulfill({json:{ok:true,enabled:false,available:false,topics:[]}});
      if(path!=="/")return route.fulfill({json:{ok:true}});
      return route.fulfill({contentType:"text/html",body:'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="root"></main></body></html>'});
    });
    await page.goto("http://account.test/");
    await page.addStyleTag({path:join(root,"client/src/index.css")});
    await page.addStyleTag({path:join(root,"client/src/styles/hgr-theme.css")});
    await page.addStyleTag({path:join(root,"client/src/styles/hgr-4.5.1.css")});
    await page.addStyleTag({path:bundle.replace(/\.js$/,".css")});
    await page.addStyleTag({path:join(root,"client/src/styles/hgr-account-workspace.css")});
    await page.addScriptTag({path:bundle});
    const dialog=page.getByRole("dialog",{name:"Halieus account"});
    await dialog.waitFor();
    const personal=dialog.getByRole("tablist",{name:"Personal account sections"});
    assert.equal(await personal.getByRole("tab").count(),5,"Exactly five personal sections");
    assert.equal(await personal.getByRole("tab",{name:/Profile/}).getAttribute("aria-selected"),"true");
    assert.equal(await dialog.getByRole("heading",{name:"Your Halieus identity"}).count(),1);
    await personal.getByRole("tab",{name:/Appearance/}).click();
    await dialog.getByRole("heading",{name:"Appearance"}).first().waitFor();
    assert.equal(await dialog.getByRole("heading",{name:"Your Halieus identity"}).count(),0,"Profile form hidden on another section");
    await personal.getByRole("tab",{name:/Notifications/}).click();
    await dialog.getByRole("heading",{name:"Notifications"}).first().waitFor();
    await personal.getByRole("tab",{name:/Feedback/}).click();
    await dialog.getByRole("heading",{name:"Send feedback"}).waitFor();
    await dialog.getByRole("button",{name:"Owner settings"}).click();
    await dialog.getByRole("heading",{name:"Administration"}).waitFor();
    const ownerNav=dialog.getByRole("navigation",{name:"Owner control panel sections"});
    assert.equal(await ownerNav.getByRole("button").count(),7,"Owner routes remain available");
    assert.equal(await ownerNav.evaluate(el=>getComputedStyle(el).overflowX),"auto",
      "Owner navigation must be horizontally swipeable, not seven oversized grid rows");
    await ownerNav.getByRole("button",{name:/Rooms/}).click();
    await dialog.getByRole("heading",{name:"Rooms",exact:true}).waitFor();
    await dialog.getByRole("button",{name:"My settings"}).click();
    await personal.getByRole("tab",{name:/Profile/}).click();
    await dialog.getByRole("heading",{name:"Your Halieus identity"}).waitFor();
    const sizes=await page.evaluate(()=>({
      pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
      accountWidth:document.querySelector(".account-panel").getBoundingClientRect().width,
      scroll: getComputedStyle(document.querySelector(".account-panel-scroll")).overflowY,
      focusedTab: document.querySelector(".hgr-account-personal-nav button.is-active")?.textContent,
    }));
    assert.equal(sizes.pageOverflow,false,"No body-level horizontal overflow");
    assert(sizes.accountWidth<=width+1,"Account modal fits viewport");
    assert.equal(sizes.scroll,"auto","One scroll owner remains");
    assert.deepEqual(errors,[],"No React runtime errors");
    console.log("PASS account workspace at "+width+"px: profile, appearance, notifications, feedback, owner tabs, room actions and bounded viewport");
    await page.close();
  }
} finally {await browser?.close();rmSync(dir,{recursive:true,force:true});}
