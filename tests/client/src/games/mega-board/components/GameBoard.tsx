import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { GameState } from "../../../../../shared/games/mega-board/game-state";
import { getGameCard } from "../../../../../shared/games/mega-board/cards";
import {
  BOARD_SPACES,
  BOARD_SPACE_COUNT,
  JAIL_POSITION,
  getBoardGridPosition,
  getBoardSpace,
  getPropertyGroupColour,
  isCornerSpace,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  isUtilityBoardSpace,
  type BoardSpace,
} from "../../../../../shared/games/mega-board/board";
import { styles } from "../styles/gameStyles";
import { PurchasePanel } from "./PurchasePanel";
import { CardPanel } from "./CardPanel";
import { AuctionPanel } from "./AuctionPanel";
import { JailPanel } from "./JailPanel";
import { SpeedDiePanel } from "./SpeedDiePanel";
import { MegaActionPanel } from "./MegaActionPanel";
import { DiceRollOverlay } from "./DiceRollOverlay";
import { DieFace } from "./DieFace";
import { PropertyDeedModal } from "./PropertyDeedModal";
import { CardEventPopup } from "./CardEventPopup";
import { BusTicketEventPopup } from "./BusTicketEventPopup";

interface GameBoardProps {
  roomCode: string;
  playerId: string;
  gameState: GameState;
  darkMode: boolean;
  message: string;
  isSpectator?: boolean;
  isResolvingPurchase: boolean;
  isSubmittingRoll: boolean;
  isResolvingCard: boolean;
  isResolvingAuction: boolean;
  isResolvingJail: boolean;
  isResolvingSpeedDie: boolean;
  isResolvingMega: boolean;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onRollDice: () => void;
  onEndTurn: () => void;
  onPurchase: () => void;
  onDeclinePurchase: () => void;
  onCardContinue: () => void;
  onAuctionBid: (amount: number) => void;
  onAuctionWithdraw: () => void;
  onJailRoll: () => void;
  onJailPayFine: () => void;
  onJailUseCard: () => void;
  onSpeedDieTripleMove: (
    position: number,
  ) => void;
  onSpeedDieBusMove: (spaces: number) => void;
  onSpeedDieMrMonopoly: () => void;
  onStartBusTicket: () => void;
  onBusTicketMove: (position: number) => void;
  onBusTicketCancel: () => void;
  onBirthdayCash: () => void;
  onBirthdayTicket: () => void;
  onAuctionSpaceSelect: (spaceId: number) => void;
  onOpenBank: () => void;
  onOpenActionPanel: (panel: "properties" | "trade" | "history") => void;
}


interface PendingTokenMovement {
  playerId: string;
  from: number;
  to: number;
  preferredForwardSteps?: number;
  preferredDirection?: "forward" | "backward";
}

type GlobalNotice = NonNullable<GameState["lastGlobalNotice"]>;

interface GlobalNoticeCursor {
  initialized: boolean;
  lastId: string | null;
  lastCreatedAt: number;
}

function getQueuedNoticeDuration(
  notice: GlobalNotice,
  backlogSize: number,
): number {
  const major = notice.presentation === "major" &&
    (notice.kind === "bankruptcy" || notice.kind === "winner");
  const requested = notice.durationMs ?? (major ? 4200 : 2200);

  // AI and Autopilot can produce events much faster than a human can. Keep
  // the narration attached to the live board state instead of letting an
  // ever-growing queue trail several turns behind.
  if (backlogSize >= 8) {
    return Math.min(requested, major ? 1500 : 450);
  }
  if (backlogSize >= 4) {
    return Math.min(requested, major ? 2100 : 700);
  }
  if (backlogSize >= 2) {
    return Math.min(requested, major ? 2800 : 1050);
  }

  return requested;
}

function getTokenTravelRoute(
  from: number,
  to: number,
  preferredForwardSteps?: number,
  preferredDirection?: "forward" | "backward",
): number[] {
  if (from === to) {
    return [];
  }

  if (
    typeof preferredForwardSteps === "number" &&
    preferredForwardSteps > 0 &&
    (from + preferredForwardSteps) % BOARD_SPACE_COUNT === to
  ) {
    return Array.from(
      { length: preferredForwardSteps },
      (_, index) => (from + index + 1) % BOARD_SPACE_COUNT,
    );
  }

  const forwardDistance =
    (to - from + BOARD_SPACE_COUNT) % BOARD_SPACE_COUNT;
  const backwardDistance =
    (from - to + BOARD_SPACE_COUNT) % BOARD_SPACE_COUNT;

  const direction = preferredDirection === "forward"
    ? 1
    : preferredDirection === "backward"
      ? -1
      : forwardDistance <= backwardDistance
        ? 1
        : -1;
  const distance = direction === 1 ? forwardDistance : backwardDistance;

  return Array.from(
    { length: distance },
    (_, index) =>
      (from + direction * (index + 1) + BOARD_SPACE_COUNT) %
      BOARD_SPACE_COUNT,
  );
}

function getCardMovementDirection(
  gameState: GameState,
  playerId: string,
): "forward" | "backward" | undefined {
  const draw = gameState.lastCardDraw;
  if (!draw || draw.playerId !== playerId) {
    return undefined;
  }

  const card = getGameCard(draw.cardId);
  if (!card) return undefined;

  // Card instructions are animated semantically rather than by shortest path.
  // "Advance" and nearest-space cards always travel forward around the board.
  // Only explicit Go Back instructions and Go To Jail deliberately reverse.
  if (card.effect.type === "move-back" || card.effect.type === "go-to-jail" || /^Go Back\b/i.test(card.title)) {
    return "backward";
  }
  if (card.effect.type === "move-to" || card.effect.type === "move-nearest") {
    return "forward";
  }

  return undefined;
}

const TOKEN_OFFSETS = [
  { x: -9, y: -9 },
  { x: 9, y: -9 },
  { x: -9, y: 9 },
  { x: 9, y: 9 },
  { x: 0, y: -14 },
  { x: 0, y: 14 },
  { x: -14, y: 0 },
  { x: 14, y: 0 },
] as const;

function getWeightedGridCentre(index: number): number {
  const weights = [1.55, ...Array(12).fill(1), 1.55];
  const total = weights.reduce((sum, value) => sum + value, 0);
  const before = weights.slice(0, index - 1).reduce((sum, value) => sum + value, 0);
  return ((before + (weights[index - 1] ?? 1) / 2) / total) * 100;
}


function getBoardSide(
  position: number,
): "corner" | "bottom" | "left" | "top" | "right" {
  if ([0, 13, 26, 39].includes(position)) {
    return "corner";
  }

  if (position >= 1 && position <= 12) {
    return "bottom";
  }

  if (position >= 14 && position <= 25) {
    return "left";
  }

  if (position >= 27 && position <= 38) {
    return "top";
  }

  return "right";
}

function getSpaceIcon(
  space: BoardSpace,
): string | null {
  const icons: Record<string, string> = {
    "GO": "⬅",
    "Jail / Just Visiting": "👮",
    "Free Parking": "🚗",
    "Go To Jail": "🚓",
    "Auction": "🔨",
    "Bus Ticket": "🚌",
    "Birthday Gift": "🎂",
    "Bank Deposit": "🏦",
    "Electric Company": "⚡",
    "Water Works": "💧",
    "Gas Company": "🔥",
  };

  if (icons[space.name]) {
    return icons[space.name];
  }

  if (space.type === "chance") {
    return "?";
  }

  if (space.type === "community-chest") {
    return "🎁";
  }

  if (space.type === "tax") {
    return "🧾";
  }

  if (space.type === "railroad") {
    return "🚂";
  }

  return null;
}

function getSpacePrice(
  space: BoardSpace,
): string | null {
  if ("price" in space) {
    return `£${space.price}`;
  }

  if (space.type === "tax") {
    return `£${space.amount}`;
  }

  if (
    "amount" in space &&
    typeof space.amount === "number"
  ) {
    return `£${space.amount}`;
  }

  if (space.name === "GO") {
    return "Collect salary";
  }

  return null;
}

