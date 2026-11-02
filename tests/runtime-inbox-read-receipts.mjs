import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const root=await mkdtemp(join(tmpdir(),"hgr-inbox-read-"));
const port=32986,bootstrap=join(root,"OWNER SETUP CODE.txt");
const server=spawn(process.execPath,["--import","tsx","src/index.ts"],{
 cwd:new URL("../server/",import.meta.url),
 env:{...process.env,PORT:String(port),SERVE_CLIENT:"false",HALIEUS_DATA_DIR:root,HALIEUS_OWNER_BOOTSTRAP_FILE:bootstrap},
 stdio:["ignore","pipe","pipe"],
});
let output="";
server.stdout.on("data",v=>output+=v.toString());
server.stderr.on("data",v=>output+=v.toString());
const base="http://127.0.0.1:"+port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(url,{cookie="",method="GET",body}={}){
 const res=await fetch(base+url,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},
 body:body?JSON.stringify(body):undefined});
 let json;try{json=await res.json();}catch{json={};}
 return {status:res.status,json,cookie:res.headers.get("set-cookie")?.split(";")[0]??cookie};
}
try {
 let ready=false;
 for(let i=0;i<90;i++){if(server.exitCode!==null)throw Error("Server exited: "+output);
  try{if((await fetch(base+"/health")).ok){ready=true;break;}}catch{}
  await sleep(150);
 }
 assert(ready,"Server not ready: "+output);
 assert.equal((await api("/accounts/inbox/read")).status,401);
 assert.equal((await api("/accounts/inbox/read",{method:"POST",body:{keys:["room:abc"]}})).status,401);
 const code=(await readFile(bootstrap,"utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0];
 assert(code,"Owner bootstrap code missing");
 const owner=await api("/auth/setup-owner",{method:"POST",body:{
  bootstrapCode:code,username:"owner",displayName:"Owner",password:"owner-secure-password-2026"
 }});
 assert.equal(owner.status,201,JSON.stringify(owner.json));
 const invite=await api("/admin/invites",{cookie:owner.cookie,method:"POST",body:{label:"viewer",expiryDays:7}});
 assert.equal(invite.status,201);
 const viewer=await api("/auth/redeem-invite",{method:"POST",body:{
  inviteCode:invite.json.code,username:"viewer",displayName:"Viewer",password:"viewer-secure-password-2026"
 }});
 assert.equal(viewer.status,201,JSON.stringify(viewer.json));
 const keys=["request:game-request-abcd","room:room-invite-abcd","friend:friend-123","guild-invite:guild-123"];
 const receipt=await api("/accounts/inbox/read",{cookie:viewer.cookie,method:"POST",body:{keys}});
 assert.equal(receipt.status,200,JSON.stringify(receipt.json));
 assert.deepEqual(receipt.json.keys,keys);
 const secondDevice=await api("/accounts/inbox/read",{cookie:viewer.cookie});
 assert.deepEqual(secondDevice.json.keys,keys,"A second signed-in client sees the same durable receipts.");
 assert.deepEqual((await api("/accounts/inbox/read",{cookie:owner.cookie})).json.keys,[],
  "Another authenticated account has its own unread state.");
 const again=await api("/accounts/inbox/read",{cookie:viewer.cookie,method:"POST",body:{keys:[keys[0],keys[0]]}});
 assert.equal(again.status,200);
 assert.deepEqual(again.json.keys,keys,"Read operations are idempotent.");
 assert.equal((await api("/accounts/inbox/read",{cookie:viewer.cookie,method:"POST",body:{keys:["unexpected:value"]}})).status,400);
 assert.equal((await api("/accounts/inbox/read",{cookie:viewer.cookie,method:"POST",body:{keys:new Array(181).fill(keys[0])}})).status,400);
 const onDisk=JSON.parse(await readFile(join(root,"accounts","accounts.json"),"utf8"));
 assert.deepEqual(onDisk.inboxReadKeys[viewer.json.account.id],keys,"Read state persisted to durable account store.");
 assert.deepEqual(onDisk.inboxReadKeys[owner.json.account.id]??[],[]);
 console.log("PASS inbox read API: authentication, per-account isolation, idempotence, bounded keys and disk persistence.");
}finally{
 server.kill("SIGTERM");
 await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once("exit",resolve);setTimeout(resolve,2500).unref?.();});
 await rm(root,{recursive:true,force:true});
}
