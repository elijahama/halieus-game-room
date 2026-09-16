import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.ROOM_SAVE_PATH = '/tmp/mega-monopoly-3.3.20d-test-rooms.json';

const { BOARD_SPACES, isOwnableBoardSpace } = await import('../server/dist/shared/games/mega-board/board.js');
const { createInitialGameState } = await import('../server/dist/shared/games/mega-board/game-state.js');
const { registerTradeHandlers } = await import('../server/dist/server/src/games/mega-board/handlers/tradeHandlers.js');
const { resolveAiTrade } = await import('../server/dist/server/src/games/mega-board/ai/ai-engine.js');
const { rooms } = await import('../server/dist/server/src/games/mega-board/state/rooms.js');
const { flushRoomSave } = await import('../server/dist/server/src/games/mega-board/utils/persistence.js');

class FakeSocket {
  constructor(id) {
    this.id = id;
    this.handlers = new Map();
  }
  on(name, handler) {
    this.handlers.set(name, handler);
  }
}

const fakeIo = {
  to() {
    return { emit() {} };
  },
};

function invoke(socket, eventName, payload) {
  const handler = socket.handlers.get(eventName);
  assert.ok(handler, `missing ${eventName} handler`);
  let response;
  handler(payload, (value) => { response = value; });
  assert.ok(response, `${eventName} should acknowledge synchronously`);
  return response;
}

function makeRoom(code = 'MULTI1') {
  const state = createInitialGameState(code, [
    { id: 'p1', name: 'Sam' },
    { id: 'p2', name: 'Maestro' },
    { id: 'p3', name: 'Kass' },
    { id: 'p4', name: 'Elijah' },
  ], {});
  state.phase = 'playing';
  state.turnPhase = 'roll';
  state.currentPlayerIndex = 0;

  const ownables = BOARD_SPACES.filter(isOwnableBoardSpace).slice(0, 4);
  ownables.forEach((space, index) => {
    const player = state.players[index];
    player.properties.push(space.id);
    state.propertyOwners[space.id] = player.id;
  });

  const now = Date.now();
  const room = {
    code,
    ranked: false,
    blitz: false,
    hostId: 'p1',
    players: state.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      isHost: index === 0,
      isConnected: true,
      isAi: false,
      aiDifficulty: null,
      hasLeft: false,
      reconnectToken: `token-${player.id}`,
      disconnectedAt: null,
    })),
    started: true,
    gameState: state,
    createdAt: now,
    updatedAt: now,
    hostDisconnectDeadline: null,
    freeParkingJackpotEnabled: false,
  };
  rooms.set(code, room);
  return { room, state, propertyIds: ownables.map((space) => space.id) };
}

function registerSockets() {
  const sockets = Object.fromEntries(['p1', 'p2', 'p3', 'p4'].map((id) => [id, new FakeSocket(id)]));
  for (const socket of Object.values(sockets)) registerTradeHandlers(fakeIo, socket);
  return sockets;
}

