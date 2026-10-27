import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const css = await readFile(resolve(root, "client/src/index.css"), "utf8");
const catalog = await readFile(resolve(root, "client/src/platform/games/catalog.ts"), "utf8");
const gameIds = [...catalog.matchAll(/\{ id: "([^"]+)", name: /g)].map((m) => m[1]);
const card = (i) => `<article class="card-game-player-row" tabindex="0">
  <span class="poker-avatar">P</span><div><strong>Player ${i} with a long name</strong>
  <small>Connected · Seat ${i}</small></div><b>${i}</b><button aria-label="Remove AI ${i}">×</button></article>`;
const mini = (i) => `<article tabindex="0"><span class="poker-avatar">P</span>
  <div><strong>Player ${i} with a long name</strong><small>Connected · 125 chips</small></div>
  <button aria-label="Remove AI ${i}">×</button></article>`;
const roster = (selectorClass, children = mini(1) + mini(2) + mini(3) + mini(4)) =>
  `<div class="${selectorClass}"><header><h2>Players</h2><span>4/8</span></header>${children}</div>`;

const fixtures = [
  { id: "mega-board", cls: ".mega-live-page .player-rail-list",
    html: `<div class="game-page mega-live-page mega-mobile-participant-mode"><div class="game-layout mega-live-layout-v3 mega-mobile-participant-layout"><div class="player-rail mega-live-player-rail mega-mobile-participant-player-rail">
      <div class="player-rail-list">${Array.from({length:4},(_,i) => `<article class="player-rail-card">
       <div class="player-rail-main-row"><div class="player-rail-copy"><strong>Player ${i+1}</strong></div></div>
       <div class="player-property-strip"><span class="player-property-chip">Property One</span><span class="player-property-chip">Property Two</span></div>
       </article>`).join("")}</div></div></div></div>` },
  { id: "ludo", cls: ".ludo-progress-list", html: roster("ludo-progress-list") },
  { id: "connect-four", cls: ".connect-four-page .card-game-roster", html: `<div class="connect-four-page"><div class="card-game-lobby">${roster("card-game-roster",card(1)+card(2)+card(3)+card(4))}</div></div>` },
  { id: "ayo", cls: ".ayo-page .card-game-roster", html: `<div class="ayo-page"><div class="card-game-lobby">${roster("card-game-roster",card(1)+card(2)+card(3)+card(4))}</div></div>` },
  { id: "word-board", cls: ".word-board-page .card-game-roster", html: `<div class="word-board-page"><div class="card-game-lobby">${roster("card-game-roster",card(1)+card(2)+card(3)+card(4))}</div></div>` },
  { id: "poker", cls: ".poker-player-list", html: roster("poker-player-list",Array.from({length:4},(_,i)=>
      `<article class="poker-player-list-card"><span class="poker-avatar">P</span><div><strong>Player ${i+1}</strong><small>Connected</small></div><b>500 chips</b><button class="poker-remove-ai">×</button></article>`).join("")) },
  { id: "blackjack", cls: ".rebuild-roster", html: roster("rebuild-roster",Array.from({length:4},(_,i)=>
    `<div><span>PL</span><div><b>Player ${i}</b><small>Connected</small></div><strong>500</strong><button>×</button></div>`).join("")) },
  { id: "whot", cls: ".rebuild-whot-opponents", html: roster("rebuild-whot-opponents",Array.from({length:4},(_,i)=>
    `<div><span>P</span><b>Player ${i}</b><small>8 cards</small></div>`).join("")) },
  { id: "hidden-dictator", cls: ".hd-live-roster", html: roster("hd-live-roster") },
  { id: "word-game", cls: ".word-game-stat-grid", html: `<div class="word-game-stat-grid">
    ${Array.from({length:4},(_,i)=>`<span><b>${i*3}</b><small>Stat ${i}</small></span>`).join("")}</div>` },
  { id: "password", cls: ".password-team-scoreboard", html: `<div class="password-team-scoreboard">
    <header>Team standings</header><section class="password-team-card"><h2>Violet</h2><article><span>V</span><div>Player One</div></article></section>
    <section class="password-team-card"><h2>Gold</h2><article><span>G</span><div>Player Two</div></article></section></div>` },
  { id: "anagrams-race", cls: ".word-arena-roster", html: roster("word-arena-roster") },
  { id: "cheat", cls: ".classic-roster", html: roster("classic-roster") },
  { id: "dominoes", cls: ".classic-player-rail", html: roster("classic-player-rail") },
];
assert.equal(gameIds.length, 14, "All 14 currently catalogued games are included");
assert.deepEqual(new Set(fixtures.map(f=>f.id)), new Set(gameIds), "Gallery audit covers the entire current game catalog");
assert.match(css, /HGR v4\.6\.6 · Gallery-first adaptive mobile/);

const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
try {
  for (const viewport of [
    {width:320,height:568,expected:2},
    {width:390,height:844,expected:2},
    {width:600,height:900,expected:2},
    {width:768,height:1024,expected:3},
    {width:900,height:1000,expected:3},
  ]) {
    const page = await browser.newPage({viewport});
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0;
        --mm-border:#64748b;--mm-surface-1:#121b2b;--mm-surface-2:#263141;--game-accent:#5b85de;
        --mm-text:#eef2ff;--mm-muted:#cbd5e1;background:#101827;color:#e5e7eb;}
        .gallery-case{width:100%;padding:10px 12px;border-bottom:1px solid #475569;}
        .gallery-host{width:100%;max-width:860px;margin:0 auto;min-width:0}
      </style></head><body>${fixtures.map(f=>`<section class="gallery-case" data-game="${f.id}">
        <div class="gallery-host">${f.html}</div></section>`).join("")}</body></html>`);
    await page.addStyleTag({content:css});
    for (const {id,cls} of fixtures) {
      const element=page.locator(`[data-game="${id}"] ${cls}`).first();
      assert.equal(await element.count(),1, `${id}: roster found`);
      const details=await element.evaluate(node=>{
        const style=getComputedStyle(node);
        return { display:style.display,
          columns:style.gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          width:node.getBoundingClientRect().width,
          scroll:node.scrollWidth>node.clientWidth+2,
        };
      });
      assert.equal(details.display,"grid",`${id} @${viewport.width} uses grid`);
      const expected = ["mega-board","word-game","password"].includes(id) ? 2 : viewport.expected;
      assert.equal(details.columns,expected,`${id} @${viewport.width}: ${JSON.stringify(details)}`);
      assert.equal(details.scroll,false,`${id}: gallery cell cannot force horizontal scroll`);
    }
    const pageOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(pageOverflow,false,`No horizontal overflow at ${viewport.width}px`);
    const buttons=page.locator('[data-game="connect-four"] .card-game-player-row button');
    assert.equal(await buttons.count(),4,"All roster action buttons preserved");
    const touch=await buttons.first().evaluate(node=>({w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height}));
    assert(touch.w>=36&&touch.h>=36,"Existing AI removal button must stay touch-accessible");
    const mega=await page.locator('[data-game="mega-board"] .player-property-strip').first()
      .evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(/\s+/).filter(Boolean).length);
    assert.equal(mega,2,"Mega Board property strips use a gallery");
    await page.close();
  }
  console.log("PASS 4.6.6 gallery-first: every game in 14-game catalog, 320/390/600/768/900 phones & tablets, preserved actions, Mega asset gallery, no page horizontal overflow");
} finally { await browser.close(); }
