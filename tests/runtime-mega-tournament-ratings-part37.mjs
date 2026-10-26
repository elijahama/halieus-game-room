import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";
import { captureMegaReplayFrame } from "../server/src/games/mega-board/utils/replay.ts";
import { createMegaBoardGameReplayArchive } from "../server/src/games/mega-board/utils/mega-game-replay.ts";
import { serializeHgrReplay, replayAsPlainText, REPLAY_GAME_IDS } from "../shared/platform/game-replay.ts";
import {
  createTournamentRatingLedger, TOURNAMENT_RATINGS_PATH,
} from "../server/src/games/mega-board/utils/tournament-ratings.ts";
import {
  calculatePlacementDelta, DEFAULT_RANKED_RATING,
} from "../shared/games/mega-board/ranked.ts";

const directory = await mkdtemp(path.join(os.tmpdir(), "hgr-tournament-ledger-"));
const tournamentFile = path.join(directory, "tournament-rankings.json");
const regularFile = path.join(directory, "rankings.json");
const untouchedRegular = JSON.stringify({ version: 1, sentinel: "never change regular Ranked" });
const names = ["Alice", "Bob", "Charlie", "Dana"];
const guilds = ["guild-a", "guild-b", "guild-a", "guild-b"];
const players = (ids = ["p1", "p2", "p3", "p4"]) =>
  ids.map((id, i) => ({ id, name: names[i] }));
const createBoard = (roomCode, ids) => {
  const state = createInitialGameState(roomCode, players(ids));
  state.phase = "finished";
  state.winnerId = ids[0];
  ids.forEach((id, i) => { state.playerStats[id].finishPosition = i + 1; });
  return state;
};
const assignment = (state, boardMatchId, accounts = ["a1", "b1", "a2", "b2"], fixtureId = "fixture-1") => ({
  tournamentId: "tournament-1", fixtureId, boardMatchId,
  roomCode: state.roomCode, gameStartedAt: state.gameStartedAt,
  seats: state.players.map((player, i) => ({
    playerId: player.id, accountId: accounts[i], guildId: guilds[i],
  })),
});

