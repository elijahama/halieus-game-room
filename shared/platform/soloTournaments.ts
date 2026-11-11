import { eliminationMatchPlan, eliminationChampion } from "./fourEntrantBracket.js";
/** Solo tournament data shared by the authenticated UI and server. */
export type SoloTournamentStatus = "registration" | "seeded" | "completed" | "cancelled";
export type SoloTournamentFormat = "four-player-single-elimination" | "four-player-double-elimination";
export type SoloMatchStatus = "awaiting-room" | "awaiting-opponents" | "room-bound" | "reset-pending" | "completed" | "not-required";
export type SoloMatchId = "semi-1" | "semi-2" | "final" | "winners-final" | "losers-1" | "losers-final" | "grand-final" | "reset-final";
export interface SoloTournamentMatch {
  id: SoloMatchId;
  round: "semifinal" | "final" | "winners" | "losers" | "grand-final" | "reset-final";
  homeAccountId: string | null;
  awayAccountId: string | null;
  roomCode: string | null;
  roomCreatedAt: number | null;
  boardMatchId: string | null;
  winnerAccountId: string | null;
  gameStartedAt: number | null;
  completedAt: number | null;
  resetApprovedAccountIds: string[];
  resetRequestedAt: number | null;
  status: SoloMatchStatus;
}
export interface SoloTournament {
  id: string;
  name: string;
  game: "mega-board";
  format: SoloTournamentFormat;
  hostAccountId: string;
  entrantAccountIds: string[];
  status: SoloTournamentStatus;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  championAccountId: string | null;
  matches: SoloTournamentMatch[];
}
export { ELIMINATION_MATCH_LABELS as SOLO_MATCH_LABELS } from "./fourEntrantBracket.js";
function bracketRows(matches: SoloTournamentMatch[]) {
  return matches.map(m=>({id:m.id,round:m.round,status:m.status,homeId:m.homeAccountId,awayId:m.awayAccountId,winnerId:m.winnerAccountId}));
}
export function soloMatchPlan(format: SoloTournamentFormat, entrants: string[], matches: SoloTournamentMatch[]) {
  return eliminationMatchPlan(format === "four-player-double-elimination",entrants,bracketRows(matches)).map(m=>({
    id:m.id,round:m.round,homeAccountId:m.homeId,awayAccountId:m.awayId,notRequired:m.notRequired,
  }));
}
export function soloChampion(format: SoloTournamentFormat,matches: SoloTournamentMatch[]): string | null {
  return eliminationChampion(format === "four-player-double-elimination",bracketRows(matches));
}
