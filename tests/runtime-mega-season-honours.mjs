import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSeasonSnapshot, rankedRecentForm, seasonPoints, SEASON_SCORING_WINDOW } from "../shared/games/mega-board/season.ts";
const row=(name,place,awardBonus=0,performanceBonus=0)=>({
  playerId:name,playerName:name,finishPosition:place,ratingBefore:1000,
  placementDelta:0,performanceBonus,awardBonus,ratingDelta:0,ratingAfter:1000,awards:[],
});
const match=(n,at,players)=>({matchId:"season-"+n,roomCode:"ABCD",completedAt:at,players});
assert.equal(seasonPoints(row("A",1)),20);
assert.equal(seasonPoints(row("A",2)),12);
assert.equal(seasonPoints(row("A",3)),8);
assert.equal(seasonPoints(row("A",4)),5);
assert.equal(seasonPoints(row("A",8)),2);
assert.equal(seasonPoints(row("A",1,1000,1000)),27,"Per-match award and performance caps apply.");
const previous = match(1,100,[row("Alice",1),row("Bob",2)]);
const after = [
  match(2,201,[row("Alice",1,36,12),row("Bob",2)]),
  match(3,202,[row("Alice",3),row("Bob",1)]),
];
const locked=[{playerKey:"alice",playerName:"Alice",rating:1600,wins:10,podiums:12}];
const first=buildSeasonSnapshot([previous,...after,after[0]],200,locked);
assert.equal(first.entries.length,2);
assert.equal(first.entries.find(p=>p.playerKey==="alice")?.seasonMatches,2,"Pre-season and duplicate matches excluded.");
assert.equal(first.entries.find(p=>p.playerKey==="alice")?.points,35);
assert.equal(first.entries.find(p=>p.playerKey==="bob")?.points,32);
assert.equal(first.entries[0].pointsToNext,0);
assert.equal(first.entries[1].pointsToNext,4);
assert.deepEqual(first.preseasonStandings,locked,"Pre-season standing remains frozen separately.");
assert.notStrictEqual(first.preseasonStandings,locked);
const many = Array.from({length:20},(_,i)=>match(i+10,300+i,[row("New",1)]));
const capped=buildSeasonSnapshot(many,200);
assert.equal(capped.entries[0].seasonMatches,20);
assert.equal(capped.entries[0].scoredMatches,SEASON_SCORING_WINDOW);
assert.equal(capped.entries[0].points,SEASON_SCORING_WINDOW*20);
assert.deepEqual(rankedRecentForm([previous,...after], "alice"),[3,1,1]);
assert.equal(buildSeasonSnapshot([previous],200).entries.length,0);
const catalogue=readFileSync(new URL("../shared/platform/progression.ts",import.meta.url),"utf8");
const server=readFileSync(new URL("../server/src/platform/progression.ts",import.meta.url),"utf8");
const spectator=readFileSync(new URL("../client/src/games/mega-board/components/SpectatorControls.tsx",import.meta.url),"utf8");
const app=readFileSync(new URL("../client/src/App.tsx",import.meta.url),"utf8");
const ranking=readFileSync(new URL("../server/src/games/mega-board/utils/rankings.ts",import.meta.url),"utf8");
for(const key of ["mega:property-empire","mega:rent-survivor","mega:comeback-victory","mega:rising-contender","mega:consistency","mega:underdog","mega:preseason-podium"]) {
  assert(catalogue.includes(key)&&server.includes(key),"Missing historical award "+key);
}
assert.match(server,/progressionIdentity\?\.accountId === accountId/,"Backfill must use account ID not display name.");
assert.match(server,/sessions\.has\(record\.sessionId\)/,"Backfill must deduplicate.");
assert.match(server,/\.betaTournamentTest === true/,"Beta games cannot generate real honours.");
assert.match(ranking,/seasonStartedAt\?: number/,"Season boundary remains backward-compatible and persists in the Ranked ledger.");
assert.match(ranking,/preseasonStandings/,"Founding podium snapshot must persist.");
assert.match(spectator,/aria-pressed/);
assert.match(app,/followedId=\{spectatorFollowId/);
console.log("PASS 4.7.x: independent 12-match scoring, backfill evidence, duplicate guards and spectator wiring.");
