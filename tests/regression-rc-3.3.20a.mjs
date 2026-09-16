import assert from 'node:assert/strict';

const { createInitialGameState } = await import('../server/dist/shared/games/mega-board/game-state.js');
const { resolvePendingCard } = await import('../server/dist/server/src/games/mega-board/utils/cards.js');

function makeRepairGame(cardId, deck) {
  const game = createInitialGameState(
    'REPAIR1',
    [
      { id: 'p1', name: 'Elijah' },
      { id: 'p2', name: 'Maestro' },
    ],
    {},
  );

  const player = game.players[0];
  player.position = 22; // Community Chest on the Jail <-> Free Parking street strip.
  player.cash = 2500;
  player.properties = [15, 23, 27, 40];

  for (const propertyId of player.properties) {
    game.propertyOwners[propertyId] = player.id;
  }

  // Current strip (13-26): 15 = two houses, 23 = hotel.
  game.propertyDevelopments[15] = 2;
  game.propertyDevelopments[23] = 5;

  // Other strips: 27 = four houses, 40 = skyscraper.
  game.propertyDevelopments[27] = 4;
  game.propertyDevelopments[40] = 6;

  game.pendingCard = {
    cardId,
    deck,
    playerId: player.id,
    resumeAction: 'advance-turn',
  };

  return { game, player };
}

// Street Repairs is strip-scoped: only buildings on positions 13-26 count.
{
  const { game, player } = makeRepairGame('chest-street-repairs', 'community-chest');
  const before = player.cash;
  const error = resolvePendingCard(game, player.id);
  assert.equal(error, null);

  // 2 houses x £40 + 1 hotel x £115 = £195.
  assert.equal(before - player.cash, 195);
}

// General Repairs remains board-wide and must still count every development.
{
  const { game, player } = makeRepairGame('chance-repairs', 'chance');
  const before = player.cash;
  const error = resolvePendingCard(game, player.id);
  assert.equal(error, null);

  // 6 houses x £25 + 1 hotel x £100 + 1 skyscraper x £100 = £350.
  assert.equal(before - player.cash, 350);
}

console.log('RC 3.3.20a Street Repairs regression checks passed.');
