import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {writeFile,rm} from "node:fs/promises";
import {resolve,join} from "node:path";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,".."),client=join(root,"client"),port=39583,base="http://127.0.0.1:"+port;
const prefix="__hgr_message_notices_"+process.pid,htmlFile=join(client,prefix+".html"),tsxFile=join(client,prefix+".tsx");
const html='<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body><div id="app"></div><script type="module" src="/'+prefix+'.tsx"></script></body></html>';
const source=[
'import React,{useState} from "react";',
'import {createRoot} from "react-dom/client";',
'import {GuildMessageDropdown} from "./src/platform/components/GuildMessageDropdown";',
'import "./src/styles/hgr-4.5.5r-invitation-dropdown.css";',
'import "./src/styles/hgr-4.5.5s-guild-message-notices.css";',
'window.__noticeActions=[];',
'const msg={key:"guild-message:m01",id:"m01",guildId:"guild-one",guildName:"HGR Test Guild",senderAccountId:"member-2",senderDisplayName:"Player Two",preview:"Would you play Ludo tonight? Feel free to invite the others.",createdAt:Date.now()};',
'function App(){',
' const [notice,setNotice]=useState(msg);window.__restore=()=>setNotice(msg);',
' const fire=action=>{window.__noticeActions.push(action);setNotice(null);};',
' return <><nav data-testid="mobile-nav" style={{position:"fixed",bottom:0,left:0,right:0,height:64,background:"#182133"}}>HGR navigation</nav>{notice && <GuildMessageDropdown message={notice} onOpen={()=>fire("open")} onLater={()=>fire("later")} onOpenInbox={()=>fire("inbox")}/>}</>;',
'}','createRoot(document.getElementById("app")).render(<App/>);'
].join("\n");
let browser,server;
try{
  await writeFile(htmlFile,html);await writeFile(tsxFile,source);
  server=spawn(process.execPath,[resolve(root,"node_modules/vite/bin/vite.js"),
    "--host","127.0.0.1","--port",String(port),"--strictPort"],{cwd:client,stdio:"pipe"});
  let ready=false;
  for(let i=0;i<90;i++){
    try{if((await fetch(base+"/"+prefix+".html")).ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)break;
    await new Promise(done=>setTimeout(done,160));
  }
  assert.ok(ready,"Browser message fixture failed");
  browser=await chromium.launch({headless:true});
  for(const [width,height] of [[320,720],[360,780],[390,844],[430,932],[820,1180],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height}});
    const failures=[];page.on("pageerror",error=>failures.push(error.message));
    await page.goto(base+"/"+prefix+".html",{waitUntil:"domcontentloaded"});
    await page.getByRole("region",{name:"New guild message"}).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll(".hgr-game-invite-dropdown-actions > button")]
      .every(button => getComputedStyle(button).minHeight === "44px"), {timeout:10000});
    assert.equal(await page.getByText("Player Two sent a message").isVisible(),true);
    const m=await page.evaluate(()=>{
      const element=document.querySelector(".hgr-guild-message-dropdown").getBoundingClientRect();
      const nav=document.querySelector('[data-testid="mobile-nav"]').getBoundingClientRect();
      const buttons=[...document.querySelectorAll(".hgr-game-invite-dropdown-actions > button")];
      return {left:element.left,right:element.right,bottom:element.bottom,navTop:nav.top,
        buttonHeights:buttons.map(b=>b.getBoundingClientRect().height),scrollWidth:document.documentElement.scrollWidth};
    });
    assert.ok(m.left>=-1&&m.right<=width+1,"Notification overflow "+width+": "+JSON.stringify(m));
    assert.ok(m.bottom<m.navTop,"Message toast covers mobile navigation "+width);
    assert.ok(m.buttonHeights.every(h=>h>=44),"Too-small touch targets at "+width+": "+JSON.stringify(m));
    assert.ok(m.scrollWidth<=width+4);
    await page.getByRole("button",{name:"Open chat"}).click();
    assert.deepEqual(await page.evaluate(()=>window.__noticeActions),["open"]);
    await page.evaluate(()=>window.__restore());
    await page.getByRole("button",{name:"Later"}).click();
    assert.equal((await page.evaluate(()=>window.__noticeActions)).at(-1),"later");
    await page.evaluate(()=>window.__restore());
    await page.getByRole("button",{name:"Inbox",exact:true}).click();
    assert.equal((await page.evaluate(()=>window.__noticeActions)).at(-1),"inbox");
    assert.deepEqual(failures,[],"JS errors in message dropdown at "+width);
    console.log("PASS 4.5.5s guild message notice "+width+"px: chat, later, inbox, touch targets and safe area");
    await page.close();
  }
}finally{
  await browser?.close();
  server?.kill("SIGTERM");
  await rm(htmlFile,{force:true});
  await rm(tsxFile,{force:true});
}
