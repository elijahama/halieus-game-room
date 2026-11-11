export type EliminationMatchId = "semi-1" | "semi-2" | "final" | "winners-final" | "losers-1" | "losers-final" | "grand-final" | "reset-final";
export type EliminationRound = "semifinal" | "final" | "winners" | "losers" | "grand-final" | "reset-final";
export interface EliminationMatch { id: EliminationMatchId; round: EliminationRound; homeId: string | null; awayId: string | null; winnerId: string | null; status: string; }
type MatchPlan = Pick<EliminationMatch, "id" | "round" | "homeId" | "awayId"> & { notRequired?: boolean };
/** Every later seat derives from completed receipts. There are exactly four entrants, no byes. */
export function eliminationMatchPlan(format: boolean, entrants: string[], matches: EliminationMatch[]): MatchPlan[] {
  const row = (id: EliminationMatchId) => matches.find(m => m.id === id);
  const winner = (id: EliminationMatchId) => row(id)?.status === "completed" ? row(id)!.winnerId : null;
  const loser = (id: EliminationMatchId) => {
    const m = row(id);
    return m?.status === "completed" && m.winnerId
      ? m.winnerId === m.homeId ? m.awayId : m.homeId : null;
  };
  const seats = (id: EliminationMatchId, round: MatchPlan["round"], a: string | null, b: string | null): MatchPlan =>
    ({ id, round, homeId: a && b ? a : null, awayId: a && b ? b : null });
  const opening = [
    seats("semi-1", "semifinal", entrants[0] ?? null, entrants[3] ?? null),
    seats("semi-2", "semifinal", entrants[1] ?? null, entrants[2] ?? null),
  ];
  if (!format) {
    return [...opening, seats("final", "final", winner("semi-1"), winner("semi-2"))];
  }
  const grand = row("grand-final");
  const grandWinner = winner("grand-final");
  const resetNeeded = !!grandWinner && grandWinner === grand?.awayId;
  return [...opening,
    seats("winners-final", "winners", winner("semi-1"), winner("semi-2")),
    seats("losers-1", "losers", loser("semi-1"), loser("semi-2")),
    seats("losers-final", "losers", loser("winners-final"), winner("losers-1")),
    seats("grand-final", "grand-final", winner("winners-final"), winner("losers-final")),
    { ...seats("reset-final", "reset-final", resetNeeded ? grand!.homeId : null,
      resetNeeded ? grand!.awayId : null), notRequired: !!grandWinner && !resetNeeded },
  ];
}
export function eliminationChampion(format: boolean, matches: EliminationMatch[]): string | null {
  const winner = (id: EliminationMatchId) => matches.find(m => m.id === id && m.status === "completed")?.winnerId ?? null;
  if (!format) return winner("final");
  const grand = matches.find(m => m.id === "grand-final");
  return grand?.status === "completed" && grand.winnerId === grand.homeId
    ? grand.winnerId : winner("reset-final");
}

export const ELIMINATION_MATCH_LABELS: Record<EliminationMatchId, string> = {
  "semi-1": "Semifinal 1", "semi-2": "Semifinal 2", "final": "Final",
  "winners-final": "Winners final", "losers-1": "Losers round 1",
  "losers-final": "Losers final", "grand-final": "Grand Final", "reset-final": "Grand Final reset",
};
