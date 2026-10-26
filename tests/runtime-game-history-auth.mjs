import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
const root=await mkdtemp(path.join(tmpdir(),"hgr-history-auth-"));
process.env.HALIEUS_DATA_DIR=root;
process.env.HALIEUS_OWNER_BOOTSTRAP_FILE=path.join(root,"owner.txt");
process.env.ROOM_SAVE_PATH=path.join(root,"rooms.json");
const {loadAccountStore,registerAccountRoutes,getAuthenticatedAccount}=await import("../server/src/platform/accounts.ts");
const {registerGameHistoryRoutes,gameHistory}=await import("../server/src/platform/game-history.ts");
const {registerLobbyHandlers}=await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const {rooms}=await import("../server/src/games/mega-board/state/rooms.ts");
const {createInitialGameState}=await import("../shared/games/mega-board/game-state.ts");
const {archiveCompletedMegaGame}=await import("../server/src/games/mega-board/utils/mega-history.ts");
await loadAccountStore();
const app=express();app.use(express.json());registerAccountRoutes(app);registerGameHistoryRoutes(app,getAuthenticatedAccount);
const server=createServer(app);const io=new Server(server);
io.on("connection",socket=>registerLobbyHandlers(io,socket));
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const sockets=[];
async function api(url,cookie="",body) {
  const res=await fetch(base+url,{method:body?"POST":"GET",headers:{Cookie:cookie,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  return {status:res.status,body:await res.json(),cookie:res.headers.get("set-cookie")?.split(";")[0]??cookie};
}
async function socket(cookie) {
  const s=connect(base,{transports:["websocket"],forceNew:true,extraHeaders:{Cookie:cookie}});
  sockets.push(s);await new Promise((resolve,reject)=>{s.once("connect",resolve);s.once("connect_error",reject);});return s;
}
const send=(s,event,payload)=>new Promise((resolve,reject)=>s.timeout(5000).emit(event,payload,(err,value)=>err?reject(err):resolve(value)));
try {
  const code=(await readFile(process.env.HALIEUS_OWNER_BOOTSTRAP_FILE,"utf8")).match(/OWNER-[A-Z0-9-]+/)[0];
  const owner=await api("/auth/setup-owner","",{bootstrapCode:code,username:"historyowner",displayName:"Original Name",password:"Test-only-password-2026"});
  assert.equal(owner.status,201);
  const host=await socket(owner.cookie);
  const guest=await socket("");
  const created=await send(host,"game:create",{code:"IDENTITY",playerName:"Unrelated display",ranked:false,replayAccountId:"forged"});
  assert.equal(created.ok,true,created.reason);
  const joined=await send(guest,"game:join",{code:"IDENTITY",playerName:"Original Name",replayAccountId:owner.body.account.id});
  assert.equal(joined.ok,true);
  const room=rooms.get("IDENTITY");
  assert.equal(room.players[0].replayAccountId,owner.body.account.id);
  assert.equal(room.players[1].replayAccountId,undefined,"Guests cannot claim accounts through names or payloads");
  assert(!JSON.stringify(created).includes("replayAccountId"));
  const renamed=await api("/auth/profile",owner.cookie,{username:"historyrenamed",displayName:"Changed Name"});
  assert.equal(renamed.status,200);
  room.started=true;room.gameState=createInitialGameState(room.code,room.players);
  room.gameState.phase="finished";room.gameState.turnPhase="finished";room.gameState.winnerId=host.id;
  const id=await archiveCompletedMegaGame(room);
  assert.equal((await api("/game-history",owner.cookie)).body.matches.length,1);
  assert.equal((await api("/game-history/"+id,owner.cookie)).status,200);
  assert.equal((await api("/game-history/"+id)).status,401);
  await api("/auth/logout",owner.cookie,{});
  assert.equal((await api("/game-history/"+id,owner.cookie)).status,401,"Revoked sessions cannot download");
  assert.equal((await gameHistory.list(owner.body.account.id)).matches.length,1);
  console.log("PASS real account cookies + socket joins: server-bound ownership, forged payload/display-name rejection, username change, private lobby response and logout revocation");
} finally {
  for(const socket of sockets)socket.disconnect();
  rooms.clear();await new Promise(resolve=>io.close(resolve));
  await new Promise(resolve=>setTimeout(resolve,1200));
  await rm(root,{recursive:true,force:true});
}