function getBoardSpaceInfo(space: BoardSpace): { title: string; icon: string; description: string; detail?: string } {
  if (space.type === "chance") return { title: "Chance", icon: "?", description: "Landing here draws a Chance card. The card is shown to every player before its movement, payment or other effect resolves.", detail: "Chance cards can move players, change cash, send a player to Jail or trigger other board effects." };
  if (space.type === "community-chest") return { title: "Community Chest", icon: "🎁", description: "Landing here draws a Community Chest card. The card is revealed to the table before the effect resolves.", detail: "Community Chest includes cash, movement and other table events." };
  if (space.type === "tax") return { title: space.name, icon: "🧾", description: `Landing here means £${space.amount.toLocaleString()} is owed to the Bank.`, detail: "If the Free Parking jackpot house rule is enabled, eligible Bank penalties and taxes feed that pot." };
  switch (space.name) {
    case "GO": return { title: "GO", icon: "🏁", description: "Passing GO pays £200. Landing exactly on GO pays £400 total under the active Mega Board house rule.", detail: "Advance-to-GO cards use the same exact-GO £400 rule." };
    case "Jail / Just Visiting": return { title: "Jail / Just Visiting", icon: "👮", description: "Players merely passing or landing here are Just Visiting. A player sent to Jail occupies the Jail state and must resolve the Jail rules on their turns.", detail: "Asset management and trading remain available while jailed." };
    case "Auction": return { title: "Auction", icon: "🔨", description: "If unowned assets remain, the player landing here chooses an unowned asset and starts an auction for the table.", detail: "If every ownable asset is already owned, the current Mega Board rule redirects the player to an eligible highest-rent destination." };
    case "Free Parking": return { title: "Free Parking", icon: "🚗", description: "Free Parking uses the room's selected house rule. When jackpot mode is on, eligible Bank penalties can accumulate here for the next player who lands on the space." };
    case "Bus Ticket": return { title: "Bus Ticket", icon: "🚌", description: "Landing here collects one Bus Ticket when a ticket remains available.", detail: "Held Bus Tickets can later be used for manual travel. Chance and Community Chest are not valid manual Bus Ticket destinations." };
    case "Go To Jail": return { title: "Go To Jail", icon: "🚓", description: "Landing here immediately sends the player to Jail.", detail: "Do not pass GO and do not collect £200 while being sent directly to Jail." };
    case "Birthday Gift": return { title: "Birthday Gift", icon: "🎂", description: "Landing here gives the player a choice between £100 cash and a Bus Ticket when tickets are available.", detail: "Birthday Gift ↔ GO movement is tracked for the Kass Maneuver Award." };
    case "Bank Deposit": return { title: "Bank Deposit", icon: "🏦", description: `Landing here requires a £${("amount" in space && typeof space.amount === "number" ? space.amount : 100).toLocaleString()} payment to the Bank.`, detail: "If the player cannot pay immediately, the normal debt-resolution flow applies." };
    default: return { title: space.name, icon: getSpaceIcon(space) ?? "ℹ", description: `This is the ${space.name} board space.` };
  }
}

function getDieFace(value: number): string {
  return [
    "",
    "⚀",
    "⚁",
    "⚂",
    "⚃",
    "⚄",
    "⚅",
  ][value] ?? String(value);
}

import { MegaTokenGlyph } from "./MegaTokenGlyph";

