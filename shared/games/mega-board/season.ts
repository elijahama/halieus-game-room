import { normaliseRankedPlayerKey, type RankedMatchSummary, type RankedMatchPlayerResult, type RankedLeaderboardEntry } from "./ranked.js";
export const SEASON_FORM_WINDOW = 5;
export const SEASON_SCORING_WINDOW = 12;
export interface SeasonLeaderboardEntry {
  rank: number; playerKey: string; playerName: string; points: number;
  scoredMatches: number; seasonMatches: number; wins: number; podiums: number;
  recentForm: number[]; pointsToNext: number; rating: number;
  profilePicture?: string | null; avatar?: string; playerColor?: string;
}
export interface SeasonSnapshot {
  startedAt: number; scoringWindow: number; entries: SeasonLeaderboardEntry[];
  preseasonStandings: Array<Pick<RankedLeaderboardEntry, "playerKey" | "playerName" | "rating" | "wins" | "podiums"> & { accountId?: string }>;
}
export function seasonPoints(result: RankedMatchPlayerResult): number {
  if (!Number.isInteger(result.finishPosition) || result.finishPosition < 1) return 0;
  const placement = [20, 12, 8, 5][result.finishPosition - 1] ?? 2;
  const performance = Math.min(4, Math.floor(Math.max(0, result.performanceBonus || 0) / 3));
  const honours = Math.min(3, Math.floor(Math.max(0, result.awardBonus || 0) / 12));
  return placement + performance + honours;
}
export function buildSeasonSnapshot(matches: readonly RankedMatchSummary[], startedAt: number,
  preseasonStandings: SeasonSnapshot["preseasonStandings"] = [],
  lifetime: readonly RankedLeaderboardEntry[] = []): SeasonSnapshot {
  const ratings = new Map(lifetime.map(p => [p.playerKey, p.rating]));
  type Result = { at: number; matchId: string; points: number; finish: number };
  const current = new Map<string, { name: string; results: Result[] }>();
  const seen = new Set<string>();
  for (const match of matches) {
    if (!match?.matchId || seen.has(match.matchId)) continue;
    seen.add(match.matchId);
    if (!Number.isFinite(match.completedAt) || match.completedAt < startedAt) continue;
    for (const result of match.players ?? []) {
      if (!result.playerName || !Number.isInteger(result.finishPosition) || result.finishPosition < 1) continue;
      const key = normaliseRankedPlayerKey(result.playerName);
      if (!key) continue;
      const row = current.get(key) ?? { name: result.playerName, results: [] };
      row.name = result.playerName;
      row.results.push({ at: match.completedAt, matchId: match.matchId,
        points: seasonPoints(result), finish: result.finishPosition });
      current.set(key, row);
    }
  }
  const entries = [...current.entries()].map(([key, row]) => {
    const recent = row.results.sort((a,b) => b.at-a.at || a.matchId.localeCompare(b.matchId))
      .slice(0, SEASON_SCORING_WINDOW);
    return {
      rank: 0, playerKey: key, playerName: row.name,
      points: recent.reduce((sum,r) => sum+r.points, 0), scoredMatches: recent.length,
      seasonMatches: row.results.length, wins: recent.filter(r=>r.finish===1).length,
      podiums: recent.filter(r=>r.finish<=3).length,
      recentForm: recent.slice(0, SEASON_FORM_WINDOW).map(r=>r.finish),
      pointsToNext: 0, rating: ratings.get(key) ?? 1000,
    };
  }).sort((a,b) => b.points-a.points || b.wins-a.wins || b.podiums-a.podiums ||
    b.scoredMatches-a.scoredMatches || a.playerName.localeCompare(b.playerName));
  entries.forEach((p,i) => { p.rank = i+1; p.pointsToNext = i===0 ? 0 : Math.max(0, entries[i-1].points-p.points+1); });
  return { startedAt, scoringWindow: SEASON_SCORING_WINDOW, entries,
    preseasonStandings: preseasonStandings.map(p=>({...p})) };
}
export function rankedRecentForm(matches: readonly RankedMatchSummary[], playerKey: string): number[] {
  const seen = new Set<string>();
  return [...matches].sort((a,b)=>b.completedAt-a.completedAt).flatMap(m=>{
    if (seen.has(m.matchId)) return [];
    seen.add(m.matchId);
    const r = m.players.find(p=>normaliseRankedPlayerKey(p.playerName)===playerKey);
    return r ? [r.finishPosition] : [];
  }).slice(0, SEASON_FORM_WINDOW);
}
