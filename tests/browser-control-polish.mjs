import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root=resolve(import.meta.dirname,'..');
let operation=null, online=true;
const account={id:'owner',username:'owner',displayName:'Owner Test',role:'owner',avatar:'OT',playerColor:'#3475c5',profilePicture:null};
account.profilePicture='data:image/png;base64,'+(await readFile(resolve(root,'client/public/control/control-icon.png'))).toString('base64');
const device={deviceId:'fixture',machineName:'Test PC',approval:'approved',online:true,localControlOnline:true};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  const fixtures={
    '/auth/status':{authenticated:true,account},
    '/admin/snapshot':{accounts:[account,{...account,id:'none',displayName:'No Photo',profilePicture:null},{...account,id:'broken',displayName:'Broken Photo',profilePicture:'data:image/png;base64,bm90LXBuZw=='}],onlineAccountIds:['owner'],audit:[]},
    '/accounts/live-games':{rooms:[]},'/accounts/me/stats':{stats:{played:0,wins:0,recent:[]}},
    '/health':{status:'online',version:'fixture',uptimeSeconds:1},
    '/control/cloud/status':{devices:[{...device,online}],activeOperation:operation},
    '/control/operation-status':{operation},'/control/operation-history':{operations:operation?[operation]:[]},
  };
  if(path in fixtures){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixtures[path]));return;}
  try{
    if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<script src="/control-navigation.js" defer></script><button id="enter" onclick="document.documentElement.requestFullscreen()">Enter fullscreen</button><a href="/control/">Control</a>');return;}
    const file=path==='/control/'?'/control/index.html':path;
    if(!/^\/control\/[a-z0-9.-]+$/.test(file)&&!/^\/control-navigation\.(js|css)$/.test(file))throw Error('not found');
    let body=await readFile(resolve(root,'client/public'+file));
    if(file==='/control/control.js') body=Buffer.concat([body,Buffer.from('\n'),await readFile(resolve(root,'client/public/control/cloud-update.js'))]);
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':'text/html');
    res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chromium',headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try{
 const navigation=await browser.newPage();
 await navigation.goto(base+'/');await navigation.locator('#enter').click();
 await navigation.waitForFunction(()=>!!document.fullscreenElement);
 assert.equal(await navigation.evaluate(()=>!!document.fullscreenElement),true);
 await navigation.getByRole('link',{name:'Control',exact:true}).click();
 await navigation.getByRole('button',{name:'Resume fullscreen'}).waitFor();
 assert.equal(await navigation.evaluate(()=>!!document.fullscreenElement),false,'no automatic fullscreen request after navigation');
 await navigation.getByRole('button',{name:'Resume fullscreen'}).click();
 await navigation.waitForFunction(()=>!!document.fullscreenElement);
 assert.equal(await navigation.evaluate(()=>!!document.fullscreenElement),true);
 await navigation.locator('.rail-return').click();
 await navigation.getByRole('button',{name:'Resume fullscreen'}).waitFor();
 await navigation.getByRole('button',{name:'Stay in window'}).click();
 assert.equal(await navigation.evaluate(()=>sessionStorage.getItem('hgr-fullscreen-navigation')),null);
 await navigation.addInitScript(()=>{Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});sessionStorage.setItem('hgr-fullscreen-navigation','1');});
 await navigation.goto(base+'/control/');
 await navigation.getByText('Continue in this responsive view.',{exact:false}).waitFor();
 assert.equal(await navigation.getByRole('button',{name:'Resume fullscreen'}).count(),0,'Apple touch safety guard remains');
 await navigation.close();
 console.log('PASS fullscreen intent, explicit resume, return, dismissal and Apple touch safety');
 for(const [width,height] of [[1440,900],[1280,600],[820,1180],[390,844]]){
  operation=null;online=true;
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/control/');await page.locator('#accessState').waitFor({state:'hidden'});
  if(width<=720){
    const back=page.getByRole('link',{name:'← Game Room',exact:true});
    assert.equal(await back.isVisible(),true);assert.equal(await back.getAttribute('href'),'/');
    assert.equal(await page.locator('.panel-card').first().evaluate(e=>getComputedStyle(e).boxShadow),'none');
  }
  if(process.env.HGR_SCREENSHOTS){await mkdir(process.env.HGR_SCREENSHOTS,{recursive:true});await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`control-${width}.png`),fullPage:true});}
  await page.locator('#profileAvatar img').evaluate(i=>i.decode());
  assert.equal(await page.locator('#profileAvatar img').evaluate(i=>i.naturalWidth),192);
  await page.waitForFunction(()=>document.querySelectorAll('#playerGrid .player-card').length===3);
  assert.equal(await page.locator('#playerGrid img').count(),1,'missing/broken photos use initials fallback');
  assert.equal(await page.locator('#playerGrid .player-avatar').nth(1).textContent(),'OT');
  await page.locator('[data-section="operations"]:visible').first().click();
  const update=page.getByRole('button',{name:/Update HGR/});
  await page.waitForFunction(()=>[...document.querySelectorAll('.operation-grid button')].find(b=>b.textContent.includes('Update HGR'))?.disabled===false);
  assert.equal(await update.evaluate(b=>getComputedStyle(b).opacity),'1');
  assert.equal(await page.getByRole('button',{name:/Start HGR/}).isDisabled(),true);
  operation={id:'run1',action:'update',state:'running',title:'Updating HGR',phase:'Building client',progress:38,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await page.waitForFunction(()=>document.getElementById('revokeCloudOwnerPc')?.disabled===true);
  assert.equal(await update.isDisabled(),true);
  assert.equal(await page.locator('#operationPhase').textContent(),'Building client');
  assert.equal(await page.locator('#operationPercent').textContent(),'38%');
  assert.equal(await page.locator('#operationUpdated').getAttribute('datetime'),operation.updatedAt);
  assert.equal(await page.locator('#operationProgressBar').evaluate(b=>getComputedStyle(b).animationName),'control-progress-pulse');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#operationProgressBar').evaluate(b=>getComputedStyle(b).animationName),'none');
  assert.equal(await page.locator('#operationPercent').textContent(),'38%','motion never fabricates numeric progress');
  operation={...operation,state:'succeeded',phase:'Update complete',progress:100};
  await page.waitForFunction(()=>document.getElementById('revokeCloudOwnerPc')?.disabled===false);
  assert.equal(await update.isDisabled(),false);
  assert.equal(await page.locator('#operationTitle').textContent(),'Update complete');
  assert.equal(await page.locator('#operationPercent').textContent(),'100%');
  assert.equal(await page.locator('#operationProgressBar').evaluate(b=>getComputedStyle(b).animationName),'none');
  operation={...operation,state:'failed',phase:'Publishing to Oracle',progress:88,reason:'Deployment verification failed'};
  await page.waitForFunction(()=>document.getElementById('operationTitle').textContent==='Update failed');
  assert.equal(await page.locator('#operationPercent').textContent(),'88%');
  assert.match(await page.locator('#controlOperationReason').textContent(),/verification failed/);
  online=false;
  await page.waitForFunction(()=>[...document.querySelectorAll('.operation-grid button')].find(b=>b.textContent.includes('Update HGR'))?.disabled===true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Control content stays within viewport');
  assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS ${width}x${height}: available/running/complete/offline operation states`);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
