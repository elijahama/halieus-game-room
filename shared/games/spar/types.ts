/** HGR Spar / Cha-Cha — Ghanaian last-trick variant.
 * Server is authoritative; live hands are private to participants. Casual/Custom spectators have an explicit read-only hand projection.
 */
export type SparSuit = "C" | "D" | "H" | "S";
export const SPAR_MAX_PLAYERS = 8;
export type SparMatchMode = "casual" | "ranked" | "custom";
export type SparDeckVariant = "traditional" | "full" | "noaces" | "expanded";
export type SparScoringMode = "stones" | "target" | "free";
export interface SparCustomSettings { handSize: 5 | 7; deck: SparDeckVariant; scoring: SparScoringMode; amount: number; underTen: boolean; showBottom: boolean; doubleFinish: boolean; }
export const DEFAULT_SPAR_CUSTOM: Readonly<SparCustomSettings> = { handSize: 5, deck: "traditional", scoring: "stones", amount: 10, underTen: false, showBottom: false, doubleFinish: false };
export const SPAR_DECK_SIZES: Record<SparDeckVariant,number> = { traditional:35, full:36, noaces:32, expanded:40 };
export function sparCustomCapacity(settings: SparCustomSettings): number {
  const reserve = (settings.underTen ? settings.handSize : 0) + (settings.showBottom ? 1 : 0);
  return Math.min(SPAR_MAX_PLAYERS, Math.floor((SPAR_DECK_SIZES[settings.deck]-reserve)/settings.handSize));
}
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
  matchMode: SparMatchMode;
  tableFormat: SparTableFormat;
  maximumPlayers: number;
  customSettings: SparCustomSettings | null;
  handSize: 5 | 7;
  scoring: SparScoringMode;
  deckSize: number;
  canExchange: boolean;
  exchangePending: boolean;
  bottomCard: SparCard | null;
  canShowBottom: boolean;
  players: SparPlayer[];
  viewerPlayerId: string | null;
  isSpectator: boolean;
  spectatorCount: number;
  spectatorNames: string[];
  // Participant hand only. Never populated for spectators.
  hand: SparCard[];
  /** Casual/Custom spectator-only current hands. Omitted for all Ranked viewers and participants. */
  spectatorHands?: Record<string,SparCard[]>;
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
