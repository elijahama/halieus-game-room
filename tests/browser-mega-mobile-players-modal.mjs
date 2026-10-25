import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {build} from "esbuild";
import {chromium} from "playwright";

const root=resolve(import.meta.dirname,"..");
const source=readFileSync(resolve(root,"client/src/App.tsx"),"utf8");
assert.match(source,/playersDrawerOpen && createPortal\(/,"Players drawer must portal out of transformed game shell");
assert.match(source,/document\.fullscreenElement \?\? document\.body/,"Players drawer must target fullscreen when active");
const imports=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
const styles=["index.css",...Array.from(imports.matchAll(/import "\.\/styles\/([^"]+\.css)";/g),m=>"styles/"+m[1])];
const css=styles.map(p=>readFileSync(resolve(root,"client/src",p),"utf8")).join("\n");
const temp=mkdtempSync(join(tmpdir(),"hgr-players-modal-"));
let browser;
try {
  const bundle=join(temp,"players.js");
  await build({entryPoints:[resolve(root,"tests/fixtures/mega-mobile-players-modal-real.tsx")],bundle:true,platform:"browser",format:"iife",outfile:bundle,define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent"});
  browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:820,height:900}]) {
    const page=await browser.newPage({viewport});
    try {
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#07111c;color:white"><div id="fixture"></div></body></html>');
      await page.addStyleTag({content:css});
      await page.addScriptTag({path:bundle});
      const modal=page.getByRole("dialog",{name:"Players and spectators"});
      await modal.waitFor({state:"visible"});
      const rows=page.locator(".tablet-players-drawer .player-rail-card");
      assert.equal(await rows.count(),8,"All eight active seats must appear in real PlayerRail");
      const geo=await page.evaluate(()=>{
        const drawer=document.querySelector(".tablet-players-drawer");
        const list=document.querySelector(".tablet-players-drawer .player-rail-list");
        const footer=document.querySelector(".tablet-players-drawer .spectator-rail-section");
        const header=document.querySelector(".tablet-players-drawer-header");
        const chat=document.querySelector(".room-chat-shell.is-floating");
        const notice=document.querySelector(".global-game-notice");
        const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
        const d={drawer:rect(drawer),list:rect(list),footer:rect(footer),header:rect(header),
          scrollable:list.scrollHeight>list.clientHeight,chatZ:getComputedStyle(chat).zIndex,
          noticeZ:getComputedStyle(notice).zIndex,modalZ:getComputedStyle(document.querySelector(".tablet-players-backdrop")).zIndex,
          overflow:getComputedStyle(list).overflowY};
        const x=header.querySelector("button").getBoundingClientRect();
        d.headerButtonTopVisible=document.elementFromPoint(x.left+x.width/2,x.top+x.height/2)===header.querySelector("button");
        list.scrollTop=list.scrollHeight;
        d.lastSeatVisible=(()=>{
          const s=list.lastElementChild.getBoundingClientRect(),v=list.getBoundingClientRect();
          return s.bottom <= v.bottom+2 && s.top < v.bottom;
        })();
        d.footerVisible=footer.getBoundingClientRect().top>=list.getBoundingClientRect().bottom-2&&footer.getBoundingClientRect().bottom<=drawer.getBoundingClientRect().bottom+2;
        return d;
      });
      assert.ok(geo.drawer.top>=0&&geo.drawer.bottom<=viewport.height+1,JSON.stringify({viewport,geo}));
      assert.ok(geo.headerButtonTopVisible,JSON.stringify({viewport,geo}));
      assert.ok(Number(geo.modalZ)>Number(geo.noticeZ)&&Number(geo.modalZ)>Number(geo.chatZ),JSON.stringify({viewport,geo}));
      assert.ok(geo.scrollable&&geo.lastSeatVisible,JSON.stringify({viewport,geo}));
      assert.ok(geo.footerVisible,JSON.stringify({viewport,geo}));
      assert.equal(geo.overflow,"auto");
      await rows.last().click();
      assert.equal(await page.evaluate(()=>window.hgrSelected),"player-7");
      await page.getByRole("button",{name:"Close players"}).click();
      assert.equal(await page.evaluate(()=>window.hgrClosed),true);
      console.log(`PASS real 8-seat Players sheet ${viewport.width}x${viewport.height}: scroll-to-last, footer, layer, button actions`);
    } finally {await page.close();}
  }
} finally {if(browser)await browser.close();rmSync(temp,{recursive:true,force:true});}
