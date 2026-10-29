import assert from "node:assert/strict";
import { notifyNewMegaTurn } from "../server/src/platform/megaTurnAlerts.ts";
import { toPublicGameRoom } from "../server/src/games/mega-board/utils/room-view.ts";

const startedAt = 1_800_000_000_000;
const a = { id: "seat-A", name: "Player", replayAccountId: "account-A", isAi: false,
  hasLeft: false, isConnected: false, reconnectToken: "private-A" };
const b = { id: "seat-B", name: "Other player", replayAccountId: "account-B", isAi: false,
  hasLeft: false, isConnected: true, reconnectToken: "private-B" };
const room = {
  code: "PLAY35", started: true, ranked: false, blitz: false, betaTournamentTest: false,
  players: [a, b], hostDisconnectDeadline: null, createdAt: startedAt, updatedAt: startedAt,
  freeParkingJackpotEnabled: false,
  gameState: {
    roomCode: "PLAY35", gameStartedAt: startedAt, phase: "playing", turnPhase: "roll",
    players: [{ id: a.id, isAi: false, autopilotEnabled: false, isBankrupt: false },
              { id: b.id, isAi: false, autopilotEnabled: false, isBankrupt: false }],
    currentPlayerIndex: 0, turnNumber: 1, pauseState: null, winnerId: null,
    globalNotices: [], lastGlobalNotice: null,
  },
};
const events = [];
const deliver = async (recipients, notice) => events.push({ recipients, notice });
const expectNoSend = (reason, change) => {
  const before = events.length, priorKey = room.lastTurnPushKey;
  room.lastTurnPushKey = undefined; // Remove dedup so each guard is independently tested.
  const undo = change();
  assert.equal(notifyNewMegaTurn(room, deliver), false, reason);
  assert.equal(events.length, before, reason + ": no gateway call");
  assert.equal(room.lastTurnPushKey, undefined, reason + ": no marker mutation");
  undo();
  room.lastTurnPushKey = priorKey;
};
assert.equal(notifyNewMegaTurn(room, deliver), true, "First eligible turn notification");
assert.equal(events.length, 1);
assert.deepEqual(events[0].recipients, ["account-A"], "Only authenticated seat owner");
assert.equal(events[0].notice.topic, "turns");
assert.equal(events[0].notice.url, "/?resumeMatch=mega-PLAY35-" + startedAt);
assert(!JSON.stringify(events[0].notice).includes("private-"));
assert(!JSON.stringify(events[0].notice).includes("account-A"));
assert.equal(notifyNewMegaTurn(room, deliver), false, "Repeated broadcast must deduplicate");
assert.equal(events.length, 1);
assert.equal(room.lastTurnPushKey, "mega-PLAY35-" + startedAt + ":1:0");
assert(!JSON.stringify(toPublicGameRoom(room)).includes("lastTurnPushKey"), "Do not publish private dedup");
expectNoSend("Paused", () => { const old = room.gameState.pauseState; room.gameState.pauseState = { pausedAt: Date.now() }; return () => { room.gameState.pauseState = old; }; });
expectNoSend("Ordering", () => { const old = room.gameState.phase; room.gameState.phase = "ordering"; return () => { room.gameState.phase = old; }; });
expectNoSend("Blocking pending auction", () => { room.gameState.pendingAuction = { id:"auction" }; return () => { room.gameState.pendingAuction = null; }; });
expectNoSend("Hidden pending trade", () => { room.gameState.pendingTrade = { id:"trade" }; return () => { room.gameState.pendingTrade = null; }; });
expectNoSend("Autopilot", () => { room.gameState.players[0].autopilotEnabled = true; return () => { room.gameState.players[0].autopilotEnabled = false; }; });
expectNoSend("Expired match", () => { room.hostDisconnectDeadline = Date.now() - 1; return () => { room.hostDisconnectDeadline = null; }; });
expectNoSend("Finished", () => { room.gameState.phase = "finished"; return () => { room.gameState.phase = "playing"; }; });
expectNoSend("Beta fixture", () => { room.betaTournamentTest = true; return () => { room.betaTournamentTest = false; }; });
room.gameState.currentPlayerIndex = 1;
assert.equal(notifyNewMegaTurn(room, deliver), true, "Next verified seat receives own alert");
assert.deepEqual(events[1].recipients, ["account-B"]);
assert.equal(room.lastTurnPushKey, "mega-PLAY35-" + startedAt + ":1:1");
room.players[0].replayAccountId = undefined;
room.gameState.currentPlayerIndex = 0; room.gameState.turnNumber = 2;
assert.equal(notifyNewMegaTurn(room, deliver), false, "Guest/no-account seat never receives push");
assert.equal(events.length, 2);
room.players[0].replayAccountId = "account-A";
assert.equal(notifyNewMegaTurn(room, deliver), true, "New turn key permits later alert");
assert.equal(events.length, 3);
assert.equal(notifyNewMegaTurn(room, deliver), false, "Persisted key suppresses replay on restart");
console.log("PASS Mega Board recipient privacy, opt-in topic payload, duplicate turn, pause, timeout, guest, finished and Beta guards");
