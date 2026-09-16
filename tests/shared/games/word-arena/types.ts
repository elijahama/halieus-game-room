export type WordArenaGameId = "word-game" | "password" | "anagrams-race";
export type WordArenaMatchMode = "casual" | "ranked";
export type WordArenaAiDifficulty = "easy" | "normal" | "hard";
export type WordGameMode = "daily" | "practice";

export interface WordArenaCreateOptions {
  matchMode: WordArenaMatchMode;
  aiCount: number;
  aiDifficulty: WordArenaAiDifficulty;
  targetScore: number;
  wordGameMode?: WordGameMode;
}
export type WordArenaPhase = "lobby" | "playing" | "round-over" | "finished";

export interface WordArenaPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  seat: number;
  score: number;
  result: string | null;
  isAi: boolean;
  aiDifficulty: WordArenaAiDifficulty | null;
}

export interface WordGuessFeedback {
  guess: string;
  marks: Array<"correct" | "present" | "absent">;
}

export interface WordArenaActionLogEntry {
  sequence: number;
  at: number;
  playerId: string | null;
  playerName: string | null;
  action: "room" | "start" | "guess" | "clue" | "round" | "finish" | "forfeit";
  detail: string;
}

export interface WordArenaPublicState {
  game: WordArenaGameId;
  gameTitle: string;
  code: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  phase: WordArenaPhase;
  matchMode: WordArenaMatchMode;
  players: WordArenaPublicPlayer[];
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  roundNumber: number;
  targetScore: number;
  aiCount: number;
  aiDifficulty: WordArenaAiDifficulty;
  winnerPlayerId: string | null;
  status: string;
  prompt: string;
  scramble: string | null;
  clue: string | null;
  clueGiverPlayerId: string | null;
  viewerSecret: string | null;
  viewerAttempts: WordGuessFeedback[];
  attemptsRemaining: number | null;
  solvedPlayerIds: string[];
  roundWinnerPlayerId: string | null;
  actionLog: WordArenaActionLogEntry[];
  wordGameMode: WordGameMode | null;
  wordPuzzleKey: string | null;
}
