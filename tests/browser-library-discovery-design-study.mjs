import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const client = join(root, "client");
const port = 39693, base = "http://127.0.0.1:" + port;
const prefix = "__hgr_discovery_" + process.pid;
const html = join(client, prefix + ".html");
const fixture = join(client, prefix + ".tsx");
const htmlText = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/' + prefix + '.tsx"></script></body></html>';
const jsx = [
  'import React, {useState} from "react";',
  'import {createRoot} from "react-dom/client";',
  'import {GameLibrarySearchPanel} from "./src/platform/components/GameLibrarySearchPanel";',
  'import {filterGameLibrary} from "./src/platform/games/libraryDiscovery";',
  'import "./src/styles/hgr-library-discovery.css";',
  'const games=[{id:"mega-board",name:"Mega Board",subtitle:"Build Trade Dominate",category:"board"},',
  '{id:"poker",name:"Poker",subtitle:"Texas Holdem",category:"cards"},',
  '{id:"ludo",name:"Ludo",subtitle:"Race home",category:"board"},',
  '{id:"password",name:"Password",subtitle:"One hidden word",category:"social"}];',
  'function App(){const [query,setQuery]=useState("");const [category,setCategory]=useState("all");',
  'const result=filterGameLibrary(games,query,category);',
  'return <div className="view-games" style={{margin:"0 auto",maxWidth:800,padding:12}}>',
  '<GameLibrarySearchPanel query={query} category={category} count={result.length} onQueryChange={setQuery} onCategoryChange={setCategory}/>',
  '<div aria-label="Matched games">{result.map(g=><article key={g.id}>{g.name}</article>)}</div></div>}',
  'createRoot(document.getElementById("root")).render(<App/>);',
].join("\n");

let server, browser;
try {
  await writeFile(html, htmlText);
  await writeFile(fixture, jsx);
  server = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"),
    "--host","127.0.0.1","--port", String(port),"--strictPort"], {cwd:client,stdio:"pipe"});
  let ready = false;
  for (let n=0; n<100; n++) {
    try { if ((await fetch(base + "/" + prefix + ".html")).ok) {ready=true;break;} } catch {}
    if (server.exitCode !== null) break;
    await new Promise(done=>setTimeout(done,150));
  }
  assert.equal(ready,true,"Discovery Vite fixture must start");
  browser = await chromium.launch({headless:true});
  for (const width of [320,390,820,1440]) {
    const context = await browser.newContext({viewport:{width,height:800}});
    const page = await context.newPage();
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base + "/" + prefix + ".html", {waitUntil:"domcontentloaded"});
    const search = page.getByRole("searchbox",{name:"Find a game"});
    await search.waitFor();
    await page.keyboard.press("Tab");
    assert.equal(await search.evaluate(element=>element.matches(":focus-visible")),true,"Keyboard Tab must expose the visible focus state");
    assert.equal(await page.getByText("4 games found").isVisible(),true);
    await search.fill("mega");
    assert.equal(await page.getByText("1 game found").isVisible(),true);
    assert.equal(await page.getByLabel("Matched games").getByText("Mega Board").count(),1);
    await page.getByRole("button",{name:"Cards"}).click();
    assert.equal(await page.getByText("0 games found").isVisible(),true);
    assert.equal(await page.getByRole("button",{name:"Cards"}).getAttribute("aria-pressed"),"true");
    await page.getByRole("button",{name:"Clear filters"}).click();
    assert.equal(await page.getByText("4 games found").isVisible(),true);
    await page.getByRole("button",{name:"Board",exact:true}).click();
    assert.equal(await page.getByText("2 games found").isVisible(),true);
    // Focus visibility was verified before pointer interactions; :focus-visible intentionally differs for mouse focus.
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,"Filter component must not create horizontal overflow");
    assert.deepEqual(errors,[],"No component page errors");
    console.log("PASS discovery browser controls " + width + "px, search, categories, clear and focus");
    await context.close();
  }
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  await rm(html,{force:true});
  await rm(fixture,{force:true});
}
