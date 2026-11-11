import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { soloMatchPlan } from "../shared/platform/soloTournaments.ts";
const root=resolve(import.meta.dirname,"..");
const source=`import React from "react";import {createRoot} from "react-dom/client";
import {SoloTournamentPanel} from "./client/src/platform/components/SoloTournamentPanel";
createRoot(document.getElementById("root")).render(<SoloTournamentPanel account={{id:"A",displayName:"Laijee"}}
onCreateRoom={()=>{window.createdRoom=true;}} onOpenRoom={(code,intent)=>{window.openedRoom={code,intent};}}
onOpenGuilds={()=>{window.openedGuilds=true;}}/>);`;
const built=await build({stdin:{contents:source,loader:"tsx",resolveDir:root},bundle:true,write:false,format:"iife",jsx:"automatic",
  loader:{".css":"empty"},define:{"import.meta.env.VITE_SERVER_URL":'""'},logLevel:"silent"});
const css=(await Promise.all(["index.css","styles/hgr-design-v1.css","styles/hgr-part17.css","styles/hgr-4.5.1.css","platform/components/SoloTournamentPanel.css"].map(file=>readFile(resolve(root,"client/src",file),"utf8")))).join("\n");
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
  for(const width of [390,820,1440]) {
    const page=await browser.newPage({viewport:{width,height:950},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
    let rows=[],posts=[],releaseCreate;
    await page.route("http://hgr.test/**",r=>r.fulfill({contentType:"text/html",body:'<html><body style="margin:0;background:#101827;color:#eef4ff;font-family:Arial"><div id="root" style="padding:16px;box-sizing:border-box"></div></body></html>'}));
    await page.route("**/tournaments/solo**",async route=>{
      const req=route.request();
      if(req.method()==="GET")return route.fulfill({json:{ok:true,tournament:rows,names:{B:"Player with a long display name",C:"Player C",D:"Player D"}}});
      const url=new URL(req.url()).pathname;
      const body=JSON.parse(req.postData()||"{}");posts.push({url,body});
      if(url==="/tournaments/solo"){
        await new Promise(done=>{releaseCreate=done;});
        rows=[{id:"test-tournament-id",name:body.name,format:body.format,hostAccountId:"A",
          game:"mega-board",entrantAccountIds:["A","B","C","D"],status:"registration",
          createdAt:1,updatedAt:1,startedAt:null,championAccountId:null,matches:[]}];
      }else if(url.endsWith("/seed")){
        rows[0].status="seeded";rows[0].startedAt=2;
        rows[0].matches=soloMatchPlan(rows[0].format,rows[0].entrantAccountIds,[]).map(m=>({...m,
          status:m.homeAccountId?"awaiting-room":"awaiting-opponents",roomCode:null,
          roomCreatedAt:null,boardMatchId:null,winnerAccountId:null,gameStartedAt:null,completedAt:null,
          resetApprovedAccountIds:[],resetRequestedAt:null}));
      }else if(url.endsWith("/bind-room")){
        const m=rows[0].matches.find(m=>m.id===url.split("/").at(-2));
        Object.assign(m,{status:"room-bound",roomCode:body.roomCode,roomCreatedAt:3,boardMatchId:"bound"});
      }else if(url.endsWith("/approve-prestart-reset")){
        rows[0].matches[0].resetApprovedAccountIds=["A"];rows[0].matches[0].resetRequestedAt=Date.now();
      }else if(url.endsWith("/join")) {
        return route.fulfill({status:409,json:{reason:"This Solo bracket is full."}});
      }else throw new Error("Unexpected action "+url);
      return route.fulfill({json:{ok:true,tournament:rows[0]}});
    });
    await page.goto("http://hgr.test");
    await page.addStyleTag({content:css});await page.addScriptTag({content:built.outputFiles[0].text});
    await page.getByText("No tournaments yet.",{exact:false}).waitFor();
    await page.getByLabel("Tournament name",{exact:true}).fill("November Mega Board");
    await page.getByRole("button",{name:"Create tournament",exact:true}).click();
    await page.getByText("Saving…",{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Create tournament",exact:true}).isDisabled(),true);
    for(let i=0;i<50&&!releaseCreate;i++)await new Promise(r=>setTimeout(r,20));
    assert.equal(posts.length,1);assert.equal(posts[0].body.format,"four-player-double-elimination");
    releaseCreate();
    await page.getByRole("button",{name:"Start bracket"}).click();
    await page.getByRole("region",{name:"Grand Final reset",exact:true}).waitFor();
    assert.equal(await page.locator(".hgr-solo-match").count(),7);
    const semi=page.getByRole("region",{name:"Semifinal 1",exact:true});
    await semi.getByRole("button",{name:"Create match room"}).click();
    assert.equal(await page.evaluate(()=>window.createdRoom),true);
    await semi.getByLabel("Room code",{exact:true}).fill("SOLO01");
    await semi.getByRole("button",{name:"Link room"}).click();
    await semi.getByRole("button",{name:"Return to match"}).click();
    assert.deepEqual(await page.evaluate(()=>window.openedRoom),{code:"SOLO01",intent:"join"});
    await semi.getByRole("button",{name:"Watch match"}).click();
    assert.deepEqual(await page.evaluate(()=>window.openedRoom),{code:"SOLO01",intent:"watch"});
    await semi.getByText("Lobby recovery",{exact:true}).click();
    await semi.getByRole("button",{name:"Approve lobby replacement"}).click();
    await semi.getByText("1/2 approvals",{exact:true}).waitFor();
    assert.equal(await semi.getByRole("button",{name:"Approve lobby replacement"}).isDisabled(),true);
    await page.getByLabel("Invitation ID",{exact:true}).fill("another-tournament");
    await page.getByRole("button",{name:"Join tournament",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"This Solo bracket is full."}).waitFor();
    assert.equal(await page.locator(".hgr-solo-match").count(),7,"failed invitation preserves current bracket");
    for(const scale of [1,2]) {
      await page.addStyleTag({content:`html{font-size:${scale*100}%}`});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      if(overflow) console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll("body *")].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,20))));
      assert.equal(overflow,false,width+"px at "+scale+"x text has no horizontal clipping");
    }
    if(width===390) {
      await mkdir(resolve(root,"../review-screenshots"),{recursive:true});
      await page.addStyleTag({content:"html{font-size:100%}"});
      await page.screenshot({path:resolve(root,"../review-screenshots/solo-390.png"),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    console.log("PASS Solo UI "+width+"px: player create/seed, seven-round bracket, link/return/watch, two-party recovery, truthful failure and 100–200% text");
    await page.close();
  }
} finally {await browser.close();}
