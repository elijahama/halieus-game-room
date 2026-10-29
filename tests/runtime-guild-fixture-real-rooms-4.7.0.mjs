import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";

const directory = await mkdtemp(join(tmpdir(), "hgr-fixture-real-lobbies-"));
process.env.HALIEUS_DATA_DIR = directory;
process.env.ROOM_SAVE_PATH = join(directory, "rooms.json");
const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
const { loadGuildFixtures, registerGuildFixtureRoutes, getGuildFixtureBoundRoom, getGuildFixtureStartBlock } =
  await import("../server/src/platform/guildFixtures.ts");
const { registerLobbyHandlers } = await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const { registerAiLobbyHandlers } = await import("../server/src/games/mega-board/handlers/aiLobbyHandlers.ts");
const { flushRoomSave } = await import("../server/src/games/mega-board/utils/persistence.ts");

const guilds = new Map([
  ["blue", { id: "blue", managerIds: ["blue-lead"], memberIds: ["blue-lead", "blue-a", "blue-b"] }],
  ["gold", { id: "gold", managerIds: ["gold-lead"], memberIds: ["gold-lead", "gold-a", "gold-b"] }],
]);
const app = express();
app.use(express.json());
await loadGuildFixtures();
registerGuildFixtureRoutes(app,
  (r) => r.get("x-test-account") ? { id: r.get("x-test-account") } : null,
  (id) => guilds.get(id) ?? null);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = "http://127.0.0.1:" + server.address().port;
async function call(path, account, body) {
  const result = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(account ? { "x-test-account": account } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: result.status, body: await result.json() };
}
const seat = (socket, account, host = false) => ({
  id: socket, replayAccountId: account, name: account, isHost: host,
  isConnected: true, isAi: false, aiDifficulty: null, hasLeft: false,
  reconnectToken: "test-only", disconnectedAt: null,
});
function lobby(code, first, second) {
  const now = Date.now();
  return { code, hostId: first.id, players: [first, second], ranked: false, blitz: false,
    started: false, gameState: null, createdAt: now, updatedAt: now,
    freeParkingJackpotEnabled: false, hostDisconnectDeadline: null, boardStyle: "classic-board" };
}
const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
function handlersFor(socketId) {
  const handlers = new Map();
  const socket = { id: socketId, connected: true, data: {},
    request: { headers: {} }, join: () => {}, on: (name, handler) => { handlers.set(name, handler); } };
  registerLobbyHandlers(io, socket);
  registerAiLobbyHandlers(io, socket);
  return handlers;
}
function emit(handlers, name, payload) {
  let result = null;
  const handler = handlers.get(name);
  assert.equal(typeof handler, "function", "missing real Mega Board handler " + name);
  handler(payload, (value) => { result = value; });
  assert.ok(result, name + " must acknowledge");
  return result;
}
try {
  const proposed = await call("/guild-fixtures", "blue-lead", {
    homeGuildId: "blue", awayGuildId: "gold",
    homeLineups: [["blue-a"], ["blue-b"]],
  });
  assert.equal(proposed.status, 200);
  const fixtureId = proposed.body.fixture.id;
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/accept", "gold-lead", {
    awayLineups: [["gold-a"], ["gold-b"]],
  })).status, 200);
  const first = lobby("GFX001", seat("socket-a", "blue-a", true), seat("socket-b", "gold-a"));
  const second = lobby("GFX002", seat("socket-c", "blue-b", true), seat("socket-d", "gold-b"));
  rooms.set(first.code, first); rooms.set(second.code, second);
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/bind-rooms", "blue-a", {
    roomCodes: [first.code, second.code],
  })).status, 403);
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/bind-rooms", "blue-lead", {
    roomCodes: [first.code, first.code],
  })).status, 400);
  second.players[1].replayAccountId = "outsider";
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/bind-rooms", "blue-lead", {
    roomCodes: [first.code, second.code],
  })).status, 409);
  second.players[1].replayAccountId = "gold-b";
  const bound = await call("/guild-fixtures/" + fixtureId + "/bind-rooms", "gold-lead", {
    roomCodes: [first.code, second.code],
  });
  assert.equal(bound.status, 200, JSON.stringify(bound.body));
  assert.equal(bound.body.fixture.status, "rooms-bound");
  assert.equal(bound.body.fixture.boards.length, 2);
  assert.notEqual(bound.body.fixture.boards[0].boardMatchId, bound.body.fixture.boards[1].boardMatchId);
  assert.equal(getGuildFixtureBoundRoom(first.code).fixtureId, fixtureId);
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/bind-rooms", "blue-lead", {
    roomCodes: [first.code, second.code],
  })).status, 409);
  const hostA = handlersFor("socket-a");
  assert.equal(emit(hostA, "game:join", { code: first.code, playerName: "uninvited" }).ok, false);
  assert.equal(emit(hostA, "game:add-ai", { code: first.code, difficulty: "easy" }).ok, false);
  assert.equal(emit(hostA, "game:reconnect", { code: first.code, reconnectToken: "test-only" }).ok, false);
  assert.equal(getGuildFixtureStartBlock(first), null);
  first.players[1].replayAccountId = "outsider";
  assert.equal(emit(hostA, "game:start", { code: first.code }).ok, false);
  assert.equal(first.started, false);
  first.players[1].replayAccountId = "gold-a";
  assert.equal(emit(hostA, "game:start", { code: first.code }).ok, true);
  assert.equal(first.gameState?.phase, "ordering");
  const hostB = handlersFor("socket-c");
  assert.equal(emit(hostB, "game:start", { code: second.code }).ok, true);
  assert.equal(second.gameState?.phase, "ordering");
  assert.notEqual(first.gameState, second.gameState);
  assert.equal(first.gameState.ranked, false);
  assert.equal(second.gameState.blitz, false);
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/cancel", "blue-lead", {})).status, 409);
  const secondProposal = await call("/guild-fixtures", "blue-lead", {
    homeGuildId: "blue", awayGuildId: "gold", homeLineups: [["blue-a"], ["blue-b"]],
  });
  const secondFixtureId = secondProposal.body.fixture.id;
  assert.equal((await call("/guild-fixtures/" + secondFixtureId + "/accept", "gold-lead", {
    awayLineups: [["gold-a"], ["gold-b"]],
  })).status, 200);
  const third = lobby("GFX003", seat("socket-e", "blue-a", true), seat("socket-f", "gold-a"));
  const fourth = lobby("GFX004", seat("socket-g", "blue-b", true), seat("socket-h", "gold-b"));
  rooms.set(third.code, third); rooms.set(fourth.code, fourth);
  assert.equal((await call("/guild-fixtures/" + secondFixtureId + "/bind-rooms", "gold-lead", {
    roomCodes: [third.code, fourth.code],
  })).status, 200);
  assert.ok(getGuildFixtureBoundRoom(third.code));
  assert.equal((await call("/guild-fixtures/" + secondFixtureId + "/cancel", "gold-lead", {})).status, 200);
  assert.equal(getGuildFixtureBoundRoom(third.code), null);
  await flushRoomSave();
  console.log("PASS HGR 4.7.0: two real Mega Board boards linked, locked account seats, actual independent starts, uninvited/AI/roster-change rejection");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await flushRoomSave();
  rooms.clear();
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}
