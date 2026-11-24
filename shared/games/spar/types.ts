/** HGR Spar / Cha-Cha — Ghanaian last-trick variant.
 * Server is authoritative; each viewer receives only their own private hand.
 */
export type SparSuit = "C" | "D" | "H" | "S";
export const SPAR_MAX_PLAYERS = 8;
export type SparTableFormat = "duel" | "multiplayer";
export function sparSeatLimit(format: SparTableFormat): number { return format === "duel" ? 2 : SPAR_MAX_PLAYERS; }
export type SparRank = "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export type SparCard = `${SparRank}${SparSuit}`;
export type SparAiDifficulty = "easy" | "normal" | "hard";
export type SparPhase = "lobby" | "bra" | "playing" | "finished";
export interface SparPlayer {
  id: string;
  name: string;
  seat: number;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: SparAiDifficulty | null;
  isConnected: boolean;
  stones: number;
  handCount: number;
  result: string | null;
}
export interface SparTrickPlay { playerId: string; playerName: string; card: SparCard; }
export interface SparResolvedTrick {
  hand: number;
  number: number;
  leadSuit: SparSuit;
  plays: SparTrickPlay[];
  winnerPlayerId: string;
  winningCard: SparCard;
  points: number; // Only trick 5 scores; all earlier tricks award zero
}
export interface SparHandAward {
  hand: number;
  playerId: string;
  playerName: string;
  winningCard: SparCard;
  offered: number;
  awarded: number;
}
export interface SparEvent {
  id: number;
  at: number;
  type: "join" | "start" | "bra" | "play" | "trick" | "award" | "finish" | "table";
  description: string;
}
export interface SparPublicState {
  game: "spar";
  gameTitle: "Spar (Cha-Cha)";
  code: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  phase: SparPhase;
  matchMode: "casual";
  tableFormat: SparTableFormat;
  maximumPlayers: number;
  players: SparPlayer[];
  viewerPlayerId: string | null;
  isSpectator: boolean;
  spectatorCount: number;
  // Server includes ONLY this viewer's own cards; no deck or other hands.
  hand: SparCard[];
  dealerPlayerId: string | null;
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  handNumber: number;
  trickNumber: number;
  plays: SparTrickPlay[];
  lastTrick: SparResolvedTrick | null;
  lastAward: SparHandAward | null;
  stonesRemaining: number;
  stonesTotal: number;
  winnerPlayerId: string | null;
  status: string;
  events: SparEvent[];
}
