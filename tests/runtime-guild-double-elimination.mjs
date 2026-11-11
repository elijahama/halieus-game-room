import assert from "node:assert/strict";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve,sep} from "node:path";
const root=await mkdtemp(join(tmpdir(),"hgr-guild-double-"));
process.env.HALIEUS_DATA_DIR=root;
process.env.ROOM_SAVE_PATH=join(root,"rooms.json");
const {rooms}=await import("../server/src/games/mega-board/state/rooms.ts");
const {createGuildFixtureCoordinator}=await import("../server/src/platform/guildFixtures.ts");
const {createGuildTournamentCoordinator}=await import("../server/src/platform/guildTournaments.ts");
const guilds=new Map(["A","B","C","D"].map(id=>[id,{id,managerIds:[id+"m"],memberIds:[id+"m",id+"1",id+"2"]}]));
const lookup=id=>guilds.get(id)??null;
let number=0;
function roomFor(accounts){
  const code="GUILD"+String(++number).padStart(4,"0"),now=Date.now();
  const players=accounts.map((id,j)=>({id:code+"-"+j,replayAccountId:id,name:id,isHost:j===0,isConnected:true,isAi:false,hasLeft:false}));
  const room={code,hostId:players[0].id,players,createdAt:now,updatedAt:now,started:false,gameState:null,ranked:false,blitz:false};
  rooms.set(code,room);return room;
}
async function finish(fixtures,room,winnerGuild){
  room.started=true;
  room.gameState={roomCode:room.code,gameStartedAt:Date.now(),phase:"finished",winnerId:room.players.find(p=>p.replayAccountId.startsWith(winnerGuild)).id,
    players:room.players.map(p=>({id:p.id,isAi:false}))};
  return fixtures.recordFinishedGame(room,room.gameState);
}
try{
  for(const resetWinner of [null,"A","B"]){
    const file=join(root,"bracket-"+String(resetWinner)+".json"),fixtureFile=join(root,"fixtures-"+String(resetWinner)+".json");
    let c=createGuildTournamentCoordinator(file),f=createGuildFixtureCoordinator(fixtureFile);await c.load();await f.load();
    let t=await c.create("Am","A","Guild double elimination",lookup,"four-guild-double-elimination");
    for(const id of ["B","C","D"])await c.register(id+"m",t.id,id,lookup);
    t=await c.start("Am",t.id,lookup);
    const order=["semi-1","semi-2","winners-final","losers-1","losers-final","grand-final",...(resetWinner?["reset-final"]:[])];
    const choices=["A","B","A","D","B",resetWinner?"B":"A",resetWinner];
    const losses={A:0,B:0,C:0,D:0};
    let earlierFixture=null;
    for(let i=0;i<order.length;i++){
      const m=t.matches.find(row=>row.id===order[i]);assert.equal(m.status,"ready");
      assert.ok(losses[m.homeGuildId]<2 && losses[m.awayGuildId]<2);
      const home=m.homeGuildId,away=m.awayGuildId;
      const fixture=await f.propose(home+"m",home,away,[[home+"1"],[home+"2"]],lookup);
      await f.accept(away+"m",fixture.id,[[away+"1"],[away+"2"]],lookup);
      const one=roomFor([home+"1",away+"1"]),two=roomFor([home+"2",away+"2"]);
      await f.bindRooms(home+"m",fixture.id,[one.code,two.code],lookup);
      if(m.id==="grand-final")await assert.rejects(c.link(home+"m",t.id,m.id,earlierFixture,lookup,id=>f.getForTournament(id)),/already assigned/);
      await c.link(home+"m",t.id,m.id,fixture.id,lookup,id=>f.getForTournament(id));
      if(m.id==="winners-final")earlierFixture=fixture.id;
      const split=m.id==="losers-final";
      await finish(f,one,split?home:choices[i]);const originals=await finish(f,two,split?away:choices[i]);
      await c.reconcile(id=>f.getForTournament(id));
      if(split){
        assert.equal(c.visible("Am",lookup)[0].matches.find(row=>row.id===m.id).status,"tied");
        await f.nominateTiebreaker(home+"m",fixture.id,home,home+"1",lookup);
        await f.nominateTiebreaker(away+"m",fixture.id,away,away+"2",lookup);
        const decider=roomFor([home+"1",away+"2"]);
        await f.bindTiebreaker(home+"m",fixture.id,decider.code,lookup);
        const settled=await finish(f,decider,choices[i]);
        assert.deepEqual(settled.boardResults,originals.boardResults);
        assert.deepEqual(await f.recordFinishedGame(decider,decider.gameState),settled);
        await c.reconcile(id=>f.getForTournament(id));
      }
      t=c.visible("Am",lookup)[0];
      assert.equal(t.matches.find(row=>row.id===m.id).winnerGuildId,choices[i]);
      losses[choices[i]===home?away:home]++;
      c=createGuildTournamentCoordinator(file);f=createGuildFixtureCoordinator(fixtureFile);await c.load();await f.load();
      assert.deepEqual(c.visible("Am",lookup)[0],t,"bracket survives every round restart");
      await c.reconcile(id=>f.getForTournament(id));assert.deepEqual(c.visible("Am",lookup)[0],t,"reconciliation does not duplicate settled results");
      if(m.id==="grand-final" && resetWinner){assert.equal(t.status,"active");assert.equal(t.championGuildId,null);}
    }
    assert.equal(t.status,"completed");assert.equal(t.championGuildId,resetWinner??"A");
    assert.equal(t.matches.find(m=>m.id==="reset-final").status,resetWinner?"completed":"not-required");
    for(const [id,count]of Object.entries(losses))assert.ok(id===t.championGuildId?count<2:count===2,"second loss eliminates each other Guild");
    const tampered=JSON.parse(await readFile(file,"utf8"));tampered.tournaments[0].matches.find(m=>m.id==="losers-final").homeGuildId="D";
    await writeFile(file,JSON.stringify(tampered));await assert.rejects(createGuildTournamentCoordinator(file).load(),/bracket seats/);
    rooms.clear();
  }
  console.log("PASS Guild double elimination: verified two-board fixtures plus decider, both reset winners, no-reset champion, second-loss elimination, fixture reuse refusal, per-round restart and tamper refusal");
}finally{rooms.clear();assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});}
