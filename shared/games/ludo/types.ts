export type LudoColour = "red" | "green" | "yellow" | "blue";
export type LudoAiDifficulty = "easy" | "normal" | "hard";
export type LudoMatchMode = "casual" | "ranked";
export type LudoPhase = "lobby" | "ordering" | "playing" | "finished";

export interface LudoRules {
  piecesPerPlayer: 4;
  rollToEnter: 6;
  extraTurnOnSix: boolean;
  extraTurnOnCapture: boolean;
  exactRollToFinish: boolean;
  safeStartSquares: boolean;
  safeStarSquares: boolean;
  blockadesEnabled: boolean;
}

export interface LudoPiece {
  id: string;
  steps: number; // -1 = yard, 0..51 = main track, 52..56 = home lane, 57 = finished.
}

export interface LudoPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: LudoAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  colour: LudoColour;
  pieces: LudoPiece[];
  finishedCount: number;
  autopilotEnabled: boolean;
  result: string | null;
  orderRoll: number | null;
}

export type LudoActionKind = "table" | "order-roll" | "roll" | "enter" | "move" | "capture" | "finish" | "forfeit";

export interface LudoActionLogEntry {
  sequence: number;
  at: number;
  playerId: string | null;
  playerName: string | null;
  playerIsAi: boolean;
  action: LudoActionKind;
  roll: number | null;
  pieceId: string | null;
  fromSteps: number | null;
  toSteps: number | null;
  capturedPlayerIds: string[];
  detail: string;
  aiReason: string | null;
}

export interface LudoPublicState {
  code: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  started: boolean;
  phase: LudoPhase;
  matchMode: LudoMatchMode;
  rulesPreset: "halieus-classic";
  rules: LudoRules;
  players: LudoPublicPlayer[];
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  currentTurnPlayerId: string | null;
  orderRound: number;
  orderContenderPlayerIds: string[];
  lastRoll: number | null;
  canRoll: boolean;
  awaitingMove: boolean;
  legalPieceIds: string[];
  winnerPlayerId: string | null;
  turnNumber: number;
  status: string;
  actionLog: LudoActionLogEntry[];
}
