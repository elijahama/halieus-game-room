import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
const root = await mkdtemp(path.join(tmpdir(), "hgr-history-"));
process.env.HALIEUS_DATA_DIR = root;
process.env.ROOM_SAVE_PATH = path.join(root, "rooms.json");
const { createGameHistory, gameHistory, registerGameHistoryRoutes } = await import("../server/src/platform/game-history.ts");
const { createInitialGameState } = await import("../shared/games/mega-board/game-state.ts");
const { captureMegaReplayFrame } = await import("../server/src/games/mega-board/utils/replay.ts");
const { reconnectRoomPlayer } = await import("../server/src/games/mega-board/utils/reconnection.ts");
const { toPublicGameRoom } = await import("../server/src/games/mega-board/utils/room-view.ts");
const { archiveCompletedMegaGame } = await import("../server/src/games/mega-board/utils/mega-history.ts");
const { emitGameState } = await import("../server/src/games/mega-board/utils/game-state.ts");
const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
const { createHgrReplayStore } = await import("../server/src/platform/game-replay-store.ts");
const app = express();
registerGameHistoryRoutes(app, req => req.headers["x-test-account"] ? { id: String(req.headers["x-test-account"]) } : null);
const server = app.listen(0, "127.0.0.1");
await new Promise(resolve => server.once("listening", resolve));
const base = "http://127.0.0.1:" + server.address().port;
const request = (url, account) => fetch(base + url, { headers: account ? { "x-test-account": account } : {} });
try {
  const players = ["a", "b"].map((id, index) => ({
    id: "socket-" + id, name: "Player " + id, isHost: index === 0, isConnected: true,
    isAi: false, aiDifficulty: null, hasLeft: false, reconnectToken: "SECRET-" + id,
    disconnectedAt: null, replayAccountId: "account-" + id,
  }));
  const state = createInitialGameState("HISTORY", players);
  state.phase = "playing"; state.turnPhase = "roll";
  state.activityLog = [{ id: "raw-event", at: Date.now(), turnNumber: 1, kind: "roll", message: "Player a rolled.", playerId: players[0].id }];
  captureMegaReplayFrame(state);
  const room = { code: "HISTORY", ranked: false, blitz: false, hostId: players[0].id, players,
    started: true, gameState: state, createdAt: Date.now(), updatedAt: Date.now(),
    hostDisconnectDeadline: null, freeParkingJackpotEnabled: false };
  await assert.rejects(archiveCompletedMegaGame(room), /finished/);
  const result = reconnectRoomPlayer(room, "SECRET-a", "replacement-socket", undefined, true);
  assert.equal(typeof result, "object");
  assert.equal(room.players[0].replayAccountId, "account-a");
  assert.equal(state.replayFrames[0].players[0].id, "replacement-socket");
  room.players[0].name = "Renamed account";
  assert(!JSON.stringify(toPublicGameRoom(room)).includes("account-a"));
  state.phase = "finished"; state.turnPhase = "finished"; state.winnerId = "replacement-socket";
  state.players[1].isBankrupt = true;
  rooms.set(room.code, room);
  const io = { to: () => ({ emit() {} }), emit() {} };
  emitGameState(io, room.code, state);
  const id = await archiveCompletedMegaGame(room);
  assert.equal(id, await archiveCompletedMegaGame(room));
  const archive = await gameHistory.get("account-a", id);
  assert.equal(archive.track.frames.at(-1).winnerId, "seat-1", "Finish hook captures final checkpoint");
  const encoded = JSON.stringify(archive);
  for (const privateValue of ["account-a", "socket-a", "replacement-socket", "SECRET-a", "raw-event"]) {
    assert(!encoded.includes(privateValue), "Private value leaked: " + privateValue);
  }
  const restarted = createGameHistory(path.join(root, "replays"));
  assert.equal((await restarted.list("account-a")).matches.length, 1);
  assert.equal((await restarted.list("account-b")).matches.length, 1);
  assert.equal(await restarted.get("Player a", id), null, "Display names cannot grant ownership");
  await restarted.record({ ...archive, finishedAt: archive.finishedAt + 100 }, ["attacker"]);
  assert.equal(await restarted.get("attacker", id), null, "Duplicate finish cannot add owners");
  assert.equal((await restarted.get("account-a", id)).finishedAt, archive.finishedAt);
  assert.equal((await request("/game-history")).status, 401);
  assert.equal((await request("/game-history/" + id)).status, 401);
  assert.equal((await request("/game-history/" + id + "?format=text", "attacker")).status, 404);
  assert.equal((await request("/game-history/HISTORY", "account-a")).status, 404);
  assert.equal((await request("/game-history?offset=-1", "account-a")).status, 400);
  assert.equal((await request("/game-history/" + id + "?format=html", "account-a")).status, 400);
  for (const format of ["json", "text"]) {
    const response = await request("/game-history/" + id + "?format=" + format, "account-a");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(response.headers.get("content-disposition"), /attachment/);
    const content = await response.text();
    assert(!content.includes("account-a") && !content.includes("SECRET-"));
    if (format === "json") assert.equal(JSON.parse(content).matchId, archive.matchId);
    else assert.match(content, /Coverage:/);
  }
  // Atomic immutability across independent store instances.
  const a = createHgrReplayStore(path.join(root, "race"));
  const b = createHgrReplayStore(path.join(root, "race"));
  await Promise.all([a.put(archive), b.put(archive)]);
  await assert.rejects(b.put({ ...archive, finishedAt: archive.finishedAt + 1 }), /different contents/);
  assert.equal((await readdir(path.join(root, "replays", "_ownership"))).length, 1);
  rooms.clear();
  console.log("PASS Game History: actual completion hook, final frame, reconnect ownership, rename, private exports, restart persistence, duplicate protection, authorization, download formats and cross-store immutability");
} finally {
  await new Promise(resolve => server.close(resolve));
  rooms.clear();
  await new Promise(resolve => setTimeout(resolve, 1200));
  await rm(root, { recursive: true, force: true });
}
