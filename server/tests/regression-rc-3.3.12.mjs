import assert from 'node:assert/strict';

import { BOARD_SPACES } from '../server/dist/shared/games/mega-board/board.js';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../server/dist/shared/games/mega-board/cards.js';
import { createInitialGameState } from '../server/dist/shared/games/mega-board/game-state.js';
import {
  placeAuctionBid,
  resolveAuctionAtDeadline,
  startAuction,
} from '../server/dist/server/src/games/mega-board/utils/auction.js';
import { autoLiquidateDebt, createDebt } from '../server/dist/server/src/games/mega-board/utils/debt.js';
import { resolveLandedSpace } from '../server/dist/server/src/games/mega-board/utils/space-resolution.js';
import { markEliminated } from '../server/dist/server/src/games/mega-board/utils/stats.js';

function makeGame(count = 4) {
  const players = Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
  }));
  const game = createInitialGameState('TEST', players);
  game.phase = 'playing';
  game.turnPhase = 'roll';
  return game;
}

function groupSpaces(group) {
  return BOARD_SPACES.filter((space) => space?.type === 'property' && space.group === group);
}

// 1) Final placements follow elimination order, not net worth.
{
  const game = makeGame(4);
  for (const [playerId, expectedPosition] of [['p4', 4], ['p3', 3], ['p2', 2]]) {
    const player = game.players.find((candidate) => candidate.id === playerId);
    assert.ok(player);
    markEliminated(game, player);
    assert.equal(game.playerStats[playerId].finishPosition, expectedPosition);
    player.isBankrupt = true;
  }
}

// 2) Auction countdown is inert until the first valid bid.
{
  const game = makeGame(2);
  assert.equal(startAuction(game, 1, 'p1'), null);
  game.pendingAuction.endsAt = Date.now() - 1_000;
  assert.equal(resolveAuctionAtDeadline(game, Date.now() + 60_000), null);
  assert.ok(game.pendingAuction, 'auction should still be open before the first bid');

  const bid = placeAuctionBid(game, 'p2', 10);
  assert.equal(bid.error, null);
  assert.equal(game.pendingAuction.highestBidderId, 'p2');
  assert.ok(game.pendingAuction.endsAt > Date.now(), 'first bid should create/reset the competitive deadline');

  const deadline = game.pendingAuction.endsAt;
  const resolution = resolveAuctionAtDeadline(game, deadline + 1);
  assert.equal(resolution?.winnerId, 'p2');
  assert.equal(game.propertyOwners[1], 'p2');
}

// 3) Mega Monopoly unimproved rent: majority = 2x, complete group = 3x.
{
  const brown = groupSpaces('brown');
  const landed = brown[0];
  assert.equal(brown.length, 3);

  const majorityGame = makeGame(2);
  const owner = majorityGame.players[0];
  const renter = majorityGame.players[1];
  owner.properties = [brown[0].id, brown[1].id];
  for (const space of brown.slice(0, 2)) majorityGame.propertyOwners[space.id] = owner.id;
  renter.position = landed.position;
  const ownerCashBefore = owner.cash;
  resolveLandedSpace({ gameState: majorityGame, player: renter, diceTotal: 7, resumeAction: 'advance-turn' });
  assert.equal(owner.cash - ownerCashBefore, landed.rents[0] * 2);

  const completeGame = makeGame(2);
  const completeOwner = completeGame.players[0];
  const completeRenter = completeGame.players[1];
  completeOwner.properties = brown.map((space) => space.id);
  for (const space of brown) completeGame.propertyOwners[space.id] = completeOwner.id;
  completeRenter.position = landed.position;
  const completeCashBefore = completeOwner.cash;
  resolveLandedSpace({ gameState: completeGame, player: completeRenter, diceTotal: 7, resumeAction: 'advance-turn' });
  assert.equal(completeOwner.cash - completeCashBefore, landed.rents[1]);
  assert.equal(landed.rents[1], landed.rents[0] * 3);

  const developedGame = makeGame(2);
  const developedOwner = developedGame.players[0];
  const developedRenter = developedGame.players[1];
  developedOwner.properties = brown.map((space) => space.id);
  for (const space of brown) developedGame.propertyOwners[space.id] = developedOwner.id;
  developedGame.propertyDevelopments[landed.id] = 1;
  developedRenter.position = landed.position;
  const developedCashBefore = developedOwner.cash;
  resolveLandedSpace({ gameState: developedGame, player: developedRenter, diceTotal: 7, resumeAction: 'advance-turn' });
  assert.equal(developedOwner.cash - developedCashBefore, landed.rents[2], 'developed rent table must take over');
}

// 4) Auto-liquidation cannot mortgage a colour group while any development remains in it.
{
  const game = makeGame(2);
  const debtor = game.players[0];
  const brown = groupSpaces('brown');
  debtor.cash = 0;
  debtor.properties = brown.map((space) => space.id);
  for (const space of brown) game.propertyOwners[space.id] = debtor.id;
  game.propertyDevelopments[brown[0].id] = 1;
  game.propertyDevelopments[brown[1].id] = 1;
  game.propertyDevelopments[brown[2].id] = 0;

  createDebt(game, {
    debtorId: debtor.id,
    creditorId: null,
    amount: 80,
    reason: 'Regression liquidation debt',
    resumeAction: 'advance-turn',
  });
  const result = autoLiquidateDebt(game, debtor.id);
  assert.equal(result.error, null);
  assert.ok(brown.some((space) => game.mortgagedProperties[space.id]), 'test should require a mortgage after selling buildings');
  assert.ok(brown.every((space) => (game.propertyDevelopments[space.id] ?? 0) === 0), 'all group development must be gone before a mortgage occurs');
}

// 5) Standard-Monopoly-only cards removed from the Mega deck.
{
  const allCards = [...CHANCE_CARDS, ...COMMUNITY_CHEST_CARDS];
  assert.equal(allCards.some((card) => /chairman of the board/i.test(card.title ?? card.text ?? '')), false);
  assert.equal(allCards.some((card) => /holiday fund/i.test(card.title ?? card.text ?? '')), false);
  assert.equal(allCards.some((card) => card.id === 'chance-chairman'), false);
  assert.equal(allCards.some((card) => card.id === 'chest-holiday-fund'), false);
}

console.log('RC 3.3.12 regression checks passed.');
