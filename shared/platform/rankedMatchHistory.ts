/** Public, post-match Ranked results only. No room secrets, roles or account tokens. */
export interface HgrRankedMatchHistoryPlayer {
  name: string;
  placement: number | null;
  winner: boolean;
  ratingDelta: number | null;
}
export interface HgrRankedMatchHistoryEntry {
  id: string;
  game: string;
  roomCode: string;
  completedAt: number;
  players: HgrRankedMatchHistoryPlayer[];
}
export interface HgrRankedMatchHistoryPage {
  matches: HgrRankedMatchHistoryEntry[];
  total: number;
  nextOffset: number | null;
}
