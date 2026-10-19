import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {chromium} from "playwright";

const root=resolve(import.meta.dirname,"..");
const port=39615;
const url="http://127.0.0.1:"+port;
const working=await mkdtemp(join(tmpdir(),"hgr-library-layout-"));
const accountDir=join(working,"accounts");
const ownerFile=join(working,"OWNER SETUP CODE.txt");
const service=spawn(process.execPath,["dist/server/src/index.js"],{
  cwd:resolve(root,"server"),
  env:{...process.env,PORT:String(port),SERVE_CLIENT:"true",HALIEUS_ACCOUNT_DATA_DIR:accountDir,HALIEUS_OWNER_BOOTSTRAP_FILE:ownerFile},
  stdio:["ignore","pipe","pipe"]});
let output="";
service.stdout.on("data",v=>output+=v.toString());
service.stderr.on("data",v=>output+=v.toString());
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let browser;
async function api(path,{method="GET",body,cookie}={}){
  const response=await fetch(url+path,{method,headers:{
    ...(cookie?{Cookie:cookie}:{}),
    ...(body?{"Content-Type":"application/json"}:{})
  },body:body?JSON.stringify(body):undefined});
  return {status:response.status,json:await response.json(),cookie:response.headers.get("set-cookie")?.split(";")[0]};
}
async function openGames(page) {
  await page.waitForFunction(()=>[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Games"&&b.getBoundingClientRect().width>0),{timeout:12000});
  const clicked=await page.evaluate(()=>{
    const visible=b=>{const rect=b.getBoundingClientRect(),computed=getComputedStyle(b);
      return rect.width>0&&rect.height>0&&computed.visibility!=="hidden"&&computed.display!=="none";};
    const button=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Games"&&visible(b));
    if(button){button.click();return true;}return false;
  });
  assert.equal(clicked,true,"Could not open Games via actual navigation");
  await page.locator('.view-games[data-game-layout]').waitFor({state:"visible",timeout:12000});
}
async function snapshot(page) {
  return await page.evaluate(()=>{
    const root=document.querySelector(".view-games");
    const groups=[...root.querySelectorAll(".halieus-game-category")];
    const buttons=[...root.querySelectorAll(".halieus-library-card")];
    const sizes=groups.map(g=>{
      const area=g.querySelector(":scope > div");
      const rect=area.getBoundingClientRect();
      const style=getComputedStyle(area);
      return {xOverflow:Math.max(0,area.scrollWidth-area.clientWidth),
        columns:style.gridTemplateColumns,autoFlow:style.gridAutoFlow,
        items:[...area.querySelectorAll(".halieus-library-card")].map(btn=>{
          const b=btn.getBoundingClientRect();
          const css=getComputedStyle(btn);
          return {height:b.height,width:b.width,left:b.left,top:b.top,right:b.right,overflow:Math.max(0,btn.scrollWidth-btn.clientWidth),minHeight:css.minHeight};
        }),
        right:rect.right};
    });
    return {layout:root.dataset.gameLayout,count:buttons.length,groups:groups.length,
      planned:root.querySelectorAll(".halieus-future-games article").length,
      games:buttons.map(b=>b.querySelector("strong")?.textContent?.trim()||"").sort(),
      controls:[...root.querySelectorAll(".halieus-game-layout-switch button")].map(b=>({
        name:b.textContent.trim(),pressed:b.getAttribute("aria-pressed"),height:b.getBoundingClientRect().height,
      })),
      screenOverflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
      sizes};
  });
}
try{
  let ready=false;
  for(let i=0;i<140;i++){
    if(service.exitCode!==null)throw Error("Game server exited: "+output);
    try{if((await fetch(url+"/health")).ok){ready=true;break;}}catch{}
    await sleep(180);
  }
  assert.ok(ready,"Isolated HGR service unavailable: "+output);
  const bootstrap=await readFile(ownerFile,"utf8");
  const code=bootstrap.match(/OWNER-[A-Z0-9-]+/)?.[0];
  assert.ok(code,"Missing owner setup fixture");
  const result=await api("/auth/setup-owner",{method:"POST",body:{
    bootstrapCode:code,username:"owner",displayName:"Game Library QA",password:"OwnerPassword123!"},
  });
  assert.equal(result.status,201,JSON.stringify(result.json));
  const session=result.cookie;
  assert.match(session,/^halieus_session=/);

  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,430,820,1440]){
    const ctx=await browser.newContext({viewport:{width,height:width<500?844:900}});
    await ctx.addCookies([{name:"halieus_session",value:session.slice("halieus_session=".length),
      domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Lax"}]);
    await ctx.addInitScript(() => sessionStorage.setItem("halieus-intro-seen-v4","1"));
    const page=await ctx.newPage();
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await openGames(page);
    const tiles=await snapshot(page);
    assert.equal(tiles.layout,"tiles","Default presentation must stay Tiles");
    assert.equal(tiles.controls.length,2);
    assert.equal(tiles.controls[0].pressed,"true");
    assert.equal(tiles.controls[1].pressed,"false");
    assert.ok(tiles.count>=10,"Active game catalogue unexpectedly missing");
    assert.equal(tiles.groups,3,"Categories should remain intact");

    await page.locator(".halieus-game-layout-switch button").nth(1).click();
    await page.waitForFunction(()=>document.querySelector('.view-games')?.dataset.gameLayout==="list");
    const list=await snapshot(page);
    assert.equal(list.controls[1].pressed,"true");
    assert.deepEqual(list.games,tiles.games,"The toggle may not change game availability or ordering");
    assert.equal(list.groups,tiles.groups);
    assert.equal(list.planned,tiles.planned,"Roadmap remains unchanged in both views");
    if(width<=720){
      for(const shelf of tiles.sizes){
        assert.equal(shelf.autoFlow,"row","Portrait Tiles must be a two-column vertical grid");
        assert.ok(shelf.xOverflow<=6,"Portrait Tiles must not scroll sideways");
        if(shelf.items.length>=2){
          assert.ok(Math.abs(shelf.items[0].top-shelf.items[1].top)<=6,
            "Two portrait Tiles should share a row at "+width);
          assert.ok(shelf.items[0].height>=155,"Phone Tiles must retain legible full card height");
        }
      }
    }
    assert.ok(list.screenOverflow<=10,"List causes viewport x-overflow "+width+": "+JSON.stringify(list));
    for(const group of list.sizes) {
      assert.equal(group.autoFlow,"row","List must disable horizontal shelf flow at "+width);
      assert.ok(group.xOverflow<=6,"List shelf still scrolls sideways at "+width+": "+JSON.stringify(group));
      for(const card of group.items) {
        assert.ok(card.height>=74,"Game row too small to touch "+width+": "+JSON.stringify(card));
        assert.ok(card.overflow<=5,"Game row clips content at "+width+": "+JSON.stringify(card));
      }
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem("halieus-game-library-layout-v1")),"list");
    await page.locator(".halieus-library-card").first().click();
    await page.locator(".halieus-create-modal").waitFor({state:"visible",timeout:8000});
    await page.reload({waitUntil:"domcontentloaded"});
    await openGames(page);
    assert.equal((await snapshot(page)).layout,"list","List preference must survive reload at "+width);
    await page.locator(".halieus-game-layout-switch button").nth(0).click();
    assert.equal((await snapshot(page)).layout,"tiles","Switching back to Tiles must work");
    assert.equal(await page.evaluate(()=>localStorage.getItem("halieus-game-library-layout-v1")),"tiles");
    await page.locator(".halieus-library-card").first().click();
    await page.locator(".halieus-create-modal").waitFor({state:"visible",timeout:8000});
    console.log("PASS HGR 4.5.5l "+width+"px: tiles/list, 3 groups, "+tiles.count+" games, no list overflow, persisted choice, same room setup");
    await ctx.close();
  }
}finally{
  await browser?.close();
  service.kill("SIGTERM");
  await sleep(180);
  await rm(working,{recursive:true,force:true});
}
