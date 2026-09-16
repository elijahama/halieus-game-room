export type BlackjackSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type BlackjackRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface BlackjackCard {
  id: string;
  suit: BlackjackSuit;
  rank: BlackjackRank;
}

export type BlackjackPhase = "lobby" | "playing" | "dealer" | "round-over" | "finished";
export type BlackjackAction = "hit" | "stand" | "double";
export type BlackjackAiDifficulty = "easy" | "normal" | "hard";
export type BlackjackMatchMode = "casual" | "ranked";

export interface BlackjackRules {
  deckCount: 1 | 2 | 4 | 6 | 8;
  dealerHitsSoft17: boolean;
  blackjackPayout: 1.5 | 1.2;
  doubleAnyTwo: boolean;
  dealerPeeksForBlackjack: boolean;
}

export interface BlackjackPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: BlackjackAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  chips: number;
  bet: number;
  /** Only populated for the viewing player. Opponents expose cardCount only. */
  hand: BlackjackCard[];
  cardCount: number;
  stood: boolean;
  busted: boolean;
  blackjack: boolean;
  doubled: boolean;
  result: string | null;
}

export interface BlackjackPublicState {
  code: string;
  phase: BlackjackPhase;
  started: boolean;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  roundNumber: number;
  matchMode: BlackjackMatchMode;
  rules: BlackjackRules;
  startingChips: number;
  minimumBet: number;
  players: BlackjackPublicPlayer[];
  dealerHand: BlackjackCard[];
  dealerHoleHidden: boolean;
  currentTurnPlayerId: string | null;
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  status: string;
  legalActions: BlackjackAction[];
}

export interface BlackjackSession {
  code: string;
  reconnectToken: string;
  playerName: string;
}
