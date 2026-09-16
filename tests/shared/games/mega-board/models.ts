/**
 * Reconstructed client/server protocol for the downloaded Mega Monopoly frontend.
 *
 * Confirmed fields come directly from game-network-readable.js.
 * Fields marked as provisional are intentionally broad until the server implementation
 * or another frontend usage proves a narrower type.
 */

export type PlayerId = string;
export type RoomCode = string;
export type BoardPosition = number;
export type BoardSpaceId = number;
export type TimestampMs = number;

export interface GameState {
  players: Player[];
  board: BoardSpace[];

  currentPlayerIndex: number;
  phase: GamePhase;

  rolling: boolean;
  movedThisTurn: boolean;
  awaitingReroll?: boolean;

  pending: PendingAction | null;
  auction: Auction | null;
  activeTrade: ActiveTrade | null;

  /** Player ID, not a full Player object. */
  winner: PlayerId | null;

  /** The frontend reads .length, so this is an array rather than a count. */
  busTicketPool: BusTicket[];

  allPropertiesSold?: boolean;
  lastDiceRoll?: DiceRoll | null;
  bankInventory: BankInventory;
  log: LogEntry[];

  /** Used while players roll to determine play order. */
  orderRollers?: PlayerId[];

  ranked?: boolean;

  /** Additional backend-only fields may exist. */
  [key: string]: unknown;
}

export type GamePhase =
  | "ordering"
  | "rolling"
  | "playing"
  | "finished"
  | string;

export interface Player {
  id: PlayerId;
  name: string;
  colour: string;

  position: BoardPosition;
  cash: number;
  properties: BoardSpaceId[];

  busTickets: number;
  getOutOfJailCards: number;

  inJail: boolean;
  jailTurns: number;
  isBankrupt: boolean;

  [key: string]: unknown;
}

export type BoardSpaceType =
  | "property"
  | "railroad"
  | "utility"
  | "chance"
  | "community-chest"
  | "tax"
  | "special"
  | string;

export type PropertyGroup =
  | "brown"
  | "light-blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark-blue"
  | string;

export interface BoardSpaceBase {
  id: BoardSpaceId;
  position: BoardPosition;
  name: string;
  type: BoardSpaceType;
}

export interface OwnableSpaceBase extends BoardSpaceBase {
  ownerId: PlayerId | null;
  price: number;
  mortgage: number;
  mortgaged: boolean;
}

export interface PropertySpace extends OwnableSpaceBase {
  type: "property";
  group: PropertyGroup;
  houseCost: number;

  /**
   * 0 = no buildings
   * 1 to 4 = houses
   * 5 = hotel
   * 6 = skyscraper
   */
  buildings: BuildingLevel;

  /** Provisional until the exact rent table field names are extracted. */
  rents?: number[];
}

export interface RailroadSpace extends OwnableSpaceBase {
  type: "railroad";
  depotCost: number;
  hasDepot: boolean;
}

export interface UtilitySpace extends OwnableSpaceBase {
  type: "utility";
}

export interface NonOwnableSpace extends BoardSpaceBase {
  type: Exclude<BoardSpaceType, "property" | "railroad" | "utility">;
  ownerId?: never;
}

export type BoardSpace =
  | PropertySpace
  | RailroadSpace
  | UtilitySpace
  | NonOwnableSpace;

export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface BankInventory {
  houses: number;
  hotels: number;
  skyscrapers: number;
  depots: number;
}

export interface DiceRoll {
  white1: number;
  white2: number;

  /** Exact speed-die field name/value shape is not confirmed yet. */
  speedDie?: number | string;

  [key: string]: unknown;
}

/** Pool entry shape has not been exposed by the frontend. */
export type BusTicket = unknown;

export type CardDeck = "chance" | "community-chest";

export type PendingAction =
  | {
      kind: "buy-or-auction";
      position: BoardPosition;
    }
  | {
      kind: "raise-funds";
      amount: number;
      unpayable?: boolean;
      label?: string;
    }
  | {
      kind: "card-ack";
      deck: CardDeck;
      revealed: boolean;
    }
  | {
      kind: "bus-move";
    }
  | {
      kind: "triples-target";
    }
  | {
      kind: "birthday-gift";
    }
  | {
      kind: "pay-or-chance";
      amount: number;
    }
  | {
      kind: "auction-space-choice";
    }
  | {
      kind: string;
      [key: string]: unknown;
    };

export interface Auction {
  spaceId: BoardSpaceId;
  currentBid: number;
  currentBidderId: PlayerId | null;
  allowedRaises: number[];
  passedPlayers: PlayerId[];
  endsAt: TimestampMs;

  [key: string]: unknown;
}

export interface TradeSide {
  cash: number;
  properties: BoardSpaceId[];
  getOutOfJailCards: number;
  busTickets: number;
}

export type TradeStatus = "building" | "offered" | string;

export interface ActiveTrade {
  tradeId: string;
  version: number;
  status: TradeStatus;

  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  editorId: PlayerId;

