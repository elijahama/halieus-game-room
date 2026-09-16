import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mega-ranked-test-'));
process.env.MEGA_MONOPOLY_DATA_DIR = tempDir;

const { createInitialGameState } = await import('../server/dist/shared/games/mega-board/game-state.js');
const { getMatchAwards, calculatePlacementDelta } = await import('../server/dist/shared/games/mega-board/ranked.js');
const { markEliminated } = await import('../server/dist/server/src/games/mega-board/utils/stats.js');
const { recordActivity } = await import('../server/dist/server/src/games/mega-board/utils/activity.js');
const { finalizeRankedMatch, getRankedLeaderboard } = await import('../server/dist/server/src/games/mega-board/utils/rankings.js');

function makeGame(names = ['Elijah', 'Maestro', 'Kass']) {
  const game = createInitialGameState('RANKT1', names.map((name, index) => ({ id: `p${index + 1}`, name })), { ranked: true });
  game.phase = 'playing';
  game.turnPhase = 'roll';
  return game;
}

// 1) Award ties are shared, including the Kass Maneuver Award.
{
  const game = makeGame();
  game.playerStats.p1.kassManeuvers = 2;
  game.playerStats.p2.kassManeuvers = 2;
  game.playerStats.p3.kassManeuvers = 1;
  const award = getMatchAwards(game).find((item) => item.key === 'kass-maneuver');
  assert.ok(award);
  assert.deepEqual(new Set(award.winnerIds), new Set(['p1', 'p2']));
}

// 2) Placement remains the main skill signal at equal starting ratings.
{
  const finishes = { p1: 1, p2: 2, p3: 3 };
  const ratings = { p1: 1000, p2: 1000, p3: 1000 };
  assert.ok(calculatePlacementDelta('p1', finishes, ratings) > 0);
  assert.equal(calculatePlacementDelta('p2', finishes, ratings), 0);
  assert.ok(calculatePlacementDelta('p3', finishes, ratings) < 0);
}

// 3) Bankruptcy activity uses the actual elimination turn even if turn advancement already wrapped.
{
  const game = makeGame(['Sam', 'Elijah']);
  game.turnNumber = 10;
  const sam = game.players[0];
  markEliminated(game, sam);
  sam.isBankrupt = true;
  game.turnNumber = 11;
  recordActivity(game, 'Sam declared bankruptcy.', 'debt', sam.id);
  assert.equal(game.playerStats[sam.id].eliminatedTurn, 10);
  assert.equal(game.activityLog.at(-1).turnNumber, 10);
}

// 4) Ranked completion writes one persistent result and is idempotent.
{
  const game = makeGame(['Elijah', 'Maestro', 'Kass']);
  game.phase = 'finished';
  game.turnPhase = 'finished';
  game.winnerId = 'p1';
  game.playerStats.p1.finishPosition = 1;
  game.playerStats.p2.finishPosition = 2;
  game.playerStats.p3.finishPosition = 3;
  game.playerStats.p1.rentCollected = 5000;
  game.playerStats.p1.peakNetWorth = 9000;
  game.playerStats.p1.peakProperties = 20;
  game.playerStats.p1.revenue = 8000;
  game.playerStats.p1.expenses = 3000;
  game.playerStats.p2.kassManeuvers = 1;
  game.playerStats.p3.kassManeuvers = 1;

  const first = finalizeRankedMatch(game);
  assert.ok(first);
  assert.equal(game.rankedProcessed, true);
  assert.equal(game.rankedResults.length, 3);
  const firstBoard = getRankedLeaderboard();
  assert.equal(firstBoard.length, 3);
  assert.ok(firstBoard.every((entry) => entry.gamesPlayed === 1));

  const second = finalizeRankedMatch(game);
  assert.equal(second?.matchId, first.matchId);
  const secondBoard = getRankedLeaderboard();
  assert.ok(secondBoard.every((entry) => entry.gamesPlayed === 1), 'same ranked match must not score twice');
}

console.log('RC 3.3.19 regression checks passed.');
