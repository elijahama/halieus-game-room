import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { createServer } from "node:http";
import { createSoloTournamentRegistrationCoordinator as create, registerSoloTournamentRegistrationRoutes }
  from "../server/src/platform/soloTournamentRegistration.ts";

const root=await mkdtemp(join(tmpdir(),"hgr-solo-registration-"));
const store=join(root,"tournaments","solo.json");
try {
  const c=create(store);
  await c.load();
  const first=await c.create("host-account","Autumn Solo Invitational");
  assert.equal(first.status,"registration");
  assert.deepEqual(first.entrantAccountIds,["host-account"]);
  assert.deepEqual(first.matches,[]);
  assert.equal(first.startedAt,null);
  assert.deepEqual(c.visible("outsider"),[],"participants only; no enumeration");
  await assert.rejects(c.create("host-account","X"),e=>e.statusCode===400);
  await assert.rejects(c.seed("host-account",first.id),e=>e.statusCode===409);
  await assert.rejects(c.join("host-account",first.id),e=>e.statusCode===409);
  await c.join("entrant-b",first.id);
  await c.join("entrant-c",first.id);
  await assert.rejects(c.seed("entrant-b",first.id),e=>e.statusCode===403);
  const race=await Promise.allSettled([c.join("entrant-d",first.id),c.join("entrant-e",first.id)]);
  assert.equal(race.filter(x=>x.status==="fulfilled").length,1,"no race can exceed four players");
  assert.equal(race.filter(x=>x.status==="rejected").length,1);
  assert.equal(c.visible("entrant-b").length,1);
  const seeded=await c.seed("host-account",first.id);
  assert.equal(seeded.status,"seeded");
  assert.equal(seeded.matches.length,3);
  assert.deepEqual(seeded.matches.map(m=>m.id),["semi-1","semi-2","final"]);
  assert.deepEqual(seeded.matches.map(m=>m.status),["awaiting-room","awaiting-room","awaiting-opponents"]);
  assert.deepEqual(seeded.matches.map(m=>m.winnerAccountId),[null,null,null],
    "not even seeded matches may invent a winner");
  assert.deepEqual(seeded.matches.map(m=>m.roomCode),[null,null,null],"never invent rooms");
  assert.equal(seeded.matches[0].homeAccountId,"host-account");
  assert.equal(seeded.matches[0].awayAccountId,seeded.entrantAccountIds[3]);
  assert.equal(seeded.matches[1].homeAccountId,"entrant-b");
  assert.equal(seeded.matches[1].awayAccountId,"entrant-c");
  await assert.rejects(c.join("late",first.id),e=>e.statusCode===409);
  await assert.rejects(c.leave("entrant-b",first.id),e=>e.statusCode===409);
  await assert.rejects(c.seed("host-account",first.id),e=>e.statusCode===409);
  await assert.rejects(c.cancel("outsider",first.id),e=>e.statusCode===403);
  const restarted=create(store);
  await restarted.load();
  assert.deepEqual(restarted.visible("entrant-c")[0],seeded,
    "reloaded store must preserve exact server-owned bracket and account identities");
  assert.deepEqual(restarted.visible("unrelated"),[]);
  const cancelled=await restarted.cancel("host-account",first.id);
  assert.equal(cancelled.status,"cancelled");
  await assert.rejects(restarted.cancel("host-account",first.id),e=>e.statusCode===409);
  const cleaned=create(store);
  await cleaned.load();
  assert.equal(cleaned.visible("host-account")[0].status,"cancelled");
  assert.deepEqual(JSON.parse(await readFile(store,"utf8")).tournaments[0].matches[2].winnerAccountId,null);
  // Strict restore must not silently reset a corrupted or forged winner.
  const mutated=JSON.parse(await readFile(store,"utf8"));
  mutated.tournaments[0].matches[0].winnerAccountId="forged-winner";
  await writeFile(store,JSON.stringify(mutated));
  const invalid=create(store);
  await assert.rejects(invalid.load(),/Invalid seeded Solo bracket/);
  await assert.rejects(invalid.create("attacker","Overwrite this"),/unavailable/);
  assert.equal(JSON.parse(await readFile(store,"utf8")).tournaments[0].matches[0].winnerAccountId,
    "forged-winner","malformed persisted data must never be replaced by an empty store");

  const originalRoot=process.env.HALIEUS_DATA_DIR;
  // Separate HTTP store path through canonical environment setting.
  const webRoot=join(root,"http");
  process.env.HALIEUS_DATA_DIR=webRoot;
  const app=express();
  app.use(express.json());
  registerSoloTournamentRegistrationRoutes(app,request=>{
    const id=request.get("x-test-account");
    return id ? {id,displayName:id} : null;
  });
  const http=createServer(app);
  await new Promise(resolve=>http.listen(0,"127.0.0.1",resolve));
  try {
    const address=http.address();
    assert.ok(address && typeof address==="object");
    const base="http://127.0.0.1:"+address.port;
    const api=async(path,account,method="GET",body,origin=base)=>{
      const response=await fetch(base+path,{
        method,headers:{
          ...(account?{"x-test-account":account}:{}),
          ...(method!=="GET"?{"content-type":"application/json","origin":origin}:{}),
        },...(body?{body:JSON.stringify(body)}:{}),
      });
      const text=await response.text();
      let data;
      try {data=JSON.parse(text);} catch {data={reason:"Non-JSON route response"};}
      return {status:response.status,data,headers:response.headers};
    };
    assert.equal((await api("/tournaments/solo",null)).status,401);
    assert.equal((await api("/tournaments/solo","guest")).data.tournament.length,0);
    assert.equal((await api("/tournaments/solo","owner","POST",{name:"HTTP tournament"},"https://evil.invalid")).status,403);
    const created=await api("/tournaments/solo","owner","POST",{name:"HTTP tournament"});
    assert.equal(created.status,200);
    assert.equal(created.data.tournament.entrantAccountIds[0],"owner");
    assert.equal(created.headers.get("cache-control"),null,
      "test application does not pretend to install production cache middleware");
    const tid=created.data.tournament.id;
    assert.equal((await api("/tournaments/solo","outsider")).data.tournament.length,0);
    assert.equal((await api("/tournaments/solo/"+tid+"/join","outsider","POST",{})).status,200);
    assert.equal((await api("/tournaments/solo","outsider")).data.tournament.length,1);
    assert.equal((await api("/tournaments/solo/"+tid+"/seed","outsider","POST",{})).status,403);
    assert.equal((await api("/tournaments/solo/"+tid+"/result","outsider","POST",{winnerAccountId:"outsider"})).status,404,
      "no client-controlled result API exists");
  } finally {
    await new Promise((resolve,reject)=>http.close(err=>err?reject(err):resolve()));
    if(originalRoot===undefined) delete process.env.HALIEUS_DATA_DIR;
    else process.env.HALIEUS_DATA_DIR=originalRoot;
  }
  const serverEntry=await readFile(join(process.cwd(),"server","src","index.ts"),"utf8");
  assert.match(serverEntry,/HGR_SOLO_TOURNAMENT_ALPHA === "1"/);
  assert.match(serverEntry,/registerSoloTournamentRegistrationRoutes\(app, getAuthenticatedAccount\)/);
  assert.match(serverEntry,/app\.use\("\/tournaments\/solo"[\s\S]*?Cache-Control"[\s\S]*?"no-store"/);
  console.log("PASS Solo tournament registration: host/auth, max four, deterministic bracket, no fake winners or rooms, durable restore, concurrent join, fail closed, HTTP/CSRF and default-off gate");
} finally {
  await rm(root,{recursive:true,force:true});
}
