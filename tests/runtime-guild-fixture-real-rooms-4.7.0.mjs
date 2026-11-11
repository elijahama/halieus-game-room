import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";

const directory = await mkdtemp(join(tmpdir(), "hgr-fixture-real-lobbies-"));
process.env.HALIEUS_DATA_DIR = directory;
process.env.ROOM_SAVE_PATH = join(directory, "rooms.json");
const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
const { loadGuildFixtures, registerGuildFixtureRoutes, getGuildFixtureBoundRoom, getGuildFixtureStartBlock, recordFinishedGuildFixtureBoard, createGuildFixtureCoordinator, getGuildFixtureForTournament } =
  await import("../server/src/platform/guildFixtures.ts");
const { registerLobbyHandlers } = await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const { registerAiLobbyHandlers } = await import("../server/src/games/mega-board/handlers/aiLobbyHandlers.ts");
const { flushRoomSave } = await import("../server/src/games/mega-board/utils/persistence.ts");
const { registerDisconnectHandler } = await import("../server/src/games/mega-board/handlers/disconnectHandler.ts");
const { registerSessionHandlers } = await import("../server/src/games/mega-board/handlers/sessionHandlers.ts");
const { endRoom } = await import("../server/src/games/mega-board/utils/room-lifecycle.ts");
const { hostReconnectGraceMs, ACTIVE_HOST_RECONNECT_GRACE_MS } = await import("../server/src/games/mega-board/utils/host-grace.ts");
const { createGuildTournamentCoordinator } = await import("../server/src/platform/guildTournaments.ts");
const { emitGameState } = await import("../server/src/games/mega-board/utils/game-state.ts");

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
const io = { to: () => ({ emit: () => {} }), in:()=>({socketsLeave:()=>{}}), emit: () => {}, sockets: { sockets: new Map() } };
function handlersFor(socketId) {
  const handlers = new Map();
  const socket = { id: socketId, connected: true, data: {},
    request: { headers: {} }, join: () => {}, leave:()=>{}, on: (name, handler) => { handlers.set(name, handler); } };
  registerLobbyHandlers(io, socket);
  registerAiLobbyHandlers(io, socket);
  registerSessionHandlers(io,socket);
  registerDisconnectHandler(io,socket);
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
  guilds.set("red",{id:"red",managerIds:["red-lead"],memberIds:["red-lead"]});
  guilds.set("green",{id:"green",managerIds:["green-lead"],memberIds:["green-lead"]});
  const lookup=id=>guilds.get(id)??null;
  const bracket=createGuildTournamentCoordinator(join(directory,"bracket.json"));await bracket.load();
  const tournament=await bracket.create("blue-lead","blue","Actual deciding game",lookup);
  for(const id of ["red","green","gold"])await bracket.register(id+"-lead",tournament.id,id,lookup);
  await bracket.start("blue-lead",tournament.id,lookup);
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
  await bracket.link("blue-lead",tournament.id,"semi-1",fixtureId,lookup,getGuildFixtureForTournament);
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
  first.gameState.phase = "finished";
  first.gameState.winnerId = "socket-a";
  emitGameState(io, first.code, first.gameState);
  // Real broadcast ingests the board finish asynchronously; awaiting the
  // same server-authoritative writer also proves duplicate dispatch is safe.
  const firstReceipt = await recordFinishedGuildFixtureBoard(first, first.gameState);
  assert.equal(firstReceipt.status, "rooms-bound");
  assert.equal(firstReceipt.boardResults.length, 1);
  assert.equal(firstReceipt.homeBoardWins, 1);
  assert.equal(firstReceipt.awayBoardWins, 0);
  second.gameState.phase = "finished";
  second.gameState.winnerId = "socket-d";
  emitGameState(io, second.code, second.gameState);
  const finalReceipt = await recordFinishedGuildFixtureBoard(second, second.gameState);
  assert.equal(finalReceipt.status, "completed");
  assert.equal(finalReceipt.boardResults.length, 2);
  assert.equal(finalReceipt.homeBoardWins, 1);
  assert.equal(finalReceipt.awayBoardWins, 1);
  assert.equal(finalReceipt.boardResults[0].winnerAccountId, "blue-a");
  assert.equal(finalReceipt.boardResults[1].winnerAccountId, "gold-b");
  const participantView = await call("/guild-fixtures", "gold-a");
  assert.equal(participantView.status, 200);
  assert.equal(participantView.body.fixtures.find(f => f.id === fixtureId).status, "completed");
  assert.equal((await call("/guild-fixtures/" + fixtureId + "/cancel", "blue-lead", {})).status, 409);

  await bracket.reconcile(getGuildFixtureForTournament);
  assert.equal(bracket.visible("blue-a",lookup)[0].matches[0].status,"tied");
  const nominate=(actor,guildId,accountId)=>call("/guild-fixtures/"+fixtureId+"/tiebreaker/nominate",actor,{guildId,accountId});
  const bind=(actor,roomCode)=>call("/guild-fixtures/"+fixtureId+"/tiebreaker/bind-room",actor,{roomCode});
  assert.equal((await nominate(null,"blue","blue-a")).status,401);
  assert.equal((await nominate("blue-a","blue","blue-a")).status,403);
  assert.equal((await nominate("blue-lead","gold","gold-a")).status,403);
  assert.equal((await nominate("blue-lead","blue","blue-lead")).status,400,"a manager outside the original lineup cannot be nominated");
  assert.equal((await nominate("blue-lead","blue","blue-a")).status,200);
  assert.equal((await bind("blue-lead","DECIDE1")).status,409,"both sides nominate first");
  assert.equal((await nominate("gold-lead","gold","gold-b")).status,200);
  const storeFile=join(directory,"guilds","mega-guild-fixtures.json");
  const restored=createGuildFixtureCoordinator(storeFile);await restored.load();
  assert.equal(restored.getForTournament(fixtureId).tiebreaker.awayAccountId,"gold-b","nomination survives restart");
  const decider=lobby("DECIDE1",seat("decide-home","blue-a",true),seat("decide-away","gold-b"));
  rooms.set(decider.code,decider);
  assert.equal((await bind("blue-a",decider.code)).status,403);
  assert.equal((await bind("blue-lead",first.code)).status,409,"original board cannot become the decider");
  for(const field of ["ranked","blitz","betaTournamentTest"]){
    decider[field]=true;assert.equal((await bind("blue-lead",decider.code)).status,409);decider[field]=false;
  }
  decider.players[1].replayAccountId="gold-a";
  assert.equal((await bind("blue-lead",decider.code)).status,409,"exact nominees required");
  decider.players[1].replayAccountId="gold-b";
  const correctCreatedAt=decider.createdAt;decider.createdAt=first.createdAt-1;
  assert.equal((await bind("blue-lead",decider.code)).status,409,"room must be created after the split result");
  decider.createdAt=correctCreatedAt;
  const linkedDecider=await bind("gold-lead",decider.code);assert.equal(linkedDecider.status,200,JSON.stringify(linkedDecider.body));
  assert.notEqual(linkedDecider.body.fixture.tiebreaker.board.boardMatchId,bound.body.fixture.boards[0].boardMatchId);
  assert.equal((await nominate("blue-lead","blue","blue-b")).status,409,"bound nominees immutable");
  const deciderHost=handlersFor("decide-home"),deciderAway=handlersFor("decide-away");
  assert.equal(emit(deciderHost,"game:end-room",{code:decider.code}).ok,false);
  assert.equal(emit(deciderHost,"game:leave",{code:decider.code}).ok,false);
  assert.equal(endRoom(io,decider.code,"ordinary cleanup"),false);
  assert.equal(hostReconnectGraceMs(decider),ACTIVE_HOST_RECONNECT_GRACE_MS);
  guilds.get("gold").memberIds= ["gold-lead","gold-a"];
  assert.equal(emit(deciderHost,"game:start",{code:decider.code}).ok,false,"membership checked again at start");
  guilds.get("gold").memberIds.push("gold-b");
  assert.equal(emit(deciderHost,"game:start",{code:decider.code}).ok,true);
  await deciderHost.get("disconnect")("transport close");
  assert.notEqual(decider.gameState.phase,"finished","disconnect is not a loss");
  assert.equal(getGuildFixtureBoundRoom(decider.code).fixtureId,fixtureId);
  assert.equal(emit(deciderHost,"game:forfeit",{code:decider.code}).ok,true);
  assert.equal(decider.gameState.phase,"finished");
  assert.equal(decider.gameState.winnerId,"decide-away");
  assert.equal(decider.hostId,"decide-away","host forfeits only their own seat");
  assert.equal(emit(deciderAway,"game:forfeit",{code:decider.code}).ok,false);
  const settled=await recordFinishedGuildFixtureBoard(decider,decider.gameState);
  assert.equal(settled.tiebreaker.result.winnerGuildId,"gold");
  assert.deepEqual(settled.boardResults,finalReceipt.boardResults,"original board receipts stay immutable");
  assert.equal(settled.homeBoardWins,1);assert.equal(settled.awayBoardWins,1);
  assert.deepEqual(await recordFinishedGuildFixtureBoard(decider,decider.gameState),settled,"duplicate receipt is idempotent");
  decider.gameState.winnerId="decide-home";
  await assert.rejects(recordFinishedGuildFixtureBoard(decider,decider.gameState),/immutable/);
  decider.gameState.winnerId="decide-away";
  await bracket.reconcile(getGuildFixtureForTournament);
  assert.equal(bracket.visible("blue-a",lookup)[0].matches[0].winnerGuildId,"gold","verified decider advances bracket");
  assert.equal(getGuildFixtureBoundRoom(decider.code),null);
  const settledStore=createGuildFixtureCoordinator(storeFile);await settledStore.load();
  assert.deepEqual(settledStore.getForTournament(fixtureId),settled);
  const tampered=JSON.parse(await readFile(storeFile,"utf8"));tampered.fixtures[0].tiebreaker.result.winnerGuildId="blue";
  const tamperFile=join(directory,"tampered.json");await writeFile(tamperFile,JSON.stringify(tampered));
  await assert.rejects(createGuildFixtureCoordinator(tamperFile).load(),/Malformed Guild deciding/);

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
  console.log("PASS Guild fixtures: real board starts and 1–1 decider; manager-only original nominations, fresh room, membership-at-start, disconnect/forfeit guards, immutable receipts, restart and bracket advancement");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await flushRoomSave();
  rooms.clear();
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}
