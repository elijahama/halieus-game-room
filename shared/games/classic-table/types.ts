export type ClassicGameId = "cheat" | "dominoes";
export type ClassicAiDifficulty = "easy" | "normal" | "hard";
export type ClassicMatchMode = "casual" | "ranked";

export interface ClassicPlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: ClassicAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  cardCount?: number;
  hand?: string[] | null;
  tileCount?: number;
  tiles?: DominoTile[] | null;
  result: string | null;
}

export type CheatRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type CheatSuit = "♠" | "♥" | "♦" | "♣";

export interface CheatCard {
  id: string;
  rank: CheatRank;
  suit: CheatSuit;
  label: string;
}

export interface CheatClaimPublic {
  playerId: string;
  playerName: string;
  claimedRank: CheatRank;
  count: number;
  at: number;
}

export interface DominoTile {
  id: string;
  a: number;
  b: number;
}

export interface DominoPlacement {
  id: string;
  a: number;
  b: number;
  left: number;
  right: number;
  playedById: string;
  playedByName: string;
}

export interface ClassicActionLogEntry {
  sequence: number;
  at: number;
  detail: string;
}

interface ClassicStateBase {
  game: ClassicGameId;
  gameTitle: string;
  code: string;
  phase: "lobby" | "playing" | "finished";
  started: boolean;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  matchMode: ClassicMatchMode;
  players: ClassicPlayerPublic[];
  currentTurnPlayerId: string | null;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  spectatorCount: number;
  status: string;
  winnerPlayerId: string | null;
  actionLog: ClassicActionLogEntry[];
}

export interface CheatPublicState extends ClassicStateBase {
  game: "cheat";
  gameTitle: "Cheat";
  pileCount: number;
  requiredRank: CheatRank;
  pendingClaim: CheatClaimPublic | null;
  viewerHand: CheatCard[];
  selectedLimit: number;
  canCallCheat: boolean;
  canAcceptClaim: boolean;
  canPlay: boolean;
}

export interface DominoesPublicState extends ClassicStateBase {
  game: "dominoes";
  gameTitle: "Dominoes";
  chain: DominoPlacement[];
  leftEnd: number | null;
  rightEnd: number | null;
  boneyardCount: number;
  viewerTiles: DominoTile[];
  playableTileIds: string[];
  canDraw: boolean;
  canPass: boolean;
  consecutivePasses: number;
}

export type ClassicPublicState = CheatPublicState | DominoesPublicState;

export interface ClassicCreateOptions {
  matchMode?: ClassicMatchMode;
  aiCount?: number;
  aiDifficulty?: ClassicAiDifficulty;
}

export interface ClassicSession {
  code: string;
  reconnectToken: string;
  playerName: string;
}
