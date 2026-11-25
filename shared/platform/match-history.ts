/** Match history is not a replay or a progression ledger. Public HTTP routes must
 * derive the account ID from authentication, never accept an arbitrary viewer ID. */
export type HistoryMatchStatus = "completed" | "forfeit-completed" | "host-ended" | "incomplete";
export interface HistoricalMatchEntry {
  matchId: string;
  game: string;
  finishedAt: number;
  status: HistoryMatchStatus;
  mode: string | null;
  players: {name:string;ai:boolean;self:boolean}[];
  result: "win" | "loss" | "draw" | "unrecorded";
  // Replay access is resolved separately by a game adapter and authorization.
  replay: "not-assessed";
}
export interface HistoricalMatchPage {
  entries: HistoricalMatchEntry[];
  total: number;
  offset: number;
  nextOffset: number | null;
}
