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
 await build({entryPoints:[resolve(root,"tests/fixtures/mega-mobile-auction-real.tsx")],bundle:true,platform:"browser",format:"iife",outfile:join(temp,"auction.js"),define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent"});
 server=createServer((req,res)=>{if(req.url==="/auction.js"){res.setHeader("content-type","text/javascript");res.end(readFileSync(join(temp,"auction.js")));}else if(req.url==="/bundle.js"){res.setHeader("content-type","text/javascript");res.end(readFileSync(join(temp,"bundle.js")));}else if(req.url==="/styles.css"){res.setHeader("content-type","text/css");res.end(css);}else if(req.url?.startsWith("/accounts")){res.setHeader("content-type","application/json");res.end('{"stats":{"played":0,"wins":0,"winRate":0,"byGame":[],"recent":[]}}');}else{res.setHeader("content-type","text/html");res.end('<!doctype html><html data-theme="dark"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="hgr-root"></div><div id="fixture"></div><script src="'+(req.url.startsWith('/auction')?'/auction.js':'/bundle.js')+'"></script>');}});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});

 for(const viewport of [{width:2048,height:1152},{width:1536,height:864},{width:1280,height:720}]) {
  for(const count of [5,8]) {
   const page=await browser.newPage({viewport});
   try {
    await page.goto(url+`/?compact=spectator&desktop=1&players=${count}`);
    const cards=page.locator('.player-rail-card');await cards.first().waitFor();
    assert.equal(await cards.count(),count);
    assert.match(await page.locator('.spectator-rail-list').innerText(),/Lagz · Bankrupt/);
    const geometry=await page.evaluate(()=>{
     const rail=document.querySelector('.mega-spectator-player-rail'),list=rail.querySelector('.player-rail-list');
     const cards=[...list.querySelectorAll('.player-rail-card')];
     const r=el=>el.getBoundingClientRect();
     return {pageCss:{display:getComputedStyle(document.querySelector(".mega-live-page")).display,height:getComputedStyle(document.querySelector(".mega-live-page")).height,position:getComputedStyle(document.querySelector(".mega-live-page")).position},rows:getComputedStyle(list).gridTemplateRows,listHeight:list.clientHeight,railBottom:r(rail).bottom,
      cards:cards.map(c=>({height:r(c).height,contentHeight:c.scrollHeight,clientHeight:c.clientHeight})),
      board:r(document.querySelector('.board-grid')).toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.ok(geometry.listHeight>=60,'Roster needs usable space: '+JSON.stringify({viewport,count,geometry}));
    assert.ok(geometry.cards.every(c=>c.height>=90&&c.contentHeight<=c.clientHeight+2),'Player cards must not clip their own content: '+JSON.stringify({viewport,count,geometry}));
    assert.equal(await page.locator(".mega-spectator-mode").evaluate(el=>getComputedStyle(el).overflowY),"auto");
    assert.ok(Math.abs(geometry.board.width-geometry.board.height)<2);
    assert.equal(geometry.overflow,false);
    await cards.last().scrollIntoViewIfNeeded();
    const lastVisible=await cards.last().evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.player-rail-list').getBoundingClientRect();return a.top<innerHeight&&a.bottom>0&&a.top<b.bottom&&a.bottom>b.top;});
    assert.ok(lastVisible,'Last player reachable by roster scrolling');
    await cards.last().focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.hgrSelected),`player-${count-1}`);
    const first=cards.first();await first.scrollIntoViewIfNeeded();
    const group=first.locator('details').first();await group.locator('summary').click();
    assert.ok(await group.getAttribute('open')!==null);
    const strip=first.locator('.player-property-strip');await strip.locator('.player-property-chip').last().scrollIntoViewIfNeeded();
    const labels=await strip.locator('.player-property-group-heading strong').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight)})));assert.ok(labels.every(l=>l.height<=l.line*2+2),'Colour groups remain readable');
    const portfolio=await strip.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY,maxHeight:getComputedStyle(el).maxHeight,bottom:el.getBoundingClientRect().bottom,last:el.lastElementChild.getBoundingClientRect().bottom}));assert.ok(portfolio.scroll<=portfolio.height+2,JSON.stringify({viewport,count,portfolio}));
    if(process.argv[2]&&viewport.width===2048&&count===5) await page.screenshot({path:process.argv[2]});
    console.log(`PASS real desktop spectator ${viewport.width}x${viewport.height}: ${count} full player cards, bankrupt spectator, scroll and grouped properties`);
   } finally {await page.close();}
  }
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});}
