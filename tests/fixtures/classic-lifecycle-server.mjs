// Test process only: reproducible deals without a production debug endpoint.
import assert from 'node:assert/strict';
let seed = 1729;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const { selectBlockedDominoWinner } = await import('../../server/src/games/classic-table/handlers.ts');
const tile = (a, b) => ({ id: `${a}-${b}`, a, b });
const players = [
  { seat: 2, hand: [tile(1, 2)] },
  { seat: 0, hand: [tile(2, 2)] },
  { seat: 1, hand: [tile(0, 3)] },
];
assert.equal(selectBlockedDominoWinner(players), players[2], 'Existing pip tie resolves by seat, not input order');
assert.equal(selectBlockedDominoWinner([players[0], players[1]]), players[0], 'Lower pips beat lower seat');
assert.deepEqual(players.map((p) => p.seat), [2, 0, 1], 'Selection does not reorder the room');
await import('../../server/src/index.ts');
