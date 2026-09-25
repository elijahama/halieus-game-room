import type {
  AiDifficulty,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  isAi: boolean;
  aiDifficulty: AiDifficulty | null;
  hasLeft: boolean;
}

export interface RoomPlayer extends LobbyPlayer {
  reconnectToken: string;
  disconnectedAt: number | null;
}

export interface GameRoom {
  code: string;
  ranked: boolean;
  blitz: boolean;
  hostId: string;
  players: RoomPlayer[];
  started: boolean;
  gameState: GameState | null;
  createdAt: number;
  updatedAt: number;
  hostDisconnectDeadline: number | null;
  freeParkingJackpotEnabled: boolean;
  turnTimerSeconds?: number;
  boardStyle?: string;
}

export interface PublicGameRoom {
  code: string;
  ranked: boolean;
  blitz: boolean;
  hostId: string;
  players: LobbyPlayer[];
  started: boolean;
  hostDisconnectDeadline: number | null;
  freeParkingJackpotEnabled: boolean;
  turnTimerSeconds?: number;
  boardStyle?: string;
}

export interface CreateGamePayload {
  playerName: string;
  ranked: boolean;
  blitz?: boolean;
  code: string;
  freeParkingJackpotEnabled?: boolean;
}

export interface JoinGamePayload {
  playerName: string;
  code: string;
}

export interface ReconnectGamePayload {
  code: string;
  reconnectToken: string;
  playerName?: string;
  force?: boolean;
}

export interface RoomCodePayload {
  code: string;
}

export interface SetTurnTimerPayload extends RoomCodePayload {
  seconds: number;
}

export interface AddAiPayload {
  code: string;
  difficulty: AiDifficulty;
}

export interface SetAutopilotPayload {
  code: string;
  enabled: boolean;
  difficulty: AiDifficulty;
}

export interface RemoveAiPayload {
  code: string;
  playerId: string;
}

export interface GameResponse {
  ok: boolean;
  reason?: string;
  code?: string;
  playerId?: string;
  reconnectToken?: string;
  room?: PublicGameRoom;
  state?: GameState;
  roomEnded?: boolean;
  spectator?: boolean;
}

export interface GameStateResponse {
  ok: boolean;
  reason?: string;
  state?: GameState;
  roll?: {
    white1: number;
    white2: number;
    speed?:
      | 1
      | 2
      | 3
      | "bus"
      | "mr-monopoly"
      | null;
    whiteTotal?: number;
    movementTotal?: number;
    total: number;
  };
}

export interface RoomPreview {
  code: string;
  ranked: boolean;
  blitz: boolean;
  started: boolean;
  hostName: string;
  playerCount: number;
  maximumPlayers: number;
  canJoin: boolean;
  reason?: string;
}

export interface RoomPreviewResponse {
  ok: boolean;
  reason?: string;
  preview?: RoomPreview;
}
