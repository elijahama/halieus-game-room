import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { CORE_THEME_IDS, themeEntitlements, themeIsAvailable, themeUnlockProgressLabel } from "../shared/platform/themeProgression.ts";
const root=resolve(import.meta.dirname,"..");
const read=relative=>readFile(resolve(root,relative),"utf8");
const base={gamerScore:0,played:0,awards:[],activePlayMs:0,wins:0,byGame:{}};
const prior={...base,gamerScore:39},earned={...base,gamerScore:50};
assert(!themeEntitlements(prior).includes("black-drive"));
assert(themeEntitlements(earned).includes("black-drive"),"Score 50 unlocks Black Drive.");
assert(themeIsAvailable("black-drive",themeEntitlements(earned),false));
assert(!themeEntitlements(earned).includes("grey-disc"),"Completed games have an independent condition.");
assert(!themeEntitlements(earned).includes("cube-indigo"),"Achievements cannot be faked by score.");
assert(themeEntitlements({...earned,played:5}).includes("grey-disc"));
assert(themeEntitlements({...earned,awards:[{id:"five-games"}]}).includes("cube-indigo"));
assert.equal(themeUnlockProgressLabel("black-drive",{authenticated:true,gamerScore:50,verifiedGames:1,achievementIds:[]}),"50/50 Gamer Score");
assert.equal(themeUnlockProgressLabel("grey-disc",{authenticated:true,gamerScore:50,verifiedGames:2,achievementIds:[]}),"2/5 verified matches");
assert.match(themeUnlockProgressLabel("cube-indigo",{authenticated:true,gamerScore:500,verifiedGames:4,achievementIds:[]}),/Complete matches/);
assert.equal(themeUnlockProgressLabel("black-drive",{authenticated:false,gamerScore:null,verifiedGames:null,achievementIds:[]}),"Sign in to check earned themes");
assert.equal(themeUnlockProgressLabel("black-drive",null),"Checking earned themes…");

const accounts=await read("server/src/platform/accounts.ts"),ui=await read("client/src/platform/components/ThemeButton.tsx");
assert.match(accounts,/const progression = auth \? await readPlayerProgression\(auth.account.id\) : null/);
assert.match(accounts,/const entitlements = progression \? themeEntitlements\(progression\) : CORE_THEME_IDS/);
assert.match(accounts,/gamerScore: progression\?\.gamerScore \?\? null/);
assert.match(accounts,/verifiedGames: progression\?\.played \?\? null/);
assert.match(accounts,/achievementIds: progression\?\.awards\.map/);
assert.match(accounts,/Cache-Control", "private, no-store"/);
assert.match(accounts,/const entitlements = themeEntitlements\(await readPlayerProgression\(auth.account.id\)\)/,"POST must independently recheck entitlements.");
assert.match(ui,/setVerifiedProgress/);
assert.match(ui,/Verified Gamer Score:/);
assert.match(ui,/themeUnlockProgressLabel\(profile.id, verifiedProgress\)/);
assert.match(ui,/disabled=\{!themeIsAvailable\(profile.id, entitlements, betaMode\)\}/);
assert.match(ui,/Sign in to view and use your earned themes/);

for(const path of ["client/public/site.webmanifest","client/public/control/manifest.webmanifest","server/control-ui/manifest.webmanifest"]){
  const manifest=JSON.parse(await read(path));
  assert.equal(manifest.display,"fullscreen",path);
  assert.equal(manifest.display_override[0],"fullscreen");
  assert(manifest.display_override.includes("standalone"));
}
const display=await read("client/src/platform/components/DisplaySettingsPanel.tsx");
const brand=await read("shared/platform/brand.ts");
const css=await read("client/src/styles/hgr-4.5.1.css");
const glyph=await read("assets/branding/icon-sets/glyphs/hgr-h.svg");
const glyphPath=glyph.match(/<path[^>]*\bd="([^"]+)"/)?.[1];
assert(glyphPath&&brand.includes(glyphPath),"Must reuse approved canonical H path.");
assert.doesNotMatch(display,/\["white-glyph", "White glyph"/);
assert.doesNotMatch(display,/\["black-glyph", "Black glyph"/);
assert.match(display,/\["mono-light", "Mono light", "White H only · transparent background"\]/);
assert.match(display,/\["mono-dark", "Mono dark", "Black H only · transparent background"\]/);
assert.match(display,/type="range" min=\{0\} max=\{2\} step=\{1\}/);
for(const path of ["client/public/sw.js","client/public/control/sw.js"]){
 const sw=await read(path);
 assert.match(sw,/badge: '\/notification-badge-96\.png\?identity=mono-h-only'/);
 assert.doesNotMatch(sw,/badge: '\/favicon-32\.png/);
}
const generator=await read("scripts/generate-platform-icons.mjs");
assert.match(generator,/canonicalGlyphPath/);
assert.match(generator,/notification-badge-96\.png/);
const badge=await readFile(resolve(root,"client/public/notification-badge-96.png"));
assert.equal(badge.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(badge.readUInt32BE(16),96);
assert.equal(badge.readUInt32BE(20),96);
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const start=css.indexOf(".halieus-brand-mark { --logo-bg");
  const monoCSS=css.slice(start,css.indexOf("@media (max-width: 540px)",start));
  assert(start>=0&&monoCSS.includes('[data-logo-preset="mono-light"] .halieus-brand-mark-tile'));
  await page.setContent('<style>'+monoCSS+'</style><span class="halieus-brand-mark" data-logo-preset="mono-light"><svg viewBox="0 0 64 64"><rect class="halieus-brand-mark-tile" x="3" y="3" width="58" height="58" rx="15" style="fill:red"/><path class="halieus-brand-mark-h-shape" d="'+glyphPath+'"/></svg></span>');
  const visible=()=>page.evaluate(()=>{
    const mark=document.querySelector(".halieus-brand-mark");
    return {tile:getComputedStyle(mark.querySelector("rect")).display,glyph:getComputedStyle(mark.querySelector("path")).fill};
  });
  assert.deepEqual(await visible(),{tile:"none",glyph:"rgb(255, 255, 255)"});
  await page.locator(".halieus-brand-mark").evaluate(el=>el.dataset.logoPreset="mono-dark");
  assert.deepEqual(await visible(),{tile:"none",glyph:"rgb(0, 0, 0)"});
  const png=badge.toString("base64");
  const pixels=await page.evaluate(async png=>{
    const image=new Image();image.src="data:image/png;base64,"+png;await image.decode();
    const canvas=document.createElement("canvas");canvas.width=96;canvas.height=96;
    const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);
    return {corner:Array.from(ctx.getImageData(0,0,1,1).data),centre:Array.from(ctx.getImageData(48,48,1,1).data)};
  },png);
  assert.equal(pixels.corner[3],0,"Notification badge must have fully transparent corners.");
  assert.equal(pixels.centre[3],255);
  assert.deepEqual(pixels.centre.slice(0,3),[255,255,255],"Badge cannot include coloured tile.");
  await page.close();
}finally{await browser.close();}
console.log("PASS 4.7.4 themes, authentic unlock conditions, fullscreen PWA fallbacks, mono glyphs, 96px transparent notification badge and readable sliders.");