  fromPlayer: TradeSide;
  toPlayer: TradeSide;

  deadline: TimestampMs;

  [key: string]: unknown;
}

export type LogEntryType =
  | "dice-rolled"
  | "order-roll"
  | "bus-tickets-expired"
  | "trade-completed"
  | "trade-rejected"
  | "trade-cancelled"
  | string;

export interface LogEntry {
  type: LogEntryType;
  timestamp: TimestampMs;
  playerId?: PlayerId;
  description?: string;
  data?: {
    fromPlayerId?: PlayerId;
    toPlayerId?: PlayerId;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type RepairType = "general" | "street";

export interface RepairRates {
  house: number;
  hotel: number;
  skyscraper: number;
  depot: number;
}

export type BusMoveChoice = "die1" | "die2" | "both";

export type RaiseFundsMethod = "settle" | "giveup" | "auto";

export type GameAction =
  | { type: "roll" }
  | { type: "end-turn" }
  | { type: "order-roll" }
  | { type: "buy-decision"; buy: boolean }
  | { type: "raise-funds"; how: RaiseFundsMethod }
  | { type: "give-up" }
  | { type: "card-reveal" }
  | { type: "card-ack" }
  | { type: "bus-move"; choice: BusMoveChoice }
  | { type: "use-bus-ticket"; position: BoardPosition }
  | { type: "triples-target"; position: BoardPosition }
  | { type: "birthday-gift"; choice: "cash" | "ticket" }
  | { type: "pay-or-chance"; choice: "pay" | "chance" }
  | { type: "auction-space-choice"; position: BoardPosition }
  | { type: "auction-bid"; raise: number }
  | { type: "auction-pass" }
  | { type: "build"; position: BoardPosition }
  | { type: "build-to-top"; position: BoardPosition }
  | {
      type: "build-to-hotels";
      position: BoardPosition;
      hotels: number;
    }
  | { type: "sell-building"; position: BoardPosition }
  | {
      type: "sell-set-down";
      position: BoardPosition;
      level: BuildingLevel;
    }
  | { type: "build-depot"; position: BoardPosition }
  | { type: "sell-depot"; position: BoardPosition }
  | { type: "mortgage"; position: BoardPosition }
  | { type: "unmortgage"; position: BoardPosition }
  | { type: "jail"; how: "pay-fine" | "use-card" }
  | { type: "trade-open"; toPlayerId: PlayerId }
  | {
      type: "trade-update";
      fromPlayer: TradeSide;
      toPlayer: TradeSide;
    }
  | { type: "trade-send" }
  | { type: "trade-counter" }
  | { type: "trade-accept"; version: number }
  | { type: "trade-reject" }
  | { type: "trade-cancel" }
  | { type: "trade-decline-turn" };

export interface AckResponse {
  ok: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface CreateGameRequest {
  playerName: string;
  ranked: boolean;
  blitz?: boolean;
  code: string;
}

export interface CreateGameResponse extends AckResponse {
  code?: RoomCode;
  playerId?: PlayerId;
}

export interface JoinGameRequest {
  roomCode: RoomCode;
  playerName: string;
}

export interface JoinGameResponse extends AckResponse {
  code?: RoomCode;
  playerId?: PlayerId;
}

export interface SpectateGameRequest {
  roomCode: RoomCode;
  playerName: string;
}

export interface SpectateGameResponse extends AckResponse {
  code?: RoomCode;
  state?: GameState;
}

export interface ReconnectGameRequest {
  roomCode: RoomCode;
  playerName: string;
}

export interface ReconnectGameResponse extends AckResponse {
  code?: RoomCode;
  playerId?: PlayerId;
  state?: GameState;
}

export interface GameActionRequest {
  action: GameAction;
}

export interface RoomLobbyPlayer {
  id?: PlayerId;
  name?: string;
  colour?: string;
  [key: string]: unknown;
}

export interface RoomUpdate {
  code: RoomCode;
  lobby: RoomLobbyPlayer[];
  ranked: boolean;
  blitz?: boolean;
  spectators?: unknown[];
  autopilots?: PlayerId[];
  started?: boolean;
  [key: string]: unknown;
}

export interface GameStateEvent {
  state: GameState;
  [key: string]: unknown;
}

export interface RankedData {
  roster?: unknown;
  leaderboard?: unknown;
  [key: string]: unknown;
}

export type ClientToServerEventName =
  | "admin:remove"
  | "admin:spectate"
  | "autopilot"
  | "feedback:submit"
  | "game:action"
  | "game:create"
  | "game:end"
  | "game:join"
  | "game:leave"
  | "game:reconnect"
  | "game:spectate"
  | "game:start"
  | "game:start-play"
  | "ranked:get"
  | "ranked:roster";

export type ServerToClientEventName =
  | "connect"
  | "disconnect"
  | "game:ended"
  | "game:state"
  | "ranked:update"
  | "room:update";