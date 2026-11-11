import assert from "node:assert/strict";
import {build} from "esbuild";
import {chromium} from "playwright";
import {resolve} from "node:path";
import {readFile,mkdir} from "node:fs/promises";
import {eliminationMatchPlan} from "../shared/platform/fourEntrantBracket.ts";
const root=resolve(import.meta.dirname,"..");
const source=`import React,{useState,useEffect} from "react";import {createRoot}from"react-dom/client";
import{GuildTournamentBracketPanel}from"./client/src/platform/components/GuildTournamentBracketPanel";
import{GuildTiebreakerPanel}from"./client/src/platform/components/GuildTiebreakerPanel";
const guild={id:"A",canManage:true,members:[{accountId:"A1",displayName:"Player One"},{accountId:"A2",displayName:"Player Two"},{accountId:"manager",displayName:"Other Manager"}]};
const account={id:"A1",displayName:"Player One"};
function App(){const[f,setF]=useState(null);const reload=()=>fetch("/guild-fixtures").then(r=>r.json()).then(r=>setF(r.fixtures[0]));useEffect(()=>{reload();window.reloadFixture=reload;},[]);
return <><GuildTournamentBracketPanel account={account} guild={guild}/>{f&&<GuildTiebreakerPanel account={account} guild={guild} fixture={f} liveRooms={[{code:"DECIDE1",game:"mega-board",createdAt:3,spectatable:true}]} onUpdated={reload} onOpenLiveRoom={(r,intent)=>window.openedRoom={code:r.code,intent}}/>}</>;}
createRoot(document.getElementById("root")).render(<App/>);`;
const built=await build({stdin:{contents:source,loader:"tsx",resolveDir:root},bundle:true,write:false,format:"iife",jsx:"automatic",
  loader:{".css":"empty"},define:{"import.meta.env.VITE_SERVER_URL":'""'},logLevel:"silent"});
