import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "hgr-history-browser-"));
let browser;
try {
  const bundle = join(temp, "history.js");
  await build({ entryPoints:[join(root,"tests/fixtures/game-history.tsx")], bundle:true,
    platform:"browser", format:"iife", outfile:bundle, jsx:"automatic", logLevel:"silent",
    define:{"process.env.NODE_ENV":'"production"', "import.meta.env.VITE_SERVER_URL":'""'} });
  browser = await chromium.launch({headless:true, executablePath:process.env.HGR_BROWSER_EXECUTABLE || undefined});
  const frame = {sequence:2,at:2000,turn:1,phase:"finished",activePlayerId:"seat-1",label:"Ava won",
    lastActivityId:"event-1",players:[{id:"seat-1",name:"Ava",tokenId:"car",colour:"red",position:3,cash:1500,bankrupt:false,owned:[]}],
    propertyOwners:{},developments:{},mortgages:{},pot:0,dice:null,winnerId:"seat-1"};
  const archive = {format:"hgr-game-replay",version:1,gameId:"mega-board",matchId:"match",roomCode:"ROOM",
    startedAt:1000,finishedAt:2000,players:[{id:"seat-1",name:"Ava",result:"winner"}],
    events:[{sequence:1,at:2000,turn:1,category:"roll",description:"Ava won",actorId:"seat-1"}],
    track:{kind:"mega-board-checkpoints",truncated:true,frames:[frame,{...frame,sequence:3}]}};
  for(const viewport of [{width:390,height:844},{width:820,height:900},{width:1440,height:900}]) {
    const page=await browser.newPage({viewport,acceptDownloads:true});
    let writes=0;
    await page.route("http://history.test/**", async route => {
      const url = new URL(route.request().url());
      if(route.request().method()!=="GET") writes++;
      if(url.pathname==="/game-history") return route.fulfill({json:{matches:[{id:"a".repeat(64),gameId:"mega-board",finishedAt:2000,players:archive.players,truncated:true}],nextOffset:null}});
      if(url.pathname.startsWith("/game-history/")) {
        if(url.searchParams.has("format")) return route.fulfill({body:url.searchParams.get("format")==="text"?"HGR Game Replay\nAva won":JSON.stringify(archive),contentType:"text/plain"});
        return route.fulfill({json:{archive}});
      }
      return route.fulfill({contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="root"></main></body></html>'});
    });
    await page.goto("http://history.test/");
    await page.addStyleTag({content:readFileSync(join(root,"client/src/index.css"),"utf8")});
    await page.addStyleTag({path:bundle.replace(/\.js$/,".css")});
    await page.addScriptTag({path:bundle});
    await page.getByRole("button",{name:/Game History/}).click();
    await page.getByRole("button",{name:/Mega Board/}).click();
    await page.getByText("Partial replay: earlier checkpoints are no longer retained.").waitFor();
    await page.getByRole("button",{name:"First",exact:true}).click();
    await page.getByRole("button",{name:"Next",exact:true}).click();
    await page.getByRole("button",{name:"Previous",exact:true}).click();
    await page.getByRole("button",{name:"Last",exact:true}).click();
    await page.getByRole("button",{name:"Play",exact:true}).click();
    await page.getByRole("button",{name:"Pause",exact:true}).click();
    await page.getByLabel("Playback speed").selectOption("2");
    for(const label of ["Download JSON","Download text"]) {
      const pending=page.waitForEvent("download");
      await page.getByRole("button",{name:label,exact:true}).click();
      const download=await pending;
      assert.match(download.suggestedFilename(),label.endsWith("JSON")?/\.json$/:/\.txt$/);
    }
    await page.getByText("Paste or upload a game report",{exact:true}).click();
    const dangerous = 'Mega Board report\n<script>window.reportExecuted=true</script>\nAva won';
    await page.getByLabel("Paste report",{exact:true}).fill(dangerous);
    await page.getByRole("button",{name:"Review pasted report"}).click();
    assert.equal(await page.locator("pre").textContent(),dangerous);
    assert.equal(await page.evaluate(()=>window.reportExecuted),undefined);
    await page.getByLabel("Upload .txt report").setInputFiles({name:"game-report.txt",mimeType:"text/plain",buffer:Buffer.from("Poker report\nPublic actions only")});
    await page.locator("pre").filter({hasText:"Poker report"}).waitFor();
    assert.match(await page.locator("pre").textContent(),/Poker report/);
    await page.getByLabel("Upload .txt report").setInputFiles({name:"game.html",mimeType:"text/html",buffer:Buffer.from("Not a text file")});
    await page.getByRole("alert").filter({hasText:"Choose a .txt report up to 1 MB."}).waitFor();
    assert.equal(writes,0,"Imported reports must never be posted to result or archive endpoints");
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"No horizontal overflow");
    await page.getByRole("button",{name:"Clear imported report"}).click();
    assert.equal(await page.locator("pre").count(),0);
    console.log("PASS Game History browser "+viewport.width+": match selection, playback, downloads, safe paste, TXT upload, invalid file rejection and contained layout");
    await page.close();
  }
} finally { if(browser)await browser.close(); rmSync(temp,{recursive:true,force:true}); }
