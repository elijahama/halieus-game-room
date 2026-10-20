import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const data=await mkdtemp(join(tmpdir(),"hgr-guild-notices-"));
const port=32981,codeFile=join(data,"OWNER SETUP CODE.txt");
const server=spawn(process.execPath,["--import","tsx","src/index.ts"],{
  cwd:new URL("../server/",import.meta.url),
  env:{...process.env,PORT:String(port),SERVE_CLIENT:"false",HALIEUS_DATA_DIR:data,
    HALIEUS_OWNER_BOOTSTRAP_FILE:codeFile},
  stdio:["ignore","pipe","pipe"],
});
let log="";
server.stdout.on("data",v=>log+=v.toString());
server.stderr.on("data",v=>log+=v.toString());
const base="http://127.0.0.1:"+port;
const sleep=ms=>new Promise(f=>setTimeout(f,ms));
async function api(path,{cookie="",method="GET",body}={}){
  const res=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  let json;try{json=await res.json();}catch{json={};}
  return {status:res.status,json,cookie:res.headers.get("set-cookie")?.split(";")[0]??cookie};
}
async function register(ownerCookie,username){
  const invited=await api("/admin/invites",{cookie:ownerCookie,method:"POST",body:{label:username,expiryDays:7}});
  assert.equal(invited.status,201,JSON.stringify(invited.json));
  const account=await api("/auth/redeem-invite",{method:"POST",body:{inviteCode:invited.json.code,username,displayName:username.toUpperCase(),password:username+"-secure-password-2026"}});
  assert.equal(account.status,201,JSON.stringify(account.json));
  return {cookie:account.cookie,id:account.json.account.id};
}
try {
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error("Server stopped: "+log);
    try{if((await fetch(base+"/health")).ok){ready=true;break;}}catch{}
    await sleep(160);
  }
  assert.ok(ready,"Test server unavailable: "+log);
  assert.equal((await api("/guilds/message-notifications")).status,401,"Notifications require a session");
  const file=await readFile(codeFile,"utf8");
  const code=file.match(/OWNER-[A-Z0-9-]+/)?.[0];assert.ok(code);
  const owner=await api("/auth/setup-owner",{method:"POST",body:{bootstrapCode:code,username:"owner",displayName:"Owner",password:"owner-secure-password-2026"}});
  assert.equal(owner.status,201,JSON.stringify(owner.json));
  const sender=await register(owner.cookie,"bravo");
  const recipient=await register(owner.cookie,"charlie");
  const stranger=await register(owner.cookie,"delta");
  const guild=await api("/guilds",{cookie:sender.cookie,method:"POST",body:{name:"HGR Chat Notices Guild"}});
  assert.equal(guild.status,201,JSON.stringify(guild.json));
  const gid=guild.json.guild.id;
  assert.equal((await api("/guilds/join",{cookie:recipient.cookie,method:"POST",body:{inviteCode:guild.json.guild.inviteCode}})).status,200);
  const sent=await api("/guilds/"+gid+"/messages",{cookie:sender.cookie,method:"POST",body:{body:"Next game night at seven"}});
  assert.equal(sent.status,201,JSON.stringify(sent.json));
  const mine=await api("/guilds/message-notifications",{cookie:recipient.cookie});
  assert.equal(mine.status,200);
  assert.ok(mine.json.messages.some(m=>m.id===sent.json.message.id && m.guildId===gid && m.preview==="Next game night at seven"),
    "Recipient gets real membership-scoped message notification");
  assert.ok(mine.json.messages.every(m=>m.senderAccountId!=="system"),"No system messages should create alerts");
  assert.equal((await api("/guilds/message-notifications",{cookie:stranger.cookie})).json.messages.length,0,
    "Strangers must never receive a guild notification");
  assert.ok(!(await api("/guilds/message-notifications",{cookie:sender.cookie})).json.messages.some(m=>m.id===sent.json.message.id),
    "No self-notification");
  assert.ok(mine.json.messages.every(m=>m.guildId===gid && m.key.startsWith("guild-message:")));
  console.log("PASS 4.5.5s: authenticated guild messaging notifications, no stranger/self leakage, real message preview and guild identity");
} finally {server.kill("SIGTERM");await sleep(140);await rm(data,{recursive:true,force:true});}
