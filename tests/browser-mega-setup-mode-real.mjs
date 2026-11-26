import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {resolve,join} from "node:path";
import {tmpdir} from "node:os";
import {createServer} from "node:http";
import {build} from "esbuild";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,".."),temp=mkdtempSync(join(tmpdir(),"hgr-setup-mode-"));
const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
const css=["index.css",...Array.from(main.matchAll(/import "\.\/styles\/([^"]+\.css)";/g),m=>"styles/"+m[1])].map(p=>readFileSync(resolve(root,"client/src",p),"utf8")).join("\n");
let browser,server;
try{
 await build({entryPoints:[resolve(root,"tests/fixtures/mega-setup-mode-real.tsx")],loader:{".svg":"dataurl",".png":"dataurl"},bundle:true,jsx:"automatic",platform:"browser",format:"iife",outfile:join(temp,"bundle.js"),define:{"import.meta.env":"{}","process.env.NODE_ENV":'"production"'},logLevel:"silent"});
 server=createServer((req,res)=>{if(req.url==="/bundle.js"){res.setHeader("content-type","text/javascript");res.end(readFileSync(join(temp,"bundle.js")));}else if(req.url==="/styles.css"){res.setHeader("content-type","text/css");res.end(css);}else if(req.url?.startsWith("/accounts")||req.url?.startsWith("/guilds")||req.url?.startsWith("/auth")){res.statusCode=503;res.end("{}");}else if(req.url==="/"||req.url?.startsWith("/?")){res.setHeader("content-type","text/html");res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="fixture"></div><script src="/bundle.js"></script>');}else{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:820,height:900},{width:1440,height:900}]){
  const page=await browser.newPage({viewport});const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
   const open=async()=>{await page.getByRole("button",{name:"Games",exact:true}).filter({visible:true}).first().click();await page.locator(".halieus-library-card").filter({has:page.getByText("Mega Board",{exact:true})}).click();return page.getByRole("dialog",{name:"Create Mega Board room"});};
   await page.goto(url);await page.locator(".halieus-home-discovery").waitFor({timeout:8000}).catch(()=>{throw Error("Home render failed: "+errors.join("; "))});let dialog=await open();let tabs=dialog.getByRole("group",{name:"Mega Board match type"});
   for(const label of ["Ranked","Blitz","Casual","Ranked"]){const button=tabs.getByRole("button",{name:new RegExp(label)});await button.click();assert.equal(await button.getAttribute("aria-pressed"),"true",label+" selects actual setup option");assert.equal(await tabs.locator('button[aria-pressed="true"]').count(),1);}
   assert.equal(await dialog.getByText("Free Parking jackpot",{exact:true}).count(),0);
   await dialog.getByRole("button",{name:"Create Mega Board room",exact:true}).click();assert.equal(await page.locator("html").getAttribute("data-created-mode"),"ranked");
   await page.goto(url+"?beta");dialog=await open();tabs=dialog.getByRole("group",{name:"Mega Board match type"});
   assert.equal(await tabs.getByRole("button",{name:/Ranked/}).getAttribute("aria-disabled"),"true");
   assert.match(await tabs.getByRole("button",{name:/Ranked/}).innerText(),/Locked/);
   await tabs.getByRole("button",{name:/Ranked/}).focus();await page.keyboard.press("Enter");assert.match(await dialog.locator(".mega-mode-picker-feedback").innerText(),/Ranked is locked/);
   assert.equal(await tabs.getByRole("button",{name:/Casual/}).getAttribute("aria-pressed"),"true");
   assert.equal(await tabs.getByRole("button",{name:/Blitz/}).getAttribute("aria-disabled"),"false");
   assert.equal(await tabs.getByRole("button",{name:/Casual/}).getAttribute("aria-disabled"),"false");
   await tabs.getByRole("button",{name:/Blitz/}).click();assert.equal(await tabs.getByRole("button",{name:/Blitz/}).getAttribute("aria-pressed"),"true");
   await dialog.getByRole("button",{name:"Create Mega Board room",exact:true}).click();assert.equal(await page.locator("html").getAttribute("data-created-mode"),"blitz");
   await dialog.getByRole("button",{name:"Exit Beta Test Lab"}).click();
   assert.equal(await tabs.getByRole("button",{name:/Ranked/}).getAttribute("aria-disabled"),"false");
   assert.deepEqual(errors,[]);console.log("PASS actual HomeScreen normal and Beta Casual/Blitz selection "+viewport.width+"x"+viewport.height);
  }finally{await page.close();}
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});}