// 1) A 4-way deal is atomic: first/second approvals do not transfer anything;
// the final approval executes every directed cash/property leg together.
{
  rooms.clear();
  const { state, propertyIds } = makeRoom();
  const sockets = registerSockets();
  const [a, b, c, d] = propertyIds;

  const proposal = invoke(sockets.p1, 'game:trade-propose', {
    code: 'MULTI1',
    recipientId: 'p2',
    recipientIds: ['p2', 'p3', 'p4'],
    cashTransfers: {
      'p1->p2': 100,
      'p2->p3': 50,
      'p3->p4': 75,
      'p4->p1': 200,
    },
    propertyRecipients: {
      [a]: 'p2',
      [b]: 'p3',
      [c]: 'p4',
      [d]: 'p1',
    },
    busTicketRecipients: {},
    jailCardRecipients: {},
    proposerCash: 0,
    recipientCash: 0,
    proposerPropertyIds: [],
    recipientPropertyIds: [],
    proposerBusTicketIds: [],
    recipientBusTicketIds: [],
    proposerJailCardIds: [],
    recipientJailCardIds: [],
  });

  assert.equal(proposal.ok, true);
  assert.equal(state.pendingTrade?.multiParty, true);
  assert.deepEqual(state.pendingTrade?.participantIds, ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(state.pendingTrade?.acceptedPlayerIds, ['p1']);

  const beforeCash = Object.fromEntries(state.players.map((p) => [p.id, p.cash]));
  const tradeId = state.pendingTrade.id;

  assert.equal(invoke(sockets.p2, 'game:trade-accept', { code: 'MULTI1', tradeId }).ok, true);
  assert.equal(state.propertyOwners[a], 'p1', 'first approval must not transfer assets');
  assert.deepEqual(Object.fromEntries(state.players.map((p) => [p.id, p.cash])), beforeCash, 'first approval must not move cash');

  assert.equal(invoke(sockets.p3, 'game:trade-accept', { code: 'MULTI1', tradeId }).ok, true);
  assert.equal(state.propertyOwners[b], 'p2', 'second approval must still be atomic');

  assert.equal(invoke(sockets.p4, 'game:trade-accept', { code: 'MULTI1', tradeId }).ok, true);
  assert.equal(state.pendingTrade, null);
  assert.equal(state.lastTradeResult?.status, 'accepted');
  assert.deepEqual(state.lastTradeResult?.participantIds, ['p1', 'p2', 'p3', 'p4']);

  assert.equal(state.propertyOwners[a], 'p2');
  assert.equal(state.propertyOwners[b], 'p3');
  assert.equal(state.propertyOwners[c], 'p4');
  assert.equal(state.propertyOwners[d], 'p1');

  assert.equal(state.players[0].cash, 2600);
  assert.equal(state.players[1].cash, 2550);
  assert.equal(state.players[2].cash, 2475);
  assert.equal(state.players[3].cash, 2375);
}

// 2) Any invited participant may decline and that cancels the entire deal with
// no partial transfer.
{
  rooms.clear();
  const { state, propertyIds } = makeRoom('MULTI2');
  const sockets = registerSockets();
  const [a, b] = propertyIds;
  const proposal = invoke(sockets.p1, 'game:trade-propose', {
    code: 'MULTI2',
    recipientId: 'p2',
    recipientIds: ['p2', 'p3'],
    cashTransfers: { 'p3->p1': 150 },
    propertyRecipients: { [a]: 'p2', [b]: 'p3' },
    busTicketRecipients: {}, jailCardRecipients: {},
    proposerCash: 0, recipientCash: 0,
    proposerPropertyIds: [], recipientPropertyIds: [],
    proposerBusTicketIds: [], recipientBusTicketIds: [],
    proposerJailCardIds: [], recipientJailCardIds: [],
  });
  assert.equal(proposal.ok, true);
  const tradeId = state.pendingTrade.id;
  assert.equal(invoke(sockets.p2, 'game:trade-decline', { code: 'MULTI2', tradeId }).ok, true);
  assert.equal(state.pendingTrade, null);
  assert.equal(state.lastTradeResult?.status, 'declined');
  assert.equal(state.propertyOwners[a], 'p1');
  assert.equal(state.propertyOwners[b], 'p2');
  assert.equal(state.players[2].cash, 2500);
}

// 3) A participant's per-turn reject-all setting blocks creation of the whole
// multi-party deal before it can pause play.
{
  rooms.clear();
  const { state } = makeRoom('MULTI3');
  const sockets = registerSockets();
  state.tradeRejectAllTurnByPlayerId.p3 = state.turnNumber;
  const response = invoke(sockets.p1, 'game:trade-propose', {
    code: 'MULTI3', recipientId: 'p2', recipientIds: ['p2', 'p3'],
    cashTransfers: { 'p1->p2': 1 }, propertyRecipients: {}, busTicketRecipients: {}, jailCardRecipients: {},
    proposerCash: 0, recipientCash: 0,
    proposerPropertyIds: [], recipientPropertyIds: [], proposerBusTicketIds: [], recipientBusTicketIds: [], proposerJailCardIds: [], recipientJailCardIds: [],
  });
  assert.equal(response.ok, false);
  assert.match(response.reason, /Kass is rejecting all trade offers/i);
  assert.equal(state.pendingTrade, null);
}


// 4) AI/Autopilot participants can take part in a multi-party deal. Their
// acceptance is evaluated automatically with the normal trade-value profile.
{
  rooms.clear();
  const { state } = makeRoom('MULTI4');
  const sockets = registerSockets();
  state.players[2].isAi = true;
  state.players[2].aiDifficulty = 'normal';

  const proposal = invoke(sockets.p1, 'game:trade-propose', {
    code: 'MULTI4', recipientId: 'p2', recipientIds: ['p2', 'p3'],
    cashTransfers: { 'p1->p2': 10, 'p2->p1': 1, 'p1->p3': 200, 'p3->p1': 1 },
    propertyRecipients: {}, busTicketRecipients: {}, jailCardRecipients: {},
    proposerCash: 0, recipientCash: 0,
    proposerPropertyIds: [], recipientPropertyIds: [], proposerBusTicketIds: [], recipientBusTicketIds: [], proposerJailCardIds: [], recipientJailCardIds: [],
  });
  assert.equal(proposal.ok, true);
  const tradeId = state.pendingTrade.id;
  assert.equal(invoke(sockets.p2, 'game:trade-accept', { code: 'MULTI4', tradeId }).ok, true);
  assert.ok(state.pendingTrade, 'deal should wait for the AI participant');
  const aiMessage = resolveAiTrade('MULTI4', state, state.players[2]);
  assert.match(aiMessage, /accepted by everyone and completed/i);
  assert.equal(state.pendingTrade, null);
  assert.equal(state.lastTradeResult?.status, 'accepted');
  assert.equal(state.players[0].cash, 2292);
  assert.equal(state.players[1].cash, 2509);
  assert.equal(state.players[2].cash, 2699);
}

rooms.clear();
await flushRoomSave();
await rm(process.env.ROOM_SAVE_PATH, { force: true });
await rm(`${process.env.ROOM_SAVE_PATH}.tmp`, { force: true });
console.log('RC 3.3.20d multi-party trade regression: PASS');
