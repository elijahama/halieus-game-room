import type {
  AiDifficulty,
  GameState,
} from "../../../../../shared/games/mega-board/game-state";

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  isAi: boolean;
  aiDifficulty: AiDifficulty | null;
  hasLeft: boolean;
}

export interface GameRoom {
  code: string;
  ranked: boolean;
  blitz: boolean;
  hostId: string;
  players: LobbyPlayer[];
  started: boolean;
  hostDisconnectDeadline: number | null;
  freeParkingJackpotEnabled?: boolean;
  turnTimerSeconds: number;
}

export interface GameResponse {
  ok: boolean;
  code?: string;
  playerId?: string;
  reason?: string;
  room?: GameRoom;
  reconnectToken?: string;
  state?: GameState;
  roomEnded?: boolean;
}

export interface GameStateResponse {
  ok: boolean;
  reason?: string;
  state?: GameState;
}

export interface DiceResponse extends GameStateResponse {
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

export interface LobbyState {
  code: string;
  playerId: string;
  players: LobbyPlayer[];
  hostDisconnectDeadline: number | null;
  freeParkingJackpotEnabled?: boolean;
  turnTimerSeconds: number;
  blitz?: boolean;
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
