import {
  BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS,
  DEFAULT_FREE_PARKING_JACKPOT,
  STARTING_CASH,
  TURN_ROLL_AUTOPILOT_DURATION_MS,
} from "./game-rules.js";
import type { CardDeckType } from "./cards.js";
import type { RankedMatchPlayerResult } from "./ranked.js";

export type PlayerId = string;

export type AiDifficulty =
  | "easy"
  | "normal"
  | "hard";

export type PlayerColour =
  | "red"
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "pink"
  | "cyan"
  | "yellow";

export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface BankInventory {
  houses: number;
  hotels: number;
  skyscrapers: number;
  depots: number;
}

export interface GamePlayer {
  id: PlayerId;
  name: string;
  colour: PlayerColour;
  tokenId: string;

  position: number;
  cash: number;

  properties: number[];

  busTickets: number;
  busTicketIds: string[];
  getOutOfJailCards: number;
  getOutOfJailCardIds: string[];

  inJail: boolean;
  jailTurns: number;

  isBankrupt: boolean;
  isAi: boolean;
  aiDifficulty: AiDifficulty | null;
  autopilotEnabled: boolean;
  autopilotDifficulty: AiDifficulty;
  isConnected: boolean;

  orderRolls: number[];
}

export type SpeedDieFace =
  | 1
  | 2
  | 3
  | "bus"
  | "mr-monopoly";


export type GameActivityKind =
  | "game"
  | "roll"
  | "purchase"
  | "auction"
  | "card"
  | "jail"
  | "building"
  | "mortgage"
  | "trade"
  | "debt"
  | "mega"
  | "turn";

export interface GameActivityEntry {
  id: string;
  at: number;
  turnNumber: number;
  kind: GameActivityKind;
  message: string;
  playerId?: PlayerId;
}


export interface AiDecisionEvent {
  at: number;
  turnNumber: number;
  playerId: PlayerId;
  action: string;
  reasonCodes: string[];
  targetPlayerId?: PlayerId;
  spaceId?: number;
  value?: number;
}

export interface DiceRoll {
  /** Server-resolved chain at this roll; absent for jail/ordering/legacy rolls. */
  doublesStage?: 0 | 1 | 2 | 3;
  white1: number;
  white2: number;
  speed: SpeedDieFace | null;
  movementTotal: number;
}

export type GamePhase =
  | "waiting"
  | "ordering"
  | "playing"
  | "finished";

export type TurnPhase =
  | "ordering"
  | "roll"
  | "speed-die-choice"
  | "jail-decision"
  | "mega-choice"
  | "resolve-space"
  | "purchase"
  | "auction"
  | "card"
  | "debt"
  | "optional-actions"
  | "finished";

export interface PendingPurchase {
  playerId: PlayerId;
  spaceId: number;
  price: number;
}

export type PendingMegaAction =
  | {
      type: "bus-ticket";
      playerId: PlayerId;
      allowedPositions: number[];
    }
  | {
      type: "birthday-gift";
      playerId: PlayerId;
      resumeAction: DebtResumeAction;
    }
  | {
      type: "auction-space";
      playerId: PlayerId;
      resumeAction: DebtResumeAction;
      eligibleSpaceIds: number[];
    };

export type PendingSpeedDieAction =
  | {
      type: "triple";
      playerId: PlayerId;
      resumeAction: "advance-turn";
      whiteDiceTotal: number;
      tripleValue: 1 | 2 | 3;
    }
  | {
      type: "bus";
      playerId: PlayerId;
      resumeAction:
        | "advance-turn"
        | "reroll";
      whiteDiceTotal: number;
      white1: number;
      white2: number;
    }
  | {
      type: "mr-monopoly";
      playerId: PlayerId;
      resumeAction:
        | "advance-turn"
        | "reroll";
      whiteDiceTotal: number;
    };

export type AuctionResumePhase =
  | "roll"
  | "speed-die-choice"
  | "optional-actions";

export interface PendingAuction {
  id: string;
  spaceId: number;
  initiatedByPlayerId: PlayerId;
  resumePhase: AuctionResumePhase;

  currentBid: number;
  highestBidderId: PlayerId | null;
  minimumIncrement: number;

  startedAt: number;
  endsAt: number;

  activeBidderIds: PlayerId[];
  withdrawnPlayerIds: PlayerId[];
  bidsByPlayerId: Record<PlayerId, number>;
}

export type DebtResumeAction =
  | "advance-turn"
  | "reroll"
  | "roll"
  | "jail-move";

export interface PendingJailMove {
  playerId: PlayerId;
  diceTotal: number;
}

