import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port=3198, data=await mkdtemp(join(tmpdir(),"hgr-friends-guild-"));
const codeFile=join(data,"OWNER SETUP CODE.txt");
const server=spawn(process.execPath,["dist/server/src/index.js"],{
  cwd:new URL("../server/",import.meta.url),
  env:{...process.env,PORT:String(port),SERVE_CLIENT:"false",HALIEUS_DATA_DIR:data,
    HALIEUS_OWNER_BOOTSTRAP_FILE:codeFile},
  stdio:["ignore","pipe","pipe"],
});
let log="";
server.stdout.on("data",value=>log+=value.toString());
server.stderr.on("data",value=>log+=value.toString());
const base="http://127.0.0.1:"+port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(path,{cookie="",method="GET",body}={}){
  const res=await fetch(base+path,{method,headers:{
    ...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},
    body:body?JSON.stringify(body):undefined});
  let json;try{json=await res.json();}catch{json={};}
  return {status:res.status,json,cookie:res.headers.get("set-cookie")?.split(";")[0]??cookie};
}
async function inviteAndRegister(ownerCookie,username){
  const invite=await api("/admin/invites",{cookie:ownerCookie,method:"POST",body:{label:username,expiryDays:7}});
  assert.equal(invite.status,201,JSON.stringify(invite.json));
  const created=await api("/auth/redeem-invite",{method:"POST",body:{
    inviteCode:invite.json.code,username,displayName:username.toUpperCase(),password:username+"-secure-2026-password"}});
  assert.equal(created.status,201,JSON.stringify(created.json));
  return {cookie:created.cookie,id:created.json.account.id};
}
try{
  let ready=false;
  for(let i=0;i<90;i++){
    if(server.exitCode!==null)throw Error("Server exited: "+log);
    try{const h=await fetch(base+"/health");if(h.ok){ready=true;break;}}catch{}
    await sleep(150);
  }
  assert.ok(ready,"Isolated HGR server did not start: "+log);
  const bootstrap=await readFile(codeFile,"utf8");
  const code=bootstrap.match(/OWNER-[A-Z0-9-]+/)?.[0];
  assert.ok(code,"Missing isolated owner bootstrap code");
  const setup=await api("/auth/setup-owner",{method:"POST",body:{
    bootstrapCode:code,username:"owner",displayName:"HGR Owner",password:"secure-owner-2026-password"}});
  assert.equal(setup.status,201,JSON.stringify(setup.json));
  const a=await inviteAndRegister(setup.cookie,"bravo");
  const b=await inviteAndRegister(setup.cookie,"charlie");
  const c=await inviteAndRegister(setup.cookie,"delta");
  assert.equal((await api("/accounts/directory",{cookie:a.cookie})).json.players.length,0,
    "Private directory must start empty, never reveal strangers");
  assert.equal((await api("/accounts/directory",{cookie:setup.cookie})).json.players.length,0,
    "Even owner uses social scope on ordinary directory");
  assert.equal((await api("/admin/directory",{cookie:a.cookie})).status,403,"Nonadmins cannot see all players");
  assert.ok((await api("/admin/directory",{cookie:setup.cookie})).json.players.length>=4,
    "Beta admin utility has a distinct privileged directory");
  assert.equal((await api("/accounts/players/"+b.id+"/stats",{cookie:a.cookie})).status,404,
    "Direct stats URL cannot expose unrelated profile");

  assert.equal((await api("/accounts/friends/requests",{cookie:a.cookie,method:"POST",body:{handle:"charlie"}})).status,400,
    "Only explicitly supplied @handles are accepted");
  assert.equal((await api("/accounts/friends/requests",{cookie:a.cookie,method:"POST",body:{handle:"@unknown-puzzler"}})).status,404);
  const declinedRequest=await api("/accounts/friends/requests",{cookie:c.cookie,method:"POST",body:{handle:"@bravo"}});
  assert.equal(declinedRequest.status,201,"A third account can send a friend request");
  assert.equal((await api("/accounts/friends/requests/"+declinedRequest.json.request.id+"/respond",{
    cookie:a.cookie,method:"POST",body:{action:"decline"}})).status,200,"Recipient can decline");
  assert.equal((await api("/accounts/directory",{cookie:c.cookie})).json.players.length,0,
    "Declined request must not open access to a profile");
  const req=await api("/accounts/friends/requests",{cookie:a.cookie,method:"POST",body:{handle:"@CHARLIE"}});
  assert.equal(req.status,201,JSON.stringify(req.json));
  assert.equal((await api("/accounts/directory",{cookie:a.cookie})).json.players.length,0,
    "Pending must not expose target directory");
  assert.equal((await api("/accounts/friends/requests",{cookie:a.cookie,method:"POST",body:{handle:"@charlie"}})).status,409,
    "Duplicate request must not create multiple entries");
  assert.equal((await api("/accounts/friends/requests/"+req.json.request.id+"/respond",{
    cookie:c.cookie,method:"POST",body:{action:"accept"}})).status,404,
    "Only the intended recipient can accept");
  const incoming=(await api("/accounts/friends",{cookie:b.cookie})).json.requests;
  assert.equal(incoming.length,1);
  assert.equal(incoming[0].senderUsername,"bravo");
  const accepted=await api("/accounts/friends/requests/"+req.json.request.id+"/respond",{
    cookie:b.cookie,method:"POST",body:{action:"accept"}});
  assert.equal(accepted.status,200,JSON.stringify(accepted.json));
  assert.equal((await api("/accounts/friends/requests/"+req.json.request.id+"/respond",{
    cookie:b.cookie,method:"POST",body:{action:"accept"}})).status,404,
    "Accepted request cannot be replayed");
  let listed=(await api("/accounts/directory",{cookie:a.cookie})).json.players;
  assert.deepEqual(listed.map(x=>x.username),["charlie"]);
  assert.equal((await api("/accounts/players/"+b.id+"/stats",{cookie:a.cookie})).status,200);
  assert.equal((await api("/accounts/directory",{cookie:c.cookie})).json.players.length,0);

  const removed=await api("/accounts/friends/"+b.id,{cookie:a.cookie,method:"DELETE"});
  assert.equal(removed.status,200);
  assert.equal((await api("/accounts/directory",{cookie:a.cookie})).json.players.length,0);

  const guild=await api("/guilds",{cookie:a.cookie,method:"POST",body:{name:"Lantern Friends Guild"}});
  assert.equal(guild.status,201,JSON.stringify(guild.json));
  assert.ok(guild.json.guild.inviteCode);
  const joined=await api("/guilds/join",{cookie:b.cookie,method:"POST",
    body:{inviteCode:guild.json.guild.inviteCode}});
  assert.equal(joined.status,200,JSON.stringify(joined.json));
  listed=(await api("/accounts/directory",{cookie:a.cookie})).json.players;
  assert.deepEqual(listed.map(x=>x.username),["charlie"],"Shared guild member visible without friending");
  assert.equal((await api("/accounts/players/"+b.id+"/stats",{cookie:a.cookie})).status,200);
  assert.equal((await api("/accounts/directory",{cookie:c.cookie})).json.players.length,0,
    "Nonmembers cannot see the guild roster through the player directory");

  const accountStore=JSON.parse(await readFile(join(data,"accounts","accounts.json"),"utf8"));
  assert.ok(accountStore.friendRequests && Array.isArray(accountStore.friendRequests),
    "Friend status must persist to account store; no browser-only relationship");
  assert.ok(accountStore.friendRequests.every(x=>x.id!=="") && !accountStore.friendRequests.some(x=>x.status==="accepted"),
    "Unfriending removes accepted relationship without deleting accounts");
  console.log("PASS 4.5.5h Friends privacy: exact handles, pending/accept/decline protection, profile gate, guild peers, admin-only list, persistence");
} finally {server.kill("SIGTERM");await sleep(150);await rm(data,{recursive:true,force:true});}
