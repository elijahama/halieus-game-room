export type ConnectFourMatchMode = "casual" | "ranked";
export type ConnectFourAiDifficulty = "easy" | "normal" | "hard";
export type ConnectFourPhase = "lobby" | "playing" | "round-over" | "finished";
export type ConnectFourDisc = 0 | 1 | 2;
export type ConnectFourColour = "red" | "yellow";
export type ConnectFourBestOf = 1 | 3 | 5;

export interface ConnectFourPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: ConnectFourAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  colour: ConnectFourColour;
  result: string | null;
  seriesWins: number;
}

export interface ConnectFourRoundResult {
  round: number;
  winnerPlayerId: string | null;
  winnerName: string | null;
  draw: boolean;
  moves: number;
}

export interface ConnectFourActionLogEntry {
  sequence: number;
  at: number;
  playerId: string | null;
  playerName: string | null;
  action: "table" | "round" | "drop" | "forfeit" | "finish";
  column: number | null;
  detail: string;
}

export interface ConnectFourPublicState {
  code: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  phase: ConnectFourPhase;
  matchMode: ConnectFourMatchMode;
  bestOf: ConnectFourBestOf;
  targetWins: number;
  roundNumber: number;
  roundHistory: ConnectFourRoundResult[];
  players: ConnectFourPublicPlayer[];
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  board: ConnectFourDisc[];
  currentTurnPlayerId: string | null;
  winnerPlayerId: string | null;
  roundWinnerPlayerId: string | null;
  draw: boolean;
  turnNumber: number;
  lastDropIndex: number | null;
  status: string;
  actionLog: ConnectFourActionLogEntry[];
}
