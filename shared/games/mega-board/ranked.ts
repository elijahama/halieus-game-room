import type { GamePlayer, GameState, PlayerMatchStats } from "./game-state.js";

export const DEFAULT_RANKED_RATING = 1000;
export const MINIMUM_RANKED_RATING = 100;
export const MAX_AWARD_RATING_BONUS = 36;
export const MAX_PERFORMANCE_RATING_BONUS = 12;

export interface RankedLeaderboardEntry {
  playerKey: string;
  playerName: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  podiums: number;
  totalFinish: number;
  averageFinish: number;
  awardsWon: number;
  performancePoints: number;
  lastPlayedAt: number;
}

export interface RankedMatchPlayerResult {
  playerId: string;
  playerName: string;
  finishPosition: number;
  ratingBefore: number;
  placementDelta: number;
  performanceBonus: number;
  awardBonus: number;
  ratingDelta: number;
  ratingAfter: number;
  awards: string[];
}

export interface RankedMatchSummary {
  matchId: string;
  roomCode: string;
  completedAt: number;
  players: RankedMatchPlayerResult[];
}

export interface RankedAwardResult {
  key: string;
  title: string;
  detail: string;
  points: number;
  value: number;
  winnerIds: string[];
}

interface AwardDefinition {
  key: string;
  title: string;
  detail: string;
  points: number;
  score: (stats: PlayerMatchStats, player: GamePlayer) => number;
}

export const RANKED_AWARD_DEFINITIONS: readonly AwardDefinition[] = [
  { key: "property-mogul", title: "Property Mogul", detail: "Highest property count reached", points: 5, score: (stats) => stats.peakProperties },
  { key: "master-builder", title: "Master Builder", detail: "Most development actions", points: 5, score: (stats) => stats.buildingEvents },
  { key: "rent-baron", title: "Rent Baron", detail: "Most rent collected", points: 7, score: (stats) => stats.rentCollected },
  { key: "auction-regular", title: "Auction Regular", detail: "Most auction activity", points: 4, score: (stats) => stats.auctionEvents },
  { key: "deal-maker", title: "Deal Maker", detail: "Most trade activity", points: 5, score: (stats) => stats.tradeEvents },
  { key: "road-warrior", title: "Road Warrior", detail: "Most rolls", points: 3, score: (stats) => stats.rolls },
  { key: "ticket-traveller", title: "Ticket Traveller", detail: "Most Bus Tickets used", points: 4, score: (stats) => stats.busTicketsUsed },
  { key: "kass-maneuver", title: "Kass Maneuver Award", detail: "Most Birthday Gift ↔ GO maneuvers", points: 7, score: (stats) => stats.kassManeuvers ?? 0 },
  { key: "peak-tycoon", title: "Peak Tycoon", detail: "Highest net worth reached", points: 7, score: (stats) => stats.peakNetWorth },
  { key: "profit-leader", title: "Profit Leader", detail: "Highest match profit", points: 6, score: (stats) => Math.max(0, (stats.revenue ?? 0) - (stats.expenses ?? 0)) },
] as const;

function fallbackStats(player: GamePlayer): PlayerMatchStats {
  return {
    actions: 0,
    rolls: 0,
    purchases: 0,
    auctionEvents: 0,
    tradeEvents: 0,
    buildingEvents: 0,
    mortgageEvents: 0,
    debtEvents: 0,
    cardEvents: 0,
    jailEvents: 0,
    rentPaid: 0,
    rentCollected: 0,
    revenue: 0,
    expenses: 0,
    busTicketsCollected: 0,
    busTicketsUsed: 0,
    kassManeuvers: 0,
    lastTrackedPosition: player.position,
    peakCash: player.cash,
    peakProperties: player.properties.length,
    peakNetWorth: player.cash,
    finishPosition: null,
    eliminatedTurn: null,
    finalCash: null,
    finalProperties: null,
    finalDevelopments: null,
    finalNetWorth: null,
    history: [],
  };
}

export function normaliseRankedPlayerKey(name: string): string {
  return name.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
}

export function getMatchAwards(gameState: GameState): RankedAwardResult[] {
  return RANKED_AWARD_DEFINITIONS.map((definition) => {
    const scored = gameState.players.map((player) => ({
      player,
      value: definition.score(gameState.playerStats?.[player.id] ?? fallbackStats(player), player),
    }));
    const best = Math.max(0, ...scored.map((entry) => entry.value));
    return {
      key: definition.key,
      title: definition.title,
      detail: definition.detail,
      points: definition.points,
      value: best,
      winnerIds: best > 0
        ? scored.filter((entry) => entry.value === best).map((entry) => entry.player.id)
        : [],
    };
  });
}

export function getAwardBonusForPlayer(gameState: GameState, playerId: string): { bonus: number; awards: string[] } {
  const wins = getMatchAwards(gameState).filter((award) => award.winnerIds.includes(playerId));
  const bonus = Math.min(MAX_AWARD_RATING_BONUS, wins.reduce((sum, award) => sum + award.points, 0));
  return { bonus, awards: wins.map((award) => award.title) };
}

function metricRankBonus(values: Array<{ playerId: string; value: number }>, playerId: string): number {
  const sorted = [...values].sort((a, b) => b.value - a.value || a.playerId.localeCompare(b.playerId));
  const player = sorted.find((entry) => entry.playerId === playerId);
  if (!player || player.value <= 0) return 0;
  const distinctAbove = new Set(sorted.filter((entry) => entry.value > player.value).map((entry) => entry.value)).size;
  return distinctAbove === 0 ? 3 : distinctAbove === 1 ? 2 : distinctAbove === 2 ? 1 : 0;
}

export function getPerformanceBonusForPlayer(gameState: GameState, playerId: string): number {
  const metrics = gameState.players.map((player) => {
    const stats = gameState.playerStats?.[player.id] ?? fallbackStats(player);
    return {
      playerId: player.id,
      rent: stats.rentCollected,
      peak: stats.peakNetWorth,
      property: stats.peakProperties,
      profit: Math.max(0, (stats.revenue ?? 0) - (stats.expenses ?? 0)),
    };
  });
  const bonus =
    metricRankBonus(metrics.map((row) => ({ playerId: row.playerId, value: row.rent })), playerId) +
    metricRankBonus(metrics.map((row) => ({ playerId: row.playerId, value: row.peak })), playerId) +
    metricRankBonus(metrics.map((row) => ({ playerId: row.playerId, value: row.property })), playerId) +
    metricRankBonus(metrics.map((row) => ({ playerId: row.playerId, value: row.profit })), playerId);
  return Math.min(MAX_PERFORMANCE_RATING_BONUS, bonus);
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function calculatePlacementDelta(
  playerId: string,
  finishByPlayerId: Record<string, number>,
  ratingByPlayerId: Record<string, number>,
): number {
  const ids = Object.keys(finishByPlayerId);
  if (ids.length <= 1) return 0;
  const perPairK = 48 / (ids.length - 1);
  let delta = 0;
  for (const otherId of ids) {
    if (otherId === playerId) continue;
    const actual = finishByPlayerId[playerId]! < finishByPlayerId[otherId]! ? 1 : 0;
    const expected = expectedScore(ratingByPlayerId[playerId] ?? DEFAULT_RANKED_RATING, ratingByPlayerId[otherId] ?? DEFAULT_RANKED_RATING);
    delta += perPairK * (actual - expected);
  }
  return Math.round(delta);
}
