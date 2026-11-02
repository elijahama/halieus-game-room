/** Public, read-only projections of completed and retained Ranked match records.
 * Never send raw session archives, account IDs, recovery tokens, hidden game
 * state, or player-private actions through the Rankings page. */
export interface HgrRankedHistoryPlayer {
  name: string;
  finishPosition: number | null;
  ratingDelta: number | null;
}
export interface HgrRankedHistoryMatch {
  id: string;
  game: string;
  roomCode: string;
  completedAt: number;
  status: "completed" | "forfeit-completed";
  winnerName: string | null;
  players: HgrRankedHistoryPlayer[];
  source: "finalized-session" | "rankings-record";
}
export interface HgrRankedHistoryPage {
  matches: HgrRankedHistoryMatch[];
  total: number;
  nextOffset: number | null;
}
