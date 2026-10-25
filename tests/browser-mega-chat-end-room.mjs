import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {chromium} from "playwright";
const root=resolve(import.meta.dirname,"..");
const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
const files=["index.css",...Array.from(main.matchAll(/import "\.\/styles\/([^"]+\.css)";/g),m=>"styles/"+m[1])];
const css=files.map(f=>readFileSync(resolve(root,"client/src",f),"utf8")).join("\n");
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932}]){
    const page=await browser.newPage({viewport});
    try{
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><main class="lobby-shell lobby-shell-v2 poker-page mega-lobby-poker-standard" style="min-height:1600px;background:#071320;color:#fff">
      <div class="poker-lobby-shell mega-poker-lobby-shell"><article class="poker-lobby-card">
      <h2>Mega Board waiting room</h2><div style="height:800px"></div>
      <div class="poker-lobby-actions poker-lobby-actions-v2 mega-poker-lobby-actions">
       <button class="button-primary">Start game</button><button class="button-danger" type="button">End room</button>
      </div></article></div>
      <aside class="room-chat-shell is-floating"><button type="button" class="room-chat-trigger"><span class="room-chat-trigger-icon">♧</span><strong>Room</strong></button></aside>
      </main></body></html>`);
      await page.addStyleTag({content:css});
      await page.getByRole("button",{name:"End room"}).scrollIntoViewIfNeeded();
      const values=await page.evaluate(()=>{
        const end=document.querySelector(".mega-poker-lobby-actions > .button-danger");
        const chat=document.querySelector(".room-chat-shell.is-floating > .room-chat-trigger");
        const m=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
        return {end:m(end),chat:m(chat),intersects:!(end.getBoundingClientRect().right<=chat.getBoundingClientRect().left || end.getBoundingClientRect().left>=chat.getBoundingClientRect().right || end.getBoundingClientRect().bottom<=chat.getBoundingClientRect().top || end.getBoundingClientRect().top>=chat.getBoundingClientRect().bottom),h:document.documentElement.scrollHeight};
      });
      assert.ok(!values.intersects,"Chat dock obscures destructive End room: "+JSON.stringify({viewport,values}));
      assert.ok(values.end.width>=150,"End room action must retain usable width: "+JSON.stringify({viewport,values}));
      await page.getByRole("button",{name:"End room"}).click();
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main class="game-page mega-live-page"><section class="right-game-stack"><div class="turn-actions-popup-layer is-trade"><div class="turn-actions-popup"><header class="turn-actions-popup-header"><h2>Trade</h2></header><button>Send trade proposal</button></div></div></section><aside class="room-chat-shell is-floating"><button class="room-chat-trigger">Chat</button></aside></main></body></html>');
      await page.addStyleTag({content:css});
      const visibility=await page.locator(".room-chat-shell.is-floating").evaluate(el=>getComputedStyle(el).visibility);
      assert.equal(visibility,"hidden","Floating chat must not cover Trade controls");
      await page.locator(".turn-actions-popup-layer").evaluate(el=>el.remove());
      const restored=await page.locator(".room-chat-shell.is-floating").evaluate(el=>getComputedStyle(el).visibility);
      assert.equal(restored,"visible","Chat should return after panel closes");
      console.log(`PASS Mega waiting room and Trade ${viewport.width}x${viewport.height}: actions clear, floating chat resumes`);
    }finally{await page.close();}
  }
}finally{await browser.close();}
