export type WhotShape = "circle" | "triangle" | "cross" | "square" | "star";
export type WhotAiDifficulty = "easy" | "normal" | "hard";
export type WhotMatchMode = "casual" | "ranked";
export type WhotPhase = "lobby" | "playing" | "round-over" | "finished";

export interface WhotCard {
  id: string;
  shape: WhotShape | "whot";
  number: number;
}


export type WhotMotionKind = "deal" | "play" | "draw" | "general-market";

export interface WhotMotionEvent {
  sequence: number;
  kind: WhotMotionKind;
  playerId: string | null;
  card: WhotCard | null;
  count: number;
  targetPlayerIds: string[];
  at: number;
}


export type WhotActionKind = "deal" | "play" | "draw" | "round" | "forfeit" | "table";

export interface WhotActionLogEntry {
  sequence: number;
  at: number;
  playerId: string | null;
  playerName: string | null;
  playerIsAi: boolean;
  action: WhotActionKind;
  card: WhotCard | null;
  count: number;
  requestedShape: WhotShape | null;
  pendingDraw: number;
  handCountBefore: number | null;
  handCountAfter: number | null;
  detail: string;
  aiReason: string | null;
}

export interface WhotRules {
  startingHandSize: 5 | 6;
  stackPickTwo: boolean;
  stackPickThree: boolean;
  whotCancelsPenalty: boolean;
  starScoresDouble: boolean;
  lastCardCallPenalty: boolean;
}

export interface WhotPublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: WhotAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  cardCount: number;
  hand: WhotCard[] | null;
  score: number;
  result: string | null;
  autopilotEnabled: boolean;
}

export interface WhotPublicState {
  code: string;
  phase: WhotPhase;
  started: boolean;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  roundNumber: number;
  matchMode: WhotMatchMode;
  rules: WhotRules;
  players: WhotPublicPlayer[];
  topCard: WhotCard | null;
  drawPileCount: number;
  currentTurnPlayerId: string | null;
  pendingDraw: number;
  pendingDrawNumber: 2 | 5 | null;
  requestedShape: WhotShape | null;
  spectatorCount: number;
  viewerPlayerId: string | null;
  isSpectator: boolean;
  status: string;
  playableCardIds: string[];
  winnerPlayerId: string | null;
  motion: WhotMotionEvent | null;
  actionLog: WhotActionLogEntry[];
}

export interface WhotSession {
  code: string;
  reconnectToken: string;
  playerName: string;
}