const css=(await Promise.all(["index.css","styles/hgr-design-v1.css","styles/hgr-part17.css","styles/hgr-4.5.1.css"].map(file=>readFile(resolve(root,"client/src",file),"utf8")))).join("\n");
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
  for(const width of [390,820,1440])for(const theme of ["light","dark"]){
    const page=await browser.newPage({viewport:{width,height:950},reducedMotion:"reduce"});
    const errors=[],posts=[];page.on("pageerror",e=>errors.push(e.message));
    let rows=[],fixture={id:"fixture-one",homeGuildId:"A",awayGuildId:"D",homeLineups:[["A1"],["A2"]],awayLineups:[["D1"],["D2"]],status:"completed",homeBoardWins:1,awayBoardWins:1,tiebreaker:{homeAccountId:null,awayAccountId:"D2",board:null,result:null}};
    await page.route("http://hgr.test/**",r=>r.fulfill({contentType:"text/html",body:'<html><body style="margin:0;background:#101827;color:#eef4ff;font-family:Arial"><div id="root" style="padding:16px;box-sizing:border-box;min-width:0"></div></body></html>'}));
    await page.route("**/guild-tournaments**",async route=>{
      const req=route.request();if(req.method()==="GET")return route.fulfill({json:{ok:true,tournaments:rows}});
      const url=new URL(req.url()).pathname,body=JSON.parse(req.postData()||"{}");posts.push({url,body});
      if(url==="/guild-tournaments")rows=[{id:"guild-cup",name:body.name,format:body.format,hostGuildId:"A",entrants:["A","B","C","D"],status:"registration",matches:[]}];
      else if(url.endsWith("/start")){rows[0].status="active";rows[0].startedAt=2;rows[0].matches=eliminationMatchPlan(true,rows[0].entrants,[]).map(m=>({id:m.id,round:m.round,homeGuildId:m.homeId,awayGuildId:m.awayId,status:m.homeId?"ready":"awaiting-teams",fixtureId:null,winnerGuildId:null}));}
      else throw new Error("Unexpected bracket route "+url);
      return route.fulfill({json:{ok:true,tournament:rows[0]}});
    });
    await page.route("**/guild-fixtures**",async route=>{
      const req=route.request();if(req.method()==="GET")return route.fulfill({json:{ok:true,fixtures:[fixture]}});
      const url=new URL(req.url()).pathname,body=JSON.parse(req.postData()||"{}");posts.push({url,body});
      if(url.endsWith("/nominate")){
        if(body.accountId==="A2")return route.fulfill({status:409,json:{reason:"Player eligibility changed. Refresh and retry."}});
        fixture.tiebreaker.homeAccountId=body.accountId;
      }else if(url.endsWith("/bind-room"))fixture.tiebreaker.board={roomCode:body.roomCode,roomCreatedAt:3,boardMatchId:"decider",seatAccountIds:["A1","D2"]};
      else throw new Error("Unexpected fixture route "+url);
      return route.fulfill({json:{ok:true,fixture}});
    });
    await page.goto("http://hgr.test");await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.addStyleTag({content:css});await page.addScriptTag({content:built.outputFiles[0].text});
    await page.getByLabel("Tournament name",{exact:true}).fill("November Guild Cup");
    await page.getByLabel("Guild bracket format").selectOption("four-guild-double-elimination");
    await page.getByRole("button",{name:"Create tournament",exact:true}).click();
    await page.getByRole("button",{name:"Start tournament",exact:true}).click();
    await page.getByRole("region",{name:"Grand Final reset",exact:true}).waitFor();
    assert.equal(posts[0].body.format,"four-guild-double-elimination");
    const contrast=await page.evaluate(()=>{
      const rgb=value=>value.match(/[0-9.]+/g).slice(0,3).map(Number);
      const lum=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const bg=lum(rgb(getComputedStyle(document.getElementById("root")).backgroundColor));
      return [...document.querySelectorAll(".halieus-guild-fixture-heading p,.halieus-guild-fixture-board>span,.halieus-guild-fixture-notice")].map(e=>{
        const fg=lum(rgb(getComputedStyle(e).color));return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
      });
    });assert.ok(contrast.every(r=>r>=4.5),"readable Guild text in "+theme+" theme: "+contrast);
    const decide=page.getByRole("region",{name:"Guild deciding game",exact:true});
    const nominees=decide.getByLabel("Original player for the deciding game");
    assert.deepEqual(await nominees.locator("option").allTextContents(),["Choose your player","Player One","Player Two"]);
    await nominees.selectOption("A2");await decide.getByRole("button",{name:"Nominate player"}).click();
    await decide.getByRole("alert").filter({hasText:"Player eligibility changed"}).waitFor();
    await nominees.selectOption("A1");await decide.getByRole("button",{name:"Nominate player"}).click();
    await decide.getByLabel("Deciding room code").fill("DECIDE1");
    await decide.getByRole("button",{name:"Link deciding room"}).click();
    await decide.getByText("Nominees locked",{exact:false}).waitFor();
    assert.equal(await decide.getByRole("button",{name:"Nominate player"}).count(),0);
    await decide.getByRole("button",{name:"Return to deciding game"}).click();
    assert.deepEqual(await page.evaluate(()=>window.openedRoom),{code:"DECIDE1",intent:"join"});
    await decide.getByRole("button",{name:"Watch deciding game"}).click();
    assert.deepEqual(await page.evaluate(()=>window.openedRoom),{code:"DECIDE1",intent:"watch"});
    for(const scale of [1,2]){
      await page.addStyleTag({content:"html{font-size:"+(scale*100)+"%}"});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      if(overflow)console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll("body *")].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+1).slice(0,15))));
      assert.equal(overflow,false,width+"px at "+scale+"x text");
    }
    if(width===390 && theme==="light"){await mkdir(resolve(root,"../review-screenshots"),{recursive:true});await page.addStyleTag({content:"html{font-size:100%}"});await page.screenshot({path:resolve(root,"../review-screenshots/guild-390.png"),fullPage:true});}
    fixture.tiebreaker.result={winnerGuildId:"A"};await page.evaluate(()=>window.reloadFixture());
    await decide.getByText("Your Guild won the decider.",{exact:true}).waitFor();
    assert.deepEqual(errors,[]);console.log("PASS Guild UI "+width+"px "+theme+": double bracket, original nominees, retry feedback, locked room, return/watch, decider result and 100–200% text");await page.close();
  }
}finally{await browser.close();}
