import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGuildTournamentCoordinator, TournamentError } from "../server/src/platform/guildTournaments.ts";
const dir = await mkdtemp(join(tmpdir(), "hgr-knockout-"));
const file = join(dir, "store.json");
const guilds = new Map(["red","blue","green","gold"].map(id => [id,
  { id, memberIds:[id+"-manager",id+"-player"],managerIds:[id+"-manager"] }]));
const lookup = id => guilds.get(id) ?? null;
const fixtures = new Map();
const game = id => fixtures.get(id) ?? null;
const denied=(promise,code)=>assert.rejects(promise,e=>e instanceof TournamentError && e.statusCode===code);
function receipt(id,home,away,winners=[],status="rooms-bound") {
  const boards = [1,2].map(n=>({boardMatchId:id+"-"+n,roomCode:id+n,roomCreatedAt:n,seatAccountIds:[]}));
  return { id,homeGuildId:home,awayGuildId:away,status,createdAt:Date.now()+5000,boards,
    boardResults:status==="completed"?winners.map((guildId,n)=>({boardMatchId:id+"-"+(n+1),winnerGuildId:guildId,gameStartedAt:Date.now()+5000,completedAt:Date.now()+6000})):[] };
}
try {
  const c=createGuildTournamentCoordinator(file); await c.load();
  await denied(c.create("red-player","red","Mega Cup",lookup),403);
  await denied(c.create("red-manager","red","",lookup),400);
  const t=await c.create("red-manager","red","Mega Guild Cup",lookup);
  await denied(c.start("red-manager",t.id,lookup),409);
  await denied(c.register("blue-player",t.id,"blue",lookup),403);
  for(const id of ["blue","green","gold"]) await c.register(id+"-manager",t.id,id,lookup);
  await denied(c.register("gold-manager",t.id,"gold",lookup),409);
  assert.equal(c.visible("outsider",lookup).length,0);
  assert.equal(c.visible("blue-player",lookup).length,1);
  await denied(c.start("blue-manager",t.id,lookup),403);
  const started=await c.start("red-manager",t.id,lookup);
  assert.deepEqual(started.matches.map(m=>[m.id,m.homeGuildId,m.awayGuildId]),
    [["semi-1","red","gold"],["semi-2","blue","green"],["final",null,null]]);
  await denied(c.start("red-manager",t.id,lookup),409);
  await denied(c.link("green-manager",t.id,"semi-1","fake",lookup,game),403);
  await denied(c.link("red-manager",t.id,"semi-1","fake",lookup,game),409);
  fixtures.set("historical",{...receipt("historical","red","gold",["red","red"],"completed"),createdAt:started.startedAt-1});
  await denied(c.link("red-manager",t.id,"semi-1","historical",lookup,game),409);
  fixtures.set("one",receipt("one","red","gold"));
  fixtures.set("two",receipt("two","blue","green"));
  await c.link("red-manager",t.id,"semi-1","one",lookup,game);
  await c.link("blue-manager",t.id,"semi-2","two",lookup,game);
  await denied(c.link("red-manager",t.id,"semi-1","one",lookup,game),409);
  await c.reconcile(game);
  assert.equal(c.visible("red-player",lookup)[0].matches[2].status,"awaiting-teams");
  fixtures.set("one",receipt("one","red","gold",["red","red"],"completed"));
  fixtures.set("two",receipt("two","blue","green",["green","green"],"completed"));
  await c.reconcile(game);
  assert.deepEqual(c.visible("red-player",lookup)[0].matches[2],
    {id:"final",round:"final",homeGuildId:"red",awayGuildId:"green",fixtureId:null,status:"ready",winnerGuildId:null});
  fixtures.set("last",receipt("last","red","green"));
  await c.link("red-manager",t.id,"final","last",lookup,game);
  fixtures.set("last",receipt("last","red","green",["red","green"],"completed"));
  await c.reconcile(game);
  assert.equal(c.visible("green-player",lookup)[0].matches[2].status,"tied");
  assert.equal(c.visible("green-player",lookup)[0].championGuildId,null);
  const another=await c.create("red-manager","red","Second Cup",lookup);
  for(const id of ["blue","green","gold"])await c.register(id+"-manager",another.id,id,lookup);
  await c.start("red-manager",another.id,lookup);
  fixtures.set("x",receipt("x","red","gold",["gold","gold"],"completed"));
  fixtures.set("y",receipt("y","blue","green",["blue","blue"],"completed"));
  await c.link("gold-manager",another.id,"semi-1","x",lookup,game);
  await c.link("blue-manager",another.id,"semi-2","y",lookup,game);
  await c.reconcile(game);
  fixtures.set("z",receipt("z","gold","blue",["gold","gold"],"completed"));
  await c.link("gold-manager",another.id,"final","z",lookup,game);
  await c.reconcile(game);
  assert.equal(c.visible("gold-player",lookup).find(x=>x.id===another.id).championGuildId,"gold");
  await denied(c.link("gold-manager",another.id,"final","z",lookup,game),409);
  const reloaded=createGuildTournamentCoordinator(file); await reloaded.load();
  assert.equal(reloaded.visible("blue-player",lookup).find(x=>x.id===another.id).status,"completed");
  const pending=await reloaded.create("red-manager","red","Cancel Cup",lookup);
  assert.equal((await reloaded.cancel("red-manager",pending.id,lookup)).status,"cancelled");
  await denied(reloaded.register("blue-manager",pending.id,"blue",lookup),409);
  assert.equal(JSON.parse(await readFile(file,"utf8")).tournaments.length,3);
  await writeFile(file,'{"version":1,"tournaments":[{"id":"bad","status":"unknown"}]}');
  await assert.rejects(createGuildTournamentCoordinator(file).load(),/Invalid persisted Guild tournament/);
  console.log("PASS 4.8 Guild knockout: manager-only four-team registration, verified real-fixture advancement, 1-1 tie hold, champion, dedup, privacy, persistence.");
} finally { await rm(dir,{recursive:true,force:true}); }