export interface PendingDebt {
  debtorId: PlayerId;
  creditorId: PlayerId | null;
  /**
   * Optional multi-creditor breakdown. Used when one server-authoritative
   * payment must be shared between several players (for example a tied
   * maximum-rent Auction landing). The amounts should add up to `amount`.
   */
  creditorShares?: Array<{
    creditorId: PlayerId;
    amount: number;
  }>;
  amount: number;
  reason: string;
  resumeAction: DebtResumeAction;

  /**
   * Amount to place into the Free Parking pot after this Bank debt is paid.
   */
  freeParkingContribution?: number;

  /** Restore this exact phase after a temporary debt is cleared. */
  resumePhase?: TurnPhase;
}

export interface PendingCard {
  cardId: string;
  deck: CardDeckType;
  playerId: PlayerId;
  resumeAction: DebtResumeAction;
}

export type TradeStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export interface TradeResult {
  id: string;
  proposerId: PlayerId;
  /** Primary/legacy recipient. Multi-party trades also populate participantIds. */
  recipientId: PlayerId;
  /** All players involved in a multi-party deal, including the proposer. */
  participantIds?: PlayerId[];
  status: "accepted" | "declined" | "cancelled" | "auto-declined";
  message: string;
  resolvedAt: number;
}

export interface LastCardDraw {
  cardId: string;
  playerId: PlayerId;
  drawnAt: number;
}

export interface GlobalGameNotice {
  id: string;
  kind:
    | "bus-ticket-expiry"
    | "bus-ticket-gained"
    | "rent-payment"
    | "card-event"
    | "free-parking"
    | "movement"
    | "go"
    | "speed-die"
    | "jail-event"
    | "auction-result"
    | "bankruptcy"
    | "winner"
    | "development"
    | "purchase-complete"
    | "trade-complete"
    | "game-mode"
    | "player-action";
  title: string;
  message: string;
  createdAt: number;
  playerId?: PlayerId;
  /** Major notices use the cinematic centre-screen presentation. */
  presentation?: "standard" | "major";
  /** Optional staged narration shown one line at a time for multi-step events. */
  steps?: string[];
  /** Optional client display duration override for standard notices. */
  durationMs?: number;
}

export interface PlayerStatHistoryPoint {
  turnNumber: number;
  at: number;
  cash: number;
  properties: number;
  developments: number;
  netWorth: number;
}

export interface PlayerMatchStats {
  actions: number;
  rolls: number;
  purchases: number;
  auctionEvents: number;
  tradeEvents: number;
  buildingEvents: number;
  mortgageEvents: number;
  debtEvents: number;
  cardEvents: number;
  jailEvents: number;
  rentPaid: number;
  rentCollected: number;
  revenue: number;
  expenses: number;
  busTicketsCollected: number;
  busTicketsUsed: number;
  /** Direct Birthday Gift ↔ GO transitions tracked during live play. */
  kassManeuvers: number;
  completedThreeWayDeals?: number;
  initiatedThreeWayDeals?: number;
  completedTrades?: number;
  /** Last position observed by the live stats tracker; not reconstructed post-match. */
  lastTrackedPosition: number;
  peakCash: number;
  peakProperties: number;
  peakNetWorth: number;
  /** Final placement assigned at elimination time. Winner is always position 1. */
  finishPosition: number | null;
  eliminatedTurn: number | null;
  finalCash: number | null;
  finalProperties: number | null;
  finalDevelopments: number | null;
  finalNetWorth: number | null;
  history: PlayerStatHistoryPoint[];
}

export interface MultiPartyTradeTransfer {
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  cash: number;
  propertyIds: number[];
  busTicketIds: string[];
  jailCardIds: string[];
}

export interface LiveTradePreview {
  proposerId: PlayerId;
  participantIds: PlayerId[];
  transfers: MultiPartyTradeTransfer[];
  stage: "draft" | "proposed";
  revision: number;
  updatedAt: number;
}

export interface TradeOffer {
  id: string;

  proposerId: PlayerId;
  /** Primary/legacy recipient. Multi-party trades use participantIds/transfers. */
  recipientId: PlayerId;

  /** True when this is an atomic 3-way or 4-way human deal. */
  multiParty?: boolean;
  /** Includes proposer and every invited participant. */
  participantIds?: PlayerId[];
  /** Proposer is accepted at creation; other participants are appended as they approve. */
  acceptedPlayerIds?: PlayerId[];
  /** Directed legs that make up an atomic multi-party deal. */
  transfers?: MultiPartyTradeTransfer[];
  /** Immediate 10% mortgage-transfer interest owed to the Bank by each receiver. */
  mortgageInterestByPlayerId?: Record<PlayerId, number>;

  proposerCash: number;
  recipientCash: number;

  proposerPropertyIds: number[];
  recipientPropertyIds: number[];

  proposerBusTicketIds: string[];
  recipientBusTicketIds: string[];

  proposerJailCardIds: string[];
  recipientJailCardIds: string[];

