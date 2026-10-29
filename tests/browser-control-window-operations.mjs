import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root=resolve(import.meta.dirname,"..");
const html=await readFile(resolve(root,"client/public/control/index.html"),"utf8");
const script=await readFile(resolve(root,"client/public/control/cloud-update.js"),"utf8");
const controlJs=await readFile(resolve(root,"client/public/control/control.js"),"utf8");
const css=await readFile(resolve(root,"client/public/control/control.css"),"utf8");
const closeCmd=await readFile(resolve(root,"Close Halieus Game Room.cmd"),"utf8");
assert.match(html,/Close HGR Window/,"Cloud Control must accurately label local Close");
assert.match(controlJs,/Close HGR window/,"Persistent Control status must explain the actual local window action");
assert.match(html,/This never closes the public website\.|public Oracle website stays online/i,"Control must explain that window actions leave the public website online");
assert.match(closeCmd,/msedge\.exe/,"Close currently targets the local dedicated Edge app");
assert.doesNotMatch(closeCmd,/ssh|systemctl|oracle|cloudflare/i,"Close is not an Oracle shutdown");

const skeleton=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/control/control.css"></head>
<body><div class="infrastructure-list"><div></div><div><small id="ownerPcDetail"></small><b></b></div></div>
<article class="operation-readiness"><div><span class="status-dot"></span><p><strong></strong><small></small></p></div></article>
<div class="operation-grid">
 <button data-operation="restart"><span>↻</span><strong>Restart HGR Window</strong><small></small></button>
 <button data-operation="start"><span>▶</span><strong>Open HGR Window</strong><small></small></button>
 <button data-operation="close"><span>■</span><strong>Close HGR Window</strong><small></small></button>
 <button data-operation="update" data-update-state="idle"><span class="operation-action-icon"></span><strong>Update HGR</strong><small></small></button>
</div><div id="operationDetails"><button id="operationDismiss"></button></div><div id="auditList"></div>
<script src="/control/cloud-update.js"></script></body></html>`;

let op=null;
const server=createServer((req,res)=>{
  const send=(body,contentType="application/json")=>{
    res.writeHead(200,{"content-type":contentType,"cache-control":"no-store"});
    res.end(typeof body==="string"?body:JSON.stringify(body));
  };
  if(req.url==="/control/"){send(skeleton,"text/html; charset=utf-8");return;}
  if(req.url==="/control/control.css"){send(css,"text/css");return;}
  if(req.url==="/control/cloud-update.js"){send(script,"text/javascript");return;}
  if(req.url==="/control/cloud/status"){send({actorRole:"owner",devices:[{deviceId:"approved",approval:"approved",online:true,localControlOnline:true,machineName:"Lagz"}],operations:[op],activeOperation:op});return;}
  if(req.url==="/control/operation-status"){send({operation:op});return;}
  if(req.url==="/control/operation-history"){send({operations:[]});return;}
  res.writeHead(404);res.end("Not found");
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE||undefined});
try {
  for(const action of ["start","restart","close","update"]) {
    op={id:"test-"+action,action,state:"running",phase:"Executing "+action,
      progress:32,startedAt:new Date().toISOString()};
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(`http://127.0.0.1:${port}/control/`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction((expected)=>
      document.querySelector("#controlOperationPhaseDetail")?.textContent===`Executing ${expected}`,
      action,{timeout:9000});
    const data=await page.locator('.operation-grid [data-operation="update"]').evaluate(el=>({
      state:el.dataset.updateState,
      disabled:el.disabled,
      copy:el.querySelector("small")?.textContent,
      animation:getComputedStyle(el.querySelector(".operation-action-icon"),"::before").animationName,
    }));
    if(action==="update"){
      assert.equal(data.state,"running","Real Update should spin");
      assert.match(data.copy,/Update in progress/);
      assert.equal(data.animation,"control-operation-spin");
    } else {
      assert.equal(data.state,"idle",`Update must NOT animate for ${action}`);
      assert(!data.copy.includes("Update in progress"),"Other operations cannot say Updating");
      assert.equal(data.animation,"none");
      assert(data.disabled,"Mutating operations remain mutually exclusive");
    }
    await page.close();
  }
  console.log("PASS HGR Control: local window Start/Restart/Close never animate Update; real Update spins; action exclusion preserved");
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
