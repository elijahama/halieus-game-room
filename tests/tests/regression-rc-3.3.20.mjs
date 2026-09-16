import assert from 'node:assert/strict';

const { BOARD_SPACES, isOwnableBoardSpace } = await import('../server/dist/shared/games/mega-board/board.js');
const { createInitialGameState } = await import('../server/dist/shared/games/mega-board/game-state.js');
const { allocateBlitzProperties } = await import('../server/dist/server/src/games/mega-board/utils/blitz.js');
const { syncSpeedDieRetirement } = await import('../server/dist/server/src/games/mega-board/utils/speed-die-lifecycle.js');

const ownableIds = BOARD_SPACES.filter(isOwnableBoardSpace).map((space) => space.id);
assert.equal(ownableIds.length, 37, 'Mega Board canonical board exposes 37 ownable assets');

function makeGame(blitz, playerCount = 3) {
  return createInitialGameState(
    blitz ? 'BLITZ1' : 'CASUAL1',
    Array.from({ length: playerCount }, (_, index) => ({ id: `p${index + 1}`, name: `Player ${index + 1}` })),
    { blitz },
  );
}

// 1) Blitz must randomise asset identity while keeping counts as even as possible.
{
  const game = makeGame(true, 3);
  const startingCash = game.players.map((player) => player.cash);
  const result = allocateBlitzProperties(game, () => 0);

  assert.equal(result.totalAssets, 37);
  const counts = game.players.map((player) => player.properties.length);
  assert.equal(Math.max(...counts) - Math.min(...counts), 1, '37 assets over 3 players must differ by at most one');
  assert.deepEqual([...counts].sort((a, b) => b - a), [13, 12, 12]);
  assert.deepEqual(game.players.map((player) => player.cash), startingCash, 'Blitz allocation is free and must not alter starting cash');
  assert.equal(Object.keys(game.mortgagedProperties).length, 0);
  assert.equal(Object.keys(game.propertyDevelopments).length, 0);
  assert.equal(Object.keys(game.railroadDepots).length, 0);

  assert.equal(syncSpeedDieRetirement(game), true);
  assert.equal(game.speedDieRetired, true, 'all assets begin owned, so normal Speed Die retirement rules apply');
}

// 2) Every ownable asset is shuffled/dealt exactly once; UI sorting cannot alter ownership.
{
  const game = makeGame(true, 8);
  const sequence = [0, 1, 0, 2, 1, 3, 0, 4, 2, 1, 5, 0, 6, 3, 2, 7];
  let cursor = 0;
  const result = allocateBlitzProperties(game, (upperExclusive) => {
    const value = sequence[cursor % sequence.length] % upperExclusive;
    cursor += 1;
    return value;
  });

  assert.equal(result.totalAssets, ownableIds.length);
  assert.equal(Object.keys(game.propertyOwners).length, ownableIds.length);

  const allHeld = game.players.flatMap((player) => player.properties);
  assert.equal(allHeld.length, ownableIds.length);
  assert.deepEqual([...allHeld].sort((a, b) => a - b), ownableIds);
  assert.equal(new Set(allHeld).size, ownableIds.length, 'no asset may be dealt twice');

  for (const player of game.players) {
    assert.deepEqual(player.properties, [...player.properties].sort((a, b) => a - b), 'portfolio display ordering should remain deterministic');
    for (const propertyId of player.properties) {
      assert.equal(game.propertyOwners[propertyId], player.id);
    }
  }

  const counts = game.players.map((player) => player.properties.length);
  assert.equal(Math.max(...counts) - Math.min(...counts), 1, '37 assets over 8 players must produce only 4- or 5-asset portfolios');
  assert.equal(counts.filter((count) => count === 5).length, 5);
  assert.equal(counts.filter((count) => count === 4).length, 3);
}

// 3) Casual/Ranked state is never transformed into Blitz by the allocation helper.
{
  const game = makeGame(false);
  const result = allocateBlitzProperties(game, () => 0);
  assert.equal(result.totalAssets, 0);
  assert.equal(Object.keys(game.propertyOwners).length, 0);
  assert.ok(game.players.every((player) => player.properties.length === 0));
}

console.log('RC 3.3.20 Blitz regression checks passed (superseded allocation rule updated in 3.3.22).');
