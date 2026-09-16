export type HalieusGameId = "mega-board" | "poker" | "whot" | "ludo" | "blackjack" | "hidden-dictator" | "connect-four" | "word-game" | "password" | "anagrams-race" | "cheat" | "dominoes" | "ayo" | "word-board";

export interface HalieusFinishedResultRow {
  rank: number;
  name: string;
  detail: string;
  winner?: boolean;
}

export interface HalieusFinishedResultStat {
  label: string;
  value: string;
}

export interface HalieusFinishedResultAward {
  title: string;
  winner: string;
  detail: string;
}

export interface HalieusFinishedResultSnapshot {
  headline: string;
  subtitle?: string;
  durationMs?: number;
  rows: HalieusFinishedResultRow[];
  stats?: HalieusFinishedResultStat[];
  awards?: HalieusFinishedResultAward[];
}

export interface HalieusGameFinishedNotice {
  id: string;
  game: HalieusGameId;
  gameTitle: string;
  code: string;
  status: "round-finished" | "game-finished";
  winner: string | null;
  message: string;
  at: number;
  /** Server-owned final snapshot so parked rooms never show stale client state. */
  result?: HalieusFinishedResultSnapshot;
}
