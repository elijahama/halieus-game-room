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
 server=createServer((req,res)=>{if(req.url==="/auction.js"){res.setHeader("content-type","text/javascript");res.end(readFileSync(join(temp,"auction.js")));}else if(req.url==="/bundle.js"){res.setHeader("content-type","text/javascript");res.end(readFileSync(join(temp,"bundle.js")));}else if(req.url==="/styles.css"){res.setHeader("content-type","text/css");res.end(css);}else if(req.url?.startsWith("/accounts")){res.setHeader("content-type","application/json");res.end('{"stats":{"played":0,"wins":0,"winRate":0,"byGame":[],"recent":[]}}');}else{res.setHeader("content-type","text/html");res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="hgr-root"></div><div id="fixture"></div><script src="'+(req.url.startsWith('/auction')?'/auction.js':'/bundle.js')+'"></script>');}});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:820,height:1180}]) {
  for(const role of ['participant','spectator']) for(const count of [6,8]) {
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try {
    await page.goto(url+`/?compact=${role}&players=${count}`);
    const cards=page.locator('.player-rail-card');await cards.first().waitFor();assert.equal(await cards.count(),count);
    const geometry=await page.evaluate(()=>{
     const cards=[...document.querySelectorAll('.player-rail-card')];const rect=e=>e.getBoundingClientRect();
     const a=rect(cards[0]),b=rect(cards[1]);
     return {sameRow:Math.abs(a.top-b.top)<2,separate:a.right<=b.left,boardBottom:rect(document.querySelector('.board-frame')).bottom,railTop:rect(document.querySelector('.player-rail')).top,overflow:document.documentElement.scrollWidth>innerWidth+1,
      clipped:cards.some(c=>c.scrollWidth>c.clientWidth+1),nameWrap:getComputedStyle(cards[0].querySelector('strong')).whiteSpace};
    });
    assert.ok(geometry.sameRow&&geometry.separate,JSON.stringify({viewport,role,geometry}));
    assert.ok(geometry.boardBottom<=geometry.railTop+1,JSON.stringify(geometry));
    assert.equal(geometry.overflow,false);assert.equal(geometry.clipped,false);assert.equal(geometry.nameWrap,'normal');
    assert.ok(await page.locator('.player-property-chip-name').count()>0);
    await cards.last().focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.hgrSelected),`player-${count-1}`);
    if(role==='participant') {
     await page.getByRole('button',{name:'Open Properties',exact:true}).click();
     await page.getByRole('button',{name:/^Build •/}).and(page.locator(':not(:disabled)')).first().click();assert.equal(await page.evaluate(()=>window.hgrBuilt),true);
     await page.getByRole('button',{name:/^Mortgage/}).last().click();assert.equal(await page.evaluate(()=>window.hgrMortgage),true);
     await page.getByRole('button',{name:'Close panel',exact:true}).click();
     await page.getByRole('button',{name:'Open Trade',exact:true}).click();await page.getByRole('dialog',{name:'Trade',exact:true}).waitFor();
     await page.getByRole('button',{name:'Close panel',exact:true}).click();
     await page.getByRole('button',{name:/Roll Dice/}).click();assert.equal(await page.evaluate(()=>window.hgrRolled),true);
    }
    // Use the production routine-notice selector and compare one line to wrapped text.
    const notices=await page.evaluate(()=>{
     const el=document.querySelector('.global-game-notice');el.innerHTML='<span>Done</span>';
     const short=el.getBoundingClientRect().height;
     const span=el.firstElementChild;const style=getComputedStyle(el);
     const expected=span.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
     span.textContent='Alexandria purchased a property with an exceptionally long name. '.repeat(5);
     return {short,expected,long:el.getBoundingClientRect().height,clipped:el.scrollHeight>el.clientHeight+1};
    });
    assert.ok(Math.abs(notices.short-notices.expected)<2,JSON.stringify(notices));assert.ok(notices.long>notices.short);assert.equal(notices.clipped,false);
    if(role==='participant') {
     await page.goto(url+'/?compact=participant&debt=1');
     await page.getByRole('button',{name:'Pay £100 debt',exact:true}).click();assert.equal(await page.evaluate(()=>window.hgrDebtPaid),true);
    }
    assert.deepEqual(errors,[]);console.log(`PASS compact ${role} ${count} seats ${viewport.width}: geometry, names, property access, notices and participant actions`);
   } finally {await page.close();}
  }
 }
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:820,height:1180},{width:844,height:390}]) {
  for(const role of ['active','spectator','withdrawn']) for(const count of [6,8]) {
   const page=await browser.newPage({viewport});
   try {
    await page.goto(url+`/auction?role=${role}&players=${count}&long=1`);
    const panel=page.locator('.auction-presentation');await panel.waitFor();
    assert.equal(await page.locator('.auction-player-list > div').count(),count);
    const g=await panel.evaluate(el=>{
     const r=el.getBoundingClientRect(),list=el.querySelector('.auction-player-list');
     const last=list.lastElementChild.getBoundingClientRect();
     return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,listHeight:list.clientHeight,listScroll:list.scrollHeight,blank:list.getBoundingClientRect().bottom-last.bottom};
    });
    assert.ok(g.top>=0&&g.bottom<=viewport.height+1&&g.left>=0&&g.right<=viewport.width+1,JSON.stringify({viewport,role,g}));
    if(g.listHeight>=g.listScroll)assert.ok(g.blank<12,'Roster must not grow empty space: '+JSON.stringify(g));
    await page.locator('.auction-player-list').evaluate(el=>el.scrollTop=el.scrollHeight);
    assert.ok(await page.locator('.auction-player-list').evaluate(el=>el.lastElementChild.getBoundingClientRect().bottom<=el.getBoundingClientRect().bottom+2));
    if(role==='active') {
     await page.getByRole('button',{name:'+£10',exact:true}).click();assert.equal(await page.evaluate(()=>window.hgrAuctionActions.bid),160);
     await page.getByRole('button',{name:'Withdraw',exact:true}).click();assert.equal(await page.evaluate(()=>window.hgrAuctionActions.withdrew),true);
     assert.match(await panel.innerText(),/Bids increase only by £10, £50 or £100/);
    } else {assert.match(await panel.innerText(),role==='spectator'?/Spectating\. Waiting/:/You have withdrawn/);assert.equal(await panel.locator('button').count(),0);}
    assert.match(await panel.innerText(),/Time left/);
    console.log(`PASS intrinsic auction ${role} ${count} seats ${viewport.width}x${viewport.height}`);
   } finally {await page.close();}
  }
 }

 for(const viewport of [{width:390,height:844},{width:844,height:390}]) {
  const page=await browser.newPage({viewport});
  try {
   await page.goto(url+'/?compact=participant&auction=1');
   await page.locator('.mega-mobile-auction-layer').waitFor();
   await page.evaluate(()=>document.getElementById('fullscreen-root').requestFullscreen());
   await page.waitForFunction(()=>document.querySelector('.mega-mobile-auction-layer')?.parentElement===document.fullscreenElement);
   await page.getByRole('button',{name:'+£10',exact:true}).click();
   await page.evaluate(()=>document.exitFullscreen());
   await page.waitForFunction(()=>document.querySelector('.mega-mobile-auction-layer')?.parentElement===document.body);
   console.log('PASS real GameBoard auction fullscreen '+viewport.width+'x'+viewport.height);
  } finally {await page.close();}
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});}
