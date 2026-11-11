import type { EliminationMatchId, EliminationRound } from "./fourEntrantBracket.js";
/** Four-guild knockout, backed exclusively by real completed two-board Mega Board Guild fixtures. */
export type HgrGuildTournamentStatus = "registration" | "active" | "completed" | "cancelled";
export type HgrGuildTournamentMatchStatus = "awaiting-teams" | "ready" | "playing" | "tied" | "completed" | "not-required";
export interface HgrGuildTournamentMatch {
  id: EliminationMatchId;
  round: EliminationRound;
  homeGuildId: string | null;
  awayGuildId: string | null;
  fixtureId: string | null;
  status: HgrGuildTournamentMatchStatus;
  winnerGuildId: string | null;
}
export interface HgrGuildTournament {
  id: string;
  name: string;
  game: "mega-board";
  format: "four-guild-knockout" | "four-guild-double-elimination";
  hostGuildId: string;
  entrants: string[];
  status: HgrGuildTournamentStatus;
  matches: HgrGuildTournamentMatch[];
  championGuildId: string | null;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
}
