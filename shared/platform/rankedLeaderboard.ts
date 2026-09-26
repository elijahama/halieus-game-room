import type { HalieusRankedModel } from "./rankedFormats.js";

export interface HalieusRankedLeaderboardEntry {
  rank: number;
  accountId: string;
  displayName: string;
  rating: number;
  provisional: boolean;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  firstPlaces?: number;
  averagePlacement?: number;
  roundDifferential?: number;
  scoreDifferential?: number;
}

export interface HalieusRankedLeaderboardSnapshot {
  game: string;
  model: HalieusRankedModel;
  generatedAt: number;
  entries: HalieusRankedLeaderboardEntry[];
}
