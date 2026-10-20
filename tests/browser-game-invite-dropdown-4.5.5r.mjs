import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {writeFile, rm} from "node:fs/promises";
import {resolve, join} from "node:path";
import {chromium} from "playwright";

const root=resolve(import.meta.dirname,"..");
const client=join(root,"client");
const port=39582, base="http://127.0.0.1:"+port;
const prefix="__hgr_invite_qa_"+process.pid;
const htmlFile=join(client,prefix+".html");
const appFile=join(client,prefix+".tsx");
const html='<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body><div id="app"></div><script type="module" src="/'+prefix+'.tsx"></script></body></html>';
const source=[
  'import React,{useState} from "react";',
  'import {createRoot} from "react-dom/client";',
  'import {GameInviteDropdown} from "./src/platform/components/GameInviteDropdown";',
  'import "./src/styles/hgr-4.5.5r-invitation-dropdown.css";',
  'window.__inviteEvents=[];',
  'const initial={kind:"request",key:"request:example",id:"example",sender:"Another Player",game:"ludo",gameTitle:"Ludo",createdAt:Date.now(),roomCode:null};',
  'function App(){',
  ' const [notice,setNotice]=useState(initial);',
  ' window.__setInvite=next=>setNotice(next);',
  ' const record=action=>{window.__inviteEvents.push(action);setNotice(null);};',
  ' return <><nav data-testid="bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,height:64,background:"#161f32",zIndex:3}}>Game Room navigation</nav>{notice && <GameInviteDropdown notification={notice} busy={false} error="" onAccept={()=>record("accept")} onDecline={()=>record("decline")} onLater={()=>record("later")} onOpenInbox={()=>record("inbox")} />}</>;',
  '}',
  'createRoot(document.getElementById("app")).render(<App/>);',
].join("\n");
let preview,browser;
try {
  await writeFile(htmlFile,html,"utf8");
  await writeFile(appFile,source,"utf8");
  preview=spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),
    "--host","127.0.0.1","--port",String(port),"--strictPort"],
    {cwd:client,stdio:"pipe"});
  let ready=false;
  for(let i=0;i<90;i++){
    try{if((await fetch(base+"/"+prefix+".html")).ok){ready=true;break;}}catch{}
    if(preview.exitCode!==null)break;
    await new Promise(done=>setTimeout(done,170));
  }
  assert.ok(ready,"Invitation test Vite harness did not launch");
  browser=await chromium.launch({headless:true});
  for (const [width,height] of [[320,720],[360,780],[390,844],[430,932],[820,1180],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base+"/"+prefix+".html",{waitUntil:"domcontentloaded"});
    await page.getByRole("region",{name:"Incoming game invitation"}).waitFor();
    assert.equal(await page.getByText("Another Player invited you to Ludo").isVisible(),true);
    const layout=await page.evaluate(()=>{
      const box=document.querySelector(".hgr-game-invite-dropdown").getBoundingClientRect();
      const bottom=document.querySelector('[data-testid="bottom-nav"]').getBoundingClientRect();
      const buttons=[...document.querySelectorAll(".hgr-game-invite-dropdown-actions > button")];
      return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,navTop:bottom.top,buttonHeights:buttons.map(x=>x.getBoundingClientRect().height),scrollWidth:document.documentElement.scrollWidth};
    });
    assert.ok(layout.left>=-1 && layout.right<=width+1,"Toast clipped at "+width+": "+JSON.stringify(layout));
    assert.ok(layout.bottom<layout.navTop,"Toast overlaps bottom navigation at "+width+": "+JSON.stringify(layout));
    assert.ok(layout.scrollWidth<=width+4,"Toast caused horizontal overflow at "+width);
    assert.ok(layout.buttonHeights.every(h=>h>=44),"Invite actions too small at "+width+": "+JSON.stringify(layout));
    await page.getByRole("button",{name:"Accept",exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>window.__inviteEvents),["accept"]);
    await page.evaluate(()=>window.__setInvite({
      kind:"room",key:"room:example-2",id:"example-2",sender:"Guild Mate",
      game:"mega-board",gameTitle:"Mega Board",createdAt:Date.now(),roomCode:"ABC123",
    }));
    await page.getByRole("button",{name:"Join room"}).click();
    assert.deepEqual(await page.evaluate(()=>window.__inviteEvents),["accept","accept"]);
    await page.evaluate(()=>window.__setInvite({
      kind:"request",key:"request:example-3",id:"example-3",sender:"A Friend",
      game:"poker",gameTitle:"Poker",createdAt:Date.now(),roomCode:null,
    }));
    await page.getByRole("button",{name:"Decline"}).click();
    assert.equal((await page.evaluate(()=>window.__inviteEvents)).at(-1),"decline");
    await page.evaluate(()=>window.__setInvite({
      kind:"room",key:"room:example-4",id:"example-4",sender:"A Friend",
      game:"whot",gameTitle:"WHOT",createdAt:Date.now(),roomCode:"WH0T27",
    }));
    await page.getByRole("button",{name:"Later — keep invitation in inbox"}).click();
    assert.equal((await page.evaluate(()=>window.__inviteEvents)).at(-1),"later");
    await page.evaluate(()=>window.__setInvite({
      kind:"request",key:"request:example-5",id:"example-5",sender:"Friend",
      game:"ayo",gameTitle:"Ayo",createdAt:Date.now(),roomCode:null,
    }));
    await page.getByRole("button",{name:"Inbox",exact:true}).click();
    assert.equal((await page.evaluate(()=>window.__inviteEvents)).at(-1),"inbox");
    assert.deepEqual(errors,[],"No React/JS errors at "+width);
    console.log("PASS 4.5.5r invitation dropdown at "+width+"px: accept, join, decline, later, inbox, safe area and touch targets");
    await page.close();
  }
} finally {
  await browser?.close();
  preview?.kill("SIGTERM");
  await rm(htmlFile,{force:true});
  await rm(appFile,{force:true});
}
