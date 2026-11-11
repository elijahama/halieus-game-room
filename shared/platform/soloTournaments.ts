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
export const SOLO_MATCH_LABELS: Record<SoloMatchId, string> = {
  "semi-1": "Semifinal 1", "semi-2": "Semifinal 2", "final": "Final",
  "winners-final": "Winners final", "losers-1": "Losers round 1",
  "losers-final": "Losers final", "grand-final": "Grand Final", "reset-final": "Grand Final reset",
};
type MatchPlan = Pick<SoloTournamentMatch, "id" | "round" | "homeAccountId" | "awayAccountId"> & { notRequired?: boolean };
/** Every later seat derives from completed receipts. There are exactly four entrants, no byes. */
export function soloMatchPlan(format: SoloTournamentFormat, entrants: string[], matches: SoloTournamentMatch[]): MatchPlan[] {
  const row = (id: SoloMatchId) => matches.find(m => m.id === id);
  const winner = (id: SoloMatchId) => row(id)?.status === "completed" ? row(id)!.winnerAccountId : null;
  const loser = (id: SoloMatchId) => {
    const m = row(id);
    return m?.status === "completed" && m.winnerAccountId
      ? m.winnerAccountId === m.homeAccountId ? m.awayAccountId : m.homeAccountId : null;
  };
  const seats = (id: SoloMatchId, round: MatchPlan["round"], a: string | null, b: string | null): MatchPlan =>
    ({ id, round, homeAccountId: a && b ? a : null, awayAccountId: a && b ? b : null });
  const opening = [
    seats("semi-1", "semifinal", entrants[0] ?? null, entrants[3] ?? null),
    seats("semi-2", "semifinal", entrants[1] ?? null, entrants[2] ?? null),
  ];
  if (format === "four-player-single-elimination") {
    return [...opening, seats("final", "final", winner("semi-1"), winner("semi-2"))];
  }
  const grand = row("grand-final");
  const grandWinner = winner("grand-final");
  const resetNeeded = !!grandWinner && grandWinner === grand?.awayAccountId;
  return [...opening,
    seats("winners-final", "winners", winner("semi-1"), winner("semi-2")),
    seats("losers-1", "losers", loser("semi-1"), loser("semi-2")),
    seats("losers-final", "losers", loser("winners-final"), winner("losers-1")),
    seats("grand-final", "grand-final", winner("winners-final"), winner("losers-final")),
    { ...seats("reset-final", "reset-final", resetNeeded ? grand!.homeAccountId : null,
      resetNeeded ? grand!.awayAccountId : null), notRequired: !!grandWinner && !resetNeeded },
  ];
}
export function soloChampion(format: SoloTournamentFormat, matches: SoloTournamentMatch[]): string | null {
  const winner = (id: SoloMatchId) => matches.find(m => m.id === id && m.status === "completed")?.winnerAccountId ?? null;
  if (format === "four-player-single-elimination") return winner("final");
  const grand = matches.find(m => m.id === "grand-final");
  return grand?.status === "completed" && grand.winnerAccountId === grand.homeAccountId
    ? grand.winnerAccountId : winner("reset-final");
}
