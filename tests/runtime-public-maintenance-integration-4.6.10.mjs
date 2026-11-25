import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
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
 const futureStart = (Math.ceil(Date.now() / 60_000) + 6) * 60_000;
 const scheduleBody = {
   confirmation:"SCHEDULE PUBLIC MAINTENANCE",
   startLocal:new Date(futureStart).toISOString().slice(0,16),
   startTimeZone:"UTC",
   endLocal:new Date(futureStart+2*60*60*1000).toISOString().slice(0,16),
   endTimeZone:"Europe/London",
   reason:"Explicit scheduled window",
 };
 // End is in a different zone, so the server—not the client—must resolve it.
 const endInLondon = new Date(futureStart+2*60*60*1000).toLocaleString("sv-SE",{
   timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false
 }).replace(" ","T");
 scheduleBody.endLocal=endInLondon;
 assert.equal((await request("/admin/public-access/schedule",{method:"POST",body:scheduleBody})).status,403,
   "Anonymous callers cannot schedule maintenance");
 assert.equal((await request("/admin/public-access/schedule",{cookie,method:"POST",
   origin:"https://evil.example",body:scheduleBody})).status,403,"Cross-site schedule must be rejected");
 const invalidZone=await request("/admin/public-access/schedule",{cookie,method:"POST",
   body:{...scheduleBody,startTimeZone:"Mars/Olympus"}});
 assert.equal(invalidZone.status,400,"Unsupported time zone must be rejected");
 const newSchedule=await request("/admin/public-access/schedule",{cookie,method:"POST",body:scheduleBody});
 assert.equal(newSchedule.status,200,"Owner can set exact future closure: "+JSON.stringify(newSchedule.json));
 assert.equal(newSchedule.json.state.closed,false,"Scheduling must not immediately close visitors");
 assert.equal(newSchedule.json.state.scheduledWindow.startAt,futureStart);
 assert.equal(newSchedule.json.state.scheduledWindow.endAt,futureStart+2*60*60*1000);
 assert.equal(newSchedule.json.state.scheduledWindow.startTimeZone,"UTC");
 assert.equal(newSchedule.json.state.scheduledWindow.endTimeZone,"Europe/London");
 assert.equal((await request("/")).status,200,"Public game remains open until the precise start");
 const pendingClose=await request("/admin/public-access",{cookie,method:"POST",
   body:{state:"closed",confirmation:"CLOSE PUBLIC GAME ROOM"}});
 assert.equal(pendingClose.status,409,"Immediate Close cannot silently discard a pending window");
 assert.equal((await request("/admin/public-access/schedule",{cookie,method:"POST",
   body:scheduleBody})).status,409,"Duplicate schedule requires cancellation first");
 assert.equal((await request("/admin/public-access/schedule/cancel",{cookie,method:"POST",
   body:{confirmation:"WRONG"}})).status,409,"Cancellation requires confirmation");
 const cancel=await request("/admin/public-access/schedule/cancel",{cookie,method:"POST",
   body:{confirmation:"CANCEL PUBLIC MAINTENANCE"}});
 assert.equal(cancel.status,200,"Owner can cancel a pending window");
 assert.equal(cancel.json.state.scheduledWindow,null);
 assert.equal((await request("/")).status,200,"Cancellation must not close the website");
  const closed=await request("/admin/public-access",{cookie,method:"POST",
  body:{state:"closed",confirmation:"CLOSE PUBLIC GAME ROOM",reason:"Planned & approved <test>"}});
 assert.equal(closed.status,200,"Owner can close empty server: "+JSON.stringify(closed.json));
 assert.equal(closed.json.state.closed,true);
 assert.equal(closed.json.state.reopenAt,null,"Immediate Close is manual; generic auto-expiry is removed");
 const visitor=await request("/");
 assert.equal(visitor.status,503);
 assert.match(visitor.text,/Game Room is temporarily closed/);
 assert.match(visitor.text,/Planned &amp; approved &lt;test&gt;/,"Owner HTML escaped");
 assert.doesNotMatch(visitor.text,/Scheduled reopening:/,"Immediate manual Close must not promise a generic timer");
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
 // Control room operations on the actual authenticated HTTP/socket server.
 const bulkStatus=()=>request("/admin/rooms/bulk-status",{cookie});
 const bulkClose=(count,origin=base,confirmation="CLOSE ALL GAME ROOMS")=>request("/admin/rooms/close-all-control",{cookie,origin,method:"POST",body:{expectedRooms:count,confirmation}});
 assert.equal((await request("/admin/rooms/bulk-status")).status,403);
 assert.equal((await request("/admin/rooms/close-all-control",{method:"POST",origin:base,body:{expectedRooms:1,confirmation:"CLOSE ALL GAME ROOMS"}})).status,403);
 const spar=await emit(guest,"spar:create",{code:"SPHTTP",playerName:"SparHost"});
 assert.equal(spar.ok,true);
 const sparBody={code:"SPHTTP",createdAt:spar.state.createdAt,confirmation:"CLOSE SPAR ROOM"};
 const sparClose=(body,origin=base)=>request("/admin/rooms/close-spar",{cookie,origin,method:"POST",body});
 assert.equal((await request("/admin/rooms/close-spar",{origin:base,method:"POST",body:sparBody})).status,403);
 assert.equal((await sparClose(sparBody,"https://evil.example")).status,403);
 assert.equal((await sparClose({...sparBody,createdAt:sparBody.createdAt-1})).status,409);
 assert.equal((await sparClose(sparBody)).json.closed,1);
 assert.equal((await sparClose(sparBody)).status,409);
 // Individual cancellation must retain a different game's room with the same code.
 const ludo=await emit(guest,"ludo:create",{code:"SAME12",playerName:"LudoHost",matchMode:"casual"});
 const c4=await emit(guest,"connect-four:create",{code:"SAME12",playerName:"ConnectHost",matchMode:"casual"});
 assert.equal(ludo.ok,true);assert.equal(c4.ok,true);
 const observer=await connect();
 try {
   assert.equal((await emit(observer,"connect-four:spectate",{code:"SAME12",playerName:"Viewer"})).ok,true);
   const oneBody={game:"connect-four",code:"SAME12",createdAt:c4.state.createdAt,confirmation:"CLOSE GAME ROOM"};
   const closeOne=(body,origin=base)=>request("/admin/rooms/close-one",{cookie,origin,method:"POST",body});
   assert.equal((await request("/admin/rooms/close-one",{origin:base,method:"POST",body:oneBody})).status,403);
   assert.equal((await closeOne(oneBody,"https://evil.example")).status,403);
   assert.equal((await closeOne({...oneBody,createdAt:oneBody.createdAt-1})).status,409);
   const notice=new Promise(resolve=>observer.once("platform:room-closed",resolve));
   const closed=await closeOne(oneBody);
   assert.equal(closed.status,200,JSON.stringify(closed.json));
   assert.equal(closed.json.game,"connect-four");
   const event=await Promise.race([notice,sleep(3000).then(()=>null)]);
   assert.equal(event?.code,"SAME12");assert.equal(event?.game,"connect-four");
   assert.equal((await closeOne(oneBody)).status,409);
   assert.equal((await emit(guest,"connect-four:reconnect",{code:"SAME12",reconnectToken:c4.reconnectToken})).ok,false);
   assert.equal((await emit(guest,"ludo:reconnect",{code:"SAME12",reconnectToken:ludo.reconnectToken})).ok,true);
   const ludoBody={...oneBody,game:"ludo",createdAt:ludo.state.createdAt};
   assert.equal((await closeOne(ludoBody)).json.closed,1);
   assert.equal((await emit(guest,"ludo:reconnect",{code:"SAME12",reconnectToken:ludo.reconnectToken})).ok,false);
   const archiveDir=join(dir,"sessions","finalized");
   const archiveFiles=await readdir(archiveDir);
   for(const game of ["connect-four","ludo"]){
     const filename=archiveFiles.find(name=>name.startsWith(game+"-SAME12-")&&name.endsWith(".json"));
     assert.ok(filename,"Cancelled room must have a durable archive");
     const archived=JSON.parse(await readFile(join(archiveDir,filename),"utf8"));
     assert.equal(archived.status,"incomplete");assert.equal(archived.summary.winner,null);
     assert.equal(archived.summary.cancellation,"owner-closed");
   }
 } finally { observer.disconnect(); }
 const ranked=await emit(guest,"connect-four:create",{code:"RANKCL",playerName:"RankHost",matchMode:"ranked"});
 assert.equal(ranked.ok,true);
 assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{game:"connect-four",code:"RANKCL",createdAt:ranked.state.createdAt,confirmation:"CLOSE GAME ROOM"}})).status,409);
 await emit(guest,"connect-four:leave",{code:"RANKCL"});
 const protectedRooms=await bulkStatus();
 assert(protectedRooms.json.protected>=1,"Disconnected Ranked recovery room must remain protected");
 assert.equal((await bulkClose(protectedRooms.json.count)).status,409);
 assert.equal((await request("/admin/rooms/close-all",{cookie,origin:base,method:"POST"})).status,409,"Legacy path must also protect competitive rooms");
 assert.equal((await emit(guest,"connect-four:reconnect",{code:"RANKCL",reconnectToken:ranked.reconnectToken})).ok,true);
 assert.equal((await emit(guest,"connect-four:end-game",{code:"RANKCL"})).ok,true);
 const casual=await emit(guest,"spar:create",{code:"BULKSP",playerName:"SparHost"});
 assert.equal(casual.ok,true);
 const snapshot=await bulkStatus();
 assert.equal(snapshot.json.protected,0);
 assert(snapshot.json.count>=1);
 assert.equal((await bulkClose(snapshot.json.count,"https://evil.example")).status,403);
 assert.equal((await bulkClose(snapshot.json.count,base,"WRONG")).status,403);
 assert.equal((await bulkClose(snapshot.json.count+1)).status,409);
 const closedRooms=await bulkClose(snapshot.json.count);
 assert.equal(closedRooms.status,200,JSON.stringify(closedRooms.json));
 assert.equal(closedRooms.json.closed,snapshot.json.count);
 assert.equal((await bulkStatus()).json.count,0);
 assert.equal((await emit(guest,"spar:reconnect",{code:"BULKSP",reconnectToken:casual.reconnectToken})).ok,false);
 assert.equal((await request("/health")).status,200,"Game closure never stops the server");
 console.log("PASS Control room HTTP: owner and Origin checks, targeted Spar, offline Ranked protection, count confirmation, guarded bulk closure");
 // Card-table cancellations preserve archive status and reject Ranked tables.
 for(const game of ["poker","blackjack","whot"]){
   const code="CARD12";
   const created=await emit(guest,game+":create",{code,playerName:"CardHost",matchMode:"casual"});
   assert.equal(created.ok,true,game+" create");
   assert.equal((await emit(guest,game+":add-ai",{code,difficulty:"normal"})).ok,true);
   if(game==="poker")assert.equal((await emit(guest,game+":start",{code})).ok,true);
   const body={game,code,createdAt:created.state.createdAt,confirmation:"CLOSE GAME ROOM"};
   const notice=new Promise(resolve=>guest.once("platform:room-closed",resolve));
   const result=await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body});
   assert.equal(result.status,200,game+" cancellation "+JSON.stringify(result.json));
   assert.equal((await Promise.race([notice,sleep(3000).then(()=>null)]))?.game,game);
   assert.equal((await emit(guest,game+":reconnect",{code,reconnectToken:created.reconnectToken})).ok,false);
   const archiveDir=join(dir,"sessions","finalized");
   const filename=(await readdir(archiveDir)).find(name=>name.startsWith(game+"-"+code+"-")&&name.endsWith(".json"));
   assert.ok(filename,game+" cancellation archive");
   const archived=JSON.parse(await readFile(join(archiveDir,filename),"utf8"));
   assert.equal(archived.status,"incomplete");assert.equal(archived.summary.winner,null);
   assert.equal(archived.summary.cancellation,"owner-closed");
   const rankedCard=await emit(guest,game+":create",{code:"RANK12",playerName:"RankHost",matchMode:"ranked"});
   assert.equal(rankedCard.ok,true);
   assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{...body,code:"RANK12",createdAt:rankedCard.state.createdAt}})).status,409);
 }
 // Remaining standalone game adapters: protected mode, cancellation receipts and archive truth.
 for(const game of ["ayo","hidden-dictator","word-board"]){
   const code="BOARD9";
   const created=await emit(guest,game+":create",{code,playerName:"BoardHost",matchMode:"casual"});
   assert.equal(created.ok,true,game+" create");
   const body={game,code,createdAt:created.state.createdAt,confirmation:"CLOSE GAME ROOM"};
   const notice=new Promise(resolve=>guest.once("platform:room-closed",resolve));
   const result=await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body});
   assert.equal(result.status,200,game+" cancellation "+JSON.stringify(result.json));
   assert.equal((await Promise.race([notice,sleep(3000).then(()=>null)]))?.game,game);
   assert.equal((await emit(guest,game+":reconnect",{code,reconnectToken:created.reconnectToken})).ok,false);
   const archiveDir=join(dir,"sessions","finalized");
   const filename=(await readdir(archiveDir)).find(name=>name.startsWith(game+"-"+code+"-")&&name.endsWith(".json"));
   assert.ok(filename,game+" cancellation archive");
   const archived=JSON.parse(await readFile(join(archiveDir,filename),"utf8"));
   assert.equal(archived.status,"incomplete");assert.equal(archived.summary.winner,null);
   assert.equal(archived.summary.cancellation,"owner-closed");
   const rankedBoard=await emit(guest,game+":create",{code:"RANKB9",playerName:"RankHost",matchMode:"ranked"});
   assert.equal(rankedBoard.ok,true);
   assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{...body,code:"RANKB9",createdAt:rankedBoard.state.createdAt}})).status,409);
 }
 // Shared engines must cancel the exact game, not another game's room.
 for(const [game,code] of [["cheat","CLASS1"],["dominoes","CLASS2"],["word-game","WORDS1"],["password","WORDS1"],["anagrams-race","WORDS1"]]){
   const created=await emit(guest,game+":create",{code,playerName:"SharedHost",matchMode:"casual",wordGameMode:"practice"});
   assert.equal(created.ok,true,game+" create");
   const body={game,code,createdAt:created.state.createdAt,confirmation:"CLOSE GAME ROOM"};
   if(game==="cheat"){
     const wrong=await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{...body,game:"dominoes"}});
     assert.equal(wrong.status,409);
   }
   if(game==="word-game")assert.equal((await emit(guest,game+":start",{code})).ok,true);
   const notice=new Promise(resolve=>guest.once("platform:room-closed",resolve));
   const result=await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body});
   assert.equal(result.status,200,game+" cancellation "+JSON.stringify(result.json));
   assert.equal((await Promise.race([notice,sleep(3000).then(()=>null)]))?.game,game);
   assert.equal((await emit(guest,game+":reconnect",{code,reconnectToken:created.reconnectToken})).ok,false);
   const archiveDir=join(dir,"sessions","finalized");
   const filename=(await readdir(archiveDir)).find(name=>name.startsWith(game+"-"+code+"-")&&name.endsWith(".json"));
   assert.ok(filename,game+" cancellation archive");
   const archived=JSON.parse(await readFile(join(archiveDir,filename),"utf8"));
   assert.equal(archived.status,"incomplete");assert.equal(archived.summary.winner,null);
   assert.equal(archived.summary.cancellation,"owner-closed");
   if(game==="cheat"||game==="dominoes")assert.equal(archived.summary.countsAsCompletedPlay,false);
   const rankedCode=game==="cheat"?"RCLASS":game==="dominoes"?"RCLAS2":"RWORDS";
   const rankedShared=await emit(guest,game+":create",{code:rankedCode,playerName:"RankHost",matchMode:"ranked",wordGameMode:"practice"});
   assert.equal(rankedShared.ok,true);
   assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{...body,code:rankedCode,createdAt:rankedShared.state.createdAt}})).status,409);
 }
 // Mega Board closure uses exact live identity and must not end other games.
 const boardCode="MEGACLOSE";
 const board=await emit(guest,"game:create",{code:boardCode,playerName:"MegaHost",ranked:false});
 assert.equal(board.ok,true);
 const otherTable=await emit(guest,"poker:create",{code:"OTHER1",playerName:"OtherHost",matchMode:"casual"});
 assert.equal(otherTable.ok,true);
 const boardInfo=(await request("/accounts/live-games",{cookie})).json.rooms.find(r=>r.game==="mega-board"&&r.code===boardCode);
 assert.ok(boardInfo);
 const boardBody={game:"mega-board",code:boardCode,createdAt:boardInfo.createdAt,confirmation:"CLOSE GAME ROOM"};
 assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{...boardBody,createdAt:boardBody.createdAt-1}})).status,409);
 let legacyEnded=false;guest.once("game:ended",()=>{legacyEnded=true;});
 const boardNotice=new Promise(resolve=>guest.once("platform:room-closed",resolve));
 assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:boardBody})).status,200);
 assert.equal((await Promise.race([boardNotice,sleep(3000).then(()=>null)]))?.game,"mega-board");
 assert.equal(legacyEnded,false,"Targeted cancellation must not trigger the legacy reset");
 assert.equal((await emit(guest,"game:reconnect",{code:boardCode,reconnectToken:board.reconnectToken})).ok,false);
 assert.equal((await emit(guest,"poker:reconnect",{code:"OTHER1",reconnectToken:otherTable.reconnectToken})).ok,true);
 const boardArchive=(await readdir(join(dir,"sessions","finalized"))).find(n=>n.startsWith("mega-board-"+boardCode+"-")&&n.endsWith(".json"));
 assert.ok(boardArchive);
 const cancelledBoard=JSON.parse(await readFile(join(dir,"sessions","finalized",boardArchive),"utf8"));
 assert.equal(cancelledBoard.status,"incomplete");assert.equal(cancelledBoard.summary.winner,null);
 assert.equal(cancelledBoard.summary.cancellation,"owner-closed");
 assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:boardBody})).status,409);
 const rankedMega=await emit(guest,"game:create",{code:"MEGARANK",playerName:"RankHost",ranked:true});
 assert.equal(rankedMega.ok,true);
 const rankedInfo=(await request("/accounts/live-games",{cookie})).json.rooms.find(r=>r.game==="mega-board"&&r.code==="MEGARANK");
 assert.ok(rankedInfo);
 assert.equal((await request("/admin/rooms/close-one",{cookie,origin:base,method:"POST",body:{...boardBody,code:"MEGARANK",createdAt:rankedInfo.createdAt}})).status,409);
 guest.disconnect();
 console.log("PASS HGR 4.6.10 live local HTTP/Socket.io: owner-only auth, CSRF, typed confirmation, occupied room 409, 503 visitor page, Control continuity, owner socket bypass and reopening");
} finally {
 host?.disconnect();ownerControl?.disconnect();
 server.kill("SIGTERM");await sleep(220);
 if(server.exitCode===null)server.kill("SIGKILL");
 await rm(dir,{recursive:true,force:true});
}
