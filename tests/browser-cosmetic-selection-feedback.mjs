import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

const root = resolve(import.meta.dirname, "..");
const source = [
  "import React from 'react';",
  "import { createRoot } from 'react-dom/client';",
  "import { SkinLibraryButton } from './client/src/platform/components/SkinLibraryButton';",
  "createRoot(document.getElementById('root')).render(<SkinLibraryButton stats={{}} betaMode={false} slots={['mega-board']} />);",
].join("\n");
const code = await build({stdin:{contents:source,loader:"tsx",resolveDir:root},bundle:true,write:false,format:"iife",jsx:"automatic",
  loader:{".svg":"dataurl"},define:{"import.meta.env.PROD":"false","import.meta.env.DEV":"false","import.meta.env.VITE_SERVER_URL":'""'},logLevel:"silent"});
const css = (await Promise.all(["index.css","styles/hgr-design-v1.css","styles/hgr-part17.css","styles/hgr-4.5.1.css"].map(
  name=>readFile(resolve(root,"client/src",name),"utf8")))).join("\n");
const defaults = {interface:"classic",cards:"classic","mega-board":"classic-board","poker-table":"classic"};
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
  for(const width of [390,1440]) {
    const page=await browser.newPage({viewport:{width,height:850},reducedMotion:"reduce"});
    const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(e.message));
    let count=0, releasePost=null, postWillFail=false;
    let delayGet=false, releaseGet=null;
    let serverPreferences={...defaults};
    await page.route("http://hgr.test/**",route=>route.fulfill({contentType:"text/html",body:'<html><body><div id="root"></div></body></html>'}));
    await page.route("**/accounts/me/cosmetics",async route=>{
      if(route.request().method()==="GET") {
        const preferences={...serverPreferences};
        if(delayGet) {
          delayGet=false;
          await new Promise(resolve=>{releaseGet=resolve;});
        }
        await route.fulfill({json:{preferences,entitlements:["classic-board","night-board"]}});
      } else {
        count++;
        const payload=JSON.parse(route.request().postData());
        await new Promise(resolve=>{releasePost=resolve;});
        if(postWillFail) {
          await route.fulfill({status:503,json:{reason:"Temporary save failure"}});
        } else {
          serverPreferences={...serverPreferences,[payload.slot]:payload.id};
          await route.fulfill({json:{preferences:serverPreferences}});
        }
      }
    });
    await page.goto("http://hgr.test");await page.addStyleTag({content:css});await page.addScriptTag({content:code.outputFiles[0].text});
    await page.getByRole("button",{name:/Board styles/}).click();
    const dialog=page.getByRole("dialog",{name:"HGR skins"});
    await dialog.waitFor();
    await dialog.locator("button").filter({hasText:"Night Board"}).first().waitFor();
    const night=dialog.locator(".halieus-skins-grid > button").filter({hasText:"Night Board"}).first();
    const classic=dialog.locator(".halieus-skins-grid > button").filter({hasText:"Classic Board"}).first();
    await night.waitFor(); await page.waitForFunction(()=>document.querySelector(".halieus-skins-grid button.is-unlocked:not(.is-active)")!=null);
    await night.click();
    await night.locator(".halieus-skin-state").getByText("Equipping…").waitFor();
    assert.equal(await night.getAttribute("aria-busy"),"true");
    assert.equal(await classic.isDisabled(),true,"other choices disabled while server save pending");
    for(let i=0; i<80 && !releasePost; i++) await new Promise(done=>setTimeout(done,20));
    assert.equal(typeof releasePost,"function","POST captured");
    assert.equal(count,1,"no duplicate requests while pending");
    releasePost();releasePost=null;
    await night.locator(".halieus-skin-state").getByText("Equipped",{exact:true}).waitFor();
    await dialog.getByRole("status").filter({hasText:"Night Board equipped."}).waitFor();
    assert.equal(await night.getAttribute("aria-busy"),"false");
    assert.equal(await night.isDisabled(),false);
    postWillFail=true;
    await classic.click();
    await classic.locator(".halieus-skin-state").getByText("Equipping…").waitFor();
    for(let i=0; i<80 && !releasePost; i++) await new Promise(done=>setTimeout(done,20));
    assert.equal(typeof releasePost,"function");
    releasePost();releasePost=null;
    await dialog.getByRole("alert").filter({hasText:"Not equipped"}).waitFor();
    assert.ok(await night.locator(".halieus-skin-state").getByText("Equipped",{exact:true}).isVisible(),"failed save did not overwrite saved selection");
    assert.equal(await classic.isDisabled(),false,"failed attempt permits retry");
    // Refresh starts first with an older snapshot, then the new save wins.
    postWillFail=false; delayGet=true;
    await dialog.getByRole("button",{name:"Refresh earned cosmetics"}).click();
    for(let i=0;i<80 && !releaseGet;i++) await new Promise(done=>setTimeout(done,20));
    assert.equal(typeof releaseGet,"function","stale GET held");
    await classic.click();
    await classic.locator(".halieus-skin-state").getByText("Equipping…").waitFor();
    for(let i=0;i<80 && !releasePost;i++) await new Promise(done=>setTimeout(done,20));
    assert.equal(typeof releasePost,"function");
    releasePost();releasePost=null;
    await classic.locator(".halieus-skin-state").getByText("Equipped",{exact:true}).waitFor();
    releaseGet();releaseGet=null;
    await dialog.getByRole("status").filter({hasText:"Unlocks require"}).waitFor();
    assert.ok(await classic.locator(".halieus-skin-state").getByText("Equipped",{exact:true}).isVisible(),
      "stale GET cannot overwrite newer server-confirmed selection");
    assert.deepEqual(jsErrors,[]);
    console.log("PASS cosmetic selection at "+width+"px: immediate pending, locked duplicate, acknowledged save, truthful failure/retry");
    await page.close();
  }
} finally {await browser.close();}
