import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const stage = process.argv[2];
if (!stage) {
  const run = promisify(execFile);
  const root = await mkdtemp(join(tmpdir(), "hgr-solo-restart-"));
  try {
    for (const boundary of ["one-approval", "after-intent", "after-memory-close", "save-failure", "after-room-save", "after-final"]) {
      const fixture = join(root, boundary);
      await mkdir(fixture);
      await assert.rejects(run(process.execPath, ["--import", "tsx", self, boundary, fixture],
        { windowsHide: true, shell: false, timeout: 20000 }), error => {
          assert.equal(error.code, 73, error.stderr || error.message);
          return true;
        });
      if (boundary === "save-failure") await rmdir(join(fixture, "rooms.json.tmp"));
      const recovered = await run(process.execPath, ["--import", "tsx", self, "recover", fixture, boundary],
        { windowsHide: true, shell: false, timeout: 20000 });
      assert.match(recovered.stdout, /RECOVERED/);
    }
    console.log("PASS Solo reset real-process restart boundaries: consent, durable intent, memory deletion, failed save, durable room deletion, completed reset.");
  } finally {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("hgr-solo-restart-"));
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
} else {
  const root = process.argv[3];
  process.env.HALIEUS_DATA_DIR = root;
  process.env.ROOM_SAVE_PATH = join(root, "rooms.json");
  const express = (await import("express")).default;
  const { rooms } = await import("../server/src/games/mega-board/state/rooms.ts");
  const solo = await import("../server/src/platform/soloTournamentRegistration.ts");
  const persistence = await import("../server/src/games/mega-board/utils/persistence.ts");
  const { endRoom } = await import("../server/src/games/mega-board/utils/room-lifecycle.ts");
  const io = { to: () => ({ emit() {} }), in: () => ({ socketsLeave() {} }), emit() {},
    sockets: { sockets: new Map() } };
  const storePath = join(root, "mega-board", "tournaments", "solo-registration.json");
  const readMatch = async () => JSON.parse(await readFile(storePath, "utf8")).tournaments[0].matches[0];
  const seat = (id, host = false) => ({ id: id + "-socket", name: id, replayAccountId: id,
    isHost: host, isConnected: true, isAi: false, aiDifficulty: null, hasLeft: false,
    reconnectToken: "token-" + id, disconnectedAt: null });
  const lobby = code => ({ code, hostId: "host-socket", players: [seat("host", true), seat("fourth")],
    ranked: false, blitz: false, betaTournamentTest: false, started: false, gameState: null,
    createdAt: Date.now(), updatedAt: Date.now(), hostDisconnectDeadline: null,
    freeParkingJackpotEnabled: false, boardStyle: "classic-board" });
  const app = express(); app.use(express.json());
  solo.registerSoloTournamentRegistrationRoutes(app, request => {
    const id = request.get("x-account"); return id ? { id, displayName: id } : null;
  });
  solo.configureSoloRoomResetCloser(async (code, boardMatchId, roomCreatedAt) => {
    assert.equal((await readMatch()).status, "reset-pending");
    const room = rooms.get(code);
    if (room) {
      assert.equal(room.createdAt, roomCreatedAt);
      assert.ok(solo.getSoloTournamentStartBlock(room), "durable intent blocks start");
      assert.equal(endRoom(io, code, "ordinary cleanup"), false, "ordinary close cannot bypass quarantine");
    }
    if (stage === "after-intent") process.exit(73);
    if (stage === "save-failure") await mkdir(persistence.getSavePath() + ".tmp");
    if (room && !endRoom(io, code, "approved reset", { soloResetMatchId: boardMatchId })) return false;
    if (stage === "after-memory-close") process.exit(73);
    await persistence.flushRoomSaveStrict();
    if (stage === "after-room-save") process.exit(73);
    return true;
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const api = async (url, account, body = {}) => {
    const response = await fetch(base + url, { method: "POST", headers: {
      "content-type": "application/json", origin: base, "x-account": account
    }, body: JSON.stringify(body) });
    const result = await response.json();
    return { status: response.status, ...result };
  };
  if (stage === "recover") {
    const boundary = process.argv[4];
    await solo.loadSoloTournamentRegistration();
    await persistence.loadRoomsFromDisk({ strict: true });
    const before = await readMatch();
    if (before.status === "reset-pending") assert.ok(solo.getSoloTournamentBoundRoom("CRASHROOM"));
    await solo.reconcileSoloTournamentResets();
    const recovered = await readMatch();
    assert.equal(recovered.winnerAccountId, null);
    const metadata = JSON.parse(await readFile(join(root, "fixture.json"), "utf8"));
    if (boundary === "one-approval") {
      assert.equal(recovered.status, "room-bound");
      assert.ok(rooms.has("CRASHROOM"), "one consent never authorizes recovery deletion");
      assert.equal((await api(metadata.resetUrl, "fourth")).status, 200);
    } else {
      assert.equal(recovered.status, "awaiting-room");
      assert.equal(rooms.has("CRASHROOM"), false);
    }
    assert.equal(JSON.parse(await readFile(persistence.getSavePath(), "utf8")).rooms.length, 0);
    const replacement = lobby("NEWROOM"); rooms.set(replacement.code, replacement);
    const rebound = await api("/tournaments/solo/" + metadata.id + "/matches/semi-1/bind-room", "host",
      { roomCode: replacement.code });
    assert.equal(rebound.status, 200);
    assert.notEqual(rebound.tournament.matches[0].boardMatchId, metadata.oldMatchId);
    assert.equal(rebound.tournament.championAccountId, null);
    console.log("RECOVERED " + boundary);
    await new Promise(resolve => server.close(resolve));
  } else {
    const created = await api("/tournaments/solo", "host", { name: "Durable reset test" });
    assert.equal(created.status, 200);
    const id = created.tournament.id;
    for (const account of ["second", "third", "fourth"]) assert.equal((await api("/tournaments/solo/" + id + "/join", account)).status, 200);
    assert.equal((await api("/tournaments/solo/" + id + "/seed", "host")).status, 200);
    rooms.set("CRASHROOM", lobby("CRASHROOM"));
    await persistence.flushRoomSaveStrict();
    const bound = await api("/tournaments/solo/" + id + "/matches/semi-1/bind-room", "host", { roomCode: "CRASHROOM" });
    assert.equal(bound.status, 200);
    const resetUrl = "/tournaments/solo/" + id + "/matches/semi-1/approve-prestart-reset";
    await writeFile(join(root, "fixture.json"), JSON.stringify({ id, resetUrl, oldMatchId: bound.tournament.matches[0].boardMatchId }));
    assert.equal((await api(resetUrl, "host")).status, 200);
    if (stage === "one-approval") process.exit(73);
    const final = await api(resetUrl, "fourth");
    if (stage === "save-failure") {
      assert.equal(final.status, 503);
      assert.equal((await readMatch()).status, "reset-pending");
      assert.ok(solo.getSoloTournamentBoundRoom("CRASHROOM"));
    } else {
      assert.equal(final.status, 200);
      assert.equal((await readMatch()).status, "awaiting-room");
    }
    process.exit(73);
  }
}
