import assert from 'node:assert/strict';
import { createInitialGameState } from '../server/dist/shared/games/mega-board/game-state.js';
import { rooms } from '../server/dist/server/src/games/mega-board/state/rooms.js';
import { syncOptionalActionTimer } from '../server/dist/server/src/games/mega-board/utils/game-state.js';

const code = 'TMR514';
const state = createInitialGameState(code, [
  { id: 'p1', name: 'Player One' },
  { id: 'p2', name: 'Player Two' },
]);
state.phase = 'playing';
state.turnPhase = 'optional-actions';
state.currentPlayerIndex = 0;
state.optionalActionDeadline = Date.now() + 90;
state.pendingTrade = {
  id: 'trade-1',
  proposerId: 'p1',
  recipientId: 'p2',
  proposerCash: 0,
  recipientCash: 50,
  proposerPropertyIds: [],
  recipientPropertyIds: [],
  proposerBusTicketIds: [],
  recipientBusTicketIds: [],
  proposerJailCardIds: [],
  recipientJailCardIds: [],
  proposerMortgageInterest: 0,
  recipientMortgageInterest: 0,
  status: 'pending',
  createdAt: Date.now(),
};

rooms.set(code, {
  code,
  ranked: false,
  blitz: false,
  hostId: 'p1',
  players: [
    { id: 'p1', name: 'Player One', isHost: true, isConnected: true, isAi: false, aiDifficulty: null, hasLeft: false, reconnectToken: 'r1', disconnectedAt: null },
    { id: 'p2', name: 'Player Two', isHost: false, isConnected: true, isAi: false, aiDifficulty: null, hasLeft: false, reconnectToken: 'r2', disconnectedAt: null },
  ],
  started: true,
  gameState: state,
  createdAt: Date.now() - 1000,
  updatedAt: Date.now(),
  hostDisconnectDeadline: null,
  freeParkingJackpotEnabled: false,
});

const emitted = [];
const io = {
  to(roomCode) {
    return { emit(event, payload) { emitted.push({ roomCode, event, payload }); } };
  },
  emit(event, payload) { emitted.push({ roomCode: '*', event, payload }); },
};

const originalDeadline = state.optionalActionDeadline;
syncOptionalActionTimer(io, code, state);
assert.equal(state.optionalActionDeadline, originalDeadline, 'existing turn deadline must not be reset when a trade is pending');

// A repeated broadcast/sync during the same pending trade must also keep the same deadline.
await new Promise((resolve) => setTimeout(resolve, 30));
syncOptionalActionTimer(io, code, state);
assert.equal(state.optionalActionDeadline, originalDeadline, 'repeated trade-state sync must not restart the turn clock');

await new Promise((resolve) => setTimeout(resolve, 140));
assert.equal(state.pendingTrade, null, 'pending trade must be cancelled when the turn expires');
assert.equal(state.currentPlayerIndex, 1, 'turn must advance after the expired trade is cancelled');
assert.equal(state.turnPhase, 'roll', 'next player must receive the normal roll phase');
assert.ok(emitted.some((entry) => entry.event === 'game:state'), 'expiry must broadcast the advanced game state');

rooms.delete(code);
console.log('Halieus 3.5.14 trade turn timer live lifecycle PASS');
