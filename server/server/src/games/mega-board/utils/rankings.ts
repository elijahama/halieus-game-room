import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";
import {
  DEFAULT_RANKED_RATING,
  MINIMUM_RANKED_RATING,
  calculatePlacementDelta,
  getAwardBonusForPlayer,
  getPerformanceBonusForPlayer,
  normaliseRankedPlayerKey,
  type RankedLeaderboardEntry,
  type RankedMatchPlayerResult,
  type RankedMatchSummary,
} from "../../../../../shared/games/mega-board/ranked.js";

interface RankedSaveDocument {
  version: 1;
  savedAt: number;
  leaderboard: RankedLeaderboardEntry[];
  matches: RankedMatchSummary[];
}

const DATA_DIRECTORY = path.resolve(
  process.env.MEGA_MONOPOLY_DATA_DIR ?? path.join(process.cwd(), "data"),
);
const RANKINGS_PATH = path.resolve(DATA_DIRECTORY, "rankings.json");
const TEMP_PATH = `${RANKINGS_PATH}.tmp`;

const leaderboard = new Map<string, RankedLeaderboardEntry>();
const rankedMatches = new Map<string, RankedMatchSummary>();
let saveChain: Promise<void> = Promise.resolve();

function createEntry(playerName: string): RankedLeaderboardEntry {
  return {
    playerKey: normaliseRankedPlayerKey(playerName),
    playerName: playerName.trim(),
    rating: DEFAULT_RANKED_RATING,
    gamesPlayed: 0,
    wins: 0,
    podiums: 0,
    totalFinish: 0,
    averageFinish: 0,
    awardsWon: 0,
    performancePoints: 0,
    lastPlayedAt: 0,
  };
}

async function writeSnapshot(): Promise<void> {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const document: RankedSaveDocument = {
    version: 1,
    savedAt: Date.now(),
    leaderboard: getRankedLeaderboard(),
    matches: [...rankedMatches.values()].sort((a, b) => b.completedAt - a.completedAt).slice(0, 500),
  };
  await writeFile(TEMP_PATH, JSON.stringify(document, null, 2), "utf8");
  await rename(TEMP_PATH, RANKINGS_PATH);
}

function queueRankingsSave(): void {
  saveChain = saveChain
    .catch(() => undefined)
    .then(writeSnapshot)
    .catch((error) => console.error("Unable to save ranked leaderboard:", error));
}

export async function loadRankingsFromDisk(): Promise<number> {
  try {
    const raw = await readFile(RANKINGS_PATH, "utf8");
    const document = JSON.parse(raw) as RankedSaveDocument;
    if (document.version !== 1 || !Array.isArray(document.leaderboard)) {
      throw new Error("Unsupported ranked save format.");
    }
    leaderboard.clear();
    rankedMatches.clear();
    for (const row of document.leaderboard) {
      if (!row?.playerKey || !row?.playerName) continue;
      leaderboard.set(row.playerKey, row);
    }
    for (const match of document.matches ?? []) {
      if (match?.matchId) rankedMatches.set(match.matchId, match);
    }
    return leaderboard.size;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return 0;
    console.error("Unable to load ranked leaderboard:", error);
    return 0;
  }
}

export async function flushRankingsSave(): Promise<void> {
  queueRankingsSave();
  await saveChain;
}

export function getRankedLeaderboard(): RankedLeaderboardEntry[] {
  return [...leaderboard.values()].sort(
    (a, b) =>
      b.rating - a.rating ||
      b.wins - a.wins ||
      b.podiums - a.podiums ||
      a.averageFinish - b.averageFinish ||
      b.gamesPlayed - a.gamesPlayed ||
      a.playerName.localeCompare(b.playerName),
  );
}

export function getRecentRankedMatches(limit = 20): RankedMatchSummary[] {
  return [...rankedMatches.values()]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, Math.max(1, Math.min(100, limit)));
}

function finishPositionFor(gameState: GameState, playerId: string): number {
  const stats = gameState.playerStats?.[playerId];
  if (playerId === gameState.winnerId) return 1;
  return stats?.finishPosition ?? gameState.players.length;
}

export function finalizeRankedMatch(gameState: GameState): RankedMatchSummary | null {
  if (!gameState.ranked || gameState.phase !== "finished") return null;

  const matchId = gameState.rankedMatchId ?? `ranked-${gameState.roomCode}-${gameState.gameStartedAt}`;
  gameState.rankedMatchId = matchId;

  const existing = rankedMatches.get(matchId);
  if (gameState.rankedProcessed) {
    if (existing && gameState.rankedResults.length === 0) {
      gameState.rankedResults = existing.players;
    }
    return existing ?? null;
  }

  if (existing) {
    gameState.rankedProcessed = true;
    gameState.rankedResults = existing.players;
    return existing;
  }

  const humanPlayers = gameState.players.filter((player) => !player.isAi);
  const finishByPlayerId = Object.fromEntries(
    humanPlayers.map((player) => [player.id, finishPositionFor(gameState, player.id)]),
  );
  const ratingByPlayerId = Object.fromEntries(
    humanPlayers.map((player) => {
      const key = normaliseRankedPlayerKey(player.name);
      return [player.id, leaderboard.get(key)?.rating ?? DEFAULT_RANKED_RATING];
    }),
  );

  const completedAt = Date.now();
  const results: RankedMatchPlayerResult[] = humanPlayers
    .map((player) => {
      const ratingBefore = ratingByPlayerId[player.id] ?? DEFAULT_RANKED_RATING;
      const placementDelta = calculatePlacementDelta(player.id, finishByPlayerId, ratingByPlayerId);
      const performanceBonus = getPerformanceBonusForPlayer(gameState, player.id);
      const award = getAwardBonusForPlayer(gameState, player.id);
      const ratingDelta = placementDelta + performanceBonus + award.bonus;
      const ratingAfter = Math.max(MINIMUM_RANKED_RATING, ratingBefore + ratingDelta);
      return {
        playerId: player.id,
        playerName: player.name,
        finishPosition: finishByPlayerId[player.id] ?? humanPlayers.length,
        ratingBefore,
        placementDelta,
        performanceBonus,
        awardBonus: award.bonus,
        ratingDelta: ratingAfter - ratingBefore,
        ratingAfter,
        awards: award.awards,
      };
    })
    .sort((a, b) => a.finishPosition - b.finishPosition || b.ratingDelta - a.ratingDelta);

  for (const result of results) {
    const key = normaliseRankedPlayerKey(result.playerName);
    const current = leaderboard.get(key) ?? createEntry(result.playerName);
    current.playerName = result.playerName;
    current.rating = result.ratingAfter;
    current.gamesPlayed += 1;
    current.wins += result.finishPosition === 1 ? 1 : 0;
    current.podiums += result.finishPosition <= 3 ? 1 : 0;
    current.totalFinish += result.finishPosition;
    current.averageFinish = current.totalFinish / current.gamesPlayed;
    current.awardsWon += result.awards.length;
    current.performancePoints += result.performanceBonus + result.awardBonus;
    current.lastPlayedAt = completedAt;
    leaderboard.set(key, current);
  }

  const summary: RankedMatchSummary = {
    matchId,
    roomCode: gameState.roomCode,
    completedAt,
    players: results,
  };
  rankedMatches.set(matchId, summary);
  gameState.rankedProcessed = true;
  gameState.rankedResults = results;
  queueRankingsSave();
  return summary;
}

export function getRankingsPath(): string {
  return RANKINGS_PATH;
}
