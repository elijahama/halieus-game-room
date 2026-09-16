import assert from 'node:assert/strict';

const { createInitialGameState } = await import('../server/dist/shared/games/mega-board/game-state.js');
const { getBoardSpace } = await import('../server/dist/shared/games/mega-board/board.js');
const { resolveLandedSpace } = await import('../server/dist/server/src/games/mega-board/utils/space-resolution.js');
const { scoreDestination } = await import('../server/dist/server/src/games/mega-board/ai/ai-strategy.js');

function makeGame(cash) {
  const game = createInitialGameState('BANKD1', [
    { id: 'p1', name: 'Sam' },
    { id: 'p2', name: 'Maestro' },
  ], {});
  const player = game.players[0];
  player.position = 50;
  player.cash = cash;
  return { game, player };
}

{
  const { game, player } = makeGame(500);
  const result = resolveLandedSpace({
    gameState: game, player, diceTotal: 7, resumeAction: 'advance-turn',
  });
  assert.equal(player.cash, 400, 'Bank Deposit must deduct £100');
  assert.equal(game.pendingDebt, null);
  assert.match(result.message, /paid £100 into Bank Deposit/);
  assert.equal(game.playerStats[player.id].expenses, 100, 'Bank Deposit must record £100 cash out');
}

{
  const { game, player } = makeGame(60);
  const result = resolveLandedSpace({
    gameState: game, player, diceTotal: 7, resumeAction: 'advance-turn',
  });
  assert.equal(player.cash, 60, 'Cash must not go negative before debt resolution');
  assert.equal(game.pendingDebt?.amount, 100);
  assert.equal(game.pendingDebt?.creditorId, null);
  assert.equal(game.pendingDebt?.reason, 'Bank Deposit');
  assert.match(result.message, /owes the Bank £100/);
}

{
  const { game, player } = makeGame(500);
  const space = getBoardSpace(50);
  assert.ok(space);
  assert.equal(scoreDestination(game, player, space), -100, 'AI must treat Bank Deposit as a £100 cost');
}

console.log('RC 3.3.20c Bank Deposit regression: PASS');
