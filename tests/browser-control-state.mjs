import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
let legacy = true, mode = 'offline', expires = 0;
const oldPage = '<h1>Old installed Control</h1><script>navigator.serviceWorker.register("/sw.js")</script>';
const oldWorker = `self.addEventListener('install',e=>{e.waitUntil(caches.open('hgr-control-shell-v1').then(c=>c.add('/legacy-shell')));self.skipWaiting()});self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.match('/legacy-shell'))});`;
const server = createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  res.setHeader('Cache-Control','no-store');
  if (path.startsWith('/api/')) {
    if (mode === 'offline') { req.socket.destroy(); return; }
    res.setHeader('Content-Type','application/json');
    if (path === '/api/ping') { res.end(JSON.stringify({service:'hgr-control',pairingAvailable:Date.now()<expires,pairingExpiresAt:new Date(expires).toISOString()})); return; }
    if (path === '/api/pair') { mode='paired'; res.end('{}'); return; }
    if (path === '/api/status') { res.statusCode=mode==='paired'?200:401; res.end('{}'); return; }
    res.end('{"entries":[]}'); return;
  }
  if (path === '/legacy-shell' || (legacy && path === '/')) { res.setHeader('Content-Type','text/html'); res.end(oldPage); return; }
  if (legacy && path === '/sw.js') { res.setHeader('Content-Type','application/javascript'); res.end(oldWorker); return; }
  const name = path === '/' ? 'index.html' : path.slice(1);
  if (!['index.html','sw.js','control.js','control.css','control-icon.png','manifest.webmanifest','offline.html'].includes(name)) { res.statusCode=404;res.end();return; }
  res.setHeader('Content-Type', name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.webmanifest')?'application/manifest+json':'text/html');
  res.end(await readFile(new URL(`../server/control-ui/${name}`,import.meta.url)));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto(base); await page.evaluate(()=>navigator.serviceWorker.ready); await page.reload();
 assert.match(await page.locator('body').innerText(),/Old installed Control/);
 legacy=false;
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update()});
 await page.locator('#offlinePanel:visible').waitFor();
 assert.equal(await page.locator('#pairPanel').isVisible(),false);
 mode='fresh';expires=Date.now()+3000;
 await page.locator('#retryConnectionButton').click(); await page.locator('#pairPanel:visible').waitFor();
 assert.equal(await page.locator('#pairCode').isEnabled(),true);
 await page.waitForFunction(()=>document.querySelector('#pairCode').disabled);
 assert.equal(await page.locator('#pairPanel').isVisible(),true);
 assert.equal(await page.locator('#pairButton').isDisabled(),true);
 assert.match(await page.locator('#pairMessage').innerText(),/expired.*HGR - Control/);
 expires=Date.now()+60000;
 await page.locator('#retryPairingButton').click();
 await page.waitForFunction(()=>!document.querySelector('#pairCode').disabled);
 await page.locator('#pairCode').fill('12345678'); await page.locator('#pairButton').click();
 await page.locator('#dashboard:visible').waitFor();
 mode='offline'; await page.locator('#offlinePanel:visible').waitFor({timeout:12000});
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 const keys=await page.evaluate(()=>caches.keys());assert.ok(!keys.includes('hgr-control-shell-v1'));
 const requests=await page.evaluate(async()=>{const c=await caches.open('hgr-control-shell-v9');return(await c.keys()).map(r=>r.url)});
 assert.ok(requests.every(u=>!u.includes('/api/')));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS stale installed PWA takeover, offline/retry/fresh/expired/paired/disconnected states and uncached API');
 await context.close();
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
