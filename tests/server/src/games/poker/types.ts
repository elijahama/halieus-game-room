export type PokerSuit = "S" | "H" | "D" | "C";
export type PokerAiDifficulty = "easy" | "normal" | "hard";
export type PokerMatchMode = "casual" | "ranked";
export type PokerVariant = "texas-holdem" | "omaha" | "five-card-draw" | "seven-card-stud";
export type PokerAutopilotMode = "off" | "semi" | "full";

export type PokerActionLogKind = "hand" | "fold" | "check" | "call" | "raise" | "all-in" | "forfeit" | "table";

export interface PokerActionLogEntry {
  sequence: number;
  at: number;
  handNumber: number;
  playerId: string | null;
  playerName: string | null;
  playerIsAi: boolean;
  action: PokerActionLogKind;
  amount: number | null;
  chipsAfter: number | null;
  detail: string;
}

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
  autopilotMode: PokerAutopilotMode;
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
  startedAt: number | null;
  updatedAt: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  aiDifficulty: PokerAiDifficulty;
  matchMode: PokerMatchMode;
  variant: PokerVariant;
  dealerSeat: number;
  hand: PokerHandState;
  actionSequence: number;
  actionLog: PokerActionLogEntry[];
}

export interface PokerPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  autopilotEnabled: boolean;
  autopilotMode: PokerAutopilotMode;
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
  variant: PokerVariant;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  players: PokerPublicPlayer[];
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  hand: Omit<PokerHandState, "deck">;
  actionLog: PokerActionLogEntry[];
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