try {
  await writeFile(regularFile, untouchedRegular, "utf8");
  assert.equal(path.basename(TOURNAMENT_RATINGS_PATH), "tournament-rankings.json");
  assert.throws(() => createTournamentRatingLedger(regularFile), /never use/);
  const ledger = createTournamentRatingLedger(tournamentFile);
  assert.equal(ledger.getLeaderboard().length, 0);
  const first = createBoard("TOURN1", ["p1", "p2", "p3", "p4"]);
  const firstAssignment = assignment(first, "board-1");
  await assert.rejects(ledger.recordCompletedBoard(first, firstAssignment), /loaded first/);
  assert.equal(await ledger.load(), 0);
  const firstRecord = await ledger.recordCompletedBoard(first, firstAssignment);
  assert.equal(firstRecord.players.length, 4);
  // Tournament-only Chess.com-style portable replay: read-only, privacy-whitelisted.
  first.activityLog.push({id:"move-1",at:123,turnNumber:1,kind:"turn",message:"Alice rolls",playerId:"p1"});
  first.phase = "playing";
  captureMegaReplayFrame(first, 125);
  first.players[0].position = 7;
  first.phase = "finished";
  captureMegaReplayFrame(first, 126);
  first.reconnectToken = "TOP-SECRET";
  first.chanceDeck = [{secret:"never export"}];
  first.replayFrames[0].injectedSecret = "must-not-leak";
  const archive = createMegaBoardGameReplayArchive(first, firstRecord);
  assert.equal(archive.events.length, 1);
  assert.equal(archive.track.frames.length, 2);
  assert.equal(archive.format, "hgr-game-replay");
  assert.equal(archive.gameId, "mega-board");
  assert.equal(archive.tournament.tournamentId, "tournament-1");
  const downloaded = serializeHgrReplay(archive);
  assert.deepEqual(JSON.parse(downloaded).tournament.boardMatchId, firstRecord.boardMatchId);
  assert.match(replayAsPlainText(archive), /Alice rolls/);
  assert.deepEqual(REPLAY_GAME_IDS, ["mega-board", "poker", "blackjack", "whot", "ludo", "hidden-dictator", "connect-four", "word-game", "password", "anagrams-race", "cheat", "dominoes", "ayo", "word-board"]);
  assert(!downloaded.includes("TOP-SECRET") && !downloaded.includes("never export") &&
    !downloaded.includes("must-not-leak"));
  assert(!downloaded.includes('"p1"') && !downloaded.includes('"p2"'),
    "Export must replace ephemeral player IDs with anonymous seats");
  assert.equal(archive.players[0].id, "seat-1");
  await assert.rejects(async () => createMegaBoardGameReplayArchive(secondFake(), firstRecord), /matching server-verified/);
  const normalArchive = createMegaBoardGameReplayArchive(first);
  assert.equal(normalArchive.gameId, "mega-board");
  assert.equal(normalArchive.tournament, undefined);
  function secondFake() { return {...first, roomCode:"WRONG"}; }
  assert.equal(await readFile(regularFile, "utf8"), untouchedRegular);
  assert.equal(ledger.getLeaderboard().length, 4);
  assert.equal(firstRecord.players[0].ratingBefore, DEFAULT_RANKED_RATING);
  assert.equal(firstRecord.players[0].placementDelta,
    calculatePlacementDelta("p1", {p1:1,p2:2,p3:3,p4:4}, {p1:1000,p2:1000,p3:1000,p4:1000}));
  const allFirst = ledger.getLeaderboard();
  assert(allFirst.every((entry) => entry.gamesPlayed === 1));
  assert.equal(allFirst.reduce((sum, entry) => sum + entry.wins, 0), 1);
  assert.equal(allFirst.reduce((sum, entry) => sum + entry.podiums, 0), 3);
  assert.equal(await readFile(regularFile, "utf8"), untouchedRegular);

  // Duplicate finish events must return the same record without awarding rating twice.
  assert.deepEqual(await ledger.recordCompletedBoard(first, firstAssignment), firstRecord);
  assert.deepEqual(ledger.getLeaderboard(), allFirst);
  await assert.rejects(ledger.recordCompletedBoard(first, {
    ...firstAssignment, fixtureId: "reassigned-fixture",
  }), /belongs to another fixture/);
  await assert.rejects(ledger.recordCompletedBoard(first, {
    ...firstAssignment, boardMatchId: "duplicate-board-id",
  }), /already been recorded/);
  assert.deepEqual(ledger.getLeaderboard(), allFirst);

  // Account ID, not name, carries ratings across tournament games and renames.
  const second = createBoard("TOURN2", ["x1", "x2", "x3", "x4"]);
  second.players[0].name = "Renamed Alice";
  const secondAssignment = assignment(second, "board-2", ["a1", "b1", "a2", "b2"], "fixture-2");
  const secondRecord = await ledger.recordCompletedBoard(second, secondAssignment);
  assert.equal(secondRecord.players[0].ratingBefore, firstRecord.players[0].ratingAfter);
  assert.equal(ledger.getLeaderboard().find((entry) => entry.accountId === "a1").playerName, "Renamed Alice");
  assert(ledger.getLeaderboard().every((entry) => entry.gamesPlayed === 2));
  assert.equal(ledger.getBoardResults("tournament-1", "fixture-2").length, 1);
  assert.equal(ledger.getBoardResults("other-tournament").length, 0);

  // Reloading must preserve the exact tournament-only rating continuity and idempotence.
  const restored = createTournamentRatingLedger(tournamentFile);
  assert.equal(await restored.load(), 4);
  assert.deepEqual(restored.getLeaderboard(), ledger.getLeaderboard());
  assert.deepEqual(restored.getBoardResults("tournament-1"), ledger.getBoardResults("tournament-1"));
  assert.deepEqual(await restored.recordCompletedBoard(first, firstAssignment), firstRecord);

  // A valid second board in the same fixture can be committed independently.
  const third = createBoard("TOURN3", ["q1","q2","q3","q4"]);
  const thirdAssignment = assignment(third, "board-3", ["a3","b3","a4","b4"]);
  const thirdRecord = await restored.recordCompletedBoard(third, thirdAssignment);
  assert.equal(thirdRecord.players.length, 4);
  assert.equal(restored.getBoardResults("tournament-1", "fixture-1").length, 2);
  assert.equal(restored.getLeaderboard().length, 8);

  // Forbid injecting regular Ranked, incomplete, mismatched, AI and duplicate seats.
  const badRanked = createBoard("RANKED", ["z1","z2","z3","z4"]);
  badRanked.ranked = true;
  await assert.rejects(restored.recordCompletedBoard(badRanked, assignment(badRanked, "bad-ranked")), /Regular Ranked/);
  const incomplete = createInitialGameState("INCOMP", players(["z1","z2","z3","z4"]));
  await assert.rejects(restored.recordCompletedBoard(incomplete, assignment(incomplete, "bad-incomplete")), /not finished/);
  const wrongAssignment = assignment(badRanked, "bad-identity");
  badRanked.ranked = false;
  wrongAssignment.roomCode = "OTHER";
  await assert.rejects(restored.recordCompletedBoard(badRanked, wrongAssignment), /does not match/);
  const badSeats = assignment(badRanked, "bad-seats");
  badSeats.seats[1].accountId = badSeats.seats[0].accountId;
  await assert.rejects(restored.recordCompletedBoard(badRanked, badSeats), /Duplicate/);
  badRanked.players[1].isAi = true;
  await assert.rejects(restored.recordCompletedBoard(badRanked, assignment(badRanked, "bad-ai")), /AI/);

  const independent = createBoard("TOURN4", ["n1","n2","n3","n4"]);
  const separate = assignment(independent, "separate", ["s1","s2","s3","s4"]);
  separate.tournamentId = "tournament-2";
  await restored.recordCompletedBoard(independent, separate);
  assert.equal(restored.getBoardResults("tournament-1").length, 3);
  assert.equal(restored.getBoardResults("tournament-2").length, 1);
  assert.equal(await readFile(regularFile, "utf8"), untouchedRegular);

  // Corrupted saved data must fail closed, never erase existing results.
  const corruptedPath = path.join(directory, "corrupt.json");
  await writeFile(corruptedPath, "{not-valid-json}", "utf8");
  const corrupted = createTournamentRatingLedger(corruptedPath);
  await assert.rejects(corrupted.load(), SyntaxError);
  await assert.rejects(corrupted.recordCompletedBoard(first, firstAssignment), /loaded first/);
  assert.equal(await readFile(corruptedPath, "utf8"), "{not-valid-json}");

  // Results handed to callers are snapshots, not writable internal state.
  const exposed = restored.getLeaderboard();
  exposed[0].rating = -100000;
  assert.notEqual(restored.getLeaderboard()[0].rating, -100000);
  console.log("PASS Part37 tournament-only rankings: formula reuse, 2-board fixture, persistence, account identity, duplicate protection, corrupt save rejection, regular-rank isolation");
} finally {
  await rm(directory, { recursive: true, force: true });
}
