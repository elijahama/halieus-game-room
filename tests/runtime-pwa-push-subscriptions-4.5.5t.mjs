import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const data=await mkdtemp(join(tmpdir(),"hgr-pwa-push-"));
const bootstrapFile=join(data,"OWNER SETUP CODE.txt");
const port=32982, base="http://127.0.0.1:"+port;
const server=spawn(process.execPath,["--import","tsx","src/index.ts"],{
  cwd:new URL("../server/",import.meta.url),
  env:{...process.env,HALIEUS_DATA_DIR:data,HALIEUS_OWNER_BOOTSTRAP_FILE:bootstrapFile,
    PORT:String(port),SERVE_CLIENT:"false"},
  stdio:["ignore","pipe","pipe"],
});
let log="";
server.stdout.on("data",v=>log+=v.toString());
server.stderr.on("data",v=>log+=v.toString());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,{cookie="",method="GET",body}={}){
  const res=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  let json;try{json=await res.json();}catch{json={};}
  return {status:res.status,json,cookie:res.headers.get("set-cookie")?.split(";")[0]??cookie};
}
async function register(ownerCookie,username){
  const token=await api("/admin/invites",{cookie:ownerCookie,method:"POST",body:{label:username,expiryDays:7}});
  assert.equal(token.status,201,JSON.stringify(token.json));
  const response=await api("/auth/redeem-invite",{method:"POST",body:{
    inviteCode:token.json.code,username,displayName:username,password:username+"-secure-password-2026"}});
  assert.equal(response.status,201,JSON.stringify(response.json));
  return {cookie:response.cookie,id:response.json.account.id};
}
try {
  let ready=false;
  for(let i=0;i<105;i++){
    if(server.exitCode!==null)throw Error("Server failed: "+log);
    try{if((await fetch(base+"/health")).ok){ready=true;break;}}catch{}
    await sleep(140);
  }
  assert.ok(ready,"Push integration server not ready: "+log);
  assert.equal((await api("/accounts/push/config")).status,401,"Require authenticated session");
  assert.equal((await api("/accounts/push/test",{method:"POST",body:{endpoint:"https://web.push.apple.com/not-subscribed"}})).status,401,
    "Guest cannot trigger a notification");
  const bootstrap=(await readFile(bootstrapFile,"utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0];assert.ok(bootstrap);
  const owner=await api("/auth/setup-owner",{method:"POST",body:{
    bootstrapCode:bootstrap,username:"owner",displayName:"Owner",password:"secure-owner-password-2026"}});
  assert.equal(owner.status,201);
  const a=await register(owner.cookie,"bravo");
  const b=await register(owner.cookie,"charlie");
  const config=await api("/accounts/push/config",{cookie:a.cookie});
  assert.equal(config.status,200);
  assert.equal(config.json.available,true);
  assert.match(config.json.publicKey,/^[A-Za-z0-9_-]{75,100}$/);
  assert.ok(!("privateKey" in config.json),"Never leak server VAPID private key");
  const endpoint="https://web.push.apple.com/test-subscription-1234567890abcdef";
  const keys={p256dh:"A".repeat(87),auth:"B".repeat(22)};
  const valid={subscription:{endpoint,keys},topics:["invites","messages"]};
  assert.equal((await api("/accounts/push/subscribe",{cookie:a.cookie,method:"POST",
    body:{subscription:{...valid.subscription,endpoint:"https://127.0.0.1:1337/private"},topics:["invites"]}})).status,400,
    "Reject SSRF and local network addresses");
  assert.equal((await api("/accounts/push/subscribe",{cookie:a.cookie,method:"POST",
    body:{subscription:{...valid.subscription,endpoint:"https://evil.example/notify"},topics:["invites"]}})).status,400,
    "Only approved browser push provider URLs accepted");
  assert.equal((await api("/accounts/push/subscribe",{cookie:a.cookie,method:"POST",
    body:{...valid,topics:["invites","unknown"]}})).status,400,
    "Reject unknown notification topics");
  assert.equal((await api("/accounts/push/subscribe",{method:"POST",body:valid})).status,401,
    "Guest cannot register device");
  const registered=await api("/accounts/push/subscribe",{cookie:a.cookie,method:"POST",body:valid});
  assert.equal(registered.status,200,JSON.stringify(registered.json));
  let stored=JSON.parse(await readFile(join(data,"notifications","push-subscriptions.json"),"utf8"));
  assert.equal(stored.subscriptions.length,1);
  assert.equal(stored.subscriptions[0].accountId,a.id);
  assert.equal(stored.subscriptions[0].endpoint,endpoint);
  assert.equal((await api("/accounts/push/status",{cookie:a.cookie,method:"POST",body:{endpoint}})).json.enabled,true);
  assert.equal((await api("/accounts/push/status",{cookie:b.cookie,method:"POST",body:{endpoint}})).json.enabled,false,
    "Another account may not impersonate a device subscription");
  assert.equal((await api("/accounts/push/test",{cookie:b.cookie,method:"POST",body:{endpoint}})).status,404,
    "Another account cannot test or learn whether this device can be reached");
  assert.equal((await api("/accounts/push/test",{cookie:a.cookie,method:"POST",body:{endpoint:"https://127.0.0.1/private"}})).status,400,
    "Test notifications must reject arbitrary/local endpoints");
  assert.ok(stored.vapid.privateKey && stored.vapid.publicKey);
  assert.equal((await api("/accounts/push/subscribe",{cookie:b.cookie,method:"POST",body:valid})).status,200,
    "Switching signed-in account rebinds browser subscription to current account");
  stored=JSON.parse(await readFile(join(data,"notifications","push-subscriptions.json"),"utf8"));
  assert.equal(stored.subscriptions.length,1);
  assert.equal(stored.subscriptions[0].accountId,b.id);
  assert.equal((await api("/accounts/push/status",{cookie:a.cookie,method:"POST",body:{endpoint}})).json.enabled,false,
    "After account switch the previous user is no longer considered enrolled");
  assert.equal((await api("/accounts/push/status",{cookie:b.cookie,method:"POST",body:{endpoint}})).json.enabled,true);
  assert.equal((await api("/accounts/push/unsubscribe",{cookie:a.cookie,method:"POST",body:{endpoint}})).status,200);
  stored=JSON.parse(await readFile(join(data,"notifications","push-subscriptions.json"),"utf8"));
  assert.equal(stored.subscriptions.length,1,"Previous account cannot revoke newer account's device");
  assert.equal((await api("/accounts/push/unsubscribe",{cookie:b.cookie,method:"POST",body:{endpoint}})).status,200);
  stored=JSON.parse(await readFile(join(data,"notifications","push-subscriptions.json"),"utf8"));
  assert.equal(stored.subscriptions.length,0,"Revocation persists");
  console.log("PASS 4.5.5t: per-account browser subscription, VAPID key not exposed, SSRF rejection, opt-in/opt-out and safe account rebinding");
} finally {server.kill("SIGTERM");await sleep(140);await rm(data,{recursive:true,force:true});}