export function GameBoard({
  roomCode,
  playerId,
  gameState,
  darkMode,
  message,
  isSpectator = false,
  isResolvingPurchase,
  isSubmittingRoll,
  isResolvingCard,
  isResolvingAuction,
  isResolvingJail,
  isResolvingSpeedDie,
  isResolvingMega,
  theme,
  onRollDice,
  onEndTurn,
  onPurchase,
  onDeclinePurchase,
  onCardContinue,
  onAuctionBid,
  onAuctionWithdraw,
  onJailRoll,
  onJailPayFine,
  onJailUseCard,
  onSpeedDieTripleMove,
  onSpeedDieBusMove,
  onSpeedDieMrMonopoly,
  onStartBusTicket,
  onBusTicketMove,
  onBusTicketCancel,
  onBirthdayCash,
  onBirthdayTicket,
  onAuctionSpaceSelect,
  onOpenBank,
  onOpenActionPanel,
}: GameBoardProps) {
  const currentGamePlayer = gameState.players.find(
    (player) => player.id === playerId,
  );
  const activeGamePlayer = gameState.players[gameState.currentPlayerIndex];
  const pendingTradeStatus = gameState.pendingTrade
    ? (() => {
        const trade = gameState.pendingTrade!;
        const proposer = gameState.players.find((player) => player.id === trade.proposerId);
        const participantIds = trade.participantIds ?? [trade.proposerId, trade.recipientId];
        const others = participantIds
          .filter((id) => id !== trade.proposerId)
          .map((id) => gameState.players.find((player) => player.id === id)?.name ?? "another player");
        if (trade.multiParty && participantIds.length >= 3) {
          const approvals = trade.acceptedPlayerIds?.length ?? 1;
          return `${proposer?.name ?? "A player"} is making a ${participantIds.length}-way deal with ${others.join(", ")}… (${approvals}/${participantIds.length} approved)`;
        }
        return `${proposer?.name ?? "A player"} is making a deal with ${others[0] ?? "another player"}…`;
      })()
    : null;
  const pendingPurchase = gameState.pendingPurchase;
  const pendingPurchaseSpace = pendingPurchase
    ? getBoardSpace(pendingPurchase.spaceId)
    : undefined;
  const isMyPendingPurchase = pendingPurchase?.playerId === playerId;
  const canAffordPendingPurchase = Boolean(
    currentGamePlayer &&
      pendingPurchaseSpace &&
      "price" in pendingPurchaseSpace &&
      currentGamePlayer.cash >= pendingPurchaseSpace.price,
  );
  const isMyTurn =
    activeGamePlayer?.id ===
    currentGamePlayer?.id;

  const rollDisabled =
    !currentGamePlayer ||
    !isMyTurn ||
    gameState.turnPhase !== "roll" ||
    isSubmittingRoll;

  const busTicketDisabled =
    !currentGamePlayer ||
    !isMyTurn ||
    gameState.turnPhase !== "roll" ||
    currentGamePlayer.busTickets < 1;

  const endTurnDisabled =
    !currentGamePlayer ||
    !isMyTurn ||
    gameState.turnPhase !==
      "optional-actions";

  const hasNonJailBlockingDecision = Boolean(
    gameState.pendingPurchase ||
    gameState.pendingCard ||
    gameState.pendingAuction ||
    gameState.pendingSpeedDieAction ||
    gameState.pendingMegaAction ||
    gameState.pendingDebt,
  );

  const canManageFromBoard = Boolean(
    currentGamePlayer &&
    isMyTurn &&
    !currentGamePlayer.autopilotEnabled &&
    !hasNonJailBlockingDecision &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision"),
  );

  const canTradeFromBoard = Boolean(
    canManageFromBoard &&
    !gameState.pendingTrade,
  );

  const [animatedRoll, setAnimatedRoll] =
    useState(
      gameState.lastDiceRoll,
    );

  const [showDiceOverlay, setShowDiceOverlay] =
    useState(false);

  const [selectedDeedSpaceId, setSelectedDeedSpaceId] =
    useState<number | null>(null);
  const [freeParkingInfoOpen, setFreeParkingInfoOpen] = useState(false);
  const [selectedInfoSpaceId, setSelectedInfoSpaceId] = useState<number | null>(null);

  // Presentation state is deliberately separate from authoritative game state.
  // The server may resolve an action immediately, but players see the dice,
  // token movement, announcement and cash change in a readable sequence.
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>(() =>
    Object.fromEntries(gameState.players.map((player) => [player.id, player.position])),
  );
  const visualPositionsRef = useRef<Record<string, number>>(visualPositions);
  const previousActualPositions = useRef<Record<string, number>>(
    Object.fromEntries(gameState.players.map((player) => [player.id, player.position])),
  );
  const pendingRollMovement = useRef<PendingTokenMovement | null>(null);
  const movementTimer = useRef<number | null>(null);
  const [travellingPlayerId, setTravellingPlayerId] = useState<string | null>(null);
  const [rollingPlayerId, setRollingPlayerId] = useState<string | null>(null);
  const previousActivePlayerId = useRef<string | null>(activeGamePlayer?.id ?? null);
  const consumedCardMovementDrawKey = useRef<string | null>(null);

  const [visibleGlobalNotice, setVisibleGlobalNotice] = useState<GameState["lastGlobalNotice"]>(null);
  const [globalNoticeQueue, setGlobalNoticeQueue] = useState<GlobalNotice[]>([]);
  const [announcementStepIndex, setAnnouncementStepIndex] = useState(0);
  const noticeBacklogAtDisplay = useRef(0);
  const globalNoticeCursor = useRef<GlobalNoticeCursor>({
    initialized: false,
    lastId: null,
    lastCreatedAt: 0,
  });
  const seenGlobalNoticeIds = useRef<Set<string>>(new Set());
  const [liveMovementNotice, setLiveMovementNotice] = useState<GlobalNotice | null>(null);
  const movementNoticeTimer = useRef<number | null>(null);
  const previousCashByPlayer = useRef<Record<string, number>>(
    Object.fromEntries(gameState.players.map((player) => [player.id, player.cash])),
  );
  const [cashDeltaQueue, setCashDeltaQueue] = useState<Array<{
    id: string;
    playerId: string;
    playerName: string;
    amount: number;
    balance: number;
  }>>([]);
  const [visibleCashDelta, setVisibleCashDelta] = useState<{
    id: string;
    playerId: string;
    playerName: string;
    amount: number;
    balance: number;
  } | null>(null);
  const [visibleActionMessage, setVisibleActionMessage] = useState("");

  useEffect(() => {
    if (!message) {
      setVisibleActionMessage("");
      return;
    }

    setVisibleActionMessage(message);
    const looksLikeError = /unable|cannot|could not|need |required|not ready|not found|invalid|failed/i.test(message);
    const timer = window.setTimeout(
      () => setVisibleActionMessage(""),
      looksLikeError ? 4800 : 2600,
    );
    return () => window.clearTimeout(timer);
  }, [message]);


  useEffect(() => {
    const notices = gameState.globalNotices?.length
      ? gameState.globalNotices
      : gameState.lastGlobalNotice
        ? [gameState.lastGlobalNotice]
        : [];

    const cursor = globalNoticeCursor.current;

    // A game snapshot contains a rolling history of notices. On first mount
    // (including reconnect/recovery) that history is context, not a playlist.
    // Seed the cursor at the newest existing notice so old events are never
    // replayed from the beginning. If the initial snapshot has no notices,
    // initialise an empty cursor so the first real event is not accidentally
    // treated as old history.
    if (!cursor.initialized) {
      cursor.initialized = true;
      if (notices.length === 0) {
        cursor.lastCreatedAt = 0;
        return;
      }
      for (const notice of notices) {
        seenGlobalNoticeIds.current.add(notice.id);
      }
      const newest = notices[notices.length - 1];
      cursor.lastId = newest.id;
      cursor.lastCreatedAt = newest.createdAt;
      return;
    }

    if (notices.length === 0) return;

    const cursorIndex = cursor.lastId
      ? notices.findIndex((notice) => notice.id === cursor.lastId)
      : -1;

    const candidates = cursorIndex >= 0
      ? notices.slice(cursorIndex + 1)
      : notices.filter((notice) => notice.createdAt > cursor.lastCreatedAt);

    const fresh = candidates.filter((notice) => {
      if (seenGlobalNoticeIds.current.has(notice.id)) return false;
      seenGlobalNoticeIds.current.add(notice.id);
      return true;
    });

    const newest = notices[notices.length - 1];
    cursor.lastId = newest.id;
    cursor.lastCreatedAt = Math.max(cursor.lastCreatedAt, newest.createdAt);

    // Bound the dedupe set to the same rolling notice window used by the
    // server. This prevents a long-running match from growing it forever.
    if (seenGlobalNoticeIds.current.size > 160) {
      const liveIds = new Set(notices.map((notice) => notice.id));
      seenGlobalNoticeIds.current = liveIds;
    }

    const displayableFresh = fresh.filter(
      (notice) => !(notice.kind === "card-event" && notice.playerId === playerId),
    );

    if (displayableFresh.length > 0) {
      setGlobalNoticeQueue((current) => {
        const combined = [...current, ...displayableFresh];
        // Routine notices are only useful while they still describe the live
        // action. Under fast AI/autopilot play, discard old standard narration
        // instead of letting it trail several turns behind.
        const now = Date.now();
        return combined.filter((notice, index) =>
          notice.presentation === "major" ||
          now - notice.createdAt < 4500 ||
          index >= combined.length - 3
        ).slice(-12);
      });
      setVisibleGlobalNotice((current) => {
        if (!current || current.presentation === "major") return current;
        return Date.now() - current.createdAt > 1200 ? null : current;
      });
    }
  }, [gameState.globalNotices, gameState.lastGlobalNotice]);

  // Never let a consequence announcement jump ahead of dice/token animation.
  // Checking the authoritative position against the visual token position also
  // closes the one-render gap between the dice overlay ending and the travel
  // animation setting travellingPlayerId.
  useEffect(() => {
    const hasUnpresentedMovement =
      pendingRollMovement.current !== null ||
      gameState.players.some(
        (player) =>
          (visualPositionsRef.current[player.id] ?? player.position) !==
          player.position,
      );

    if (
      visibleGlobalNotice ||
      globalNoticeQueue.length === 0 ||
      showDiceOverlay ||
      travellingPlayerId !== null ||
      hasUnpresentedMovement
    ) {
      return;
    }
    const [next, ...rest] = globalNoticeQueue;
    const age = Date.now() - next.createdAt;
    const staleAfter = next.presentation === "major" ? 10000 : 4500;

    // If rapid AI turns have already made a routine notice obsolete, skip it
    // rather than narrating history while the board is several actions ahead.
    if (age > staleAfter) {
      setGlobalNoticeQueue(rest);
      return;
    }

    noticeBacklogAtDisplay.current = globalNoticeQueue.length;
    setGlobalNoticeQueue(rest);
    setVisibleGlobalNotice(next);
  }, [
    globalNoticeQueue,
    visibleGlobalNotice,
    showDiceOverlay,
    travellingPlayerId,
    visualPositions,
    gameState.players,
  ]);

  useEffect(() => {
    if (!visibleGlobalNotice) return;

    setAnnouncementStepIndex(0);
    const isMajor = visibleGlobalNotice.presentation === "major" &&
      (visibleGlobalNotice.kind === "bankruptcy" || visibleGlobalNotice.kind === "winner");
    const duration = getQueuedNoticeDuration(
      visibleGlobalNotice,
      noticeBacklogAtDisplay.current,
    );
    const steps = visibleGlobalNotice.steps ?? [];
    const timers: number[] = [];

    if (isMajor && steps.length > 1) {
      const minimumStepTime = noticeBacklogAtDisplay.current >= 6 ? 360 : 700;
      const interval = Math.max(
        minimumStepTime,
        Math.floor((duration - 250) / steps.length),
      );
      for (let index = 1; index < steps.length; index += 1) {
        timers.push(window.setTimeout(() => setAnnouncementStepIndex(index), interval * index));
      }
    }

    timers.push(window.setTimeout(() => setVisibleGlobalNotice(null), duration));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visibleGlobalNotice]);

  useEffect(() => {
    const nextCash = Object.fromEntries(
      gameState.players.map((player) => [player.id, player.cash]),
    );
    const localPlayer = gameState.players.find((player) => player.id === playerId);
    const previous = playerId ? previousCashByPlayer.current[playerId] : undefined;
    previousCashByPlayer.current = nextCash;

    // Exact account deltas and resulting balances are private information.
    // Public transactions are narrated by purpose-built global notices, while
    // this ticker is only ever shown to the player whose account changed.
    if (
      !localPlayer ||
      previous === undefined ||
      previous === localPlayer.cash
    ) {
      return;
    }

    const delta = {
      id: `cash-${localPlayer.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerId: localPlayer.id,
      playerName: localPlayer.name,
      amount: localPlayer.cash - previous,
      balance: localPlayer.cash,
    };

    setCashDeltaQueue((current) => {
      // Keep account feedback current. If several server mutations arrive in a
      // burst, retain only the newest few rather than narrating stale balances.
      return [...current, delta].slice(-3);
    });
  }, [gameState.players, playerId]);

  // Account feedback is time-critical and may display alongside the public
  // announcement that explains it. It must not sit behind the narration queue.
  useEffect(() => {
    if (visibleCashDelta || cashDeltaQueue.length === 0) {
      return;
    }
    const [next, ...rest] = cashDeltaQueue;
    setCashDeltaQueue(rest);
    setVisibleCashDelta(next);
  }, [cashDeltaQueue, visibleCashDelta]);

  useEffect(() => {
    if (!visibleCashDelta) return;
    const timer = window.setTimeout(() => setVisibleCashDelta(null), 1150);
    return () => window.clearTimeout(timer);
  }, [visibleCashDelta]);

  const [transientCardDraw, setTransientCardDraw] = useState<GameState["lastCardDraw"]>(null);
  const seenCardDrawKey = useRef<string | null>(null);

  useEffect(() => {
    const draw = gameState.lastCardDraw;
    if (!draw || draw.playerId !== playerId) return;
    const key = `${draw.drawnAt}:${draw.playerId}:${draw.cardId}`;
    if (seenCardDrawKey.current === key) return;
    seenCardDrawKey.current = key;

    // Human card decisions already use the full blocking card popup. This
    // transient reveal is for cards that resolve automatically (AI/autopilot)
    // so every Chance/Community Chest draw still has visible animation.
    if (
      gameState.pendingCard?.cardId === draw.cardId &&
      gameState.pendingCard?.playerId === draw.playerId
    ) {
      return;
    }

    if (Date.now() - draw.drawnAt > 10000) return;
    setTransientCardDraw(draw);
    const timer = window.setTimeout(() => setTransientCardDraw(null), 3200);
    return () => window.clearTimeout(timer);
  }, [gameState.lastCardDraw, gameState.pendingCard]);

  const setVisualPosition = (playerId: string, position: number) => {
    const next = { ...visualPositionsRef.current, [playerId]: position };
    visualPositionsRef.current = next;
    setVisualPositions(next);
  };

  const animateTokenMovement = (movement: PendingTokenMovement) => {
    if (movementTimer.current) {
      window.clearTimeout(movementTimer.current);
      movementTimer.current = null;
    }

    const route = getTokenTravelRoute(
      movement.from,
      movement.to,
      movement.preferredForwardSteps,
      movement.preferredDirection,
    );

    const movingPlayer = gameState.players.find((player) => player.id === movement.playerId);
    const destination = getBoardSpace(movement.to);
    const automatedMovement = Boolean(movingPlayer?.isAi || movingPlayer?.autopilotEnabled);
    const presentationPressure = globalNoticeQueue.length +
      gameState.players.filter((player) =>
        (visualPositionsRef.current[player.id] ?? player.position) !== player.position
      ).length;
    const targetTravelMs = presentationPressure >= 3
      ? 520
      : automatedMovement
        ? 760
        : 1350;
    const stepDelayMs = route.length > 0
      ? Math.max(38, Math.min(120, Math.floor(targetTravelMs / route.length)))
      : 0;
    const movementNotice: GlobalNotice = {
      id: `movement-${movement.playerId}-${movement.from}-${movement.to}-${Date.now()}`,
      kind: "movement",
      title: "📍 Player movement",
      message: `${movingPlayer?.name ?? "Player"} is moving to ${destination?.name ?? `Space ${movement.to}`}.`,
      createdAt: Date.now(),
      playerId: movement.playerId,
      presentation: "standard",
      durationMs: Math.max(700, Math.min(1800, route.length * stepDelayMs + 350)),
    };
    setLiveMovementNotice(movementNotice);
    if (movementNoticeTimer.current) window.clearTimeout(movementNoticeTimer.current);
    movementNoticeTimer.current = window.setTimeout(
      () => setLiveMovementNotice(null),
      movementNotice.durationMs,
    );

    if (route.length === 0) {
      setVisualPosition(movement.playerId, movement.to);
      setTravellingPlayerId(null);
      return;
    }

    setVisualPosition(movement.playerId, movement.from);
    setTravellingPlayerId(movement.playerId);

    let routeIndex = 0;
    const travelNextSpace = () => {
      const nextPosition = route[routeIndex];
      if (nextPosition === undefined) {
        setVisualPosition(movement.playerId, movement.to);
        setTravellingPlayerId(null);
        movementTimer.current = null;
        return;
      }

      setVisualPosition(movement.playerId, nextPosition);
      routeIndex += 1;
      movementTimer.current = window.setTimeout(travelNextSpace, stepDelayMs);
    };

    travelNextSpace();
  };

  const previousRollKey =
    useRef<string | null>(null);

  const rollEffectReady =
    useRef(false);

  const diceTimer =
    useRef<number | null>(null);

  const rollKey =
    gameState.lastDiceRoll
      ? [
          gameState.rollSequence ?? 0,
          gameState.lastDiceRoll.white1,
          gameState.lastDiceRoll.white2,
          String(gameState.lastDiceRoll.speed),
          gameState.lastDiceRoll.movementTotal,
        ].join(":")
      : null;

  useEffect(() => {
    if (!rollEffectReady.current) {
      rollEffectReady.current = true;
      previousRollKey.current = rollKey;
      return;
    }

    if (
      rollKey &&
      rollKey !== previousRollKey.current &&
      gameState.lastDiceRoll
    ) {
      const movedPlayer = gameState.players.find((player) => {
        const previous = previousActualPositions.current[player.id];
        return previous !== undefined && previous !== player.position;
      });

      if (movedPlayer) {
        const from =
          visualPositionsRef.current[movedPlayer.id] ??
          previousActualPositions.current[movedPlayer.id] ??
          movedPlayer.position;
        pendingRollMovement.current = {
          playerId: movedPlayer.id,
          from,
          to: movedPlayer.position,
          preferredForwardSteps: gameState.lastDiceRoll.movementTotal,
        };
        setVisualPosition(movedPlayer.id, from);
      } else {
        pendingRollMovement.current = null;
      }

      setRollingPlayerId(
        movedPlayer?.id ??
        gameState.pendingSpeedDieAction?.playerId ??
        previousActivePlayerId.current ??
        activeGamePlayer?.id ??
        null,
      );
      setAnimatedRoll(gameState.lastDiceRoll);
      setShowDiceOverlay(true);

      if (diceTimer.current) {
        window.clearTimeout(diceTimer.current);
      }

      // Safety fallback. DiceRollOverlay normally settles first.
      diceTimer.current = window.setTimeout(() => {
        setShowDiceOverlay(false);
        const movement = pendingRollMovement.current;
        pendingRollMovement.current = null;
        if (movement) {
          animateTokenMovement(movement);
        }
      }, 2600);
    }

    previousRollKey.current = rollKey;
  }, [gameState.lastDiceRoll, gameState.players, rollKey]);


  useEffect(
    () => () => {
      if (diceTimer.current) {
        window.clearTimeout(diceTimer.current);
      }
      if (movementTimer.current) {
        window.clearTimeout(movementTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    previousActualPositions.current = Object.fromEntries(
      gameState.players.map((player) => [player.id, player.position]),
    );
  }, [gameState.players]);

  useEffect(() => {
    previousActivePlayerId.current = activeGamePlayer?.id ?? null;
  }, [activeGamePlayer?.id]);

  useEffect(() => {
    if (showDiceOverlay || travellingPlayerId || pendingRollMovement.current) {
      return;
    }

    const movedPlayer = gameState.players.find(
      (player) =>
        (visualPositionsRef.current[player.id] ?? player.position) !==
        player.position,
    );

    if (!movedPlayer) {
      return;
    }

    const from = visualPositionsRef.current[movedPlayer.id] ?? movedPlayer.position;
    const draw = gameState.lastCardDraw;
    const drawKey = draw ? `${draw.drawnAt}:${draw.playerId}:${draw.cardId}` : null;
    const cardDirection = drawKey && consumedCardMovementDrawKey.current !== drawKey
      ? getCardMovementDirection(gameState, movedPlayer.id)
      : undefined;
    if (cardDirection && drawKey) {
      consumedCardMovementDrawKey.current = drawKey;
    }

    animateTokenMovement({
      playerId: movedPlayer.id,
      from,
      to: movedPlayer.position,
      preferredDirection: cardDirection,
    });
  }, [gameState.players, showDiceOverlay, travellingPlayerId]);

  useEffect(() => {
    const action = gameState.pendingSpeedDieAction;
    if (
      showDiceOverlay ||
      travellingPlayerId !== null ||
      !isMyTurn ||
      isResolvingSpeedDie ||
      action?.type !== "mr-monopoly"
    ) {
      return;
    }

    // Mr. Monopoly is an automatic bonus move, not a player decision.
    // Retry after a short presentation pause until the authoritative server
    // clears the pending action. This prevents a missed acknowledgement or
    // render race from leaving the game permanently stuck in speed-die-choice.
    const timer = window.setTimeout(() => {
      onSpeedDieMrMonopoly();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    gameState.pendingSpeedDieAction,
    isMyTurn,
    isResolvingSpeedDie,
    onSpeedDieMrMonopoly,
    showDiceOverlay,
    travellingPlayerId,
  ]);


  const tokenLayout = useMemo(
    () =>
      gameState.players
        .filter(
          (player) =>
            !player.isBankrupt,
        )
        .map((player) => {
          const sameSpacePlayers =
            gameState.players.filter(
              (candidate) =>
                !candidate.isBankrupt &&
                (visualPositions[candidate.id] ?? candidate.position) ===
                  (visualPositions[player.id] ?? player.position),
            );

          const stackIndex =
            sameSpacePlayers.findIndex(
              (candidate) =>
                candidate.id ===
                player.id,
            );

          const baseOffset =
            TOKEN_OFFSETS[
              stackIndex %
                TOKEN_OFFSETS.length
            ];

          const visualPosition = visualPositions[player.id] ?? player.position;
          const jailZone = visualPosition === JAIL_POSITION
            ? (player.inJail ? "jail" : "visiting")
            : null;
          const jailBias = jailZone === "jail"
            ? { x: 18, y: -18 }
            : jailZone === "visiting"
              ? { x: -18, y: 18 }
              : { x: 0, y: 0 };
          const offset = {
            x: baseOffset.x + jailBias.x,
            y: baseOffset.y + jailBias.y,
          };

          const gridPosition =
            getBoardGridPosition(visualPosition);

          return {
            player,
            left: getWeightedGridCentre(gridPosition.column),
            top: getWeightedGridCentre(gridPosition.row),
            offset,
            jailZone,
          };
        }),
    [gameState.players, visualPositions],
  );

  const hasPendingVisualMovement = gameState.players.some(
    (player) =>
      (visualPositions[player.id] ?? player.position) !== player.position,
  );
  const isTokenTravelling = travellingPlayerId !== null || hasPendingVisualMovement;

  const selectedDeedSpace =
    selectedDeedSpaceId === null
      ? undefined
      : getBoardSpace(selectedDeedSpaceId);
  const selectedInfoSpace = selectedInfoSpaceId === null ? undefined : getBoardSpace(selectedInfoSpaceId);
  const selectedInfo = selectedInfoSpace ? getBoardSpaceInfo(selectedInfoSpace) : null;

  const blockingBoardDecision = Boolean(
    gameState.pendingPurchase ||
    gameState.pendingCard ||
    gameState.pendingAuction ||
    gameState.pendingMegaAction ||
    gameState.pendingDebt ||
    (gameState.pendingSpeedDieAction &&
      gameState.pendingSpeedDieAction.type !== "bus"),
  );

  const boardFrameRef = useRef<HTMLElement | null>(null);
  const [desktopBoardSize, setDesktopBoardSize] = useState<number | null>(null);

  useEffect(() => {
    const node = boardFrameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const desktop = window.matchMedia("(min-width: 1181px)").matches;
      if (!desktop) {
        setDesktopBoardSize(null);
        return;
      }
      const rect = node.getBoundingClientRect();
      const next = Math.max(0, Math.floor(Math.min(rect.width, rect.height)));
      setDesktopBoardSize((current) => current === next ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("fullscreenchange", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("fullscreenchange", measure);
    };
  }, []);

  const preRollPreview = useMemo(() => {
    const preview = new Map<number, number>();
    if (
      !isMyTurn ||
      gameState.turnPhase !== "roll" ||
      showDiceOverlay ||
      isTokenTravelling ||
      blockingBoardDecision ||
      !currentGamePlayer
    ) {
      return preview;
    }
    const maxDistance = gameState.speedDieRetired ? 12 : 15;
    for (let distance = 1; distance <= maxDistance; distance += 1) {
      preview.set(
        (currentGamePlayer.position + distance) % BOARD_SPACE_COUNT,
        distance,
      );
    }
    return preview;
  }, [
    isMyTurn,
    gameState.turnPhase,
    gameState.speedDieRetired,
    showDiceOverlay,
    isTokenTravelling,
    blockingBoardDecision,
    currentGamePlayer?.position,
  ]);

  const busChoicePreview = useMemo(() => {
    const preview = new Map<number, number>();
    const action = gameState.pendingSpeedDieAction;
    if (
      !isMyTurn ||
      action?.type !== "bus" ||
      !currentGamePlayer ||
      showDiceOverlay ||
      isTokenTravelling
    ) {
      return preview;
    }
    const distances = [...new Set([action.white1, action.white2, action.whiteDiceTotal])];
    for (const distance of distances) {
      preview.set(
        (currentGamePlayer.position + distance) % BOARD_SPACE_COUNT,
        distance,
      );
    }
    return preview;
  }, [
    isMyTurn,
    gameState.pendingSpeedDieAction,
    currentGamePlayer?.position,
    showDiceOverlay,
    isTokenTravelling,
  ]);

  return (
    <section
      ref={boardFrameRef}
      className="board-frame"
      aria-label="Mega Board board"
      style={{
        ...styles.boardFrame,
        background: theme.cardBackground,
        borderColor: theme.border,
        ...(desktopBoardSize ? { "--mega-board-size": `${desktopBoardSize}px` } as CSSProperties : {}),
      }}
    >
      <div
        className="board-grid"
        style={{
          ...styles.board,
          background: darkMode ? "#18251f" : "#dce8d4",
          borderColor: theme.border,
        }}
      >
        {BOARD_SPACES.map((space) => {
          const gridPosition = getBoardGridPosition(space.position);
          const corner = isCornerSpace(space.position);
          const ownerId = gameState.propertyOwners[space.id];
          const owner = ownerId
            ? gameState.players.find((player) => player.id === ownerId)
            : undefined;
          const previewDistance = preRollPreview.get(space.position);
          const busChoiceDistance = busChoicePreview.get(space.position);
          const isFreeParking = space.name === "Free Parking";
          const canInspectDeed = isOwnableBoardSpace(space);
          const isInteractiveSpace = true;

          const activateSpace = () => {
            if (busChoiceDistance !== undefined) {
              onSpeedDieBusMove(busChoiceDistance);
              return;
            }
            if (isFreeParking) {
              setFreeParkingInfoOpen(true);
              return;
            }
            if (canInspectDeed) {
              setSelectedDeedSpaceId(space.id);
              return;
            }
            setSelectedInfoSpaceId(space.id);
          };

          return (
            <div
              key={space.id}
              className={`board-space board-space-${space.type} ${
                corner ? "is-corner" : ""
              } ${owner ? "is-owned-space" : ""} ${
                gameState.mortgagedProperties[space.id] ? "is-mortgaged-space" : ""
              } ${canInspectDeed ? "is-clickable-deed" : ""} ${
                isFreeParking ? "is-clickable-free-parking" : ""
              } ${!canInspectDeed && !isFreeParking ? "is-clickable-info" : ""} ${previewDistance !== undefined ? "has-movement-preview" : ""} ${
                busChoiceDistance !== undefined ? "has-bus-choice-preview" : ""
              } ${isRailroadBoardSpace(space) ? "is-station-space" : ""} ${
                isUtilityBoardSpace(space) ? "is-utility-space" : ""
              } ${space.position === JAIL_POSITION ? "is-jail-corner" : ""}`}
              data-side={getBoardSide(
                space.position,
              )}
              data-space-name={space.name}
              role={isInteractiveSpace ? "button" : undefined}
              tabIndex={isInteractiveSpace ? 0 : undefined}
              aria-label={
                busChoiceDistance !== undefined
                  ? `Move ${busChoiceDistance} spaces to ${space.name}`
                  : isFreeParking
                    ? "View Free Parking jackpot"
                    : canInspectDeed
                      ? `View ${space.name} title deed`
                      : `View information about ${space.name}`
              }
              onClick={isInteractiveSpace ? activateSpace : undefined}
              onKeyDown={isInteractiveSpace ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activateSpace();
                }
              } : undefined}
              style={{
                ...styles.boardSpace,
                gridRow: gridPosition.row,
                gridColumn: gridPosition.column,
                background: corner
                  ? darkMode
                    ? "#334155"
                    : "#f5f1e8"
                  : darkMode
                    ? "#24322b"
                    : "#ffffff",
                color: theme.text,
                borderColor: darkMode ? "#718096" : "#222222",
                ...(owner ? { ["--owner-colour" as string]: owner.colour } : {}),
              }}
            >
              {(isPropertyBoardSpace(space) || isRailroadBoardSpace(space) || isUtilityBoardSpace(space)) && (
                <span
                  className={`property-colour-strip asset-class-strip ${
                    isRailroadBoardSpace(space)
                      ? "station-strip"
                      : isUtilityBoardSpace(space)
                        ? "utility-strip"
                        : "property-strip"
                  }`}
                  style={{
                    ...styles.propertyColourStrip,
                    background: isPropertyBoardSpace(space)
                      ? getPropertyGroupColour(space.group)
                      : isRailroadBoardSpace(space)
                        ? "#343941"
                        : "#7b8794",
                  }}
                >
                  {isPropertyBoardSpace(space) &&
                    (gameState.propertyDevelopments[space.id] ?? 0) > 0 && (
                      <span className="development-markers" aria-label={`Development level ${gameState.propertyDevelopments[space.id] ?? 0}`}>
                        {(gameState.propertyDevelopments[space.id] ?? 0) <= 4
                          ? Array.from({ length: gameState.propertyDevelopments[space.id] ?? 0 }, (_, index) => (
                              <i key={index} className="development-piece is-house" aria-hidden="true" />
                            ))
                          : (gameState.propertyDevelopments[space.id] ?? 0) === 5
                            ? <i className="development-piece is-hotel" aria-hidden="true" />
                            : <i className="development-piece is-skyscraper" aria-hidden="true" />}
                      </span>
                    )}
                  {isRailroadBoardSpace(space) && gameState.railroadDepots[space.id] && (
                    <span className="development-markers depot-marker" title="Train Depot">🚉</span>
                  )}
                </span>
              )}

              <span style={styles.spaceNumber}>{space.position}</span>

              {space.position === JAIL_POSITION ? (
                <div className="jail-corner-visual" aria-label="Jail and Just Visiting">
                  <span className="jail-cell-zone"><b>JAIL</b></span>
                  <span className="just-visiting-zone"><b>JUST</b><b>VISITING</b></span>
                </div>
              ) : (
                <>
                  {getSpaceIcon(space) && (
                    <span
                      className="board-space-icon"
                      aria-hidden="true"
                    >
                      {getSpaceIcon(space)}
                    </span>
                  )}

                  <strong
                    className="board-space-name"
                    style={{
                      ...styles.spaceName,
                      fontSize: corner
                        ? "10px"
                        : space.name.length >= 20
                          ? "5.25px"
                          : space.name.length >= 17
                            ? "5.65px"
                            : space.name.length >= 14
                              ? "6.05px"
                              : space.name.length >= 11
                                ? "6.65px"
                                : "8px",
                      lineHeight: space.name.length >= 14 ? 1 : space.name.length >= 11 ? 1.04 : 1.12,
                    }}
                  >
                    {space.name}
                  </strong>
                </>
              )}

              {getSpacePrice(space) && (
                <span className="board-space-price">
                  {getSpacePrice(space)}
                </span>
              )}

              {busChoiceDistance !== undefined ? (
                <span className="movement-preview-badge is-bus-choice" aria-hidden="true">
                  {busChoiceDistance}
                </span>
              ) : previewDistance !== undefined ? (
                <span className="movement-preview-badge" aria-hidden="true">
                  {previewDistance}
                </span>
              ) : null}

            </div>
          );
        })}


        <div
          className="animated-token-layer"
          aria-label="Player positions"
        >
          {tokenLayout.map(
            ({
              player,
              left,
              top,
              offset,
              jailZone,
            }) => (
              <span
                key={player.id}
                title={jailZone === "jail" ? `${player.name}, in Jail` : jailZone === "visiting" ? `${player.name}, Just Visiting` : `${player.name}, position ${player.position}`}
                aria-label={jailZone === "jail" ? `${player.name} is in Jail` : jailZone === "visiting" ? `${player.name} is Just Visiting` : `${player.name} is on position ${player.position}`}
                className={`animated-board-token ${
                  player.id ===
                  activeGamePlayer?.id
                    ? "is-current-token"
                    : ""
                } ${player.id === travellingPlayerId ? "is-travelling-token" : ""} ${
                  jailZone === "jail" ? "is-in-jail-token" : jailZone === "visiting" ? "is-just-visiting-token" : ""
                }`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  color:
                    player.colour,
                  transform:
                    `translate(-50%, -50%) ` +
                    `translate(${offset.x}px, ${offset.y}px)`,
                }}
              >
                <span className="board-token-glyph"><MegaTokenGlyph tokenId={player.tokenId} fallback={player.name.charAt(0).toUpperCase()} /></span>
              </span>
            ),
          )}
        </div>

        <div
          className="board-centre board-centre-authentic"
          style={{
            ...styles.boardCentre,
            gridRow: "2 / 14",
            gridColumn: "2 / 14",
            background: darkMode ? "#1b2b24" : "#dce8d4",
            color: theme.text,
          }}
        >
          <div
            className="board-centre-decoration"
          >
            <div className="board-deck board-deck-chance">
              <span>?</span>
              <small>Chance</small>
            </div>
            <div className="board-deck board-deck-community">
              <span>🎁</span>
              <small>Community</small>
            </div>
            <button
              type="button"
              className="board-deck board-deck-bank board-bank-button"
              onClick={onOpenBank}
              aria-label={`Open Bank inventory. ${gameState.bankInventory.houses} houses, ${gameState.bankInventory.hotels} hotels, ${gameState.bankInventory.skyscrapers} skyscrapers, ${gameState.bankInventory.depots} depots available.`}
            >
              <span className="board-bank-icon">🏦</span>
              <small>Bank</small>
              {/* Live stock comes directly from the authoritative GameState broadcast.
                  The compact board badge is read-only; clicking the Bank opens the full inventory. */}
              <div className="board-bank-live-stock" aria-hidden="true">
                <b className={gameState.bankInventory.houses === 0 ? "is-empty" : undefined} title="Houses available">🏠 {gameState.bankInventory.houses}</b>
                <b className={gameState.bankInventory.hotels === 0 ? "is-empty" : undefined} title="Hotels available">🏨 {gameState.bankInventory.hotels}</b>
                <b className={gameState.bankInventory.skyscrapers === 0 ? "is-empty" : undefined} title="Skyscrapers available">🏙️ {gameState.bankInventory.skyscrapers}</b>
                <b className={gameState.bankInventory.depots === 0 ? "is-empty" : undefined} title="Depots available">🚉 {gameState.bankInventory.depots}</b>
              </div>
            </button>
            <div className="board-deck board-deck-bus">
              <span>🚌</span>
              <small>{gameState.busTicketsRemaining} tickets</small>
            </div>
          </div>

          <div className="board-centre-core">
            <p className="board-room-code">Room {roomCode}</p>
            <h2 className="board-centre-logo" style={styles.boardLogo}>
              <span>HALIEUS</span>
              <b>MEGA BOARD</b>
            </h2>

            <div
              className="centre-turn-status"
              style={{
                background: theme.secondaryBackground,
                borderColor: theme.border,
              }}
            >
              <span style={{ color: theme.mutedText }}>{isMyTurn ? "YOUR TURN" : `${activeGamePlayer?.name ?? "PLAYER"}'S TURN`}</span>
              <strong
                className={visibleActionMessage ? "is-live-action-message" : undefined}
                style={{ color: theme.text }}
              >
                {visibleActionMessage ||
                  (showDiceOverlay
                    ? `${gameState.players.find((player) => player.id === rollingPlayerId)?.name ?? activeGamePlayer?.name ?? "Player"} is rolling...`
                    : travellingPlayerId
                      ? `${gameState.players.find((player) => player.id === travellingPlayerId)?.name ?? "Player"} is moving to ${getBoardSpace(gameState.players.find((player) => player.id === travellingPlayerId)?.position ?? 0)?.name ?? "the destination"}...`
                      : visibleGlobalNotice
                        ? visibleGlobalNotice.message
                      : pendingTradeStatus
                        ? pendingTradeStatus
                      : gameState.turnPhase === "roll" ? "Ready to roll" :
                        gameState.turnPhase === "optional-actions" ? "Optional actions" :
                        gameState.turnPhase === "purchase" ? "Property decision" :
                        gameState.turnPhase === "auction" ? "Auction in progress" :
                        gameState.turnPhase === "card" ? "Resolving card" :
                        gameState.turnPhase === "debt" ? "Resolving debt" :
                        gameState.turnPhase === "jail-decision" ? "Jail decision" :
                        gameState.turnPhase === "speed-die-choice" ? "Speed Die choice" :
                        gameState.turnPhase.replaceAll("-", " "))}
              </strong>
            </div>

            {!isSpectator && currentGamePlayer && !currentGamePlayer.autopilotEnabled && isMyTurn && (
              gameState.turnPhase === "roll" ||
              gameState.turnPhase === "optional-actions" ||
              gameState.turnPhase === "jail-decision"
            ) && (
              <div className="board-action-dock" aria-label="Current turn actions">
                <div className="board-main-action-row">
                  {gameState.turnPhase === "roll" && (
                    <button
                      type="button"
                      className="board-primary-action is-primary"
                      disabled={rollDisabled}
                      onClick={onRollDice}
                    >
                      🎲 Roll Dice
                    </button>
                  )}

                  {gameState.turnPhase === "optional-actions" && (
                    <button
                      type="button"
                      className="board-primary-action is-primary"
                      disabled={endTurnDisabled}
                      onClick={onEndTurn}
                    >
                      ⏭ End Turn
                    </button>
                  )}
                </div>

                <div className="board-secondary-action-row">
                  {gameState.turnPhase === "roll" && currentGamePlayer.busTickets > 0 && (
                    <button
                      type="button"
                      className="board-primary-action is-secondary"
                      disabled={busTicketDisabled}
                      onClick={onStartBusTicket}
                    >
                      🚌 Bus Ticket ×{currentGamePlayer.busTickets}
                    </button>
                  )}

                  {canManageFromBoard && (
                    <button
                      type="button"
                      className="board-primary-action is-secondary"
                      onClick={() => onOpenActionPanel("properties")}
                    >
                      🏠 Properties
                    </button>
                  )}

                  {canTradeFromBoard && (
                    <button
                      type="button"
                      className="board-primary-action is-secondary"
                      onClick={() => onOpenActionPanel("trade")}
                    >
                      🤝 Trade
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="centre-roll-readout" style={{ color: theme.mutedText }}>
              {gameState.lastDiceRoll ? (
                <>
                  <div
                    className="dice-tray"
                    key={`${gameState.rollSequence ?? 0}-${gameState.lastDiceRoll.white1}-${gameState.lastDiceRoll.white2}-${gameState.lastDiceRoll.speed ?? "none"}`}
                    aria-label="Last dice roll"
                  >
                    <DieFace value={gameState.lastDiceRoll.white1} />
                    <DieFace value={gameState.lastDiceRoll.white2} />
                    {gameState.lastDiceRoll.speed !== null && (
                      <DieFace value={gameState.lastDiceRoll.speed} speed />
                    )}
                  </div>
                  <span>
                    Last roll
                    {typeof gameState.lastDiceRoll.speed === "number" &&
                    gameState.lastDiceRoll.white1 === gameState.lastDiceRoll.white2 &&
                    gameState.lastDiceRoll.white1 === gameState.lastDiceRoll.speed
                      ? " • Triples!"
                      : gameState.lastDiceRoll.white1 === gameState.lastDiceRoll.white2
                        ? " • Doubles!"
                        : ""}
                  </span>
                </>
              ) : (
                <span>Waiting for the first roll</span>
              )}
            </div>
          </div>
        </div>

        {!showDiceOverlay && !isTokenTravelling && (
          gameState.pendingMegaAction ||
          (gameState.pendingSpeedDieAction &&
            gameState.pendingSpeedDieAction.type !== "mr-monopoly") ||
          (activeGamePlayer?.inJail && gameState.turnPhase === "jail-decision") ||
          gameState.pendingAuction ||
          (gameState.pendingCard?.playerId === playerId) ||
          pendingPurchase
        ) && (
          <div className="board-decision-layer" aria-live="polite">
            <div className="board-decision-card-shell">
            {!showDiceOverlay && gameState.pendingMegaAction &&
              gameState.turnPhase ===
                "mega-choice" && (
                <MegaActionPanel
                  action={gameState.pendingMegaAction}
                  gameState={gameState}
                  playerId={playerId}
                  isResolving={isResolvingMega}
                  theme={theme}
                  onBusMove={onBusTicketMove}
                  onBusCancel={onBusTicketCancel}
                  onBirthdayCash={onBirthdayCash}
                  onBirthdayTicket={onBirthdayTicket}
                  onAuctionSelect={onAuctionSpaceSelect}
                />
              )}

            {!showDiceOverlay && gameState.pendingSpeedDieAction &&
              gameState.turnPhase ===
                "speed-die-choice" &&
              gameState.pendingSpeedDieAction.type !== "mr-monopoly" &&
              activeGamePlayer && (
                <SpeedDiePanel
                  action={
                    gameState.pendingSpeedDieAction
                  }
                  playerName={
                    activeGamePlayer.name
                  }
                  isMine={isMyTurn}
                  isResolving={
                    isResolvingSpeedDie
                  }
                  currentPosition={
                    activeGamePlayer.position
                  }
                  theme={theme}
                  onTripleMove={
                    onSpeedDieTripleMove
                  }
                  onBusMove={onSpeedDieBusMove}
                  onMrMonopoly={
                    onSpeedDieMrMonopoly
                  }
                />
              )}

            {!showDiceOverlay && activeGamePlayer?.inJail &&
              gameState.turnPhase ===
                "jail-decision" && (
                <JailPanel
                  player={activeGamePlayer}
                  isMine={isMyTurn}
                  isResolving={
                    isResolvingJail
                  }
                  canSeePrivateInfo={isSpectator}
                  theme={theme}
                  onRoll={onJailRoll}
                  onPayFine={
                    onJailPayFine
                  }
                  onUseCard={
                    onJailUseCard
                  }
                />
              )}

            {!showDiceOverlay && gameState.pendingAuction && (
              <AuctionPanel
                playerId={playerId}
                gameState={gameState}
                isResolving={isResolvingAuction}
                isSpectator={isSpectator}
                theme={theme}
                onBid={onAuctionBid}
                onWithdraw={onAuctionWithdraw}
              />
            )}

            {!showDiceOverlay && gameState.pendingCard?.playerId === playerId && (
              <CardPanel
                playerId={playerId}
                gameState={gameState}
                isResolvingCard={isResolvingCard}
                theme={theme}
                onContinue={onCardContinue}
              />
            )}

            {!showDiceOverlay && pendingPurchase && pendingPurchaseSpace && (
              <PurchasePanel
                space={pendingPurchaseSpace}
                isMine={isMyPendingPurchase}
                canAfford={canAffordPendingPurchase}
                isResolving={isResolvingPurchase}
                theme={theme}
                onBuy={onPurchase}
                onPass={onDeclinePurchase}
              />
            )}

            </div>
          </div>
        )}
      </div>
      {transientCardDraw && !gameState.pendingCard && (
        <CardEventPopup
          draw={transientCardDraw}
          playerName={gameState.players.find((player) => player.id === transientCardDraw.playerId)?.name ?? "A player"}
        />
      )}
      {visibleCashDelta && (
        <div
          key={visibleCashDelta.id}
          className={`cash-delta-popup ${visibleCashDelta.amount > 0 ? "is-positive" : "is-negative"}`}
          role="status"
          aria-live="polite"
        >
          <span>
            {visibleCashDelta.amount > 0 ? "+" : "−"}£{Math.abs(visibleCashDelta.amount).toLocaleString()}
            <small> · Balance £{visibleCashDelta.balance.toLocaleString()}</small>
          </span>
        </div>
      )}
      {liveMovementNotice && !visibleGlobalNotice && (
        <div
          key={liveMovementNotice.id}
          className="global-game-notice is-movement is-live-movement is-single-line"
          role="status"
          aria-live="polite"
          aria-label={`${liveMovementNotice.title}: ${liveMovementNotice.message}`}
        >
          <span>{liveMovementNotice.message}</span>
        </div>
      )}
      {visibleGlobalNotice &&
      (visibleGlobalNotice.kind === "bus-ticket-gained" || visibleGlobalNotice.kind === "bus-ticket-expiry") &&
      visibleGlobalNotice.playerId === playerId ? (
        <BusTicketEventPopup notice={visibleGlobalNotice} onDismiss={() => setVisibleGlobalNotice(null)} />
      ) : visibleGlobalNotice && visibleGlobalNotice.presentation === "major" &&
          (visibleGlobalNotice.kind === "bankruptcy" || visibleGlobalNotice.kind === "winner") ? (
        <div
          key={visibleGlobalNotice.id}
          className={`game-announcement-layer is-${visibleGlobalNotice.kind}`}
          role="status"
          aria-live="assertive"
        >
          <article className="game-announcement-card">
            <p>Game announcement</p>
            <strong>{visibleGlobalNotice.title}</strong>
            <span>
              {visibleGlobalNotice.steps?.[announcementStepIndex] ?? visibleGlobalNotice.message}
            </span>
            {(visibleGlobalNotice.steps?.length ?? 0) > 1 && (
              <div className="game-announcement-progress" aria-hidden="true">
                {visibleGlobalNotice.steps!.map((_, index) => (
                  <i key={index} className={index <= announcementStepIndex ? "is-active" : ""} />
                ))}
              </div>
            )}
          </article>
        </div>
      ) : visibleGlobalNotice ? (
        <div
          key={visibleGlobalNotice.id}
          className={`global-game-notice is-${visibleGlobalNotice.kind} is-single-line`}
          role="status"
          aria-live="assertive"
          aria-label={`${visibleGlobalNotice.title}: ${visibleGlobalNotice.message}`}
        >
          <span>{visibleGlobalNotice.message}</span>
        </div>
      ) : null}
      {showDiceOverlay &&
        animatedRoll && (
          <DiceRollOverlay
            roll={animatedRoll}
            settleMs={
              gameState.players.find((player) => player.id === rollingPlayerId)?.isAi ||
              gameState.players.find((player) => player.id === rollingPlayerId)?.autopilotEnabled
                ? 850
                : 1350
            }
            onSettled={() => {
              if (diceTimer.current) {
                window.clearTimeout(diceTimer.current);
              }
              diceTimer.current = window.setTimeout(() => {
                setShowDiceOverlay(false);
                const movement = pendingRollMovement.current;
                pendingRollMovement.current = null;
                if (movement) {
                  animateTokenMovement(movement);
                }
              }, 220);
            }}
          />
        )}
      {selectedDeedSpace && isOwnableBoardSpace(selectedDeedSpace) && (
        <PropertyDeedModal
          space={selectedDeedSpace}
          gameState={gameState}
          theme={theme}
          onClose={() => setSelectedDeedSpaceId(null)}
        />
      )}
      {selectedInfoSpace && selectedInfo && !freeParkingInfoOpen && (
        <div className="board-space-info-layer" onMouseDown={() => setSelectedInfoSpaceId(null)}>
          <section className="board-space-info-card" role="dialog" aria-modal="true" aria-label={`${selectedInfo.title} information`} onMouseDown={(event) => event.stopPropagation()} style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text }}>
            <button type="button" className="modal-close-button" onClick={() => setSelectedInfoSpaceId(null)}>×</button>
            <span className="board-space-info-icon">{selectedInfo.icon}</span>
            <p className="modal-eyebrow">Board space</p>
            <h2>{selectedInfo.title}</h2>
            <p>{selectedInfo.description}</p>
            {selectedInfo.detail && <small>{selectedInfo.detail}</small>}
          </section>
        </div>
      )}
      {freeParkingInfoOpen && (
        <div className="free-parking-info-layer" onMouseDown={() => setFreeParkingInfoOpen(false)}>
          <section
            className="free-parking-info-card"
            role="dialog"
            aria-modal="true"
            aria-label="Free Parking information"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text }}
          >
            <button type="button" className="modal-close-button" onClick={() => setFreeParkingInfoOpen(false)}>×</button>
            <span className="free-parking-info-icon">🚗</span>
            <p className="modal-eyebrow">Free Parking</p>
            <h2>
              {gameState.freeParkingJackpotEnabled
                ? `£${gameState.freeParkingPot.toLocaleString()}`
                : "Official rules"}
            </h2>
            <p style={{ color: theme.mutedText }}>
              {gameState.freeParkingJackpotEnabled
                ? "Eligible Bank penalties and taxes feed this jackpot. The next player to land on Free Parking collects the full pot."
                : "The Free Parking jackpot house rule is off, so landing here does not award a cash pot."}
            </p>
          </section>
        </div>
      )}
    </section>
  );
}
