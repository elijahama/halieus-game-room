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

export interface PokerWinner {
  playerId: string;
  name: string;
  amount: number;
  handName: string;
  cards: PokerCard[];
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
  actionLog: PokerActionLogEntry[];
  hand: {
    handNumber: number;
    phase: "lobby" | "preflop" | "flop" | "turn" | "river" | "showdown" | "finished";
    dealerPlayerId: string | null;
    smallBlindPlayerId: string | null;
    bigBlindPlayerId: string | null;
    currentTurnPlayerId: string | null;
    board: PokerCard[];
    currentBet: number;
    minimumRaise: number;
    pot: number;
    winners: PokerWinner[];
    status: string;
  };
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

export interface PokerSession {
  code: string;
  playerName: string;
  reconnectToken: string;
}