  /** Immediate Bank interest owed by the proposer for incoming mortgaged assets. */
  proposerMortgageInterest: number;

  /** Immediate Bank interest owed by the recipient for incoming mortgaged assets. */
  recipientMortgageInterest: number;

  status: TradeStatus;
  createdAt: number;
}

export interface GameState {
  roomCode: string;

  players: GamePlayer[];

  propertyOwners: Record<number, PlayerId | null>;

  propertyDevelopments: Record<number, BuildingLevel>;

  /**
   * True means a Train Depot is installed on this railroad.
   */
  railroadDepots: Record<number, boolean>;

  /**
   * True means the property, railroad or utility is mortgaged.
   */
  mortgagedProperties: Record<number, boolean>;

  bankInventory: BankInventory;

  pendingPurchase: PendingPurchase | null;
  pendingAuction: PendingAuction | null;
  pendingTrade: TradeOffer | null;
  lastTradeResult: TradeResult | null;
  tradeRejectAllTurnByPlayerId: Record<PlayerId, number>;
  pendingDebt: PendingDebt | null;
  pendingCard: PendingCard | null;
  lastCardDraw: LastCardDraw | null;
  lastGlobalNotice: GlobalGameNotice | null;
  globalNotices: GlobalGameNotice[];
  pendingJailMove: PendingJailMove | null;
  pendingMegaAction: PendingMegaAction | null;
  pendingSpeedDieAction:
    | PendingSpeedDieAction
    | null;

  chanceDeck: string[];
  communityChestDeck: string[];
  busTicketDeck: string[];
  busTicketsDiscarded: string[];

  currentPlayerIndex: number;
  phase: GamePhase;
  turnPhase: TurnPhase;

  movedThisTurn: boolean;
  awaitingReroll: boolean;

  lastDiceRoll: DiceRoll | null;
  /** Monotonic presentation id so identical consecutive rolls still animate. */
  rollSequence: number;
  /** Server-side duplicate-roll guard keyed by player ID. */
  lastAcceptedRollAtByPlayerId: Record<PlayerId, number>;
  /** True while every ownable asset has an owner. Bank returns reactivate the red Speed Die. */
  speedDieRetired: boolean;

  consecutiveDoubles: number;
  busTicketsRemaining: number;
  freeParkingJackpotEnabled: boolean;
  freeParkingPot: number;

  turnNumber: number;
  gameStartedAt: number;
  /** Host-controlled human turn window, in seconds. Persisted as part of authoritative match state. */
  turnTimerSeconds: number;
  /** Server-authoritative deadline for a manual human to begin the required roll. */
  turnRollDeadline: number | null;
  /** Player whose manual roll window owns turnRollDeadline. */
  turnRollDeadlinePlayerId: PlayerId | null;
  optionalActionDeadline: number | null;
  winnerId: PlayerId | null;

  /** Match mode copied into the authoritative state for reports/results. */
  ranked: boolean;
  /** Blitz starts with every ownable asset independently assigned to a random player. */
  blitz: boolean;
  /** Stable ID for a completed ranked match. */
  rankedMatchId: string | null;
  /** True after leaderboard/rating effects were applied exactly once. */
  rankedProcessed: boolean;
  /** Rating breakdown captured at ranked match completion. */
  rankedResults: RankedMatchPlayerResult[];

  activityLog: GameActivityEntry[];
  aiDecisionLog: AiDecisionEvent[];
  playerStats: Record<PlayerId, PlayerMatchStats>;

  orderRollEligiblePlayerIds: PlayerId[];
  orderRollCompletedPlayerIds: PlayerId[];
  orderingRound: number;
}

export const PLAYER_COLOURS: PlayerColour[] = [
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "pink",
  "cyan",
  "yellow",
];

export function createGamePlayer(
  id: PlayerId,
  name: string,
  playerIndex: number,
  isAi = false,
  aiDifficulty: AiDifficulty | null = null,
): GamePlayer {
  return {
    id,
    name,
    colour:
      PLAYER_COLOURS[
        playerIndex % PLAYER_COLOURS.length
      ],
    tokenId: ["top-hat","car","ship","dog","boot","cat","wheelbarrow","thimble"][playerIndex % 8],

    position: 0,
    cash: STARTING_CASH,

    properties: [],

    busTickets: 0,
    busTicketIds: [],
    getOutOfJailCards: 0,
    getOutOfJailCardIds: [],

    inJail: false,
    jailTurns: 0,

    isBankrupt: false,
    isAi,
    aiDifficulty: isAi
      ? aiDifficulty ?? "normal"
      : null,
    autopilotEnabled: false,
    autopilotDifficulty: "normal",
    isConnected: true,

    orderRolls: [],
  };
}

