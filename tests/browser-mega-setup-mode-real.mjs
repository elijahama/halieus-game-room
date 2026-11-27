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
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:820,height:900},{width:1440,height:900},{width:1097,height:500},{width:1463,height:680},{width:823,height:450},{width:1000,height:360}]){
  const page=await browser.newPage({viewport});const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
   const open=async()=>{await page.getByRole("button",{name:"Games",exact:true}).filter({visible:true}).first().click();await page.locator(".halieus-library-card").filter({has:page.getByText("Mega Board",{exact:true})}).click();return page.getByRole("dialog",{name:"Create Mega Board room"});};
   await page.goto(url);await page.locator(".halieus-home-discovery").waitFor({timeout:8000}).catch(()=>{throw Error("Home render failed: "+errors.join("; "))});if(viewport.width>=921&&viewport.height<=780){const rail=page.locator(".halieus-sidebar");const geometry=await rail.evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,overflow:getComputedStyle(el).overflowY}));assert.equal(geometry.overflow,"auto","Desktop navigation owns vertical overflow");if(geometry.content>geometry.height+2){await rail.hover();await page.mouse.wheel(0,600);await page.waitForFunction(()=>document.querySelector(".halieus-sidebar").scrollTop>0);}}let dialog=await open();let tabs=dialog.getByRole("group",{name:"Mega Board match type"});
   if(viewport.width>viewport.height&&viewport.height<=780){
    const rect=await dialog.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=viewport.height+1,"Scaled dialog fits viewport");
    const scroll=await dialog.evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,overflow:getComputedStyle(el).overflowY}));assert.ok(scroll.overflow==="auto"||scroll.overflow==="scroll");
    if(scroll.content>scroll.height+2){await dialog.hover();await page.mouse.wheel(0,600);await page.waitForFunction(()=>document.querySelector(".pre-game-shell").scrollTop>0);}
   }
   const appearance=dialog.locator("details.hgr-pregame-details").filter({hasText:"Board appearance"});
   assert.equal(await appearance.getAttribute("open"),null);await appearance.locator("summary").click();assert.notEqual(await appearance.getAttribute("open"),null);await appearance.locator("summary").click();
   for(const label of ["Ranked","Blitz","Casual","Ranked"]){const button=tabs.getByRole("button",{name:new RegExp(label)});await button.click();assert.equal(await button.getAttribute("aria-pressed"),"true",label+" selects actual setup option");assert.equal(await tabs.locator('button[aria-pressed="true"]').count(),1);}
   assert.match(await tabs.getByRole("button",{name:/Ranked/}).innerText(),/🏆/);
   assert.match(await tabs.getByRole("button",{name:/Blitz/}).innerText(),/⚡/);
   assert.doesNotMatch(await tabs.innerText(),/Selected|Available/);
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
   if(viewport.width===390){
    await page.goto(url);
    await page.getByRole("button",{name:"Games",exact:true}).filter({visible:true}).first().click();
    for(const [game,group,choices] of [["Poker","Poker match type",["Ranked","Casual"]],["WHOT","WHOT match type",["Ranked","Casual"]],["Ludo","Ludo match type",["Ranked","Casual"]],["Blackjack","Blackjack match type",["Ranked","Casual"]],["Ayo","Ayo match type",["Ranked","Casual"]],["Connect Four","Connect Four match type",["Ranked","Casual"]],["Hidden Dictator","Hidden Dictator match type",["Ranked","Casual"]],["Cheat","Cheat match type",["Ranked","Casual"]],["Dominoes","Dominoes match type",["Ranked","Casual"]],["Password","Password match type",["Ranked","Casual"]],["Anagrams Race","Anagrams Race match type",["Ranked","Casual"]],["Word Board","Word Board dictionary mode",["Challenge","Open / slang","Standard"]],["Word Game","Word Game puzzle type",["Practice","Daily Puzzle"]],["Spar (Cha-Cha)","Spar match mode",["Custom","Casual"]]]){
     await page.locator(".halieus-library-card").filter({has:page.getByText(game,{exact:true})}).click();
     const setup=page.getByRole("dialog",{name:"Create "+game+" room"}),groupEl=setup.getByRole("group",{name:group,exact:true});
     for(const choice of choices){const b=groupEl.getByRole("button",{name:new RegExp(choice)});await b.click();assert.equal(await b.getAttribute("aria-pressed"),"true",game+" "+choice);assert.equal(await groupEl.locator('button[aria-pressed="true"]').count(),1);}
     assert.doesNotMatch(await groupEl.innerText(),/Selected|Available/);
     if(game==="Poker"){const upcoming=setup.locator("details").filter({hasText:"Upcoming Poker variants"});assert.equal(await upcoming.getAttribute("open"),null);await upcoming.locator("summary").click();assert.equal(await upcoming.getByText("Omaha").isVisible(),true);await upcoming.locator("summary").click();}
     if(game==="Spar (Cha-Cha)"){await groupEl.getByRole("button",{name:"Custom",exact:true}).click();const optional=setup.locator("details").filter({hasText:"Optional Spar rules"});assert.equal(await optional.getAttribute("open"),null);await optional.locator("summary").click();const underTen=optional.getByRole("checkbox",{name:/Under-Ten/});await underTen.check();await optional.locator("summary").click();await optional.locator("summary").click();assert.equal(await underTen.isChecked(),true);await optional.locator("summary").click();await setup.getByRole("button",{name:"Create Spar (Cha-Cha) room",exact:true}).click();assert.equal(JSON.parse(await page.locator("html").getAttribute("data-spar-created")).custom.underTen,true);}

     if(choices.includes("Ranked"))assert.match(await groupEl.getByRole("button",{name:/Ranked/}).innerText(),/🏆/);
     if(game==="Spar (Cha-Cha)")assert.equal(await groupEl.getByRole("button",{name:/Ranked/}).getAttribute("aria-disabled"),"true");
     await setup.getByRole("button",{name:"Close room setup"}).click();console.log("PASS shared setup selector "+game);
    }
   }
   assert.deepEqual(errors,[]);console.log("PASS actual HomeScreen normal and Beta Casual/Blitz selection "+viewport.width+"x"+viewport.height);
  }finally{await page.close();}
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});}
