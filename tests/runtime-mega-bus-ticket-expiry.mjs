import assert from "node:assert/strict";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";
import { BUS_TICKET_CARDS } from "../shared/games/mega-board/cards.ts";
import {
  collectBusTicket,
  collectAutomaticBusResultTicket,
  syncBusTicketCounts,
} from "../server/src/games/mega-board/utils/mega-rules.ts";

const allIds = BUS_TICKET_CARDS.map((card) => card.id);
assert.equal(allIds.length, 16, "Mega Edition pool has exactly 16 unique tickets");
assert.equal(new Set(allIds).size, allIds.length, "Bus Ticket card IDs must be unique");

function freshState() {
  const state = createInitialGameState("BTEXP", [
    { id: "p1", name: "Alpha" },
    { id: "p2", name: "Beta" },
    { id: "p3", name: "Gamma" },
  ]);
  const held = [
    ["bus-standard-1", "bus-standard-2"],
    ["bus-expire-2"],
    ["bus-standard-3"],
  ];
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].busTicketIds = [...held[i]];
  }
  const heldIds = new Set(held.flat());
  state.busTicketDeck = allIds.filter((id) => !heldIds.has(id));
  state.busTicketsDiscarded = [];
  syncBusTicketCounts(state);
  assert.equal(state.busTicketDeck[0], "bus-expire-1", "The next draw is an expiry ticket");
  assert.equal(state.busTicketsRemaining, 12, "Four tickets start in player hands");
  return state;
}

function auditPool(state) {
  const held = state.players.flatMap((p) => p.busTicketIds);
  const all = [...held, ...state.busTicketDeck, ...state.busTicketsDiscarded];
  assert.equal(all.length, 16, "Every ticket is still accounted for");
  assert.equal(new Set(all).size, 16, "No ticket can exist in two locations");
  assert.deepEqual(new Set(all), new Set(allIds), "All original IDs are accounted for");
  assert.equal(state.busTicketsRemaining, state.busTicketDeck.length, "The reported pool size is authoritative");
  state.players.forEach((p) => assert.equal(p.busTickets, p.busTicketIds.length,
    "Player counts match the server's actual held ticket IDs"));
}

for (const drawPath of ["board-space", "speed-die"]) {
  const state = freshState();
  const first = drawPath === "board-space"
    ? collectBusTicket(state, state.players[0])
    : collectAutomaticBusResultTicket(state, state.players[0]);
  assert.equal(first.ticketId ?? first.awardedTicketId, "bus-expire-1",
    drawPath + ": the actual drawn ticket is kept");
  assert.equal(first.expiresOtherTickets ?? first.expiryTriggered, true,
    drawPath + ": expiry effect is triggered");
  assert.equal(first.expiredTicketCount, 4,
    drawPath + ": four previously held tickets expire, including prior expiry cards");
  assert.deepEqual(state.players.map((p) => p.busTicketIds), [["bus-expire-1"], [], []],
    drawPath + ": every other player's hand is emptied");
  assert.deepEqual(state.busTicketsDiscarded,
    ["bus-standard-1", "bus-standard-2", "bus-expire-2", "bus-standard-3"],
    drawPath + ": expired tickets are retired, not shuffled into the deck");
  for (const id of state.busTicketsDiscarded) {
    assert.ok(!state.busTicketDeck.includes(id), drawPath + ": expired ticket " + id + " cannot be drawn again");
  }
  assert.equal(state.busTicketsRemaining, 11, "The deck shrinks exactly by the new draw");
  auditPool(state);

  // A second expiry can retire a previously protected expiry ticket, but must
  // not resurface any older tickets or produce additional drawable supply.
  const second = collectBusTicket(state, state.players[1]);
  assert.equal(second.ticketId, "bus-expire-3");
  assert.equal(second.expiredTicketCount, 1);
  assert.deepEqual(state.players.map((p) => p.busTicketIds), [[], ["bus-expire-3"], []]);
  assert.ok(state.busTicketsDiscarded.includes("bus-expire-1"),
    "The first expiry ticket only survives its own draw, not a later one");
  assert.equal(state.busTicketsDiscarded.length, 5);
  assert.equal(state.busTicketsRemaining, 10);
  auditPool(state);

  // Exhaust the remaining finite 16-ticket pool. A returned/expired ticket
  // appearing in any later draw would imply that supply was incorrectly replenished.
  const expectedRemaining = [...state.busTicketDeck];
  const drawn = [];
  while (state.busTicketDeck.length > 0) {
    const result = collectBusTicket(state, state.players[2]);
    if (result.collected) drawn.push(result.ticketId);
    auditPool(state);
  }
  assert.deepEqual(drawn, expectedRemaining,
    "Draws must consume the original deck once, without recycling expired IDs");
  assert.equal(state.busTicketsRemaining, 0, "An exhausted pool stays exhausted");
  assert.equal(collectBusTicket(state, state.players[2]).collected, false,
    "No Bus Ticket can be drawn after the 16-card pool has been exhausted");
  auditPool(state);
  console.log("PASS " + drawPath + ": all previously held tickets expire permanently; protected new card and finite 16-ticket pool intact");
}


{
  // A restored room or handler can carry stale denormalized counts.
  // Every server broadcast must repair them from the real deck and hands.
  const { emitGameState } = await import("../server/src/games/mega-board/utils/game-state.ts");
  const state = createInitialGameState("BTCOUNT", [
    { id: "p1", name: "Alpha", isAi: true },
    { id: "p2", name: "Beta", isAi: true },
  ]);
  state.phase = "playing";
  state.turnPhase = "roll";
  state.busTicketDeck = ["bus-standard-4", "bus-standard-5"];
  state.busTicketsDiscarded = ["bus-standard-1"];
  state.players[0].busTicketIds = ["bus-standard-2"];
  state.players[0].busTickets = 99;
  state.busTicketsRemaining = 16;
  const emitted = [];
  const io = { to: () => ({ emit: (name, payload) => emitted.push([name, payload]) }) };
  emitGameState(io, "BTCOUNT", state);
  assert.equal(state.busTicketsRemaining, 2, "Server counter is repaired before broadcast");
  assert.equal(state.players[0].busTickets, 1, "Held-ticket count is repaired before broadcast");
  const broadcast = emitted.find(([name]) => name === "game:state")?.[1]?.state;
  assert.ok(broadcast, "The repaired authoritative state was broadcast");
  assert.equal(broadcast.busTicketsRemaining, 2);
  assert.equal(broadcast.players[0].busTickets, 1);

  const { readFile } = await import("node:fs/promises");
  const boardSource = await readFile(
    new URL("../client/src/games/mega-board/components/GameBoard.tsx", import.meta.url), "utf8"
  );
  assert.match(boardSource, /const remainingBusTickets = Array\.isArray\(gameState\.busTicketDeck\)/,
    "The board should derive remaining cards from the live draw pile");
  assert.equal((boardSource.match(/\{remainingBusTickets\}/g) ?? []).length, 3,
    "The badge, accessible label and Bus Ticket dialog all use the same count");
  console.log("PASS Bus Ticket counter: server broadcast and board derive from the live draw pile");
}
