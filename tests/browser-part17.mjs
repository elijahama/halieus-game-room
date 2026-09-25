import { io } from "socket.io-client";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
const root=resolve(import.meta.dirname,".."); const data=await mkdtemp(resolve(tmpdir(),"hgr-part17-browser-"));
const base="http://127.0.0.1:39479";
const server=spawn(process.execPath,[resolve(root,"server/dist/server/src/index.js")],{cwd:resolve(root,"server"),env:{...process.env,PORT:"39479",SERVE_CLIENT:"true",CLIENT_ORIGINS:base,HALIEUS_DATA_DIR:data,HALIEUS_OWNER_BOOTSTRAP_FILE:resolve(data,"bootstrap.txt")},stdio:"pipe"});
let output="",browser; const sockets=[]; let serial=0;
const ack=(socket,event,payload)=>new Promise((ok,fail)=>socket.timeout(5000).emit(event,payload,(error,response)=>error?fail(error):response?.ok?ok(response):fail(Error(`${event}: ${response?.reason}`))));server.stdout.on("data",d=>output+=d);server.stderr.on("data",d=>output+=d);
try{
 for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(base+"/health")).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 const bootstrap=(await readFile(resolve(data,"bootstrap.txt"),"utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0];
 const setup=await fetch(base+"/auth/setup-owner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bootstrapCode:bootstrap,username:"validation",displayName:"Verified Player",password:"Only-local-test-450!"})}); assert.equal(setup.status,201); const cookie=setup.headers.get("set-cookie").split(";")[0];
 const connect=async(auth=false)=>{const s=io(base,{transports:["websocket"],reconnection:false,extraHeaders:auth?{Cookie:cookie}:{}});sockets.push(s);await new Promise((ok,fail)=>{s.once("connect",ok);s.once("connect_error",fail);});return s;};
 const realHost=await connect(true),realGuest=await connect();
 await ack(realHost,"connect-four:create",{code:"AWARD1",playerName:"Verified Player",bestOf:1});await ack(realGuest,"connect-four:join",{code:"AWARD1",playerName:"Other Player"});const startedAward=await ack(realHost,"connect-four:start",{code:"AWARD1"});assert.ok(!JSON.stringify(startedAward).includes("progressionIdentity"),"Private account attribution leaked to client");
 for(const[player,column]of[[realHost,0],[realGuest,1],[realHost,0],[realGuest,1],[realHost,0],[realGuest,1],[realHost,0]])await ack(player,"connect-four:drop",{code:"AWARD1",column});
 let progress;for(let i=0;i<30;i++){const result=await(await fetch(base+"/accounts/me/stats",{headers:{Cookie:cookie}})).json();progress=result.stats?.progression;if(progress?.played===1)break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(progress.played,1);assert.equal(progress.wins,1);assert.equal(progress.gamerScore,40);
 const equip=async(id)=>fetch(base+"/accounts/me/cosmetics",{method:"POST",headers:{Cookie:cookie,"Content-Type":"application/json"},body:JSON.stringify({slot:"mega-board",id})});assert.equal((await equip("tycoon-board")).status,403);assert.equal((await equip("classic-board")).status,200);
 await ack(realHost,"connect-four:create",{code:"CLOSE1",playerName:"Verified Player"});await ack(realGuest,"connect-four:join",{code:"CLOSE1",playerName:"Other Player"});await ack(realHost,"connect-four:start",{code:"CLOSE1"});await ack(realHost,"connect-four:end-game",{code:"CLOSE1"});await new Promise(r=>setTimeout(r,200));assert.equal((await(await fetch(base+"/accounts/me/stats",{headers:{Cookie:cookie}})).json()).stats.progression.played,1);

 const createdStyle=await ack(realHost,'game:create',{code:'STYLE2',playerName:'Verified Player',ranked:false});
 await ack(realHost,'game:set-board-style',{code:'STYLE2',style:'muted-tournament-board'});
 const joinedStyle=await ack(realGuest,'game:join',{code:'STYLE2',playerName:'Guest'});assert.equal(joinedStyle.room.boardStyle,'muted-tournament-board');
 await assert.rejects(ack(realGuest,'game:set-board-style',{code:'STYLE2',style:'classic-board'}));
 const startedStyle=await ack(realHost,'game:start',{code:'STYLE2'});assert.equal(startedStyle.state.boardStyle,'muted-tournament-board');
 await assert.rejects(ack(realHost,'game:set-board-style',{code:'STYLE2',style:'classic-board'}));
 const viewer=await connect();const view=await ack(viewer,'game:spectate',{code:'STYLE2',playerName:'Viewer'});assert.equal(view.state.boardStyle,'muted-tournament-board');
 realGuest.disconnect();const recovered=await connect();const recovery=await ack(recovered,'game:reconnect',{code:'STYLE2',reconnectToken:joinedStyle.reconnectToken,playerName:'Guest'});assert.equal(recovery.state.boardStyle,'muted-tournament-board');
 await ack(realHost,'game:end-room',{code:'STYLE2'});
 console.log('PASS real sockets: shared host surface, guest denial, start lock, spectator and recovery');
 realHost.disconnect();realGuest.disconnect();console.log("PASS authenticated real match: account-bound award, earned score, locked cosmetic rejection, permitted cosmetic save, host-close exclusion");
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE});
 if(process.env.HGR_SCREENSHOTS)await mkdir(process.env.HGR_SCREENSHOTS,{recursive:true});
 for(const[device,width,height]of[["desktop",1440,900],["short-desktop",1280,600],["phone",390,844],["short-phone",360,640],["tablet",820,1180]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
  await context.addInitScript(()=>{localStorage.setItem("halieus-game-room-theme","light");sessionStorage.setItem("halieus-intro-seen-v4","1");});
  const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));let signedIn=false;
  await page.route("**/auth/status",r=>r.fulfill({json:{ok:true,setupRequired:false,authenticated:signedIn,registration:"invite-only",account:signedIn?{id:"test",username:"tester",displayName:"A Long Player Name",role:"player",status:"active",avatar:"T",playerColor:"#9933ff",createdAt:0,lastLoginAt:null}:null}}));
  await page.goto(base);await page.locator(".account342-card").waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${device} auth overflow`);
  if(width>=900){const intro=await page.locator(".account342-intro").boundingBox(),form=await page.locator(".account342-card").boundingBox();assert.ok(intro.x+intro.width<=form.x+1,"desktop auth columns");}
  const open=async()=>page.locator(".halieus-theme-trigger").first().click();
  await open();await page.locator(".halieus-theme-library-launch").click();await page.locator(".halieus-theme-library-grid button").filter({hasText:"Redline"}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.themeProfile==="redline");
  assert.equal(await page.evaluate(()=>localStorage.getItem("halieus-game-room-theme")),"light","preview must not persist");
  await page.keyboard.press("Escape");await page.waitForFunction(()=>document.documentElement.dataset.theme==="light");
  await open();await page.locator(".halieus-theme-library-launch").click();await page.locator(".halieus-theme-library-grid button").filter({hasText:"Redline"}).click();await page.getByRole("button",{name:"Apply theme",exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem("halieus-game-room-theme-profile")),"redline");
  await open();await page.locator(".halieus-theme-custom-launch").click();await page.locator('input[aria-label="Primary UI colour picker"]').fill("#123456");
  await page.waitForFunction(()=>document.documentElement.dataset.theme==="custom");await page.getByRole("button",{name:"Cancel",exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==="profile");
  signedIn=true;await page.reload();await page.locator(".halieus-shell").waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${device} home overflow`);
  assert.equal(await page.locator(".modal-close-button:visible,.results-close:visible").count(),0,"Home has a stray modal close control");
  if(process.env.HGR_SCREENSHOTS)await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`${device}-part17-home.png`)});
  if(width<700){const avatar=await page.locator(".halieus-mobile-account").boundingBox();assert.ok(avatar.x>=0&&avatar.x+avatar.width<=width,"Home profile button clipped");}
  const start=page.locator(".halieus-showcase-actions button.button-primary").first();{await start.click();await page.locator(".pre-game-shell").waitFor();const box=await page.locator(".pre-game-shell").boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height+1,`${device} setup containment`);await page.keyboard.press("Escape");await page.locator(".pre-game-shell").waitFor({state:"hidden"});}
  if (!(await page.locator(".halieus-library-card").count())) await page.locator(".halieus-showcase-status button").first().click();
  const count=await page.locator(".halieus-library-card").count(); assert.equal(count,14);
  for(let i=0;i<count;i++) { await page.locator(".halieus-library-card").nth(i).click(); const shell=page.locator(".pre-game-shell"); await shell.waitFor(); assert.ok(await shell.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${device} setup ${i} overflow`); await shell.locator('button[type="submit"]').scrollIntoViewIfNeeded(); await page.keyboard.press("Escape"); await shell.waitFor({state:"hidden"}); }
  if(device!=="short-phone") for(const [game,ai] of [["poker",7],["ludo",3],["connect-four",1],["ayo",1],["dominoes",0],["word-game",0],["mega-board",3]]) {
    const prefix=game==="mega-board"?"game":game, code=`V${String(++serial).padStart(5,"0")}`;
    const host=io(base,{transports:["websocket"],reconnection:false});sockets.push(host);await new Promise((ok,fail)=>{host.once("connect",ok);host.once("connect_error",fail);});
    const created=await ack(host,`${prefix}:create`,{code,playerName:"Visual Host",aiCount:game==="dominoes"?3:0,wordGameMode:"practice"});
    if(game==="mega-board")await ack(host,"game:set-board-style",{code,style:"muted-tournament-board"});
    for(let i=0;i<ai;i++)await ack(host,`${prefix}:add-ai`,{code,difficulty:"normal"});
    await ack(host,`${prefix}:start`,{code,matchId:created.state?.matchId});host.disconnect();await new Promise(r=>setTimeout(r,150));
    await page.evaluate(({game,code,token})=>{for(const key of Object.keys(localStorage))if(key.includes("session-v"))localStorage.removeItem(key);localStorage.setItem(game==="mega-board"?"mega-board-session-v1":`halieus-${game}-session-v1`,JSON.stringify({code,reconnectToken:token,playerName:"Visual Host"}));},{game,code,token:created.reconnectToken});
    await page.goto(`${base}/${prefix}/${code}?guest=1`);
    const menu=page.locator('.halieus-game-menu-trigger, .ordering-menu-button').first();await menu.waitFor({timeout:10000}).catch(async error=>{throw Error(`${device} ${game}: ${(await page.locator("body").innerText()).slice(-1800)}; ${error.message}`)});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${device} ${game} page overflow`);
    if(game==="poker"&&width<700){const boxes=await page.locator(".poker-seat").evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));assert.equal(boxes.length,8);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(boxes[i].right<=boxes[j].x+1||boxes[j].right<=boxes[i].x+1||boxes[i].bottom<=boxes[j].y+1||boxes[j].bottom<=boxes[i].y+1,"Poker seats overlap");}
    if(game==="mega-board"){
      await page.waitForFunction(()=>document.documentElement.dataset.skinMegaBoard==='muted-tournament-board');
      const personal=await page.evaluate(()=>({profile:document.documentElement.dataset.themeProfile,text:document.documentElement.dataset.textScale}));
      assert.equal(personal.profile,'redline','Host surface must not overwrite personal theme');
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('halieus-skins-change',{detail:{interface:'classic',cards:'classic','mega-board':'tycoon-board','poker-table':'classic'}})));
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.skinMegaBoard),'muted-tournament-board','Personal cosmetic cannot overwrite shared match surface');
    }
    if(game==="ludo")assert.ok(await page.locator(".ludo-status-panel").evaluate(el=>el.scrollHeight<=el.clientHeight+1),"Ludo race status panel clips or scrolls");
    if(process.env.HGR_SCREENSHOTS)await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`${device}-${game}-live.png`),fullPage:true});
    await menu.click();const dialog=page.locator(".game-menu-modal");await dialog.waitFor();const box=await dialog.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height+1,`${device} ${game} menu off viewport`);assert.equal(await page.evaluate(()=>document.body.style.overflow),"hidden");if(game==="poker") {
      const group=dialog.getByRole("group",{name:"Text size",exact:true});const sizes=[];
      for(const size of ["Small","Standard","Large"]){await group.getByRole("button",{name:size,exact:true}).click();sizes.push(await group.getByRole("button",{name:size,exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)));}
      assert.ok(sizes[0]<sizes[1]&&sizes[1]<sizes[2],`Text scale ineffective: ${sizes}`);
      await group.getByRole("button",{name:"Standard",exact:true}).click();
      await dialog.locator(".halieus-theme-trigger").click();await page.locator(".halieus-theme-popover").waitFor();assert.ok(await page.locator(".halieus-theme-popover").evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+20));}),"Theme modal is behind game menu");await page.keyboard.press("Escape");assert.ok(await dialog.isVisible(),"Closing nested dialog closed game menu");
    }
    await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});
    console.log(`PASS ${device} ${game}: live/recovery containment and reachable centered menu`);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${device}: auth layout, theme preview/cancel/apply/custom rollback, home containment, setup dialog`);await context.close();
 }
}finally{for(const socket of sockets)socket.disconnect();await browser?.close();server.kill();await new Promise(r=>server.exitCode!==null?r():server.once("exit",r));await rm(data,{recursive:true,force:true});}
