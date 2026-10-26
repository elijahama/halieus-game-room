import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { REPLAY_GAME_IDS, replayAsPlainText, serializeHgrReplay } from "../shared/platform/game-replay.ts";
import { createFinishedTimelineReplay } from "../server/src/platform/game-replay-timeline.ts";
import { createHgrReplayStore } from "../server/src/platform/game-replay-store.ts";

const root = await mkdtemp(path.join(os.tmpdir(), "hgr-universal-replays-"));
try {
  const store = createHgrReplayStore(root);
  assert.equal(REPLAY_GAME_IDS.length, 14);
  for (const gameId of REPLAY_GAME_IDS) {
    const record = createFinishedTimelineReplay({
      gameId, matchId: gameId + "-match-1", roomCode: "TEST001",
      startedAt: 1000, finishedAt: 2000, phase: "finished",
      players: [
        {id:"player-one",name:"Alpha",result:"winner", privateHand:"TOP-SECRET"},
        {id:"player-two",name:"Beta",result:"lost", reconnectToken:"PRIVATE-TOKEN"},
      ],
      actions: [
        {sequence:1,at:1500,turn:1,category:"move",description:"Alpha played",actorId:"player-one",
          unrevealedCards:"never export hidden cards"},
      ],
      roomPrivateState: "PRIVATE-SECRETS",
    });
    assert.equal(record.gameId, gameId);
    assert.equal(record.track.kind, "event-timeline");
    const json = serializeHgrReplay(record);
    assert(!json.includes("TOP-SECRET") && !json.includes("PRIVATE-TOKEN") &&
      !json.includes("PRIVATE-SECRETS") && !json.includes("never export hidden cards"),
      gameId + " must never serialize unknown private fields");
    assert(replayAsPlainText(record).includes("Alpha played"));
    assert.equal(record.players[0].id, "seat-1");
    assert.equal(record.events[0].actorId, "seat-1");
    assert(!json.includes("player-one"), "Do not expose original connection player IDs");
    const injected = {...record, hiddenDeck: "LEAK-ME", track: {...record.track, secret:"PRIVATE-TRACK"}};
    assert(!serializeHgrReplay(injected).includes("LEAK-ME"));
    assert(!serializeHgrReplay(injected).includes("PRIVATE-TRACK"));
    const [a, b] = await Promise.all([store.put(record), store.put(record)]);
    assert.deepEqual(a, b);
    assert.deepEqual(await store.get(gameId, record.matchId), record);
    const malicious = structuredClone(record);
    malicious.events[0].description = "Someone rewrote the record";
    await assert.rejects(store.put(malicious), /different contents/);
  }
  assert.equal((await readdir(root)).length, REPLAY_GAME_IDS.length);
  assert.equal(await store.get("poker", "missing"), null);
  await assert.rejects(store.get("mega-board", ""), /Invalid match ID/);
  await assert.rejects(store.get("../escape", "x"), /Unknown replay game/);
  const p = createFinishedTimelineReplay({
    gameId: "poker", matchId: "path-../../secret", roomCode: "TEST",
    startedAt: 1, finishedAt: 2, phase: "finished",
    players: [{id:"one",name:"One",result:"winner"}],
    actions: [],
  });
  await store.put(p);
  const names = await readdir(path.join(root,"poker"));
  assert(names.every((n) => /^[a-f0-9]{64}\.json$/.test(n)), "Match identifiers must not become filenames");
  await assert.rejects(async () => createFinishedTimelineReplay({...p, phase:"playing"}), /finished/);
  await assert.rejects(async () => createFinishedTimelineReplay({...p, phase:"finished", actions:p.events, finishedAt:0}), /date range/);
  // Archives are portable JSON and remain usable without any live game room.
  assert.equal(JSON.parse(await readFile(path.join(root,"poker",names[0]),"utf8")).gameId,"poker");
  console.log("PASS HGR-wide replay envelope: all 14 game IDs, private-field allowlisting, timeline/text export, idempotent atomic archive, traversal safety and immutable finished records");
} finally {
  await rm(root, { recursive:true, force:true });
}
