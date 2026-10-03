import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root=resolve(import.meta.dirname,'..');
const data=await mkdtemp(resolve(tmpdir(),'hgr-control-branding-'));
const base='http://127.0.0.1:39467';
const expectedHash=JSON.parse(await readFile(resolve(root,'assets/branding/references/control-artwork.json'),'utf8')).sha256;
const server=spawn(process.execPath,[resolve(root,'server/dist/server/src/index.js')],{
 cwd:resolve(root,'server'),env:{...process.env,PORT:'39467',SERVE_CLIENT:'true',CLIENT_ORIGINS:base,HALIEUS_DATA_DIR:data,HALIEUS_OWNER_BOOTSTRAP_FILE:resolve(data,'bootstrap.txt')},stdio:'pipe'
});
let browser,output='';
server.stdout.on('data',s=>output+=s);server.stderr.on('data',s=>output+=s);
try {
 let ready=false;
 for(let i=0;i<100&&!ready;i++) {
  if(server.exitCode!==null) throw Error(output);
  try {ready=(await fetch(`${base}/health`)).ok;} catch {}
  if(!ready) await new Promise(r=>setTimeout(r,100));
 }
 assert.ok(ready,'Fixture server must start');
 browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
 if(process.env.HGR_SCREENSHOTS) await mkdir(process.env.HGR_SCREENSHOTS,{recursive:true});
 for(const [device,width,height] of [['desktop',1440,900],['short',1280,600],['tablet',820,1180],['phone',390,844]]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(()=>sessionStorage.setItem('halieus-intro-seen-v4','1'));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let role='owner';
  await page.route('**/auth/status',route=>route.fulfill({json:{ok:true,setupRequired:false,authenticated:role!=='guest',registration:'invite-only',account:role==='guest'?null:{id:'branding-owner',username:'tester',displayName:'Brand Test',role,status:'active',avatar:'H',playerColor:'#3475c5',createdAt:0,lastLoginAt:null}}}));
  await page.goto(base);await page.locator('.hgr-admin-control-launcher').waitFor();
  const image=page.locator('.hgr-admin-control-mark');
  await image.evaluate(i=>i.decode());assert.equal(await image.evaluate(i=>i.naturalWidth),192);
  assert.equal(await image.evaluate(i=>i.tagName),'IMG');
  const imageUrl=await image.getAttribute('src');assert.match(imageUrl,/control-approved2/);
  const response=await context.request.get(base+imageUrl);
  assert.equal(createHash('sha256').update(await response.body()).digest('hex'),expectedHash);
  const box=await image.boundingBox();assert.ok(box.width>=30&&box.height>=30);
  assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height);
  if(process.env.HGR_SCREENSHOTS) await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`${device}-admin-control.png`)});
  role='player';await page.reload();await page.locator('.halieus-shell').waitFor();
  assert.equal(await page.locator('.hgr-admin-control-launcher').count(),0,'Player must not gain an admin launcher');
  role='guest';await page.goto(`${base}/control/`);
  await page.getByText('Sign in to use HGR Control',{exact:true}).waitFor();
  for(const selector of ['.control-brand-mark','.access-icon']) {
   const mark=page.locator(selector);await mark.evaluate(i=>i.decode());
   assert.equal(await mark.evaluate(i=>i.tagName),'IMG');
   assert.equal(await mark.evaluate(i=>i.naturalWidth),192);
   assert.match(await mark.getAttribute('src'),/4\.5\.4-control-approved3/);
   const markResponse=await context.request.get(base+(await mark.getAttribute('src')));
   assert.equal(createHash('sha256').update(await markResponse.body()).digest('hex'),expectedHash);
   assert.equal(await mark.evaluate(i=>getComputedStyle(i).backgroundImage),'none','Artwork must not gain a synthetic tile');
  }
  const manifestHref=await page.locator('link[rel="manifest"]').getAttribute('href');
  assert.equal(manifestHref,'/control/manifest.webmanifest?v=4.5.4-control-approved3');
  const manifestResponse=await context.request.get(base+manifestHref);
  assert.equal(manifestResponse.ok(),true);
  const manifest=await manifestResponse.json();
  assert.equal(manifest.id,'/control/');assert.equal(manifest.start_url,'/control/');assert.equal(manifest.scope,'/control/');
  assert.equal(manifest.icons[0].src,'/control/control-icon.png?v=4.5.4-control-approved3');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${device}: cloud overflow`);
  if(process.env.HGR_SCREENSHOTS) await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`${device}-cloud-control.png`)});
  assert.deepEqual(errors,[]);await context.close();
  console.log(`PASS ${device}: approved cloud/admin image bytes, PWA manifest, role visibility and containment`);
 }
} finally {
 await browser?.close();server.kill();
 await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));
 await rm(data,{recursive:true,force:true});
}
