import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolve } from "node:path";
const root=resolve(import.meta.dirname,"..");
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 for(const width of [360,390,820]){
  const page=await browser.newPage({viewport:{width,height:780}});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--hgr-brand:#e6a71c;--hgr-surface:#08131f;--hgr-text:#f3f4f6;--hgr-action-ink:#151a22;--mm-surface-2:#08131f}</style></head><body><nav class="halieus-mobile-nav" aria-label="Mobile navigation"><button>Home</button><button>Games</button><button class="halieus-mobile-join-game" onclick="window.joinCount=(window.joinCount||0)+1"><span class="halieus-mobile-join-game-icon">+</span><span>Join</span></button><button>Players</button><button>Guilds</button></nav></body></html>');
  for(const p of ["client/src/index.css","client/src/styles/hgr-4.5.1.css","client/src/styles/hgr-flat-mobile-join.css"])await page.addStyleTag({path:resolve(root,p)});
  const button=page.locator(".halieus-mobile-join-game"),icon=page.locator(".halieus-mobile-join-game-icon");
  const sample=()=>button.evaluate(el=>{const a=getComputedStyle(el),b=getComputedStyle(el.querySelector(".halieus-mobile-join-game-icon"));return {buttonBackground:a.backgroundImage,buttonShadow:a.boxShadow,buttonBorder:a.borderTopWidth,buttonTransform:a.transform,iconBackground:b.backgroundImage,iconShadow:b.boxShadow,iconBorder:b.borderTopWidth,iconTransform:b.transform,before:getComputedStyle(el,"::before").content,after:getComputedStyle(el,"::after").content};});
  for(const mode of ["normal","hover","pressed"]){
   if(mode==="hover")await button.hover({force:true});
   if(mode==="pressed"){await button.dispatchEvent("pointerdown");await button.evaluate(el=>el.classList.add("is-active"));}
   const v=await sample();
   assert.equal(v.buttonBackground,"none",mode+" button must have no shiny gradient");
   assert.equal(v.buttonShadow,"none",mode+" button must have no inset/outer bevel");
   assert.equal(v.buttonBorder,"0px",mode+" button has no raised rim");
   assert.equal(v.buttonTransform,"none",mode+" button does not shift");
   assert.equal(v.iconBackground,"none",mode+" icon has no gloss");
   assert.equal(v.iconShadow,"none",mode+" icon has no glow");
   assert.equal(v.iconBorder,"0px",mode+" icon has no rim");
   assert.equal(v.iconTransform,"none",mode+" icon does not compress");
   assert(["none","normal"].includes(v.before) && ["none","normal"].includes(v.after),"No decorative Join pseudo surfaces");
  }
  await button.evaluate(el=>el.classList.remove("is-active"));
  await button.click({force:true});
  assert.equal(await page.evaluate(()=>window.joinCount),1,"Join remains actionable");
  console.log("PASS flat mobile Join "+width+"px: no gradient, shadow, emboss or active-state motion");
  await page.close();
 }
}finally{await browser?.close();}