export function createInitialGameState(
  roomCode: string,
  players: Array<{
    id: PlayerId;
    name: string;
    isAi?: boolean;
    aiDifficulty?: AiDifficulty | null;
  }>,
  options: {
    turnTimerSeconds?: number;
    freeParkingJackpotEnabled?: boolean;
    ranked?: boolean;
    blitz?: boolean;
  } = {},
): GameState {
  const gamePlayers = players.map(
    (player, index) =>
      createGamePlayer(
        player.id,
        player.name,
        index,
        player.isAi ?? false,
        player.aiDifficulty ?? null,
      ),
  );

  return {
    roomCode,

    players: gamePlayers,

    propertyOwners: {},
    propertyDevelopments: {},
    railroadDepots: {},
    mortgagedProperties: {},

    bankInventory: {
      houses: 32,
      hotels: 12,
      skyscrapers: 8,
      depots: 4,
    },

    pendingPurchase: null,
    pendingAuction: null,
    pendingTrade: null,
    lastTradeResult: null,
    tradeRejectAllTurnByPlayerId: {},
    pendingDebt: null,
    pendingCard: null,
    lastCardDraw: null,
    lastGlobalNotice: null,
    globalNotices: [],
    pendingJailMove: null,
    pendingMegaAction: null,
    pendingSpeedDieAction: null,

    chanceDeck: [],
    communityChestDeck: [],
    busTicketDeck: [],
    busTicketsDiscarded: [],

    currentPlayerIndex: 0,
    phase: "ordering",
    turnPhase: "ordering",

    movedThisTurn: false,
    awaitingReroll: false,

    lastDiceRoll: null,
    rollSequence: 0,
    lastAcceptedRollAtByPlayerId: {},
    speedDieRetired: false,

    consecutiveDoubles: 0,
    busTicketsRemaining: 16,
    freeParkingJackpotEnabled:
      options.freeParkingJackpotEnabled ??
      DEFAULT_FREE_PARKING_JACKPOT,
    freeParkingPot: 0,

    turnNumber: 1,
    gameStartedAt: Date.now(),
    turnTimerSeconds: options.turnTimerSeconds ?? Math.round((options.blitz ? BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS : TURN_ROLL_AUTOPILOT_DURATION_MS) / 1000),
    turnRollDeadline: null,
    turnRollDeadlinePlayerId: null,
    optionalActionDeadline: null,
    winnerId: null,

    ranked: options.ranked ?? false,
    blitz: options.blitz ?? false,
    rankedMatchId: null,
    rankedProcessed: false,
    rankedResults: [],

    activityLog: [],
    aiDecisionLog: [],
    playerStats: Object.fromEntries(
      gamePlayers.map((player) => [
        player.id,
        {
          actions: 0,
          rolls: 0,
          purchases: 0,
          auctionEvents: 0,
          tradeEvents: 0,
          buildingEvents: 0,
          mortgageEvents: 0,
          debtEvents: 0,
          cardEvents: 0,
          jailEvents: 0,
          rentPaid: 0,
          rentCollected: 0,
          revenue: 0,
          expenses: 0,
          busTicketsCollected: 0,
          busTicketsUsed: 0,
          kassManeuvers: 0,
          lastTrackedPosition: player.position,
          peakCash: player.cash,
          peakProperties: 0,
          peakNetWorth: player.cash,
          finishPosition: null,
          eliminatedTurn: null,
          finalCash: null,
          finalProperties: null,
          finalDevelopments: null,
          finalNetWorth: null,
          history: [{
            turnNumber: 1,
            at: Date.now(),
            cash: player.cash,
            properties: 0,
            developments: 0,
            netWorth: player.cash,
          }],
        },
      ]),
    ),

    orderRollEligiblePlayerIds:
      gamePlayers.map(
        (player) => player.id,
      ),

    orderRollCompletedPlayerIds: [],

    orderingRound: 1,
  };
}

export function compareOrderRolls(
  firstPlayer: GamePlayer,
  secondPlayer: GamePlayer,
): number {
  const longestHistory = Math.max(
    firstPlayer.orderRolls.length,
    secondPlayer.orderRolls.length,
  );

  for (
    let index = 0;
    index < longestHistory;
    index += 1
  ) {
    const firstRoll =
      firstPlayer.orderRolls[index] ?? -1;

    const secondRoll =
      secondPlayer.orderRolls[index] ?? -1;

    if (firstRoll !== secondRoll) {
      return secondRoll - firstRoll;
    }
  }

  return 0;
}

export function findOrderRollTies(
  players: GamePlayer[],
): GamePlayer[][] {
  const groups =
    new Map<string, GamePlayer[]>();

  for (const player of players) {
    const key =
      player.orderRolls.join(",");

    const group =
      groups.get(key) ?? [];

    group.push(player);
    groups.set(key, group);
  }

  return [...groups.values()].filter(
    (group) => group.length > 1,
  );
}
