import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { soloMatchPlan, soloChampion } from "../shared/platform/soloTournaments.ts";
const format="four-player-double-elimination";
// Exhaust all possible winners, proving a champion never eliminates a one-loss opponent.
let paths=0;
function explore(matches, losses={A:0,B:0,C:0,D:0}) {
  const plan=soloMatchPlan(format,["A","B","C","D"],matches);
  const next=plan.find(m=>m.homeAccountId && !matches.some(r=>r.id===m.id));
  if(!next) {
    const champion=soloChampion(format,matches);
    assert.ok(champion);
    for(const [account,count] of Object.entries(losses)) assert.equal(count,account===champion?losses[champion]:2);
    assert.ok(losses[champion]<2);
    paths++; return;
  }
  for(const winner of [next.homeAccountId,next.awayAccountId]) {
    const loser=winner===next.homeAccountId?next.awayAccountId:next.homeAccountId;
    assert.ok(losses[winner]<2 && losses[loser]<2,"eliminated entrant cannot play again");
    explore([...matches,{...next,status:"completed",winnerAccountId:winner}],{...losses,[loser]:losses[loser]+1});
  }
}
explore([]);
assert.equal(paths,96);
const root=await mkdtemp(join(tmpdir(),"hgr-solo-double-"));
process.env.HALIEUS_DATA_DIR=root;
process.env.ROOM_SAVE_PATH=join(root,"rooms.json");
const { rooms }=await import("../server/src/games/mega-board/state/rooms.ts");
const { createSoloTournamentRegistrationCoordinator }=await import("../server/src/platform/soloTournamentRegistration.ts");
try {
  for(const resetWinner of [null,"A","B"]) {
    const file=join(root,"bracket-"+String(resetWinner)+".json");
    const c=createSoloTournamentRegistrationCoordinator(file);await c.load();
    let t=await c.create("A","Double elimination",format);
    for(const id of ["B","C","D"])t=await c.join(id,t.id);
    t=await c.seed("A",t.id);
    const order=["semi-1","semi-2","winners-final","losers-1","losers-final","grand-final",...(resetWinner?["reset-final"]:[])];
    const choices=["A","B","A","D","B",resetWinner?"B":"A",resetWinner];
    for(let i=0;i<order.length;i++) {
      const m=t.matches.find(row=>row.id===order[i]);
      assert.equal(m.status,"awaiting-room");
      const code="D"+String(resetWinner??"N")+String(i)+"ROOM";
      const now=Date.now();
      const players=[m.homeAccountId,m.awayAccountId].map((account,j)=>({
        id:code+"-"+j,name:account,replayAccountId:account,isHost:j===0,isConnected:true,
        isAi:false,hasLeft:false,reconnectToken:"token-"+account,disconnectedAt:null,
      }));
      const room={code,createdAt:now,updatedAt:now,hostId:players[0].id,players,
        ranked:false,blitz:false,betaTournamentTest:false,started:false,gameState:null,hostDisconnectDeadline:null};
      rooms.set(code,room);
      t=await c.bindRoom("A",t.id,m.id,code);
      room.started=true;
      room.gameState={roomCode:code,gameStartedAt:now,phase:"finished",
        winnerId:players.find(p=>p.replayAccountId===choices[i]).id,
        players:players.map(p=>({id:p.id,isAi:false}))};
      t=await c.recordFinishedGame(room,room.gameState);
      assert.deepEqual(await c.recordFinishedGame(room,room.gameState),t,"duplicate receipt is immutable and idempotent");
      const restored=createSoloTournamentRegistrationCoordinator(file);await restored.load();
      assert.deepEqual(restored.visible("A")[0],t,"each round survives disk restoration");
      if(m.id==="grand-final" && resetWinner) {
        assert.equal(t.status,"seeded");assert.equal(t.championAccountId,null,"losers winner must play the reset");
      }
    }
    assert.equal(t.status,"completed");
    assert.equal(t.championAccountId,resetWinner??"A");
    assert.equal(t.matches.find(m=>m.id==="reset-final").status,resetWinner?"completed":"not-required");
    const tampered=JSON.parse(await readFile(file,"utf8"));
    tampered.tournaments[0].matches.find(m=>m.id==="losers-final").homeAccountId="D";
    await writeFile(file,JSON.stringify(tampered));
    await assert.rejects(createSoloTournamentRegistrationCoordinator(file).load(),/bracket|receipt/);
    rooms.clear();
  }
  console.log("PASS Solo double elimination: all 96 result paths, real-room receipt guards, both reset winners, no-reset final, immutable results, per-round restart and tamper refusal");
} finally {
  rooms.clear();
  assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));
  await rm(root,{recursive:true,force:true});
}
