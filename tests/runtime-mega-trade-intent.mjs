import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";
import { rooms } from "../server/src/games/mega-board/state/rooms.ts";
import { registerTradeHandlers } from "../server/src/games/mega-board/handlers/tradeHandlers.ts";

let counter = 0;
function createRoom(playerCount) {
  const code = "DI" + ++counter;
  const ids = ["p1", "p2", "p3", "p4"].slice(0, playerCount);
  const gameState = createInitialGameState(code, ids.map(id => ({ id, name: "Player " + id })));
  gameState.phase = "playing";
  gameState.turnPhase = "optional-actions";
  gameState.currentPlayerIndex = 0;
  for (const player of gameState.players) {
    player.cash = 1500;
    player.isAi = false;
    player.isBankrupt = false;
  }
  rooms.set(code, {
    code, hostId: "p1", started: true, gameState, createdAt: Date.now(),
    updatedAt: Date.now(), ranked: false, blitz: false,
    players: ids.map(id => ({ id, name: "Player " + id, isAi: false, isConnected: true })),
    hostDisconnectDeadline: null,
  });
  const emitted = [];
  const io = {
    to(target) { return { emit(event, value) { emitted.push({ target, event, value }); } }; },
    emit(event, value) { emitted.push({ event, value }); },
  };
  const clients = new Map();
  for (const id of ids) {
    const registered = new Map();
    registerTradeHandlers(io, { id, on(event, callback) { registered.set(event, callback); } });
    clients.set(id, registered);
  }
  function emit(id, event, payload = {}) {
    const handler = clients.get(id)?.get(event);
    assert(handler, "Missing " + event + " for " + id);
    handler({ code, ...payload });
  }
  const latest = () => emitted.filter(item => item.event === "game:trade-live").at(-1);
  const empty = {
    cashTransfers: {}, propertyRecipients: {}, busTicketRecipients: {},
    jailCardRecipients: {}, revision: 1,
  };
  return { code, ids, gameState, emitted, emit, latest, empty, dispose() { rooms.delete(code); } };
}

for (const playerCount of [2, 3, 4]) {
  const room = createRoom(playerCount);
  try {
    const recipients = room.ids.slice(1);
    const beforeBalances = room.gameState.players.map(p => p.cash);
    const beforeHistory = room.gameState.activityLog.length;
    room.emit("p1", "game:trade-live-update", {
      ...room.empty, recipientIds: recipients,
    });
    const draft = room.latest()?.value;
    assert(draft, "Recipient selection must broadcast deal intent without assets.");
    assert.deepEqual(draft.participantIds, room.ids);
    assert.equal(draft.proposerId, "p1");
    assert.equal(draft.stage, "draft");
    assert.deepEqual(draft.transfers, [], "No fake money or assets in an intent-only draft.");
    assert.equal(room.gameState.pendingTrade, null, "Draft must not create a formal offer.");
    assert.equal(room.gameState.activityLog.length, beforeHistory, "Draft is never persistent match history.");
    assert.deepEqual(room.gameState.players.map(p => p.cash), beforeBalances, "Preview cannot transfer cash.");

    const beforeUnauthorized = room.emitted.length;
    room.emit("p2", "game:trade-live-update", {
      ...room.empty, recipientIds: ["p1"],
    });
    assert.equal(room.emitted.length, beforeUnauthorized, "Only active player may broadcast deal intent.");

    room.emit("p1", "game:trade-live-update", {
      ...room.empty, recipientIds: recipients, cashTransfers: { "p1->p2": 100 },
      revision: 2,
    });
    assert.equal(room.latest()?.value?.transfers[0]?.cash, 100, "Offer changes broadcast live.");

    room.emit("p1", "game:trade-live-close");
    assert.equal(room.latest()?.value, null, "Closing an editor removes draft intent.");

    room.emit("p1", "game:trade-live-update", { ...room.empty, recipientIds: recipients });
    room.emit("p1", "game:trade-live-update", { ...room.empty, recipientIds: [] });
    assert.equal(room.latest()?.value, null, "Removing all recipients clears the intent.");

    const countBeforeTurnChange = room.emitted.length;
    room.gameState.currentPlayerIndex = 1;
    room.emit("p1", "game:trade-live-update", { ...room.empty, recipientIds: recipients });
    assert.equal(room.emitted.length, countBeforeTurnChange, "Old active player cannot send after turn changes.");
    console.log("PASS " + playerCount + "-player deal intent and clearance");
  } finally {
    room.dispose();
  }
}

const overlay = readFileSync(new URL("../client/src/games/mega-board/components/LiveTradeOverlay.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
assert.match(overlay, /wants to make a deal with/, "Live status should name the player making the deal.");
assert.match(overlay, /has proposed a deal to/, "Submitted offer must have distinct wording.");
assert.doesNotMatch(overlay, /if \(transfers\.length === 0\) return null/, "Empty terms must still show deal intent.");
assert.match(app, /tradeCloseNoticeSentRef\.current = true;[\s\S]*?closeLiveTradeDraft\(\)/,
  "Closing an unsent draft should clear the notification once.");
console.log("PASS deal intent labels and no premature proposal.");
