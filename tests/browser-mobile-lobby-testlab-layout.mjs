import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root=resolve(import.meta.dirname,"..");
const main=readFileSync(resolve(root,"client/src/main.tsx"),"utf8");
const cssPaths=["index.css",...Array.from(main.matchAll(/import "\.\/styles\/([^"]+\.css)";/g),m=>"styles/"+m[1])];
const css=cssPaths.map(p=>readFileSync(resolve(root,"client/src",p),"utf8")).join("\n");
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:820,height:900}]) {
    const page=await browser.newPage({viewport});
    try {
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><section class="account-panel"><section class="account-admin-content-card account-test-lab"><header class="account-content-heading"><div><p class="modal-eyebrow">ADMIN BETA TESTING</p><h4>Test Lab</h4><small>Launch rooms with an isolated test identity so experiments do not count toward your normal account record.</small></div><span class="account-status-badge status-active">ACTIVE</span></header></section></section></body></html>');
      await page.addStyleTag({content:css});
      for(const label of ["ACTIVE","OFF"]) {
        await page.locator(".account-status-badge").evaluate((el,value)=>{el.textContent=value;},label);
        const m=await page.evaluate(()=>{
          const b=document.querySelector(".account-test-lab .account-status-badge"),h=document.querySelector(".account-test-lab .account-content-heading");
          const box=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
          return {badge:box(b),heading:box(h),whiteSpace:getComputedStyle(b).whiteSpace,wordBreak:getComputedStyle(b).wordBreak,text:b.textContent};
        });
        assert.equal(m.whiteSpace,"nowrap","Test Lab status must never split: "+JSON.stringify({viewport,m}));
        assert.ok(m.badge.height<=28 && m.badge.width>=27,"Badge should be horizontal: "+JSON.stringify({viewport,m}));
        assert.ok(m.badge.right<=viewport.width+1 && m.badge.left>=0,"Status badge clipped: "+JSON.stringify({viewport,m}));
        console.log(`PASS Test Lab ${viewport.width}×${viewport.height} ${label} badge stays horizontal`);
      }
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><main class="lobby-shell lobby-shell-v2 poker-page mega-lobby-poker-standard" style="background:#081522;color:white">
        <header class="poker-header mega-poker-header"><div class="poker-brand-lockup"><div><p>Halieus Game Room</p><h1>Mega Board</h1></div></div><div class="mega-poker-header-tools"><div class="poker-room-meta"><span>Room</span><span>Casual</span><span>8/8 players</span><span>45s turns</span><span>Connected</span></div><button>Back to Game Room</button></div></header>
        <section class="poker-lobby-shell mega-poker-lobby-shell"><article class="poker-lobby-card glass-card mega-poker-lobby-card"><h2>Mega Board</h2><p>Bring everyone in, choose the shared board and start when the room is ready.</p>
        <dl class="poker-settings-summary">${Array.from({length:6},(_,i)=>`<div><dt>Setting ${i}</dt><dd>Value</dd></div>`).join("")}</dl>
        <section class="poker-variant-roadmap mega-board-style-roadmap">Board appearance</section><section class="room-recovery-key-panel">Recovery key placeholder</section>
        <div class="poker-lobby-actions poker-lobby-actions-v2 mega-poker-lobby-actions"><button>Add AI player</button><button>Start game</button><button>End room</button></div></article>
        <section class="poker-player-list mega-poker-player-list">${Array.from({length:8},(_,i)=>`<article class="poker-player-list-card">Player ${i+1}</article>`).join("")}</section></section></main></body></html>`);
      await page.addStyleTag({content:css});
      const m=await page.evaluate(()=>{
        const page=document.querySelector(".mega-lobby-poker-standard");
        const header=document.querySelector(".mega-poker-header");
        const shell=document.querySelector(".mega-poker-lobby-shell");
        const roster=document.querySelector(".mega-poker-player-list");
        return {
          paddingTop:parseFloat(getComputedStyle(header).paddingTop),
          shellMargin:parseFloat(getComputedStyle(shell).marginTop),
          pageOverflowY:getComputedStyle(page).overflowY,
          pageHeight:page.getBoundingClientRect().height,
          scrollHeight:document.documentElement.scrollHeight,
          headerTop:header.getBoundingClientRect().top,
          shellTop:shell.getBoundingClientRect().top,
          rosterRight:roster.getBoundingClientRect().right,
        };
      });
      assert.ok(m.paddingTop<=15,"Mega mobile header still reserves 64px: "+JSON.stringify({viewport,m}));
      assert.ok(m.shellMargin<=16,"Lobby retains excessive gap: "+JSON.stringify({viewport,m}));
      assert.ok(m.rosterRight<=viewport.width+1,"Player roster overflow: "+JSON.stringify({viewport,m}));
      if(viewport.width<=430) assert.ok(m.scrollHeight>viewport.height,"Long lobby should be vertically scrollable: "+JSON.stringify({viewport,m}));
      console.log(`PASS Mega room ${viewport.width}×${viewport.height}: top padding=${m.paddingTop}px, lobby gap=${m.shellMargin}px`);
    } finally {await page.close();}
  }
} finally {await browser.close();}
