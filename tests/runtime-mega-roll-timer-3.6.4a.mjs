import assert from 'node:assert/strict';
import { createInitialGameState } from '../server/dist/shared/games/mega-board/game-state.js';
import { rooms } from '../server/dist/server/src/games/mega-board/state/rooms.js';
import { runAiTickOnce } from '../server/dist/server/src/games/mega-board/ai/ai-engine.js';

const code = 'TMR364A';
const state = createInitialGameState(code, [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]);
state.phase = 'playing';
state.turnPhase = 'roll';
state.currentPlayerIndex = 0;

const roomPlayers = state.players.map((player, index) => ({
  id: player.id,
  name: player.name,
  isHost: index === 0,
  isConnected: true,
  isAi: false,
  aiDifficulty: null,
  hasLeft: false,
  reconnectToken: `token-${index}`,
  disconnectedAt: null,
}));
rooms.set(code, {
  code,
  ranked: false,
  blitz: false,
  hostId: 'p1',
  players: roomPlayers,
  started: true,
  gameState: state,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  hostDisconnectDeadline: null,
  freeParkingJackpotEnabled: false,
});

const emitted = [];
const io = {
  to() { return { emit(event, payload) { emitted.push([event, payload]); } }; },
  emit() {},
};

try {
  const before = Date.now();
  runAiTickOnce(io, code, true);
  assert.equal(state.turnRollDeadlinePlayerId, 'p1');
  assert.ok(state.turnRollDeadline >= before + 44_000 && state.turnRollDeadline <= before + 46_000, 'manual roll window should be ~45 seconds');
  const firstDeadline = state.turnRollDeadline;

  runAiTickOnce(io, code, true);
  assert.equal(state.turnRollDeadline, firstDeadline, 'repeated coordinator ticks must not reset the roll timer');
  assert.equal(state.players[0].autopilotEnabled, false);

  state.turnRollDeadline = Date.now() - 1;
  runAiTickOnce(io, code, true);
  assert.equal(state.players[0].autopilotEnabled, true, 'expired roll timer must enable Autopilot on the same human seat');
  assert.equal(state.turnRollDeadline, null);
  assert.equal(state.turnRollDeadlinePlayerId, null);
  assert.match(state.activityLog.at(-1)?.message ?? '', /Autopilot took over to keep the game moving/i);
  assert.ok(emitted.some(([event]) => event === 'game:state'), 'takeover should broadcast authoritative game state');

  state.players[0].autopilotEnabled = false;
  runAiTickOnce(io, code, true);
  assert.equal(state.turnRollDeadlinePlayerId, 'p1', 'Take Control during roll phase should start a fresh manual window');
  assert.ok((state.turnRollDeadline ?? 0) > Date.now());

  state.turnPhase = 'resolve-space';
  runAiTickOnce(io, code, true);
  assert.equal(state.turnRollDeadline, null, 'leaving roll phase must clear the roll deadline');
  assert.equal(state.turnRollDeadlinePlayerId, null);
} finally {
  rooms.delete(code);
}

console.log('Mega Board 3.6.4a anti-stall roll timer runtime: PASS');
