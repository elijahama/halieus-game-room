export type PokerSuit = "S" | "H" | "D" | "C";
export type PokerAiDifficulty = "easy" | "normal" | "hard";
export type PokerMatchMode = "casual" | "ranked";

export interface PokerCard {
  rank: number;
  suit: PokerSuit;
}

export type PokerPhase =
  | "lobby"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "finished";

export interface PokerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  autopilotEnabled: boolean;
  isConnected: boolean;
  reconnectToken: string;
  seat: number;
  chips: number;
  holeCards: PokerCard[];
  folded: boolean;
  allIn: boolean;
  currentBet: number;
  totalCommitted: number;
  acted: boolean;
  eliminated: boolean;
}

export interface PokerWinner {
  playerId: string;
  name: string;
  amount: number;
  handName: string;
  cards: PokerCard[];
}

export interface PokerHandState {
  handNumber: number;
  phase: PokerPhase;
  dealerPlayerId: string | null;
  smallBlindPlayerId: string | null;
  bigBlindPlayerId: string | null;
  currentTurnPlayerId: string | null;
  board: PokerCard[];
  deck: PokerCard[];
  currentBet: number;
  minimumRaise: number;
  pot: number;
  winners: PokerWinner[];
  status: string;
}

export interface PokerRoom {
  code: string;
  players: PokerPlayer[];
  spectators: Map<string, string>;
  started: boolean;
  createdAt: number;
  updatedAt: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  aiDifficulty: PokerAiDifficulty;
  matchMode: PokerMatchMode;
  dealerSeat: number;
  hand: PokerHandState;
}

export interface PokerPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  autopilotEnabled: boolean;
  isConnected: boolean;
  seat: number;
  chips: number;
  folded: boolean;
  allIn: boolean;
  currentBet: number;
  totalCommitted: number;
  eliminated: boolean;
  holeCards: PokerCard[] | null;
}

export interface PokerPublicState {
  code: string;
  started: boolean;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  aiDifficulty: PokerAiDifficulty;
  matchMode: PokerMatchMode;
  createdAt: number;
  updatedAt: number;
  players: PokerPublicPlayer[];
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  hand: Omit<PokerHandState, "deck">;
  legalActions: {
    canFold: boolean;
    canCheck: boolean;
    canCall: boolean;
    canRaise: boolean;
    canAllIn: boolean;
    callAmount: number;
    minimumRaiseTo: number;
    maximumRaiseTo: number;
  } | null;
}
