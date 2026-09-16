import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(join(tmpdir(), 'hgr-handoff-'));
const port = 38417;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [resolve(root,'server/dist/server/src/index.js')], { cwd: resolve(root,'server'), env: {...process.env, PORT:String(port), SERVE_CLIENT:"true", CLIENT_ORIGINS:base, HALIEUS_DATA_DIR:temp, HALIEUS_OWNER_BOOTSTRAP_FILE:join(temp,'bootstrap.txt')}, stdio:'pipe' });
let output=''; server.stdout.on('data',d=>output+=d); server.stderr.on('data',d=>output+=d);
let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  const malformed=await fetch(base+'/auth/status',{headers:{cookie:'halieus_session=%ZZ; bad=%ZZ'}});
  assert.equal(malformed.status,200); assert.equal(malformed.headers.get('cache-control'),'no-store');
  assert.equal(malformed.headers.get('referrer-policy'),'no-referrer');
  // A forged left-most forwarded address must not rotate the limiter key.
  for(let i=0;i<13;i++){
    const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':`spoof-${i}, 192.0.2.1`},body:JSON.stringify({username:'absent',password:'bad'})});
    assert.equal(r.status,i<12?401:429);
  }
  browser=await chromium.launch({channel:process.env.HGR_BROWSER_CHANNEL || undefined,headless:true});
  const account={id:'test',username:'tester',displayName:'Test Player',role:'player',status:'active',avatar:'H',playerColor:'#8b5cf6',createdAt:0,lastLoginAt:null};
  async function pageFor({theme='dark',reduced=false,mobile=false,saved=false,landscape=false}={}) {
    const context=await browser.newContext({viewport:landscape?{width:844,height:390}:mobile?{width:390,height:844}:{width:1440,height:900},reducedMotion:reduced?'reduce':'no-preference'});
    await context.addInitScript(({theme,saved})=>{localStorage.setItem('halieus-game-room-theme',theme);if(saved)localStorage.setItem('halieus-connect-four-session-v1',JSON.stringify({code:'TEST42',playerName:'Tester',reconnectToken:'TESTTOKEN'}));},{theme,saved});
    const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);}); page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url()));
    await page.route('**/auth/status',async route=>{await new Promise(r=>setTimeout(r,150));await route.fulfill({json:{ok:true,setupRequired:false,authenticated:true,account,registration:'invite-only',accessRequestsEnabled:true}});});
    return {context,page,errors};
  }
  for(const mode of ['auto','enter','skip','reduced','mobile-light','landscape']){
    const {context,page,errors}=await pageFor({reduced:mode==='reduced',mobile:mode==='mobile-light',landscape:mode==='landscape',theme:mode==='mobile-light'?'light':'dark'});
    let loads=0;page.on('framenavigated',f=>{if(f===page.mainFrame())loads++;});
    await page.goto(base); await page.locator('.halieus-intro-v4').waitFor();
    assert.equal(await page.locator('.halieus-shell').count(),1,'destination mounted under intro');
    assert.equal(await page.locator('.halieus-shell').evaluate(e=>e.parentElement.inert),true);
    await page.evaluate(()=>{window.__handoff=[];const sample=()=>{const intro=document.querySelector('.halieus-intro-v4');const home=document.querySelector('.halieus-shell');window.__handoff.push({intro:!!intro,home:!!home,opacity:home?getComputedStyle(home).opacity:'0',introOpacity:intro?getComputedStyle(intro).opacity:'0'});if(intro)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
    if(mode==='enter'||mode==='mobile-light')await page.getByRole('button',{name:'Enter Game Room',exact:true}).click();
    if(mode==='skip'||mode==='reduced')await page.getByRole('button',{name:'Skip intro',exact:true}).click();
    await page.locator('.halieus-intro-v4').waitFor({state:'detached',timeout:6500});
    assert.equal(loads,1,'handoff must not reload');assert.equal(await page.locator('.halieus-shell').evaluate(e=>e.parentElement.inert),false);
    assert.ok(await page.evaluate(()=>window.__handoff.every(x=>x.home && (Number(x.introOpacity)>0 || Number(x.opacity)>0))),'destination present on every sampled frame');
    assert.equal(await page.locator('html').getAttribute('data-theme'),mode==='mobile-light'?'light':'dark');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal page overflow');
    if(process.env.HGR_SCREENSHOTS)await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`handoff-${mode}.png`)});
    assert.deepEqual(errors,[]);
    await page.reload();await page.locator('.halieus-shell').waitFor();assert.equal(await page.locator('.halieus-intro-v4').count(),0,'refresh bypass');
    console.log(`PASS handoff ${mode}`);await context.close();
  }
  const routes=['join','game','spectate/mega','poker','blackjack','whot','ludo','connect-four','ayo','word-board','hidden-dictator','cheat','dominoes','word-game','password','anagrams-race'];
  for(const route of routes){const {context,page,errors}=await pageFor();await page.goto(`${base}/${route}/TEST42?guest=1`);await page.waitForTimeout(250);assert.equal(await page.locator('.halieus-intro-v4').count(),0,route);assert.deepEqual(errors,[]);await context.close();}
  const {context,page,errors}=await pageFor({saved:true});await page.goto(base);await page.locator('.halieus-shell').waitFor();assert.equal(await page.locator('.halieus-intro-v4').count(),0,'saved seat bypass');assert.deepEqual(errors,[]);await context.close();
  console.log('PASS 16 direct routes, saved recovery, private headers, malformed cookies, rate-limit spoof regression');
} finally {await browser?.close();server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));await rm(temp,{recursive:true,force:true});}
