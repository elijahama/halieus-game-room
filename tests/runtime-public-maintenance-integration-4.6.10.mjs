import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io } from "socket.io-client";

const dir = await mkdtemp(join(tmpdir(),"hgr-visitor-gate-integration-"));
const bootstrap = join(dir,"OWNER SETUP CODE.txt");
const port = 35000 + Math.floor(Math.random()*1400);
const base="http://127.0.0.1:"+port;
const server = spawn(process.execPath,["--import","tsx","src/index.ts"],{
  cwd:new URL("../server/",import.meta.url),
  env:{...process.env,HALIEUS_DATA_DIR:dir,HALIEUS_OWNER_BOOTSTRAP_FILE:bootstrap,
    PORT:String(port),SERVE_CLIENT:"false"},
  stdio:["ignore","pipe","pipe"],
});
let output="";
server.stdout.on("data",part=>output+=part.toString());
server.stderr.on("data",part=>output+=part.toString());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(path,{cookie="",method="GET",body,origin}={}){
 const res=await fetch(base+path,{
   method,
   headers:{...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{}),
     ...(origin?{Origin:origin}:{})},
   body:body?JSON.stringify(body):undefined,
 });
 const text=await res.text();
 let json;try{json=JSON.parse(text)}catch{json=null}
 return {status:res.status,json,text,cache:res.headers.get("cache-control"),cookie:res.headers.get("set-cookie")?.split(";")[0]??cookie};
}
function connect(opts={}){
 return new Promise((resolve,reject)=>{
  const socket=io(base,{transports:["websocket"],forceNew:true,reconnection:false,timeout:4000,...opts});
  socket.once("connect",()=>resolve(socket));
  socket.once("connect_error",err=>{socket.disconnect();reject(err)});
 });
}
function rejectConnect(opts={}){
 return new Promise((resolve,reject)=>{
  const socket=io(base,{transports:["websocket"],forceNew:true,reconnection:false,timeout:4000,...opts});
  const timer=setTimeout(()=>{socket.disconnect();reject(Error("Public socket never rejected"))},5000);
  socket.once("connect",()=>{clearTimeout(timer);socket.disconnect();reject(Error("Unexpected public connection"))});
  socket.once("connect_error",err=>{clearTimeout(timer);socket.disconnect();resolve(err)});
 });
}
const emit=(s,name,payload)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error("Timed out "+name)),5000);
 s.emit(name,payload,ack=>{clearTimeout(timer);resolve(ack)});
});
let host=null, ownerControl=null;
try {
 let ready=false;
 for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error("Server exited: "+output);
  try{if((await fetch(base+"/health")).ok){ready=true;break}}catch{}
  await sleep(150);
 }
 assert(ready,"Public maintenance fixture server failed: "+output);
 assert.equal((await request("/")).status,200,"Default public site is open");
 assert.equal((await request("/admin/public-access")).status,403,"Guest cannot see operator controls");
 const token=(await readFile(bootstrap,"utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0];
 assert(token);
 const created=await request("/auth/setup-owner",{method:"POST",body:{
  bootstrapCode:token,username:"owner",displayName:"Owner",password:"secure-owner-password-2026"}});
 assert.equal(created.status,201,JSON.stringify(created.json));
 const cookie=created.cookie;
 const initial=await request("/admin/public-access",{cookie});
 assert.equal(initial.status,200);
 assert.equal(initial.json.state.closed,false);
 assert.equal((await request("/admin/public-access",{cookie,method:"POST",body:{
  state:"closed",confirmation:"NO"}})).status,409,"Unconfirmed close rejected");
 assert.equal((await request("/admin/public-access",{cookie,origin:"https://evil.example",
  method:"POST",body:{state:"closed",confirmation:"CLOSE PUBLIC GAME ROOM"}})).status,403,"Cross-site mutation rejected");

 host=await connect();
 const started=await emit(host,"connect-four:create",{
  code:"MNT411",playerName:"FixtureHost",matchMode:"casual",bestOf:1,
 });
 assert.equal(started.ok,true,"Fixture active game created: "+JSON.stringify(started));
 const busy=await request("/admin/public-access",{cookie,method:"POST",
  body:{state:"closed",confirmation:"CLOSE PUBLIC GAME ROOM",reason:"Planned downtime"}});
 assert.equal(busy.status,409,"Public closure cannot interrupt active game");
 assert(busy.json.activeRooms>0,"Live-room count must be authoritative");
 assert.equal((await request("/")).status,200,"Denied closure leaves public site open");
 host.disconnect();host=null;
 await sleep(150);
 const badWindow=await request("/admin/public-access",{cookie,method:"POST",
  body:{state:"closed",confirmation:"CLOSE PUBLIC GAME ROOM",reopenAt:Date.now()+1000}});
 assert.equal(badWindow.status,400,"An invalid reopening deadline is rejected");
 assert.equal((await request("/")).status,200,"Invalid schedule does not close visitors");
 const deadline=Date.now()+90_000;
 const closed=await request("/admin/public-access",{cookie,method:"POST",
  body:{state:"closed",confirmation:"CLOSE PUBLIC GAME ROOM",reason:"Planned & approved <test>",reopenAt:deadline}});
 assert.equal(closed.status,200,"Owner can close empty server: "+JSON.stringify(closed.json));
 assert.equal(closed.json.state.closed,true);
 assert.equal(closed.json.state.reopenAt,deadline,"Deadline returned to owner Control");
 const visitor=await request("/");
 assert.equal(visitor.status,503);
 assert.match(visitor.text,/Game Room is temporarily closed/);
 assert.match(visitor.text,/Planned &amp; approved &lt;test&gt;/,"Owner HTML escaped");
 assert.match(visitor.text,/Scheduled reopening:/,"Visitor sees scheduled reopening time");
 assert.match(visitor.text,/id="controlLogin"/,"Owner can sign in to Control while public closed");
 assert.match(visitor.text,/href="\/control\/"/,"Control link remains available");
 assert.match(visitor.cache,/no-store/);
 assert.equal((await request("/health")).status,200,"Health stays online during visitor closure");
 assert.equal((await request("/auth/status")).status,200,"Owner login API remains reachable");
 assert.equal((await request("/admin/public-access",{cookie})).json.state.closed,true,"Authenticated owner can query gate");

 const refused=await rejectConnect();
 assert.match(refused.message,/temporarily closed/);
 const spoof=await rejectConnect({auth:{hgrControl:true}});
 assert.match(spoof.message,/temporarily closed/,"Untrusted Control flag grants no bypass");
 ownerControl=await connect({extraHeaders:{Cookie:cookie},auth:{hgrControl:true}});
 assert.equal(ownerControl.connected,true,"Only real owner Control socket remains connected");

 const open=await request("/admin/public-access",{cookie,method:"POST",
  body:{state:"open",confirmation:"REOPEN PUBLIC GAME ROOM"}});
 assert.equal(open.status,200,"Owner can reopen");
 assert.equal(open.json.state.closed,false);
 assert.equal(open.json.state.reopenAt,null,"Owner reopening clears the deadline");
 assert.equal((await request("/")).status,200,"Public page restored after reopening");
 const guest=await connect();
 assert(guest.connected,"Game sockets allowed after reopen");
 guest.disconnect();
 console.log("PASS HGR 4.6.10 live local HTTP/Socket.io: owner-only auth, CSRF, typed confirmation, occupied room 409, 503 visitor page, Control continuity, owner socket bypass and reopening");
} finally {
 host?.disconnect();ownerControl?.disconnect();
 server.kill("SIGTERM");await sleep(220);
 if(server.exitCode===null)server.kill("SIGKILL");
 await rm(dir,{recursive:true,force:true});
}
