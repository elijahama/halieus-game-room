import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";

const data = await mkdtemp(join(tmpdir(), "hgr-beta-tournament-"));
process.env.HALIEUS_DATA_DIR = data;
process.env.HALIEUS_OWNER_BOOTSTRAP_FILE = join(data, "owner-setup.txt");
process.env.ROOM_SAVE_PATH = join(data, "rooms.json");
const { loadAccountStore, registerAccountRoutes, configureAccountAdminRuntimeControls } =
  await import("../server/src/platform/accounts.ts");
const { registerLobbyHandlers } = await import("../server/src/games/mega-board/handlers/lobbyHandlers.ts");
const { registerAiLobbyHandlers } = await import("../server/src/games/mega-board/handlers/aiLobbyHandlers.ts");
const { emitGameState } = await import("../server/src/games/mega-board/utils/game-state.ts");
const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
const { flushRoomSave } = await import("../server/src/games/mega-board/utils/persistence.ts");
await loadAccountStore();
configureAccountAdminRuntimeControls({
  getRoomCount: () => rooms.size,
  getLiveRooms: () => [...rooms.values()].map(r => ({
    game: "mega-board", gameTitle: "Mega Board", code: r.code, started: r.started,
    humanPlayers: r.players.filter(p => !p.isAi).map(p => p.name),
  })),
  closeAllRooms: async () => ({ closed: 0 }),
});
const app = express();
app.use(express.json());
registerAccountRoutes(app);
const httpServer = createServer(app);
const io = new Server(httpServer);
io.on("connection", socket => {
  registerLobbyHandlers(io, socket);
  registerAiLobbyHandlers(io, socket);
});
await new Promise(resolve => httpServer.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + httpServer.address().port;
const clients = [];
async function api(path, cookie = "", body) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] ?? cookie };
}
async function connectAccount(cookie) {
  const client = connect(base, { transports: ["websocket"], forceNew: true, extraHeaders: { Cookie: cookie } });
  clients.push(client);
  await new Promise((resolve, reject) => { client.once("connect", resolve); client.once("connect_error", reject); });
  return client;
}
function send(socket, event, payload) {
  return new Promise((resolve, reject) => socket.timeout(5000).emit(event, payload, (error, reply) => error ? reject(error) : resolve(reply)));
}
async function register(ownerCookie, username) {
  const invite = await api("/admin/invites", ownerCookie, { label: username, expiryDays: 7 });
  assert.equal(invite.status, 201, JSON.stringify(invite.body));
  const account = await api("/auth/redeem-invite", "", {
    inviteCode: invite.body.code, username, displayName: username, password: username + "-test-only-pass-2026",
  });
  assert.equal(account.status, 201, JSON.stringify(account.body));
  return { id: account.body.account.id, cookie: account.cookie, role: account.body.account.role };
}
try {
  const token = (await readFile(process.env.HALIEUS_OWNER_BOOTSTRAP_FILE, "utf8")).match(/OWNER-[A-Z0-9-]+/)?.[0];
  assert.ok(token);
  const owner = await api("/auth/setup-owner", "", {
    bootstrapCode: token, username: "betahost", displayName: "Beta Host", password: "beta-host-test-only-password-2026",
  });
  assert.equal(owner.status, 201);
  const invited = await register(owner.cookie, "regularplayer");
  const bystander = await register(owner.cookie, "notinvited");
  assert.equal(invited.role, "player");
  const host = await connectAccount(owner.cookie);
  const member = await connectAccount(invited.cookie);
  const outsider = await connectAccount(bystander.cookie);
  const guest = await connectAccount("");
  const attempted = await send(member, "game:create", { code: "BETAW4", playerName: "Fraud", ranked: true, betaTournamentTest: true });
  assert.equal(attempted.ok, false, "Non-admin must never create practice rooms by setting a client flag.");
  const created = await send(host, "game:create", {
    code: "BETAW4", playerName: "[BETA] Beta Host", betaTournamentTest: true, ranked: true, blitz: true,
  });
  assert.equal(created.ok, true, created.reason);
  assert.equal(created.room.betaTournamentTest, true);
  assert.equal(created.room.ranked, false);
  assert.equal(created.room.blitz, false);
  assert.equal((await send(guest, "game:join", { code: "BETAW4", playerName: "Guest" })).ok, false);
  assert.equal((await send(outsider, "game:join", { code: "BETAW4", playerName: "No invite" })).ok, false);
  const betaInvitation = await api("/accounts/game-invites", owner.cookie, {
    game: "mega-board", roomCode: "BETAW4", recipientAccountId: invited.id,
  });
  assert.equal(betaInvitation.status, 201, JSON.stringify(betaInvitation.body));
  assert.equal(betaInvitation.body.invite.betaTournamentTest, true);
  const inbox = await api("/accounts/game-invites", invited.cookie);
  assert.equal(inbox.status, 200);
  assert.equal(inbox.body.invites.length, 1);
  assert.equal(inbox.body.invites[0].betaTournamentTest, true);
  assert.equal((await api("/auth/status", invited.cookie)).body.account.role, "player");
  const stolenHostSeat = await send(outsider, "game:reconnect", {
    code: "BETAW4", reconnectToken: created.reconnectToken, playerName: "Stolen seat",
  });
  assert.equal(stolenHostSeat.ok, false, "An invited practice host seat cannot be stolen by a signed-in outsider.");
  const joined = await send(member, "game:join", { code: "BETAW4", playerName: "Regular Player" });
  assert.equal(joined.ok, true, joined.reason);
  assert.equal(joined.room.betaTournamentTest, true);
  const withAi = await send(host, "game:add-ai", { code: "BETAW4", difficulty: "easy" });
  assert.equal(withAi.ok, true, withAi.reason);
  const started = await send(host, "game:start", { code: "BETAW4" });
  assert.equal(started.ok, true, started.reason);
  const practice = rooms.get("BETAW4");
  assert.equal(practice.gameState.ranked, false);
  assert.equal(practice.gameState.players.some(p => p.isAi), true);
  practice.gameState.phase = "finished";
  practice.gameState.turnPhase = "finished";
  practice.gameState.winnerId = host.id;
  emitGameState(io, "BETAW4", practice.gameState);
  await flushRoomSave();
  await new Promise(resolve => setTimeout(resolve, 500));
  let finalFiles = [];
  try { finalFiles = await readdir(join(data, "sessions", "finalized")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  assert.equal(finalFiles.filter(name => name.endsWith(".json")).length, 0,
    "Completed practice must not enter the permanent sessions archive.");
  assert.equal((await api("/accounts/me/stats", invited.cookie)).body.stats.played, 0);
  assert.equal((await api("/accounts/me/stats", owner.cookie)).body.stats.played, 0);
  assert.equal((await api("/accounts/me/quick-play", invited.cookie)).body.profile.preferences.length, 0);
  const { gameHistory } = await import("../server/src/platform/game-history.ts");
  assert.equal((await gameHistory.list(invited.id)).matches.length, 0,
    "The Beta match must not appear as an official downloadable replay.");
  const { readPlayerProgression } = await import("../server/src/platform/progression.ts");
  assert.equal((await readPlayerProgression(invited.id)).gamerScore, 0);
  const ordinary = await send(member, "game:create", { code: "NORMAL4", playerName: "Regular Player", ranked: false });
  assert.equal(ordinary.ok, true);
  assert.equal(ordinary.room.betaTournamentTest, false);
  console.log("PASS HGR Beta Tournament Practice: owner-only creation, ordinary invitee, real AI and human lobby, no official progression/statistics, normal-mode separation");
} finally {
  clients.forEach(socket => socket.disconnect());
  rooms.clear();
  await new Promise(resolve => io.close(resolve));
  await flushRoomSave();
  await new Promise(resolve => setTimeout(resolve, 550));
  await rm(data, { recursive: true, force: true, maxRetries: 8, retryDelay: 50 });
}
