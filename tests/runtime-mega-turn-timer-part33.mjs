import assert from "node:assert/strict";
import { readMegaTurnTimer } from "../client/src/games/mega-board/utils/turnTimer.ts";

const now = 1_800_000_000_000;
const player = { id: "a", name: "Michael", isAi: false, autopilotEnabled: false };
const base = { turnPhase: "roll", turnRollDeadlinePlayerId: "a", turnRollDeadline: now + 150_000 };
const read = (state, activePlayer = player) => readMegaTurnTimer(state, activePlayer, now);

assert.deepEqual(
  { value: read(base).value, status: read(base).status },
  { value: "2:30", status: "running" },
  "Spectators and active seats use the same authoritative roll deadline",
);
assert.equal(read({ ...base, turnRollDeadline: now + 9000 }).urgent, true);
assert.equal(read({ ...base, turnRollDeadline: now - 1000 }).value, "0:00");
assert.equal(read({ ...base, turnRollDeadlinePlayerId: "other" }).value, "—", "Stale player deadlines must not display");
assert.equal(read({ ...base, turnRollDeadline: null }).status, "waiting");
assert.equal(read({ ...base, turnPhase: "roll" }, { ...player, isAi: true }).value, "Auto");
assert.equal(read({ ...base, turnPhase: "roll" }, { ...player, autopilotEnabled: true }).value, "Auto");
assert.equal(read({ turnPhase: "optional-actions", optionalActionDeadline: now + 42000 }).value, "0:42");
assert.equal(read({ turnPhase: "optional-actions", optionalActionDeadline: now + 42_000, pendingTrade: { id: "trade" } }).value, "Paused", "Pending trade suspends the displayed countdown");
for (const phase of ["debt", "jail-decision", "purchase", "auction", "card", "resolving-debt"]) {
  assert.equal(read({ turnPhase: phase }).value, "Paused", phase + " should never create a fake countdown");
}
assert.equal(readMegaTurnTimer(base, undefined, now).status, "waiting");
console.log("PASS Mega Board server-authoritative turn timer: roll, optional, AI, trades, paused decisions, stale deadlines");
