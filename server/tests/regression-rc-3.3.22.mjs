import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { createInitialGameState } = await import('../server/dist/shared/games/mega-board/game-state.js');
const { allocateBlitzProperties } = await import('../server/dist/server/src/games/mega-board/utils/blitz.js');
const {
  isAutomatedTradeCoolingDown,
  rememberRejectedAutomatedTrade,
  clearAutomatedTradeMemoryForRoom,
} = await import('../server/dist/server/src/games/mega-board/utils/automated-trade-memory.js');

// Report JPUH2C established that the canonical board contains 37 ownable assets.
// For 8 players the next build must deal five assets to five players and four to three.
{
  const game = createInitialGameState(
    'JPUH2C2',
    Array.from({ length: 8 }, (_, index) => ({ id: `p${index + 1}`, name: `P${index + 1}` })),
    { blitz: true },
  );
  let seed = 0;
  const result = allocateBlitzProperties(game, (upperExclusive) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % upperExclusive;
  });
  assert.equal(result.totalAssets, 37);
  const counts = game.players.map((player) => player.properties.length);
  assert.deepEqual([...counts].sort((a, b) => b - a), [5, 5, 5, 5, 5, 4, 4, 4]);
}

// Rejected automated deals must cool down progressively instead of repeating every few turns.
{
  const game = createInitialGameState(
    'TRADE22',
    [
      { id: 'buyer', name: 'Buyer' },
      { id: 'seller', name: 'Seller' },
    ],
    {},
  );
  const buyer = game.players[0];
  const seller = game.players[1];
  buyer.autopilotEnabled = true;
  buyer.properties = [1];
  seller.properties = [3];
  game.propertyOwners[1] = buyer.id;
  game.propertyOwners[3] = seller.id;

  const trade = { proposerId: buyer.id, recipientId: seller.id, recipientPropertyIds: [3] };
  game.turnNumber = 1;
  rememberRejectedAutomatedTrade('TRADE22', game, trade);
  assert.equal(isAutomatedTradeCoolingDown('TRADE22', game, buyer.id, seller.id, [3], 5), true);
  assert.equal(isAutomatedTradeCoolingDown('TRADE22', game, buyer.id, seller.id, [3], 11), false);

  game.turnNumber = 11;
  rememberRejectedAutomatedTrade('TRADE22', game, trade);
  assert.equal(isAutomatedTradeCoolingDown('TRADE22', game, buyer.id, seller.id, [3], 30), true, 'second rejection uses a longer cooldown');
  assert.equal(isAutomatedTradeCoolingDown('TRADE22', game, buyer.id, seller.id, [3], 31), false);

  buyer.properties.push(4);
  game.propertyOwners[4] = buyer.id;
  assert.equal(isAutomatedTradeCoolingDown('TRADE22', game, buyer.id, seller.id, [3], 12), false, 'material portfolio changes allow reconsideration');
  clearAutomatedTradeMemoryForRoom('TRADE22');
}

const lobby = readFileSync(resolve(root, 'server/src/games/mega-board/handlers/lobbyHandlers.ts'), 'utf8');
const ai = readFileSync(resolve(root, 'server/src/games/mega-board/ai/ai-engine.ts'), 'utf8');
assert.match(lobby, /shuffled and evenly dealt all/);
assert.match(lobby, /dealt as evenly as possible/);
assert.doesNotMatch(lobby, /No portfolio balancing was applied/);
assert.match(ai, /minimumLikelyAcceptance/);
assert.match(ai, /maximumStrategicOffer/);

console.log('3.3.22 JPUH2C-derived Blitz distribution and trade-memory regression PASS');
