import { CORE_THEME_IDS } from "../../shared/platform/themeProgression";
import { committedTheme, commitTheme } from "./platform/themePreview";
import { type HgrLogoPreset } from "../../shared/platform/brand";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type {
  AiDifficulty,
  GameState,
  LiveTradePreview,
} from "../../shared/games/mega-board/game-state";
import { type RankedLeaderboardEntry, type RankedMatchSummary } from "../../shared/games/mega-board/ranked";
import { socket } from "./platform/network/sockets";
import { fullscreenUnavailableMessage, stableFullscreenAvailable } from "./platform/fullscreen";
import { HomeScreen } from "./platform/components/HomeScreen";
import { AccountPortal } from "./platform/accounts/AccountPortal";
import { AccountPanel } from "./platform/accounts/AccountPanel";
import { accountApi } from "./platform/accounts/api";
import type { HalieusAccountSummary, HalieusAuthStatus } from "../../shared/platform/accounts";
import { PokerScreen } from "./games/poker/PokerScreen";
import { BlackjackRebuildScreen as BlackjackScreen } from "./games/blackjack/BlackjackRebuildScreen";
import { WhotRebuildScreen as WhotScreen } from "./games/whot/WhotRebuildScreen";
import { LudoScreen } from "./games/ludo/LudoScreen";
import { ConnectFourScreen } from "./games/connect-four/ConnectFourScreen";
import { AyoScreen } from "./games/ayo/AyoScreen";
import { WordBoardScreen } from "./games/word-board/WordBoardScreen";
import { HiddenDictatorScreen } from "./games/hidden-dictator/HiddenDictatorScreen";
import { WordArenaScreen } from "./games/word-arena/WordArenaScreen";
import { ClassicTableScreen } from "./games/classic-table/ClassicTableScreen";
import type { BlackjackAction, BlackjackAiDifficulty, BlackjackMatchMode, BlackjackPublicState } from "../../shared/games/blackjack/types";
import type { WhotAiDifficulty, WhotMatchMode, WhotPublicState, WhotShape } from "../../shared/games/whot/types";
import type { LudoAiDifficulty, LudoMatchMode, LudoPublicState } from "../../shared/games/ludo/types";
import type { ConnectFourAiDifficulty, ConnectFourBestOf, ConnectFourMatchMode, ConnectFourPublicState } from "../../shared/games/connect-four/types";
import type { AyoAiDifficulty, AyoMatchMode, AyoPublicState } from "../../shared/games/ayo/types";
import type { WordBoardAiDifficulty, WordBoardPlacement, WordBoardPublicState } from "../../shared/games/word-board/types";
import type { HiddenDictatorAiDifficulty, HiddenDictatorMatchMode, HiddenDictatorPublicState } from "../../shared/games/hidden-dictator/types";
import type { WordArenaCreateOptions, WordArenaGameId, WordArenaPublicState } from "../../shared/games/word-arena/types";
import type { ClassicAiDifficulty, ClassicCreateOptions, ClassicGameId, ClassicMatchMode, ClassicPublicState } from "../../shared/games/classic-table/types";
import type { PokerPublicState, PokerSession } from "./games/poker/types";
import { InviteJoinScreen } from "./games/mega-board/components/InviteJoinScreen";
import { GameMenu } from "./games/mega-board/components/GameMenu";
import { LobbyScreen } from "./games/mega-board/components/LobbyScreen";
import { TurnOrderScreen } from "./games/mega-board/components/TurnOrderScreen";
import { ThemeButton } from "./platform/components/ThemeButton";
import { GameChrome } from "./platform/components/GameChrome";
import { GameBrandIcon } from "./platform/components/GameBrandIcon";
import { HalieusIntro } from "./platform/components/HalieusIntro";
import { GAME_BY_ID, type GameId } from "./platform/games/catalog";
import { ConfirmDialog } from "./platform/components/ConfirmDialog";
import { AutopilotControl } from "./platform/components/AutopilotControl";
import { RoomChatPanel } from "./platform/components/RoomChatPanel";
import { useGameSound } from "./games/mega-board/hooks/useGameSound";
import { GameBoard } from "./games/mega-board/components/GameBoard";
import { GameSidebar } from "./games/mega-board/components/GameSidebar";
import { LiveTradeOverlay } from "./games/mega-board/components/LiveTradeOverlay";
import { PlayerRail } from "./games/mega-board/components/PlayerRail";
import { PlayerDetailsModal } from "./games/mega-board/components/PlayerDetailsModal";
import { AvailablePropertiesModal } from "./games/mega-board/components/AvailablePropertiesModal";
import { WinnerScreen } from "./games/mega-board/components/WinnerScreen";
import { LeaderboardModal } from "./games/mega-board/components/LeaderboardModal";
import { PokerLeaderboardModal } from "./games/poker/components/PokerLeaderboardModal";
import { downloadGameReport } from "./games/mega-board/utils/gameReport";
import { styles } from "./games/mega-board/styles/gameStyles";
import { clearCustomThemeVariables, customThemeVariables, readableInk, isDarkColour, readCustomTheme, readDensity, readLogoPreset, readTextScale, readThemeMode, readThemeProfileId, resolveThemeMode, themeProfileVariables, THEME_PROFILES, type HalieusCustomTheme, type HalieusDensity, type HalieusTextScale, type HalieusThemeMode, type HalieusThemeProfileId, THEME_KEY } from "./platform/theme";
import { saveSkinPreferences, clearBetaSkinPreview, readEffectiveSkinPreferences, type HalieusSkinPreferences } from "./platform/skins";
import { emptyTradeDraft, tradeTransferKey, type TradeDraft } from "./games/mega-board/types/trade";
import type {
  DiceResponse,
  GameResponse,
  GameRoom,
  GameStateResponse,
  LobbyState,
  RoomPreview,
  RoomPreviewResponse,
} from "./games/mega-board/types/lobby";


interface SavedSession {
  code: string;
  reconnectToken: string;
  playerName: string;
}

interface PokerResponse {
  ok: boolean;
  reason?: string;
  code?: string;
  playerId?: string;
  reconnectToken?: string;
  state?: PokerPublicState;
}

interface BlackjackResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: BlackjackPublicState; }
interface WhotResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: WhotPublicState; }
interface LudoResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: LudoPublicState; }
interface ConnectFourResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: ConnectFourPublicState; }
interface AyoResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: AyoPublicState; }
interface WordBoardResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: WordBoardPublicState; }
interface HiddenDictatorResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: HiddenDictatorPublicState; }
interface WordArenaResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: WordArenaPublicState; }
interface ClassicResponse { ok: boolean; reason?: string; code?: string; playerId?: string; reconnectToken?: string; state?: ClassicPublicState; }

const SESSION_KEY =
  "mega-board-session-v1";
const LEGACY_SESSION_KEY = "mega-monopoly-session-v1";
const POKER_SESSION_KEY = "halieus-poker-session-v1";
const BLACKJACK_SESSION_KEY = "halieus-blackjack-session-v1";
const WHOT_SESSION_KEY = "halieus-whot-session-v1";
const LUDO_SESSION_KEY = "halieus-ludo-session-v1";
const CONNECT_FOUR_SESSION_KEY = "halieus-connect-four-session-v1";
const AYO_SESSION_KEY = "halieus-ayo-session-v1";
const WORD_BOARD_SESSION_KEY = "halieus-word-board-session-v1";
const HIDDEN_DICTATOR_SESSION_KEY = "halieus-hidden-dictator-session-v1";
const WORD_ARENA_GAMES: WordArenaGameId[] = ["word-game", "password", "anagrams-race"];
const WORD_ARENA_SESSION_KEYS: Record<WordArenaGameId, string> = { "word-game": "halieus-word-game-session-v1", password: "halieus-password-session-v1", "anagrams-race": "halieus-anagrams-race-session-v1" };
const CLASSIC_GAMES: ClassicGameId[] = ["cheat", "dominoes"];
const CLASSIC_SESSION_KEYS: Record<ClassicGameId, string> = { cheat: "halieus-cheat-session-v1", dominoes: "halieus-dominoes-session-v1" };
const SOUND_KEY =
  "mega-board-sound";
const INTRO_SESSION_KEY = "halieus-intro-seen-v4";

function readSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(
      raw,
    ) as SavedSession;
    return parsed.code &&
      parsed.reconnectToken
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function saveSession(
  session: SavedSession,
): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

function readPokerSavedSession(): PokerSession | null {
  try {
    const raw = localStorage.getItem(POKER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PokerSession;
    return parsed.code && parsed.reconnectToken ? parsed : null;
  } catch {
    return null;
  }
}

function savePokerSession(session: PokerSession): void {
  localStorage.setItem(POKER_SESSION_KEY, JSON.stringify(session));
}

function clearPokerSession(): void {
  localStorage.removeItem(POKER_SESSION_KEY);
}

function readCardSavedSession(key: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    return parsed.code && parsed.reconnectToken ? parsed : null;
  } catch { return null; }
}
function saveCardSession(key: string, session: SavedSession): void { localStorage.setItem(key, JSON.stringify(session)); }
function clearCardSession(key: string): void { localStorage.removeItem(key); }


function readInviteCodeFromPath():
  | string
  | null {
  const match =
    window.location.pathname.match(
      /^\/join\/([A-Z0-9]{4,12})\/?$/i,
    );

  return match?.[1]
    ?.trim()
    .toUpperCase() ?? null;
}

function readGameCodeFromPath(): string | null {
  const match = window.location.pathname.match(/^\/game\/([A-Z0-9]{4,12})\/?$/i);
  return match?.[1]?.trim().toUpperCase() ?? null;
}

function readMegaSpectatorCodeFromPath(): string | null {
  const match = window.location.pathname.match(/^\/spectate\/mega\/([A-Z0-9]{4,12})\/?$/i);
  return match?.[1]?.trim().toUpperCase() ?? null;
}

function readPokerCodeFromPath(): string | null {
  const match = window.location.pathname.match(/^\/poker\/([A-Z0-9]{4,12})\/?$/i);
  return match?.[1]?.trim().toUpperCase() ?? null;
}

function readBlackjackCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/blackjack\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readWhotCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/whot\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readLudoCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/ludo\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readConnectFourCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/connect-four\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readAyoCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/ayo\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readWordBoardCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/word-board\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readHiddenDictatorCodeFromPath(): string | null { const match = window.location.pathname.match(/^\/hidden-dictator\/([A-Z0-9]{4,12})\/?$/i); return match?.[1]?.trim().toUpperCase() ?? null; }
function readClassicRouteFromPath(): { game: ClassicGameId; code: string } | null { for (const game of CLASSIC_GAMES) { const match = window.location.pathname.match(new RegExp(`^/${game}/([A-Z0-9]{4,12})/?$`, "i")); if (match?.[1]) return { game, code: match[1].trim().toUpperCase() }; } return null; }
function readWordArenaRouteFromPath(): { game: WordArenaGameId; code: string } | null {
  for (const game of WORD_ARENA_GAMES) { const match = window.location.pathname.match(new RegExp(`^/${game}/([A-Z0-9]{4,12})/?$`, "i")); if (match?.[1]) return { game, code: match[1].trim().toUpperCase() }; }
  return null;
}

function readGuestAccessRequested(): boolean {
  try { return new URLSearchParams(window.location.search).get("guest") === "1"; } catch { return false; }
}

function currentRoomReturnPath(): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("guest");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return window.location.pathname; }
}


function updateBrowserPath(
  path: string,
): void {
  window.history.replaceState(
    null,
    "",
    path,
  );
}

function generateRoomCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from({ length: 6 }, () => {
    const index = Math.floor(Math.random() * characters.length);
    return characters[index];
  }).join("");
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function App() {
  const directGuestRoute = Boolean(
    readInviteCodeFromPath() ||
    readMegaSpectatorCodeFromPath() ||
    readPokerCodeFromPath() ||
    readLudoCodeFromPath() ||
    readHiddenDictatorCodeFromPath() ||
    readConnectFourCodeFromPath() ||
    readAyoCodeFromPath() ||
    readWordBoardCodeFromPath() ||
    readWordArenaRouteFromPath() ||
    readClassicRouteFromPath() ||
    readBlackjackCodeFromPath() ||
    readWhotCodeFromPath() ||
    readGameCodeFromPath()
  );
  const guestAccessRequested = directGuestRoute && readGuestAccessRequested();

  const [selectedGame, setSelectedGame] = useState<GameId>(() => readPokerCodeFromPath() ? "poker" : readBlackjackCodeFromPath() ? "blackjack" : readWhotCodeFromPath() ? "whot" : readLudoCodeFromPath() ? "ludo" : readHiddenDictatorCodeFromPath() ? "hidden-dictator" : readConnectFourCodeFromPath() ? "connect-four" : readAyoCodeFromPath() ? "ayo" : readWordBoardCodeFromPath() ? "word-board" : readClassicRouteFromPath()?.game ?? readWordArenaRouteFromPath()?.game ?? "mega-board");
  const [pokerState, setPokerState] = useState<PokerPublicState | null>(null);
  const [pokerSavedSession, setPokerSavedSession] = useState<PokerSession | null>(() => readPokerSavedSession());
  const [pokerRecoveryCode, setPokerRecoveryCode] = useState(() => readPokerSavedSession()?.reconnectToken ?? "");
  const [blackjackState, setBlackjackState] = useState<BlackjackPublicState | null>(null);
  const [whotState, setWhotState] = useState<WhotPublicState | null>(null);
  const [ludoState, setLudoState] = useState<LudoPublicState | null>(null);
  const [connectFourState, setConnectFourState] = useState<ConnectFourPublicState | null>(null);
  const [ayoState, setAyoState] = useState<AyoPublicState | null>(null);
  const [wordBoardState, setWordBoardState] = useState<WordBoardPublicState | null>(null);
  const [hiddenDictatorState, setHiddenDictatorState] = useState<HiddenDictatorPublicState | null>(null);
  const [wordArenaState, setWordArenaState] = useState<WordArenaPublicState | null>(null);
  const [classicState, setClassicState] = useState<ClassicPublicState | null>(null);
  const [blackjackSavedSession, setBlackjackSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(BLACKJACK_SESSION_KEY));
  const [whotSavedSession, setWhotSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(WHOT_SESSION_KEY));
  const [ludoSavedSession, setLudoSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(LUDO_SESSION_KEY));
  const [connectFourSavedSession, setConnectFourSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(CONNECT_FOUR_SESSION_KEY));
  const [ayoSavedSession, setAyoSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(AYO_SESSION_KEY));
  const [wordBoardSavedSession, setWordBoardSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(WORD_BOARD_SESSION_KEY));
  const [hiddenDictatorSavedSession, setHiddenDictatorSavedSession] = useState<SavedSession | null>(() => readCardSavedSession(HIDDEN_DICTATOR_SESSION_KEY));
  const [wordArenaSavedSessions, setWordArenaSavedSessions] = useState<Record<WordArenaGameId, SavedSession | null>>(() => ({ "word-game": readCardSavedSession(WORD_ARENA_SESSION_KEYS["word-game"]), password: readCardSavedSession(WORD_ARENA_SESSION_KEYS.password), "anagrams-race": readCardSavedSession(WORD_ARENA_SESSION_KEYS["anagrams-race"]) }));
  const [classicSavedSessions, setClassicSavedSessions] = useState<Record<ClassicGameId, SavedSession | null>>(() => ({ cheat: readCardSavedSession(CLASSIC_SESSION_KEYS.cheat), dominoes: readCardSavedSession(CLASSIC_SESSION_KEYS.dominoes) }));
  const [blackjackRecoveryCode, setBlackjackRecoveryCode] = useState(() => readCardSavedSession(BLACKJACK_SESSION_KEY)?.reconnectToken ?? "");
  const [whotRecoveryCode, setWhotRecoveryCode] = useState(() => readCardSavedSession(WHOT_SESSION_KEY)?.reconnectToken ?? "");
  const [ludoRecoveryCode, setLudoRecoveryCode] = useState(() => readCardSavedSession(LUDO_SESSION_KEY)?.reconnectToken ?? "");
  const [connectFourRecoveryCode, setConnectFourRecoveryCode] = useState(() => readCardSavedSession(CONNECT_FOUR_SESSION_KEY)?.reconnectToken ?? "");
  const [ayoRecoveryCode, setAyoRecoveryCode] = useState(() => readCardSavedSession(AYO_SESSION_KEY)?.reconnectToken ?? "");
  const [wordBoardRecoveryCode, setWordBoardRecoveryCode] = useState(() => readCardSavedSession(WORD_BOARD_SESSION_KEY)?.reconnectToken ?? "");
  const [hiddenDictatorRecoveryCode, setHiddenDictatorRecoveryCode] = useState(() => readCardSavedSession(HIDDEN_DICTATOR_SESSION_KEY)?.reconnectToken ?? "");
  const [wordArenaRecoveryCodes, setWordArenaRecoveryCodes] = useState<Record<WordArenaGameId, string>>(() => ({ "word-game": readCardSavedSession(WORD_ARENA_SESSION_KEYS["word-game"])?.reconnectToken ?? "", password: readCardSavedSession(WORD_ARENA_SESSION_KEYS.password)?.reconnectToken ?? "", "anagrams-race": readCardSavedSession(WORD_ARENA_SESSION_KEYS["anagrams-race"])?.reconnectToken ?? "" }));
  const [classicRecoveryCodes, setClassicRecoveryCodes] = useState<Record<ClassicGameId, string>>(() => ({ cheat: readCardSavedSession(CLASSIC_SESSION_KEYS.cheat)?.reconnectToken ?? "", dominoes: readCardSavedSession(CLASSIC_SESSION_KEYS.dominoes)?.reconnectToken ?? "" }));
  const [classicMatchModes, setClassicMatchModes] = useState<Record<ClassicGameId, ClassicMatchMode>>({ cheat: "casual", dominoes: "casual" });
  const [authStatus, setAuthStatus] = useState<HalieusAuthStatus | null>(null);
  const [siteIntroSeen, setSiteIntroSeen] = useState(() => {
    try { return directGuestRoute || sessionStorage.getItem(INTRO_SESSION_KEY) === "1"; }
    catch { return directGuestRoute; }
  });
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [betaMode, setBetaMode] = useState(() => sessionStorage.getItem("halieus-beta-test-mode") === "1");
  const [bankruptcyConfirmOpen, setBankruptcyConfirmOpen] = useState(false);
  const [authLoadError, setAuthLoadError] = useState("");
  const [pokerMatchMode, setPokerMatchMode] = useState<"casual" | "ranked">("casual");
  const [pokerVariant, setPokerVariant] = useState<"texas-holdem" | "omaha" | "five-card-draw" | "seven-card-stud">("texas-holdem");
  const [whotMatchMode, setWhotMatchMode] = useState<WhotMatchMode>("casual");
  const [ludoMatchMode, setLudoMatchMode] = useState<LudoMatchMode>("casual");
  const [blackjackMatchMode, setBlackjackMatchMode] = useState<BlackjackMatchMode>("casual");
  const [connectFourMatchMode, setConnectFourMatchMode] = useState<ConnectFourMatchMode>("casual");
  const [ayoMatchMode, setAyoMatchMode] = useState<AyoMatchMode>("casual");
  const [connectFourBestOf, setConnectFourBestOf] = useState<ConnectFourBestOf>(3);
  const [hiddenDictatorMatchMode, setHiddenDictatorMatchMode] = useState<HiddenDictatorMatchMode>("casual");
  const [isUpdatingPokerAutopilot, setIsUpdatingPokerAutopilot] = useState(false);
  const [pokerStartingChips, setPokerStartingChips] = useState(5000);
  const [pokerSmallBlind, setPokerSmallBlind] = useState(25);
  const [pokerBigBlind, setPokerBigBlind] = useState(50);
  const [inviteCode, setInviteCode] =
    useState<string | null>(() =>
      readInviteCodeFromPath(),
    );
  const [invitePreview, setInvitePreview] =
    useState<RoomPreview | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] =
    useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [savedSession, setSavedSession] =
    useState<SavedSession | null>(() =>
      readSavedSession(),
    );
  const [playerName, setPlayerName] = useState(
    () => readSavedSession()?.playerName ?? "",
  );
  const [roomCode, setRoomCode] = useState(
    () => readMegaSpectatorCodeFromPath() ?? readInviteCodeFromPath() ?? readPokerCodeFromPath() ?? readLudoCodeFromPath() ?? readHiddenDictatorCodeFromPath() ?? readConnectFourCodeFromPath() ?? readAyoCodeFromPath() ?? readWordBoardCodeFromPath() ?? readWordArenaRouteFromPath()?.code ?? generateRoomCode(),
  );
  const [recoveryCode, setRecoveryCode] =
    useState(
      () => readSavedSession()?.reconnectToken ?? "",
    );
  const [isRecovering, setIsRecovering] =
    useState(false);
  const [gameMenuOpen, setGameMenuOpen] =
    useState(false);
  const [availablePropertiesOpen, setAvailablePropertiesOpen] = useState(false);
  const [playersDrawerOpen, setPlayersDrawerOpen] = useState(false);
  const [selectedPlayerDetailId, setSelectedPlayerDetailId] = useState<string | null>(null);
  const [turnActionsCloseSignal, setTurnActionsCloseSignal] = useState(0);
  const [turnActionsOpenSignal, setTurnActionsOpenSignal] = useState(0);
  const [turnActionPanel, setTurnActionPanel] = useState<"properties" | "trade" | "history" | null>(null);
  const [localClock, setLocalClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setLocalClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [ranked, setRanked] = useState(false);
  const [blitz, setBlitz] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [pokerLeaderboardOpen, setPokerLeaderboardOpen] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [leaderboardEntries, setLeaderboardEntries] = useState<RankedLeaderboardEntry[]>([]);
  const [recentRankedMatches, setRecentRankedMatches] = useState<RankedMatchSummary[]>([]);
  const [freeParkingJackpotEnabled, setFreeParkingJackpotEnabled] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectators, setSpectators] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isResolvingPurchase, setIsResolvingPurchase] = useState(false);
  const [isSubmittingRoll, setIsSubmittingRoll] = useState(false);
  const rollRequestLockedRef = useRef(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isManagingAsset, setIsManagingAsset] = useState(false);
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);
  const [isResolvingDebt, setIsResolvingDebt] = useState(false);
  const [isResolvingCard, setIsResolvingCard] = useState(false);
  const [isResolvingAuction, setIsResolvingAuction] = useState(false);
  const [isResolvingJail, setIsResolvingJail] = useState(false);
  const [isResolvingSpeedDie, setIsResolvingSpeedDie] = useState(false);
  const [isResolvingMega, setIsResolvingMega] = useState(false);
  const [isUpdatingAutopilot, setIsUpdatingAutopilot] =
    useState(false);
  const [isUpdatingTurnTimer, setIsUpdatingTurnTimer] = useState(false);
  const [tradeDraft, setTradeDraft] = useState<TradeDraft>(() => emptyTradeDraft());
  const [liveTradePreview, setLiveTradePreview] = useState<LiveTradePreview | null>(null);
  const tradeLiveRevisionRef = useRef(0);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  // A parked Mega Board remains live/recoverable while the player browses the Halieus Game Room.
  const [megaBoardParked, setMegaBoardParked] = useState(false);

  // Keep browser metadata aligned with the active game while the root portal remains branded as Halieus Game Room.
  useEffect(() => {
    let cancelled = false;
    accountApi<HalieusAuthStatus>("/auth/status")
      .then((status) => {
        if (cancelled) return;
        setAuthStatus(status);
        setAuthLoadError("");
        if (status.account && !playerName.trim()) setPlayerName(status.account.displayName);
      })
      .catch((error) => {
        if (cancelled) return;
        setAuthLoadError(error instanceof Error ? error.message : "Account service is unavailable.");
      });
    return () => { cancelled = true; };
  }, []);

  // First-paint continuity: the static Halieus curtain is delivered in the HTML
  // itself, so it exists before React, the CSS bundle, or /auth/status can finish.
  // Keep it above the app until there is intentional UI ready to reveal. This
  // prevents internet latency from exposing a technical "checking access" page.
  useEffect(() => {
    // The curtain does not leave merely because the intro component mounted.
    // It waits for authentication to resolve first, so pressing Enter can never
    // uncover an intermediate access-check state on a slower hosted connection.
    const appReady = guestAccessRequested || Boolean(authStatus) || Boolean(authLoadError);
    if (!appReady) return;

    const curtain = document.getElementById("halieus-boot-curtain");
    if (!curtain) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => curtain.classList.add("is-leaving"));
    });
    const timer = window.setTimeout(() => curtain.remove(), 520);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timer);
    };
  }, [authLoadError, authStatus, guestAccessRequested]);

  const hasRecoverableSession = Boolean(savedSession || pokerSavedSession || blackjackSavedSession || whotSavedSession || ludoSavedSession || connectFourSavedSession || ayoSavedSession || wordBoardSavedSession || hiddenDictatorSavedSession || Object.values(wordArenaSavedSessions).some(Boolean) || Object.values(classicSavedSessions).some(Boolean));

  // The branded arrival belongs to the start of a fresh signed-in Game Room
  // session. If this tab is continuing a recoverable game, treat the arrival as
  // already handled so closing/forgetting that room cannot make the intro appear
  // unexpectedly halfway through the session.
  useEffect(() => {
    if (directGuestRoute || !authStatus?.authenticated || siteIntroSeen || !hasRecoverableSession) return;
    setSiteIntroSeen(true);
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "1"); } catch { /* In-memory completion still works. */ }
  }, [authStatus?.authenticated, directGuestRoute, hasRecoverableSession, siteIntroSeen]);

  function completeSiteIntro(): void {
    setSiteIntroSeen(true);
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "1"); } catch { /* In-memory completion still works. */ }
  }

  function applyAuthenticatedAccount(account: HalieusAccountSummary): void {
    setAuthStatus((current) => ({
      ok: true,
      setupRequired: false,
      authenticated: true,
      account,
      registration: "invite-only",
      accessRequestsEnabled: current?.accessRequestsEnabled ?? true,
    }));
    if (!playerName.trim()) setPlayerName(account.displayName);
    setAuthLoadError("");
  }

  useEffect(() => {
    if (!authStatus?.authenticated) return;
    let cancelled = false;
    const pulse = () => { if (!cancelled) void accountApi("/auth/heartbeat", { method: "POST" }).catch(() => undefined); };
    pulse();
    const timer = window.setInterval(pulse, 20000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [authStatus?.authenticated, authStatus?.account?.id]);

  async function signOutAccount(): Promise<void> {
    try { await accountApi("/auth/logout", { method: "POST" }); } catch { /* local state still closes access */ }
    setAuthStatus((current) => current ? { ...current, authenticated: false, account: null, setupRequired: false } : null);
    setAccountPanelOpen(false);
    sessionStorage.removeItem("halieus-beta-test-mode");
    window.dispatchEvent(new CustomEvent<boolean>("halieus-beta-mode", { detail: false }));
    sessionStorage.removeItem(INTRO_SESSION_KEY);
    setSiteIntroSeen(false);
    setBetaMode(false);
    setPlayerName("");
    updateBrowserPath("/");
  }

  useEffect(() => {
    socket.auth = { betaMode };
    socket.emit("platform:progression-mode", { beta: betaMode });
  }, [betaMode]);
  useEffect(() => { if (authStatus?.account?.id && socket.connected) { socket.disconnect(); socket.connect(); } }, [authStatus?.account?.id]);

  function enterBetaTestMode(): void {
    const account = authStatus?.account;
    if (!account || (account.role !== "owner" && account.role !== "admin")) return;
    const testName = `[BETA] ${account.displayName}`.slice(0, 24);
    sessionStorage.setItem("halieus-beta-test-mode", "1");
    window.dispatchEvent(new CustomEvent<boolean>("halieus-beta-mode", { detail: true }));
    setBetaMode(true);
    setPlayerName(testName);
    setMessage("Beta Test Lab active. New rooms use an isolated test identity and do not count toward your account stats.");
  }

  function exitBetaTestMode(): void {
    sessionStorage.removeItem("halieus-beta-test-mode");
    window.dispatchEvent(new CustomEvent<boolean>("halieus-beta-mode", { detail: false }));
    clearBetaSkinPreview();
    setBetaMode(false);
    if (authStatus?.account) setPlayerName(authStatus.account.displayName);
    setMessage("Beta Test Lab closed. Your normal Halieus identity is restored.");
  }

  const [skinPreferences, setSkinPreferences] = useState<HalieusSkinPreferences>(() => readEffectiveSkinPreferences(false));
  const [themeMode, setThemeMode] = useState<HalieusThemeMode>(() => readThemeMode());
  const [themeProfileId, setThemeProfileId] = useState<HalieusThemeProfileId>(() => readThemeProfileId());
  const [customTheme, setCustomTheme] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [logoPreset, setLogoPreset] = useState<HgrLogoPreset>(() => readLogoPreset());
  const [textScale, setTextScale] = useState<HalieusTextScale>(() => readTextScale());
  const [density, setDensity] = useState<HalieusDensity>(() => readDensity());
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const resolvedThemeMode = resolveThemeMode(themeMode, systemPrefersDark);
  const activeThemeProfile = THEME_PROFILES.find((profile) => profile.id === themeProfileId) ?? THEME_PROFILES[0];
  const darkMode = resolvedThemeMode === "dark" || resolvedThemeMode === "blue" || resolvedThemeMode === "red" || resolvedThemeMode === "green" || (resolvedThemeMode === "profile" && isDarkColour(activeThemeProfile.theme.page)) || (resolvedThemeMode === "custom" && isDarkColour(customTheme.page));
  const [soundEnabled, setSoundEnabled] =
    useState(
      () =>
        localStorage.getItem(SOUND_KEY) !==
        "off",
    );

  useGameSound(
    gameState,
    soundEnabled,
    Boolean(!megaBoardParked && !pokerState && gameStarted),
  );

  /*
   * 4.0.2 mobile viewport contract:
   *
   * The document viewport stays device-width for every game and every phase.
   * Older Mega Board builds forced a desktop-sized layout viewport on phones,
   * shrinking turn order, menus and the live board and sometimes leaking that
   * scale into later screens. Responsive CSS now owns layout; runtime code must
   * not rewrite the browser viewport.
   */


  useEffect(() => {
    const handleSkins = (event: Event) => setSkinPreferences((event as CustomEvent<HalieusSkinPreferences>).detail);
    window.addEventListener("halieus-skins-change", handleSkins);
    return () => window.removeEventListener("halieus-skins-change", handleSkins);
  }, []);

  useEffect(() => {
    if (!betaMode) clearBetaSkinPreview();
    setSkinPreferences(readEffectiveSkinPreferences(betaMode));
  }, [betaMode]);

  useEffect(() => {
    if (betaMode) return;
    let live = true;
    const validate = (ids: string[]) => {
      const current = committedTheme();
      if (live && current.mode === "profile" && !ids.includes(current.profile)) commitTheme({ ...current, profile:"blue-circuit" });
    };
    void accountApi<{entitlements:string[]}>("/accounts/me/themes").then(r=>validate(r.entitlements)).catch(()=>validate(CORE_THEME_IDS));
    return ()=>{live=false;};
  }, [authStatus?.account?.id, betaMode]);

  useEffect(() => {
    if (!authStatus?.account?.id || betaMode) return;
    let active = true;
    void accountApi<{ preferences: HalieusSkinPreferences }>("/accounts/me/cosmetics")
      .then(result => { if (active) saveSkinPreferences(result.preferences); })
      .catch(() => { /* Keep the cached appearance during a temporary connection failure. */ });
    return () => { active = false; };
  }, [authStatus?.account?.id, betaMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.skinInterface = skinPreferences.interface;
    root.dataset.skinCards = skinPreferences.cards;
    root.dataset.skinMegaBoard = gameStarted && gameState
      ? gameState.boardStyle ?? "classic-board"
      : lobby ? lobby.boardStyle ?? "classic-board" : skinPreferences["mega-board"];
    root.dataset.skinPokerTable = skinPreferences["poker-table"];
  }, [skinPreferences, gameStarted, gameState?.roomCode, gameState?.gameStartedAt, gameState?.boardStyle, lobby?.boardStyle, lobby?.code, betaMode, authStatus?.account?.id]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemPrefersDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const handleThemeMode = (event: Event) => {
      const requested = (event as CustomEvent<HalieusThemeMode>).detail;
      if (requested === "system" || requested === "light" || requested === "dark" || requested === "blue" || requested === "red" || requested === "green" || requested === "profile" || requested === "custom") setThemeMode(requested);
    };
    const handleThemeProfile = (event: Event) => setThemeProfileId((event as CustomEvent<HalieusThemeProfileId>).detail);
    const handleCustomTheme = (event: Event) => setCustomTheme((event as CustomEvent<HalieusCustomTheme>).detail);
    const handleTextScale = (event: Event) => setTextScale((event as CustomEvent<HalieusTextScale>).detail);
    const handleDensity = (event: Event) => setDensity((event as CustomEvent<HalieusDensity>).detail);
    const handleLogoPreset = (event: Event) => setLogoPreset((event as CustomEvent<HgrLogoPreset>).detail);
    window.addEventListener("halieus-theme-mode", handleThemeMode);
    window.addEventListener("halieus-theme-profile", handleThemeProfile);
    window.addEventListener("halieus-custom-theme", handleCustomTheme);
    window.addEventListener("halieus-text-scale", handleTextScale);
    window.addEventListener("halieus-density", handleDensity);
    window.addEventListener("halieus-logo-preset", handleLogoPreset);
    return () => {
      window.removeEventListener("halieus-theme-mode", handleThemeMode);
      window.removeEventListener("halieus-theme-profile", handleThemeProfile);
      window.removeEventListener("halieus-custom-theme", handleCustomTheme);
      window.removeEventListener("halieus-text-scale", handleTextScale);
      window.removeEventListener("halieus-density", handleDensity);
      window.removeEventListener("halieus-logo-preset", handleLogoPreset);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeMode = themeMode;
    root.dataset.theme = resolvedThemeMode;
    root.dataset.themeContrast = darkMode ? "dark" : "light";
    root.dataset.themeProfile = themeProfileId;
    root.dataset.textScale = textScale;
    root.dataset.density = density;
    root.dataset.logoPreset = logoPreset;
    root.style.colorScheme = darkMode ? "dark" : "light";
    clearCustomThemeVariables(root);
    if (resolvedThemeMode === "custom") {
      for (const [key, value] of Object.entries(customThemeVariables(customTheme))) root.style.setProperty(key, value);
    } else if (resolvedThemeMode === "profile") {
      for (const [key, value] of Object.entries(themeProfileVariables(activeThemeProfile))) root.style.setProperty(key, value);
    }
    const logoTokens = getComputedStyle(root);
    root.style.setProperty("--hgr-logo-ink", readableInk([logoTokens.getPropertyValue("--hgr-logo-bg").trim() || "#daa017"]));
    root.style.setProperty("--hgr-logo-light-ink", readableInk([logoTokens.getPropertyValue("--hgr-surface").trim() || "#ffffff"]));
    root.style.backgroundColor = resolvedThemeMode === "custom"
      ? customTheme.page
      : resolvedThemeMode === "profile"
        ? activeThemeProfile.theme.page
        : resolvedThemeMode === "light"
          ? "#f4f5f7"
          : resolvedThemeMode === "blue"
            ? "#06111c"
            : resolvedThemeMode === "red"
              ? "#170d10"
              : resolvedThemeMode === "green"
                ? "#0d1712"
                : "#0f1012";
  }, [activeThemeProfile, customTheme, darkMode, density, logoPreset, resolvedThemeMode, textScale, themeMode, themeProfileId]);

  useEffect(() => {
    localStorage.setItem(
      SOUND_KEY,
      soundEnabled ? "on" : "off",
    );
  }, [soundEnabled]);

  useEffect(() => {
    const handlePopState = () => {
      const nextInviteCode =
        readInviteCodeFromPath();

      setInviteCode(
        nextInviteCode,
      );

      if (nextInviteCode) {
        setRoomCode(
          nextInviteCode,
        );
      }
    };

    window.addEventListener(
      "popstate",
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, []);

  useEffect(() => {
    if (
      !inviteCode ||
      lobby ||
      connectionStatus !== "Connected"
    ) {
      return;
    }

    let cancelled = false;

    const loadPreview = () => {
      setIsLoadingInvite(true);

      socket.emit(
        "game:preview",
        { code: inviteCode },
        (response: RoomPreviewResponse) => {
          if (cancelled) {
            return;
          }

          setIsLoadingInvite(false);

          if (
            !response.ok ||
            !response.preview
          ) {
            setInvitePreview(null);
            setMessage(
              response.reason ??
                "This invite is no longer available.",
            );
            return;
          }

          setInvitePreview(
            response.preview,
          );
          setRanked(response.preview.ranked);
          setBlitz(response.preview.blitz);
          setMessage("");
        },
      );
    };

    loadPreview();

    const interval =
      window.setInterval(
        loadPreview,
        5000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    connectionStatus,
    inviteCode,
    lobby,
  ]);

  useEffect(() => {
    function handleConnect() {
      const megaSpectatorCode = readMegaSpectatorCodeFromPath();
      if (megaSpectatorCode) {
        setSelectedGame("mega-board");
        setRoomCode(megaSpectatorCode);
        setConnectionStatus("Joining spectator view...");
        socket.emit("game:spectate", { code: megaSpectatorCode, playerName: playerName.trim() || "Spectator" }, (response: GameResponse) => {
          if (!response.ok || !response.code || !response.playerId || !response.room || !response.state) {
            setConnectionStatus("Connected");
            setMessage(response.reason ?? "Unable to spectate this Mega Board game.");
            updateBrowserPath("/");
            return;
          }
          clearSession();
          setSavedSession(null);
          setRecoveryCode("");
          setLobby({
            code: response.code,
            playerId: response.playerId,
            players: response.room.players,
      turnTimerSeconds: response.room.turnTimerSeconds,
      boardStyle: response.room.boardStyle,
            hostDisconnectDeadline: response.room.hostDisconnectDeadline,
            freeParkingJackpotEnabled: response.room.freeParkingJackpotEnabled,
            blitz: response.room.blitz,
          });
          setRanked(response.room.ranked);
          setBlitz(response.room.blitz);
          setGameState(response.state);
          setGameStarted(true);
          setIsSpectator(true);
          setMegaBoardParked(false);
          setConnectionStatus("Connected");
          setMessage("Spectator mode. Player cash is visible; controls are read-only.");
        });
        return;
      }

      const directInviteCode =
        readInviteCodeFromPath();

      if (directInviteCode) {
        setInviteCode(
          directInviteCode,
        );
        setRoomCode(
          directInviteCode,
        );
        setConnectionStatus(
          "Connected",
        );
        return;
      }

      const pokerRouteCode = readPokerCodeFromPath();
      const pokerSession = readPokerSavedSession();
      if (pokerRouteCode && pokerSession?.code === pokerRouteCode) {
        setConnectionStatus("Recovering poker table...");
        socket.emit(
          "poker:reconnect",
          { code: pokerSession.code, reconnectToken: pokerSession.reconnectToken, playerName: pokerSession.playerName },
          (response: PokerResponse) => {
            if (response.ok && response.state && response.reconnectToken) {
              setPokerState(response.state);
              setSelectedGame("poker");
              setPlayerName(pokerSession.playerName);
              setRoomCode(pokerSession.code);
              setPokerRecoveryCode(response.reconnectToken);
              setConnectionStatus("Connected");
            } else {
              setConnectionStatus("Connected");
              setMessage(response.reason ?? "The saved poker table could not be recovered.");
              updateBrowserPath("/");
            }
          },
        );
        return;
      }

      // A Poker invite URL is also a valid guest entry route. If this browser
      // has no matching saved seat, open Poker setup with the invited room code
      // preloaded so the guest only needs to enter their name and join.
      if (pokerRouteCode) {
        setSelectedGame("poker");
        setRoomCode(pokerRouteCode);
        setConnectionStatus("Connected");
        setMessage("Poker invite ready. Enter your name and join the waiting room.");
        return;
      }

      const blackjackRouteCode = readBlackjackCodeFromPath();
      if (blackjackRouteCode) {
        const savedBlackjackSeat = readCardSavedSession(BLACKJACK_SESSION_KEY);
        if (savedBlackjackSeat?.code === blackjackRouteCode) {
          setConnectionStatus("Recovering Blackjack table...");
          socket.emit("blackjack:reconnect", savedBlackjackSeat, (response: BlackjackResponse) => { setConnectionStatus("Connected"); if (!applyBlackjackResponse(response, savedBlackjackSeat.playerName)) { setMessage(response.reason ?? "Saved Blackjack seat could not be recovered."); updateBrowserPath("/"); } });
        } else { setSelectedGame("blackjack"); setRoomCode(blackjackRouteCode); setConnectionStatus("Connected"); setMessage("Blackjack invite ready. Sign in or join this table."); }
        return;
      }
      const whotRouteCode = readWhotCodeFromPath();
      if (whotRouteCode) {
        const savedWhotSeat = readCardSavedSession(WHOT_SESSION_KEY);
        if (savedWhotSeat?.code === whotRouteCode) {
          setConnectionStatus("Recovering WHOT room...");
          socket.emit("whot:reconnect", savedWhotSeat, (response: WhotResponse) => { setConnectionStatus("Connected"); if (!applyWhotResponse(response, savedWhotSeat.playerName)) { setMessage(response.reason ?? "Saved WHOT seat could not be recovered."); updateBrowserPath("/"); } });
        } else { setSelectedGame("whot"); setRoomCode(whotRouteCode); setConnectionStatus("Connected"); setMessage("WHOT invite ready. Sign in or join this room."); }
        return;
      }
      const ludoRouteCode = readLudoCodeFromPath();
      if (ludoRouteCode) {
        const savedLudoSeat = readCardSavedSession(LUDO_SESSION_KEY);
        if (savedLudoSeat?.code === ludoRouteCode) {
          setConnectionStatus("Recovering Ludo room...");
          socket.emit("ludo:reconnect", savedLudoSeat, (response: LudoResponse) => { setConnectionStatus("Connected"); if (!applyLudoResponse(response, savedLudoSeat.playerName)) { setMessage(response.reason ?? "Saved Ludo seat could not be recovered."); updateBrowserPath("/"); } });
        } else { setSelectedGame("ludo"); setRoomCode(ludoRouteCode); setConnectionStatus("Connected"); setMessage("Ludo invite ready. Enter your name and join the room."); }
        return;
      }
      const connectFourRouteCode = readConnectFourCodeFromPath();
      const connectFourSession = readCardSavedSession(CONNECT_FOUR_SESSION_KEY);
      if (connectFourRouteCode && connectFourSession?.code === connectFourRouteCode) {
        setConnectionStatus("Recovering Connect Four room...");
        socket.emit("connect-four:reconnect", connectFourSession, (response: ConnectFourResponse) => {
          setConnectionStatus("Connected");
          if (!applyConnectFourResponse(response, connectFourSession.playerName)) { setMessage(response.reason ?? "Saved Connect Four seat could not be recovered."); updateBrowserPath("/"); }
        });
        return;
      }
      if (connectFourRouteCode) { setSelectedGame("connect-four"); setRoomCode(connectFourRouteCode); setConnectionStatus("Connected"); setMessage("Connect Four invite ready. Sign in or join this room."); return; }
      const ayoRouteCode = readAyoCodeFromPath();
      const ayoSession = readCardSavedSession(AYO_SESSION_KEY);
      if (ayoRouteCode && ayoSession?.code === ayoRouteCode) {
        setConnectionStatus("Recovering Ayo board...");
        socket.emit("ayo:reconnect", ayoSession, (response: AyoResponse) => { setConnectionStatus("Connected"); if (!applyAyoResponse(response, ayoSession.playerName)) { setMessage(response.reason ?? "Saved Ayo seat could not be recovered."); updateBrowserPath("/"); } });
        return;
      }
      if (ayoRouteCode) { setSelectedGame("ayo"); setRoomCode(ayoRouteCode); setConnectionStatus("Connected"); setMessage("Ayo invite ready. Sign in or join this board."); return; }
      const wordBoardRouteCode = readWordBoardCodeFromPath();
      const wordBoardSession = readCardSavedSession(WORD_BOARD_SESSION_KEY);
      if (wordBoardRouteCode && wordBoardSession?.code === wordBoardRouteCode) {
        setConnectionStatus("Recovering Word Board table...");
        socket.emit("word-board:reconnect", wordBoardSession, (response: WordBoardResponse) => { setConnectionStatus("Connected"); if (!applyWordBoardResponse(response, wordBoardSession.playerName)) { setMessage(response.reason ?? "Saved Word Board seat could not be recovered."); updateBrowserPath("/"); } });
        return;
      }
      if (wordBoardRouteCode) { setSelectedGame("word-board"); setRoomCode(wordBoardRouteCode); setConnectionStatus("Connected"); setMessage("Word Board invite ready. Sign in or join this table."); return; }
      const hiddenDictatorRouteCode = readHiddenDictatorCodeFromPath();
      const hiddenDictatorSession = readCardSavedSession(HIDDEN_DICTATOR_SESSION_KEY);
      if (hiddenDictatorRouteCode && hiddenDictatorSession?.code === hiddenDictatorRouteCode) {
        setConnectionStatus("Recovering Hidden Dictator room...");
        socket.emit("hidden-dictator:reconnect", hiddenDictatorSession, (response: HiddenDictatorResponse) => {
          setConnectionStatus("Connected");
          if (!applyHiddenDictatorResponse(response, hiddenDictatorSession.playerName)) { setMessage(response.reason ?? "Saved Hidden Dictator seat could not be recovered."); updateBrowserPath("/"); }
        });
        return;
      }
      if (hiddenDictatorRouteCode) { setSelectedGame("hidden-dictator"); setRoomCode(hiddenDictatorRouteCode); setConnectionStatus("Connected"); setMessage("Hidden Dictator invite ready. Sign in or join this room."); return; }
      const classicRoute = readClassicRouteFromPath();
      if (classicRoute) {
        const savedClassicSeat = readCardSavedSession(CLASSIC_SESSION_KEYS[classicRoute.game]);
        if (savedClassicSeat?.code === classicRoute.code) {
          setConnectionStatus(`Recovering ${GAME_BY_ID[classicRoute.game].name} room...`);
          socket.emit(`${classicRoute.game}:reconnect`, savedClassicSeat, (response: ClassicResponse) => { setConnectionStatus("Connected"); if (!applyClassicResponse(response, savedClassicSeat.playerName)) { setMessage(response.reason ?? `Saved ${GAME_BY_ID[classicRoute.game].name} seat could not be recovered.`); updateBrowserPath("/"); } });
        } else { setSelectedGame(classicRoute.game); setRoomCode(classicRoute.code); setConnectionStatus("Connected"); setMessage(`${GAME_BY_ID[classicRoute.game].name} invite ready. Sign in or join this room.`); }
        return;
      }

      const wordArenaRoute = readWordArenaRouteFromPath();
      if (wordArenaRoute) {
        const savedWordSeat = readCardSavedSession(WORD_ARENA_SESSION_KEYS[wordArenaRoute.game]);
        if (savedWordSeat?.code === wordArenaRoute.code) {
          setConnectionStatus(`Recovering ${GAME_BY_ID[wordArenaRoute.game].name} room...`);
          socket.emit(`${wordArenaRoute.game}:reconnect`, savedWordSeat, (response: WordArenaResponse) => { setConnectionStatus("Connected"); if (!applyWordArenaResponse(response, savedWordSeat.playerName)) { setMessage(response.reason ?? `Saved ${GAME_BY_ID[wordArenaRoute.game].name} seat could not be recovered.`); updateBrowserPath("/"); } });
        } else { setSelectedGame(wordArenaRoute.game); setRoomCode(wordArenaRoute.code); setConnectionStatus("Connected"); setMessage(`${GAME_BY_ID[wordArenaRoute.game].name} invite ready. Sign in or join this room.`); }
        return;
      }

      const session = readSavedSession();

      if (!session) {
        setConnectionStatus("Connected");
        return;
      }

      // A saved seat is offered on the Home screen. Only auto-reconnect when
      // the browser is actually reloading that game's /game/CODE route.
      // This prevents an old recovery slot from hijacking a fresh setup.
      const routedGameCode = readGameCodeFromPath();
      if (routedGameCode !== session.code) {
        setConnectionStatus("Connected");
        return;
      }

      setConnectionStatus("Recovering game...");

      socket.emit(
        "game:reconnect",
        {
          code: session.code,
          reconnectToken: session.reconnectToken,
          playerName: session.playerName,
          force: false,
        },
        (response: GameResponse) => {
          if (!applyRecoveredGame(response, session)) {
            setConnectionStatus("Connected");
            setMessage(response.reason ?? "The saved game could not be recovered.");
            updateBrowserPath("/");
          }
        },
      );
    }

    function handleDisconnect() {
      setConnectionStatus("Disconnected");
    }

    function handleLobbyUpdated(room: GameRoom) {
      setLobby((currentLobby) => {
        if (!currentLobby || currentLobby.code !== room.code) {
          return currentLobby;
        }

        return {
          ...currentLobby,
          players: room.players,
          turnTimerSeconds: room.turnTimerSeconds,
          boardStyle: room.boardStyle,
          hostDisconnectDeadline:
            room.hostDisconnectDeadline,
        };
      });
      setRanked(room.ranked);
      setBlitz(room.blitz);
    }

    function handleGameStarted(room: GameRoom) {
      handleLobbyUpdated(room);
      setGameStarted(true);
      setMessage("");
    }

    function handleGameState(payload: { state: GameState }) {
      setGameState(payload.state);
      setRanked(payload.state.ranked);
      setBlitz(payload.state.blitz);
      setGameStarted(true);
      setIsResolvingPurchase(false);
      setIsBuilding(false);
      setIsManagingAsset(false);
      setIsSubmittingTrade(false);
      setIsResolvingDebt(false);
      setIsResolvingCard(false);
      setIsResolvingAuction(false);
      setIsResolvingJail(false);
      setIsResolvingSpeedDie(false);
      setIsResolvingMega(false);

      if (!payload.state.pendingTrade) {
        setTradeDraft(emptyTradeDraft());
      }

      // A live draft is ephemeral and only belongs to the player whose turn it
      // currently is. Clear it as soon as the turn moves, the game leaves play,
      // or the draft becomes a formal pending trade. This prevents stale
      // "Deal in progress" banners surviving after there is no negotiation.
      setLiveTradePreview((currentPreview) => {
        if (!currentPreview) return currentPreview;
        const activePlayer = payload.state.players[payload.state.currentPlayerIndex];
        if (
          payload.state.phase !== "playing" ||
          payload.state.pendingTrade ||
          activePlayer?.id !== currentPreview.proposerId
        ) {
          return null;
        }
        return currentPreview;
      });

      setMessage("");
    }

    function resetToHome(
      statusMessage: string,
      forgetSession: boolean,
    ) {
      if (forgetSession) {
        clearSession();
        setSavedSession(null);
        setRecoveryCode("");
      }

      setLobby(null);
      setMegaBoardParked(false);
      setInviteCode(null);
      setInvitePreview(null);
      updateBrowserPath("/");
      setGameStarted(false);
      setGameState(null);
      setLiveTradePreview(null);
      setSpectators([]);
      setGameMenuOpen(false);
      setRoomCode(generateRoomCode());
      setMessage(statusMessage);
    }

    function handleSpectators(nextSpectators: Array<{ id: string; name: string }>) {
      setSpectators(nextSpectators);
    }

    function handleGameEnded(payload: { reason?: string }) {
      resetToHome(
        payload.reason ??
          "The game was ended by the host.",
        true,
      );
    }

    function handleSessionReplaced(payload: { reason?: string }) {
      resetToHome(
        payload.reason ??
          "This session was opened in another browser.",
        true,
      );
    }

    function handlePokerState(nextState: PokerPublicState) {
      setPokerState(nextState);
      setSelectedGame("poker");
      setRoomCode(nextState.code);
      setMessage("");
    }

    function handleBlackjackState(nextState: BlackjackPublicState) { setBlackjackState(nextState); setSelectedGame("blackjack"); setRoomCode(nextState.code); setMessage(""); if (nextState.phase === "finished") { clearCardSession(BLACKJACK_SESSION_KEY); setBlackjackSavedSession(null); setBlackjackRecoveryCode(""); } }
    function handleWhotState(nextState: WhotPublicState) { setWhotState(nextState); setWhotMatchMode(nextState.matchMode); setSelectedGame("whot"); setRoomCode(nextState.code); setMessage(""); }
    function handleLudoState(nextState: LudoPublicState) { setLudoState(nextState); setLudoMatchMode(nextState.matchMode); setSelectedGame("ludo"); setRoomCode(nextState.code); setMessage(""); }
    function handleAyoState(nextState: AyoPublicState) { setAyoState(nextState); setSelectedGame("ayo"); setRoomCode(nextState.code); setMessage(""); if (nextState.phase === "finished") { clearCardSession(AYO_SESSION_KEY); setAyoSavedSession(null); setAyoRecoveryCode(""); } }
    function handleWordBoardState(nextState: WordBoardPublicState) { setWordBoardState(nextState); setSelectedGame("word-board"); setRoomCode(nextState.code); setMessage(""); if (nextState.phase === "finished") { clearCardSession(WORD_BOARD_SESSION_KEY); setWordBoardSavedSession(null); setWordBoardRecoveryCode(""); } }
    function handleConnectFourState(nextState: ConnectFourPublicState) { setConnectFourState(nextState); setConnectFourMatchMode(nextState.matchMode); setConnectFourBestOf(nextState.bestOf); setSelectedGame("connect-four"); setRoomCode(nextState.code); setMessage(""); }
    function handleHiddenDictatorState(nextState: HiddenDictatorPublicState) { setHiddenDictatorState(nextState); setHiddenDictatorMatchMode(nextState.matchMode); setSelectedGame("hidden-dictator"); setRoomCode(nextState.code); setMessage(""); }
    function handleWordArenaState(nextState: WordArenaPublicState) { setWordArenaState(nextState); setSelectedGame(nextState.game); setRoomCode(nextState.code); setMessage(""); if (nextState.phase === "finished") updateWordArenaSavedSession(nextState.game, null); }
    function handleClassicState(nextState: ClassicPublicState) { setClassicState(nextState); setClassicMatchModes((current) => ({ ...current, [nextState.game]: nextState.matchMode })); setSelectedGame(nextState.game); setRoomCode(nextState.code); setMessage(""); if (nextState.phase === "finished") updateClassicSavedSession(nextState.game, null); else if (nextState.viewerReconnectToken && nextState.viewerPlayerId) updateClassicSavedSession(nextState.game, { code: nextState.code, reconnectToken: nextState.viewerReconnectToken, playerName: nextState.players.find((player) => player.id === nextState.viewerPlayerId)?.name ?? "Player" }); }
    function handleLiveTradePreview(nextPreview: LiveTradePreview | null) { setLiveTradePreview(nextPreview); }
    function handleAllRoomsClosed(payload?: { reason?: string }) {
      clearSession(); clearPokerSession(); clearCardSession(BLACKJACK_SESSION_KEY); clearCardSession(WHOT_SESSION_KEY); clearCardSession(LUDO_SESSION_KEY); clearCardSession(CONNECT_FOUR_SESSION_KEY); clearCardSession(AYO_SESSION_KEY); clearCardSession(WORD_BOARD_SESSION_KEY); clearCardSession(HIDDEN_DICTATOR_SESSION_KEY); WORD_ARENA_GAMES.forEach((game) => clearCardSession(WORD_ARENA_SESSION_KEYS[game])); CLASSIC_GAMES.forEach((game) => clearCardSession(CLASSIC_SESSION_KEYS[game]));
      setSavedSession(null); setPokerSavedSession(null); setBlackjackSavedSession(null); setWhotSavedSession(null); setLudoSavedSession(null); setConnectFourSavedSession(null); setAyoSavedSession(null); setWordBoardSavedSession(null); setHiddenDictatorSavedSession(null); setWordArenaSavedSessions({ "word-game": null, password: null, "anagrams-race": null }); setClassicSavedSessions({ cheat: null, dominoes: null });
      setRecoveryCode(""); setPokerRecoveryCode(""); setBlackjackRecoveryCode(""); setWhotRecoveryCode(""); setLudoRecoveryCode(""); setConnectFourRecoveryCode(""); setAyoRecoveryCode(""); setWordBoardRecoveryCode(""); setHiddenDictatorRecoveryCode(""); setWordArenaRecoveryCodes({ "word-game": "", password: "", "anagrams-race": "" }); setClassicRecoveryCodes({ cheat: "", dominoes: "" });
      setLobby(null); setGameState(null); setPokerState(null); setBlackjackState(null); setWhotState(null); setLudoState(null); setConnectFourState(null); setAyoState(null); setWordBoardState(null); setHiddenDictatorState(null); setWordArenaState(null); setClassicState(null); setGameStarted(false); setIsSpectator(false); setSpectators([]); setMegaBoardParked(false);
      setInviteCode(null); setInvitePreview(null); setRoomCode(generateRoomCode()); updateBrowserPath("/");
      setMessage(payload?.reason ?? "All live Halieus rooms were closed by an administrator.");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("lobby:updated", handleLobbyUpdated);
    socket.on("game:started", handleGameStarted);
    socket.on("game:state", handleGameState);
    socket.on("game:trade-live", handleLiveTradePreview);
    socket.on("poker:state", handlePokerState);
    socket.on("blackjack:state", handleBlackjackState);
    socket.on("whot:state", handleWhotState);
    socket.on("ludo:state", handleLudoState);
    socket.on("connect-four:state", handleConnectFourState);
    socket.on("ayo:state", handleAyoState);
    socket.on("word-board:state", handleWordBoardState);
    socket.on("hidden-dictator:state", handleHiddenDictatorState);
    socket.on("word-game:state", handleWordArenaState);
    socket.on("password:state", handleWordArenaState);
    socket.on("anagrams-race:state", handleWordArenaState);
    socket.on("cheat:state", handleClassicState);
    socket.on("dominoes:state", handleClassicState);
    socket.on("game:spectators", handleSpectators);
    socket.on("game:ended", handleGameEnded);
    socket.on(
      "game:session-replaced",
      handleSessionReplaced,
    );
    socket.on("platform:all-rooms-closed", handleAllRoomsClosed);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("lobby:updated", handleLobbyUpdated);
      socket.off("game:started", handleGameStarted);
      socket.off("game:state", handleGameState);
      socket.off("game:trade-live", handleLiveTradePreview);
      socket.off("poker:state", handlePokerState);
      socket.off("blackjack:state", handleBlackjackState);
      socket.off("whot:state", handleWhotState);
      socket.off("ludo:state", handleLudoState);
      socket.off("connect-four:state", handleConnectFourState);
      socket.off("ayo:state", handleAyoState);
      socket.off("word-board:state", handleWordBoardState);
      socket.off("hidden-dictator:state", handleHiddenDictatorState);
      socket.off("word-game:state", handleWordArenaState);
      socket.off("password:state", handleWordArenaState);
      socket.off("anagrams-race:state", handleWordArenaState);
      socket.off("cheat:state", handleClassicState);
      socket.off("dominoes:state", handleClassicState);
      socket.off("game:spectators", handleSpectators);
      socket.off("game:ended", handleGameEnded);
      socket.off(
        "game:session-replaced",
        handleSessionReplaced,
      );
      socket.off("platform:all-rooms-closed", handleAllRoomsClosed);
      socket.disconnect();
    };
  }, []);

  function applyRecoveredGame(
    response: GameResponse,
    session: SavedSession,
  ): boolean {
    if (
      !response.ok ||
      !response.code ||
      !response.playerId ||
      !response.room ||
      !response.reconnectToken
    ) {
      return false;
    }

    const nextSession: SavedSession = {
      code: response.code,
      reconnectToken:
        response.reconnectToken,
      playerName: session.playerName,
    };

    saveSession(nextSession);
    setSavedSession(nextSession);
    setRecoveryCode(
      response.reconnectToken,
    );
    setLobby({
      code: response.code,
      playerId: response.playerId,
      players: response.room.players,
      turnTimerSeconds: response.room.turnTimerSeconds,
      boardStyle: response.room.boardStyle,
      hostDisconnectDeadline:
        response.room.hostDisconnectDeadline,
      blitz: response.room.blitz,
    });
    setRanked(response.room.ranked);
    setBlitz(response.room.blitz);
    setIsSpectator(false);
    setPlayerName(session.playerName);
    setRoomCode(response.code);
    setGameState(response.state ?? null);
    setGameStarted(response.room.started);
    setMegaBoardParked(false);
    setInviteCode(null);
    setInvitePreview(null);
    updateBrowserPath(
      `/game/${response.code}`,
    );
    setConnectionStatus("Connected");
    setMessage(
      response.room.started
        ? "Game recovered."
        : "Lobby recovered.",
    );
    return true;
  }

  function recoverGame(
    session: SavedSession,
    force: boolean,
  ) {
    if (!socket.connected) {
      setMessage(
        "The server is not connected.",
      );
      return;
    }

    setIsRecovering(true);
    setMessage("Recovering game…");

    socket.emit(
      "game:reconnect",
      {
        code: session.code,
        reconnectToken:
          session.reconnectToken,
        playerName: session.playerName,
        force,
      },
      (response: GameResponse) => {
        setIsRecovering(false);

        if (
          !applyRecoveredGame(
            response,
            session,
          )
        ) {
          setMessage(
            response.reason ??
              "The game could not be recovered.",
          );
        }
      },
    );
  }

  function handleResumeSavedSession() {
    const session =
      readSavedSession();

    // Returning from the Game Room does not need a reconnect when this socket
    // still owns the live seat; simply reveal the already-authoritative state.
    if (session && megaBoardParked && lobby?.code === session.code) {
      setMegaBoardParked(false);
      setSelectedGame("mega-board");
      updateBrowserPath(`/game/${session.code}`);
      setMessage(gameStarted ? "Returned to your Mega Board game." : "Returned to your Mega Board lobby.");
      return;
    }

    if (!session) {
      setSavedSession(null);
      setMessage(
        "No saved game was found in this browser.",
      );
      return;
    }

    recoverGame(session, true);
  }

  function handleManualReconnect() {
    const trimmedName =
      playerName.trim();
    const trimmedCode =
      roomCode.trim().toUpperCase();
    const trimmedRecoveryCode =
      recoveryCode.trim();

    if (
      !trimmedName ||
      !trimmedCode ||
      !trimmedRecoveryCode
    ) {
      setMessage(
        "Enter your player name, room code and recovery key.",
      );
      return;
    }

    recoverGame(
      {
        code: trimmedCode,
        playerName: trimmedName,
        reconnectToken:
          trimmedRecoveryCode,
      },
      true,
    );
  }


function handleSpectateGame() {
  const code = roomCode.trim().toUpperCase();

  if (!code) {
    setMessage("Enter the active room code to spectate.");
    return;
  }

  if (!socket.connected) {
    setMessage("The server is not connected.");
    return;
  }

  setIsJoining(true);
  setMessage("Joining as spectator…");

  socket.emit(
    "game:spectate",
    { code, playerName: playerName.trim() || "Spectator" },
    (response: GameResponse) => {
      setIsJoining(false);

      if (
        !response.ok ||
        !response.code ||
        !response.playerId ||
        !response.room ||
        !response.state
      ) {
        setMessage(response.reason ?? "Unable to spectate this game.");
        return;
      }

      clearSession();
      setSavedSession(null);
      setRecoveryCode("");
      setIsSpectator(true);
      setMegaBoardParked(false);
      setLobby({
        code: response.code,
        playerId: response.playerId,
        players: response.room.players,
      turnTimerSeconds: response.room.turnTimerSeconds,
      boardStyle: response.room.boardStyle,
        hostDisconnectDeadline: response.room.hostDisconnectDeadline,
        blitz: response.room.blitz,
      });
      setRanked(response.room.ranked);
      setBlitz(response.room.blitz);
      setGameState(response.state);
      setGameStarted(true);
      updateBrowserPath(`/game/${response.code}`);
      setMessage("Spectator mode. Player cash is visible; controls are read-only.");
    },
  );
}

function handleLeaveSpectator() {
  if (!lobby) return;
  socket.emit(
    "game:leave-spectator",
    { code: lobby.code },
    () => undefined,
  );
  setIsSpectator(false);
  setLobby(null);
  setMegaBoardParked(false);
  setGameState(null);
  setSpectators([]);
  setGameStarted(false);
  setMessage("Left spectator view.");
  updateBrowserPath("/");
}

  function handleForgetSavedSession() {
    clearSession();
    setSavedSession(null);
    setRecoveryCode("");
    if (!lobby) {
      updateBrowserPath("/");
      setRoomCode(generateRoomCode());
    }
    setMessage(
      "Saved recovery details removed from this browser.",
    );
  }

  function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = playerName.trim();
    const trimmedCode = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      setMessage("Enter your player name.");
      return;
    }

    if (!trimmedCode) {
      setMessage("Enter or generate a room code.");
      return;
    }

    if (!socket.connected) {
      setMessage("The server is not connected.");
      return;
    }

    setIsCreating(true);
    setMessage("Creating game...");

    socket.emit(
      "game:create",
      {
        playerName: trimmedName,
        ranked,
        blitz,
        code: trimmedCode,
        freeParkingJackpotEnabled,
      },
      (response: GameResponse) => {
        setIsCreating(false);

        if (
          !response.ok ||
          !response.code ||
          !response.playerId ||
          !response.room ||
          !response.reconnectToken
        ) {
          setMessage(response.reason ?? "Could not create the game.");
          return;
        }

        setMegaBoardParked(false);
        setLobby({
          code: response.code,
          playerId: response.playerId,
          players: response.room.players,
      turnTimerSeconds: response.room.turnTimerSeconds,
      boardStyle: response.room.boardStyle,
          hostDisconnectDeadline:
            response.room.hostDisconnectDeadline,
          blitz: response.room.blitz,
        });
        setRanked(response.room.ranked);
        setBlitz(response.room.blitz);
        setIsSpectator(false);
        const nextSession = {
          code: response.code,
          reconnectToken:
            response.reconnectToken,
          playerName: trimmedName,
        };
        saveSession(nextSession);
        setSavedSession(nextSession);
        setRecoveryCode(
          response.reconnectToken,
        );
        setInviteCode(null);
        setInvitePreview(null);
        updateBrowserPath(
          `/game/${response.code}`,
        );
        setMessage("");
      },
    );
  }

  function handleJoinGame() {
    const trimmedName = playerName.trim();
    const trimmedCode = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      setMessage("Enter your player name.");
      return;
    }

    if (!trimmedCode) {
      setMessage("Enter the room code.");
      return;
    }

    if (!socket.connected) {
      setMessage("The server is not connected.");
      return;
    }

    setIsJoining(true);
    setMessage("Joining game...");

    socket.emit(
      "game:join",
      {
        playerName: trimmedName,
        code: trimmedCode,
      },
      (response: GameResponse) => {
        setIsJoining(false);

        if (
          !response.ok ||
          !response.code ||
          !response.playerId ||
          !response.room ||
          !response.reconnectToken
        ) {
          setMessage(response.reason ?? "Could not join the game.");
          return;
        }

        setMegaBoardParked(false);
        setLobby({
          code: response.code,
          playerId: response.playerId,
          players: response.room.players,
      turnTimerSeconds: response.room.turnTimerSeconds,
      boardStyle: response.room.boardStyle,
          hostDisconnectDeadline:
            response.room.hostDisconnectDeadline,
          blitz: response.room.blitz,
        });
        setRanked(response.room.ranked);
        setBlitz(response.room.blitz);
        const nextSession = {
          code: response.code,
          reconnectToken:
            response.reconnectToken,
          playerName: trimmedName,
        };
        saveSession(nextSession);
        setSavedSession(nextSession);
        setRecoveryCode(
          response.reconnectToken,
        );
        setInviteCode(null);
        setInvitePreview(null);
        updateBrowserPath(
          `/game/${response.code}`,
        );
        setMessage("");
      },
    );
  }

  function handleRefreshInvite() {
    if (!inviteCode) {
      return;
    }

    setIsLoadingInvite(true);

    socket.emit(
      "game:preview",
      { code: inviteCode },
      (response: RoomPreviewResponse) => {
        setIsLoadingInvite(false);

        if (
          !response.ok ||
          !response.preview
        ) {
          setInvitePreview(null);
          setMessage(
            response.reason ??
              "This invite is no longer available.",
          );
          return;
        }

        setInvitePreview(
          response.preview,
        );
        setRanked(response.preview.ranked);
        setBlitz(response.preview.blitz);
        setMessage("");
      },
    );
  }

  function handleInviteGoHome() {
    setInviteCode(null);
    setInvitePreview(null);
    updateBrowserPath("/");
    setRoomCode(generateRoomCode());
    setMessage("");
  }

  function finishLocalExit(
    statusMessage: string,
  ) {
    clearSession();
    setSavedSession(null);
    setRecoveryCode("");
    setLobby(null);
    setMegaBoardParked(false);
    setInviteCode(null);
    setInvitePreview(null);
    updateBrowserPath("/");
    setGameStarted(false);
    setGameState(null);
    setGameMenuOpen(false);
    setMessage(statusMessage);
    setRoomCode(generateRoomCode());
  }

  function handleForfeitGame() {
    if (!lobby || !gameStarted) return;

    setMessage("Forfeiting match…");

    socket.emit(
      "game:forfeit",
      { code: lobby.code },
      (response: GameResponse) => {
        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to forfeit the match.",
          );
          return;
        }

        // Forfeit removes only the active seat. Keep this browser in the room
        // as a spectator instead of treating the action like a full exit.
        clearSession();
        setSavedSession(null);
        setRecoveryCode("");
        setIsSpectator(true);
        setGameMenuOpen(false);
        setTurnActionsCloseSignal((value) => value + 1);

        if (response.room) {
          setLobby((currentLobby) =>
            currentLobby
              ? {
                  ...currentLobby,
                  players: response.room!.players,
                  hostDisconnectDeadline:
                    response.room!.hostDisconnectDeadline,
                }
              : currentLobby,
          );
        }

        if (response.state) {
          setGameState(response.state);
        }

        setMessage(
          "You forfeited the match. The game continues and you are now spectating.",
        );
      },
    );
  }

  // "Back" is intentionally non-destructive: keep the socket, recovery token,
  // lobby membership and game state alive while the player browses Halieus.
  function handleBackToGameRoom() {
    if (!lobby) return;

    // Spectator sessions do not own a recoverable player seat, so Back simply
    // leaves spectator view instead of parking a session that cannot resume.
    if (isSpectator) {
      handleLeaveSpectator();
      return;
    }

    setMegaBoardParked(true);
    setSelectedGame("mega-board");
    setGameMenuOpen(false);
    setPlayersDrawerOpen(false);
    setSelectedPlayerDetailId(null);
    setTurnActionsCloseSignal((value) => value + 1);
    updateBrowserPath("/");
    setRoomCode(lobby.code);
    setMessage(
      gameStarted
        ? "Returned to the Game Room. Your Mega Board seat is still active."
        : "Returned to the Game Room. Your Mega Board lobby seat is still active.",
    );
  }

  function handleLeaveGame() {
    if (!lobby) return;

    setMessage("Leaving game…");

    socket.emit(
      "game:leave",
      { code: lobby.code },
      (response: GameResponse) => {
        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to leave the game.",
          );
          return;
        }

        finishLocalExit(
          gameStarted
            ? "You left the game."
            : "You left the lobby.",
        );
      },
    );
  }

  function handleEndRoom() {
    if (!lobby) return;

    setMessage("Ending game…");

    socket.emit(
      "game:end-room",
      { code: lobby.code },
      (response: GameResponse) => {
        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to end the game.",
          );
          return;
        }

        finishLocalExit(
          "The game was ended.",
        );
      },
    );
  }



  function handleAddAi(
    difficulty: AiDifficulty,
  ) {
    if (!lobby) {
      return;
    }

    setMessage("Adding AI player...");

    socket.emit(
      "game:add-ai",
      {
        code: lobby.code,
        difficulty,
      },
      (response: GameResponse) => {
        if (!response.ok) {
          setMessage(
            response.reason ??
              "Could not add the AI player.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleRemoveAi(
    playerId: string,
  ) {
    if (!lobby) {
      return;
    }

    socket.emit(
      "game:remove-ai",
      {
        code: lobby.code,
        playerId,
      },
      (response: GameResponse) => {
        if (!response.ok) {
          setMessage(
            response.reason ??
              "Could not remove the AI player.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function loadRankedLeaderboard() {
    setLeaderboardLoading(true);
    setLeaderboardError("");
    socket.emit("ranked:get", {}, (response: { ok?: boolean; reason?: string; leaderboard?: RankedLeaderboardEntry[]; recentMatches?: RankedMatchSummary[] }) => {
      setLeaderboardLoading(false);
      if (!response?.ok) {
        setLeaderboardError(response?.reason ?? "Unable to load the Ranked leaderboard.");
        return;
      }
      setLeaderboardEntries(response.leaderboard ?? []);
      setRecentRankedMatches(response.recentMatches ?? []);
    });
  }

  function handleOpenLeaderboard() {
    setLeaderboardOpen(true);
    loadRankedLeaderboard();
  }

  function handleStartGame() {
    if (!lobby) {
      setMessage("You are not currently in a lobby.");
      return;
    }

    setMessage("Starting game...");
    socket.emit("game:start", { code: lobby.code }, (response: GameResponse) => {
      if (!response.ok || !response.room || !response.state) {
        setMessage(response.reason ?? "Could not start the game.");
        return;
      }

      // The start acknowledgement is authoritative. Do not make the host depend
      // on a separate room broadcast to leave the lobby; that broadcast remains
      // useful for the other players and as a duplicate state sync.
      setLobby((current) => current ? {
        ...current,
        players: response.room!.players,
        turnTimerSeconds: response.room!.turnTimerSeconds,
        boardStyle: response.room!.boardStyle,
        hostDisconnectDeadline: response.room!.hostDisconnectDeadline,
        blitz: response.room!.blitz,
      } : current);
      setGameState(response.state);
      setRanked(response.state.ranked);
      setBlitz(response.state.blitz);
      setGameStarted(true);
      setMegaBoardParked(false);
      setMessage("");
    });
  }

  function handleSelectMegaToken(tokenId: string) {
    if (!lobby || !gameState) return;
    socket.emit("game:set-token", { code: lobby.code, tokenId }, (response: GameStateResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to choose that piece."); else setMessage(""); });
  }

  function handleOrderRoll() {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }

    socket.emit(
      "game:order-roll",
      { code: lobby.code },
      (response: DiceResponse) => {
        if (!response.ok) {
          setMessage(response.reason ?? "Unable to roll for turn order.");
          return;
        }

        setMessage(
          response.roll
            ? `You rolled ${response.roll.white1} + ${response.roll.white2} = ${response.roll.total}.`
            : "Turn-order roll completed.",
        );
      },
    );
  }

  function handleRollDice() {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }
    if (rollRequestLockedRef.current) {
      return;
    }

    rollRequestLockedRef.current = true;
    setIsSubmittingRoll(true);
    socket.emit(
      "game:roll",
      { code: lobby.code },
      (response: GameStateResponse) => {
        if (!response.ok) {
          setMessage(response.reason ?? "Unable to roll dice.");
        } else {
          setMessage("");
        }

        window.setTimeout(() => {
          rollRequestLockedRef.current = false;
          setIsSubmittingRoll(false);
        }, response.ok ? 1200 : 250);
      },
    );
  }

  function handleJailAction(
    eventName:
      | "game:jail-pay"
      | "game:jail-use-card",
    pendingMessage: string,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingJail(true);
    setMessage(pendingMessage);

    socket.emit(
      eventName,
      { code: lobby.code },
      (response: GameStateResponse) => {
        setIsResolvingJail(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to complete the Jail action.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleJailPayFine() {
    handleJailAction(
      "game:jail-pay",
      "Paying Jail fine...",
    );
  }

  function handleJailUseCard() {
    handleJailAction(
      "game:jail-use-card",
      "Using Get Out of Jail Free card...",
    );
  }

  function handleJailRoll() {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingJail(true);
    setMessage(
      "Rolling for doubles...",
    );

    socket.emit(
      "game:jail-roll",
      { code: lobby.code },
      (response: DiceResponse) => {
        setIsResolvingJail(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to roll from Jail.",
          );
          return;
        }

        setMessage(
          response.roll
            ? `Jail roll: ${response.roll.white1} + ${response.roll.white2} = ${response.roll.total}.`
            : "Jail roll completed.",
        );
      },
    );
  }

  function handleSpeedDieAction(
    eventName:
      | "game:speed-die-mr-monopoly",
    pendingMessage: string,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingSpeedDie(true);
    setMessage(pendingMessage);

    socket.emit(
      eventName,
      { code: lobby.code },
      (response: GameStateResponse) => {
        setIsResolvingSpeedDie(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to complete the Speed Die action.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleSpeedDieTripleMove(
    position: number,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingSpeedDie(true);
    setMessage(
      "Moving to the selected space...",
    );

    socket.emit(
      "game:speed-die-triple-move",
      {
        code: lobby.code,
        position,
      },
      (response: GameStateResponse) => {
        setIsResolvingSpeedDie(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to complete the triple move.",
          );
          return;
        }

        setMessage("");
      },
    );
  }


  function handleSpeedDieBusMove(spaces: number) {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }

    setIsResolvingSpeedDie(true);
    setMessage(`Moving ${spaces} space${spaces === 1 ? "" : "s"}...`);

    socket.emit(
      "game:speed-die-bus-move",
      { code: lobby.code, spaces },
      (response: GameStateResponse) => {
        setIsResolvingSpeedDie(false);
        if (!response.ok) {
          setMessage(response.reason ?? "Unable to complete the Bus move.");
          return;
        }
        setMessage("");
      },
    );
  }

  function handleSpeedDieMrMonopoly() {
    handleSpeedDieAction(
      "game:speed-die-mr-monopoly",
      "Completing the Mr. Monopoly move...",
    );
  }


  function handleMegaAction(
    eventName:
      | "game:bus-ticket-start"
      | "game:bus-ticket-cancel"
      | "game:birthday-gift-cash"
      | "game:birthday-gift-ticket",
    pendingMessage: string,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingMega(true);
    setMessage(pendingMessage);

    socket.emit(
      eventName,
      { code: lobby.code },
      (response: GameStateResponse) => {
        setIsResolvingMega(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to complete the Mega action.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleStartBusTicket() {
    handleMegaAction(
      "game:bus-ticket-start",
      "Choosing a Bus Ticket destination...",
    );
  }

  function handleBusTicketCancel() {
    handleMegaAction(
      "game:bus-ticket-cancel",
      "Cancelling Bus Ticket...",
    );
  }

  function handleBusTicketMove(
    position: number,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingMega(true);
    setMessage("Using Bus Ticket...");

    socket.emit(
      "game:bus-ticket-move",
      {
        code: lobby.code,
        position,
      },
      (response: GameStateResponse) => {
        setIsResolvingMega(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to use the Bus Ticket.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleBirthdayCash() {
    handleMegaAction(
      "game:birthday-gift-cash",
      "Collecting Birthday Gift...",
    );
  }

  function handleBirthdayTicket() {
    handleMegaAction(
      "game:birthday-gift-ticket",
      "Collecting Birthday Bus Ticket...",
    );
  }

  function handleAuctionSpaceSelect(
    spaceId: number,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsResolvingMega(true);
    setMessage("Starting selected auction...");

    socket.emit(
      "game:auction-space-select",
      {
        code: lobby.code,
        spaceId,
      },
      (response: GameStateResponse) => {
        setIsResolvingMega(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to start the selected auction.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleTurnTimerChange(seconds: number) {
    if (!lobby || gameStarted) {
      setMessage("The game state is not ready.");
      return;
    }

    setIsUpdatingTurnTimer(true);
    socket.emit(
      "game:set-turn-timer",
      { code: lobby.code, seconds },
      (response: GameStateResponse) => {
        setIsUpdatingTurnTimer(false);
        if (!response.ok) {
          setMessage(response.reason ?? "Unable to change the turn timer.");
          return;
        }
        setMessage(`Turn timer changed to ${seconds < 60 ? `${seconds} seconds` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}.`);
      },
    );
  }

  function handleEndTurn() {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setMessage("Ending turn...");

    socket.emit(
      "game:end-turn",
      {
        code: lobby.code,
      },
      (response: GameStateResponse) => {
        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to end the turn.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handlePurchaseProperty() {
    if (!lobby || !gameState?.pendingPurchase) {
      setMessage("There is no property awaiting purchase.");
      return;
    }

    setIsResolvingPurchase(true);
    setMessage("Purchasing property...");

    socket.emit(
      "game:purchase",
      { code: lobby.code },
      (response: GameStateResponse) => {
        setIsResolvingPurchase(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to purchase the property.");
          return;
        }

        setMessage("Property purchased successfully.");
      },
    );
  }

  function handleDeclinePurchase() {
    if (!lobby || !gameState?.pendingPurchase) {
      setMessage("There is no property awaiting a decision.");
      return;
    }

    setIsResolvingPurchase(true);
    setMessage("Passing on property...");

    socket.emit(
      "game:decline-purchase",
      { code: lobby.code },
      (response: GameStateResponse) => {
        setIsResolvingPurchase(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to pass on the property.");
          return;
        }

        setMessage("Property declined.");
      },
    );
  }

  function handleAuctionBid(
    amount: number,
  ) {
    if (!lobby || !gameState?.pendingAuction) {
      setMessage(
        "There is no auction in progress.",
      );
      return;
    }

    setIsResolvingAuction(true);
    setMessage("Submitting bid...");

    socket.emit(
      "game:auction-bid",
      {
        code: lobby.code,
        amount,
      },
      (response: GameStateResponse) => {
        setIsResolvingAuction(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to place the bid.",
          );
          return;
        }

        setMessage("Bid accepted.");
      },
    );
  }

  function handleAuctionWithdraw() {
    if (!lobby || !gameState?.pendingAuction) {
      setMessage(
        "There is no auction in progress.",
      );
      return;
    }

    setIsResolvingAuction(true);
    setMessage(
      "Withdrawing from auction...",
    );

    socket.emit(
      "game:auction-withdraw",
      {
        code: lobby.code,
      },
      (response: GameStateResponse) => {
        setIsResolvingAuction(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to withdraw from the auction.",
          );
          return;
        }

        setMessage(
          "You withdrew from the auction.",
        );
      },
    );
  }

  function handleBuildProperty(spaceId: number) {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }

    setIsBuilding(true);
    setMessage("Developing property...");
    const buildWatchdog = window.setTimeout(() => {
      setIsBuilding(false);
    }, 3500);

    socket.emit(
      "game:build",
      {
        code: lobby.code,
        spaceId,
      },
      (response: GameStateResponse) => {
        window.clearTimeout(buildWatchdog);
        setIsBuilding(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to develop the property.");
          return;
        }

        setMessage("Property developed successfully.");
      },
    );
  }

  function handleBuildToProperty(spaceId: number, targetLevel: 5 | 6) {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }

    setIsBuilding(true);
    setMessage(targetLevel === 5 ? "Building to Hotel..." : "Building to Skyscraper...");
    const buildWatchdog = window.setTimeout(() => setIsBuilding(false), 5000);

    socket.emit(
      "game:build-to",
      { code: lobby.code, spaceId, targetLevel },
      (response: GameStateResponse) => {
        window.clearTimeout(buildWatchdog);
        setIsBuilding(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to complete the bulk development.");
          return;
        }

        setMessage(targetLevel === 5 ? "Hotel development completed." : "Skyscraper development completed.");
      },
    );
  }

  function handleBuildGroupToProperty(spaceId: number, targetLevel: 5 | 6) {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }

    setIsBuilding(true);
    setMessage(targetLevel === 5 ? "Building group to Hotels..." : "Building group to Skyscrapers...");
    const buildWatchdog = window.setTimeout(() => setIsBuilding(false), 6500);

    socket.emit(
      "game:build-group-to",
      { code: lobby.code, spaceId, targetLevel },
      (response: GameStateResponse) => {
        window.clearTimeout(buildWatchdog);
        setIsBuilding(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to complete the group development.");
          return;
        }

        setMessage(
          targetLevel === 5
            ? "Colour group developed to Hotels."
            : "Colour group developed to Skyscrapers.",
        );
      },
    );
  }

  function handleAssetAction(
    eventName:
      | "game:mortgage"
      | "game:unmortgage"
      | "game:sell-building"
      | "game:build-depot"
      | "game:sell-depot",
    spaceId: number,
    pendingMessage: string,
    successMessage: string,
  ) {
    if (!lobby) {
      return;
    }

    setIsManagingAsset(true);
    setMessage(pendingMessage);

    socket.emit(
      eventName,
      {
        code: lobby.code,
        spaceId,
      },
      (response: GameStateResponse) => {
        setIsManagingAsset(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to complete the asset action.",
          );
          return;
        }

        setMessage(successMessage);
      },
    );
  }

  function handleMortgage(spaceId: number) {
    handleAssetAction(
      "game:mortgage",
      spaceId,
      "Mortgaging asset...",
      "Asset mortgaged.",
    );
  }

  function handleUnmortgage(spaceId: number) {
    handleAssetAction(
      "game:unmortgage",
      spaceId,
      "Unmortgaging asset...",
      "Asset unmortgaged.",
    );
  }

  function handleSellBuilding(spaceId: number) {
    handleAssetAction(
      "game:sell-building",
      spaceId,
      "Selling development...",
      "Development sold.",
    );
  }


  function handleBuildDepot(spaceId: number) {
    handleAssetAction(
      "game:build-depot",
      spaceId,
      "Building Train Depot...",
      "Train Depot built.",
    );
  }

  function handleSellDepot(spaceId: number) {
    handleAssetAction(
      "game:sell-depot",
      spaceId,
      "Selling Train Depot...",
      "Train Depot sold.",
    );
  }

  function handleCardContinue() {
    if (!lobby) {
      return;
    }

    setIsResolvingCard(true);
    setMessage("Applying card...");

    socket.emit(
      "game:card-continue",
      {
        code: lobby.code,
      },
      (response: GameStateResponse) => {
        setIsResolvingCard(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to apply the card.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handleDebtAction(
    eventName:
      | "game:pay-debt"
      | "game:auto-liquidate-debt"
      | "game:declare-bankruptcy",
    pendingMessage: string,
  ) {
    if (!lobby) {
      return;
    }

    setIsResolvingDebt(true);
    setMessage(pendingMessage);

    socket.emit(
      eventName,
      { code: lobby.code },
      (response: GameStateResponse) => {
        setIsResolvingDebt(false);

        if (!response.ok) {
          setMessage(
            response.reason ?? "Unable to resolve the debt.",
          );
          return;
        }

        setMessage("");
      },
    );
  }

  function handlePayDebt() {
    handleDebtAction(
      "game:pay-debt",
      "Paying debt...",
    );
  }

  function handleAutoLiquidateDebt() {
    handleDebtAction(
      "game:auto-liquidate-debt",
      "Auto-liquidating assets...",
    );
  }

  function handleDeclareBankruptcy() {
    setBankruptcyConfirmOpen(true);
  }

  function publishLiveTradeDraft(nextDraft: TradeDraft) {
    setTradeDraft(nextDraft);
    if (!lobby || !gameState || gameState.pendingTrade) {
      return;
    }
    const recipientIds = nextDraft.recipientIds.filter(Boolean);
    if (recipientIds.length === 0) {
      socket.emit("game:trade-live-close", { code: lobby.code });
      setLiveTradePreview(null);
      return;
    }
    tradeLiveRevisionRef.current += 1;
    socket.emit("game:trade-live-update", {
      code: lobby.code,
      recipientIds: recipientIds.slice(0, 3),
      cashTransfers: nextDraft.cashTransfers,
      propertyRecipients: nextDraft.propertyRecipients,
      busTicketRecipients: nextDraft.busTicketRecipients,
      jailCardRecipients: nextDraft.jailCardRecipients,
      revision: tradeLiveRevisionRef.current,
    });
  }

  function closeLiveTradeDraft() {
    if (lobby) socket.emit("game:trade-live-close", { code: lobby.code });
    setLiveTradePreview(null);
  }

  function handleTradePropose() {
    if (!lobby || !gameState) {
      setMessage("The game state is not ready.");
      return;
    }

    setIsSubmittingTrade(true);
    setMessage("Sending trade proposal...");

    const recipientIds = tradeDraft.recipientIds.filter(Boolean).slice(0, 3);
    if (recipientIds.length === 0) {
      setIsSubmittingTrade(false);
      setMessage("Choose at least one player for the deal.");
      return;
    }

    const recipientId = recipientIds[0];
    const isMultiParty = recipientIds.length >= 2;
    const proposerId = lobby.playerId;
    const proposerCash = isMultiParty ? 0 : (tradeDraft.cashTransfers[tradeTransferKey(proposerId, recipientId)] ?? 0);
    const recipientCash = isMultiParty ? 0 : (tradeDraft.cashTransfers[tradeTransferKey(recipientId, proposerId)] ?? 0);
    const selectedProperties = Object.entries(tradeDraft.propertyRecipients);
    const selectedBusTickets = Object.entries(tradeDraft.busTicketRecipients);
    const selectedJailCards = Object.entries(tradeDraft.jailCardRecipients);

    socket.emit(
      "game:trade-propose",
      {
        code: lobby.code,
        recipientId,
        recipientIds,
        cashTransfers: tradeDraft.cashTransfers,
        propertyRecipients: tradeDraft.propertyRecipients,
        busTicketRecipients: tradeDraft.busTicketRecipients,
        jailCardRecipients: tradeDraft.jailCardRecipients,
        proposerCash,
        recipientCash,
        proposerPropertyIds: isMultiParty ? [] : selectedProperties.filter(([propertyId, to]) => gameState.propertyOwners[Number(propertyId)] === proposerId && to === recipientId).map(([propertyId]) => Number(propertyId)),
        recipientPropertyIds: isMultiParty ? [] : selectedProperties.filter(([propertyId, to]) => gameState.propertyOwners[Number(propertyId)] === recipientId && to === proposerId).map(([propertyId]) => Number(propertyId)),
        proposerBusTicketIds: isMultiParty ? [] : selectedBusTickets.filter(([ticketId, to]) => gameState.players.find((player) => player.id === proposerId)?.busTicketIds.includes(ticketId) && to === recipientId).map(([ticketId]) => ticketId),
        recipientBusTicketIds: isMultiParty ? [] : selectedBusTickets.filter(([ticketId, to]) => gameState.players.find((player) => player.id === recipientId)?.busTicketIds.includes(ticketId) && to === proposerId).map(([ticketId]) => ticketId),
        proposerJailCardIds: isMultiParty ? [] : selectedJailCards.filter(([cardId, to]) => gameState.players.find((player) => player.id === proposerId)?.getOutOfJailCardIds.includes(cardId) && to === recipientId).map(([cardId]) => cardId),
        recipientJailCardIds: isMultiParty ? [] : selectedJailCards.filter(([cardId, to]) => gameState.players.find((player) => player.id === recipientId)?.getOutOfJailCardIds.includes(cardId) && to === proposerId).map(([cardId]) => cardId),
      },
      (response: GameStateResponse) => {
        setIsSubmittingTrade(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to send the trade.");
          return;
        }

        setLiveTradePreview(null);
        setMessage("Trade proposal sent.");
      },
    );
  }

  function handleTradeAccept(tradeId: string) {
    if (!lobby) {
      return;
    }

    setIsSubmittingTrade(true);
    setMessage("Accepting trade...");

    socket.emit(
      "game:trade-accept",
      {
        code: lobby.code,
        tradeId,
      },
      (response: GameStateResponse) => {
        setIsSubmittingTrade(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to accept the trade.");
          return;
        }

        setMessage("Trade completed.");
      },
    );
  }

  function handleTradeDecline(tradeId: string) {
    if (!lobby) {
      return;
    }

    setIsSubmittingTrade(true);
    setMessage("Closing trade...");

    socket.emit(
      "game:trade-decline",
      {
        code: lobby.code,
        tradeId,
      },
      (response: GameStateResponse) => {
        setIsSubmittingTrade(false);

        if (!response.ok) {
          setMessage(response.reason ?? "Unable to close the trade.");
          return;
        }

        setMessage("Trade closed.");
      },
    );
  }



  function handleRejectAllTrades(enabled: boolean) {
    if (!lobby) {
      return;
    }

    setIsSubmittingTrade(true);
    socket.emit(
      "game:trade-reject-all",
      { code: lobby.code, enabled },
      (response: GameStateResponse) => {
        setIsSubmittingTrade(false);
        if (!response.ok) {
          setMessage(response.reason ?? "Unable to update trade preferences.");
          return;
        }
        setMessage(enabled ? "Rejecting all trade offers for this turn." : "Incoming trade offers enabled.");
      },
    );
  }
  function handleAutopilotChange(
    enabled: boolean,
  ) {
    if (!lobby || !gameState) {
      setMessage(
        "The game state is not ready.",
      );
      return;
    }

    setIsUpdatingAutopilot(true);
    setMessage(
      enabled
        ? "Starting Autopilot..."
        : "Returning control to you...",
    );

    socket.emit(
      "game:set-autopilot",
      {
        code: lobby.code,
        enabled,
        difficulty: "normal",
      },
      (response: GameStateResponse) => {
        setIsUpdatingAutopilot(false);

        if (!response.ok) {
          setMessage(
            response.reason ??
              "Unable to update Autopilot.",
          );
          return;
        }

        setMessage(
          enabled
            ? "Autopilot is active."
            : "You have control again.",
        );
      },
    );
  }

  function applyPokerResponse(response: PokerResponse, name: string, isSpectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null);
    setPokerState(response.state);
    setSelectedGame("poker");
    setRoomCode(response.code);
    setPlayerName(name);
    setInviteCode(null);
    setLobby(null);
    setGameStarted(false);
    setGameState(null);
    if (!isSpectator && response.reconnectToken) {
      const session: PokerSession = { code: response.code, playerName: name, reconnectToken: response.reconnectToken };
      savePokerSession(session);
      setPokerSavedSession(session);
      setPokerRecoveryCode(response.reconnectToken);
    }
    updateBrowserPath(`/poker/${response.code}`);
    setMessage("");
    return true;
  }

  function handleCreatePoker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) {
      setMessage(!playerName.trim() ? "Enter your name first." : "Enter or generate a room code.");
      return;
    }
    setIsCreating(true);
    setMessage("Creating private poker table...");
    socket.emit(
      "poker:create",
      { code: roomCode, playerName, startingChips: pokerStartingChips, smallBlind: pokerSmallBlind, bigBlind: pokerBigBlind, aiDifficulty: "normal", matchMode: pokerMatchMode, variant: pokerVariant },
      (response: PokerResponse) => {
        setIsCreating(false);
        if (!applyPokerResponse(response, playerName)) setMessage(response.reason ?? "Unable to create poker table.");
      },
    );
  }

  function handleJoinPoker() {
    if (!playerName.trim() || !roomCode.trim()) {
      setMessage(!playerName.trim() ? "Enter your name first." : "Enter the poker room code.");
      return;
    }
    setIsJoining(true);
    setMessage("Joining poker table...");
    socket.emit("poker:join", { code: roomCode, playerName }, (response: PokerResponse) => {
      setIsJoining(false);
      if (!applyPokerResponse(response, playerName)) setMessage(response.reason ?? "Unable to join poker table.");
    });
  }

  function handleSpectatePoker() {
    if (!roomCode.trim()) {
      setMessage("Enter the poker room code to spectate.");
      return;
    }
    setIsJoining(true);
    socket.emit("poker:spectate", { code: roomCode, playerName: playerName || "Spectator" }, (response: PokerResponse) => {
      setIsJoining(false);
      if (!applyPokerResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? "Unable to spectate poker table.");
    });
  }

  function recoverPoker(session: PokerSession) {
    setIsRecovering(true);
    setMessage("Recovering poker table...");
    socket.emit("poker:reconnect", { code: session.code, reconnectToken: session.reconnectToken, playerName: session.playerName }, (response: PokerResponse) => {
      setIsRecovering(false);
      if (!applyPokerResponse(response, session.playerName)) setMessage(response.reason ?? "Poker table could not be recovered.");
    });
  }

  function handlePokerStart() {
    if (!pokerState) return;
    socket.emit("poker:start", { code: pokerState.code }, (response: PokerResponse) => {
      if (!response.ok) setMessage(response.reason ?? "Unable to start poker table.");
    });
  }

  // Poker difficulty is table-wide and can be tuned by the host before the
  // first hand. Existing AI seats use the room-level value immediately.
  function handlePokerAiDifficultyChange(difficulty: "easy" | "normal" | "hard") {
    if (!pokerState) return;
    setMessage(`Setting Poker AI to ${difficulty}...`);
    socket.emit("poker:set-ai-difficulty", { code: pokerState.code, difficulty }, (response: PokerResponse) => {
      if (!response.ok) {
        setMessage(response.reason ?? "Unable to change Poker AI difficulty.");
        return;
      }
      setMessage(`Poker AI difficulty set to ${difficulty}.`);
    });
  }

  function handlePokerAddAi() {
    if (!pokerState) return;
    socket.emit("poker:add-ai", { code: pokerState.code }, (response: PokerResponse) => {
      if (!response.ok) setMessage(response.reason ?? "Unable to add AI player.");
    });
  }

  function handlePokerRemoveAi(playerId: string) {
    if (!pokerState) return;
    socket.emit("poker:remove-ai", { code: pokerState.code, playerId }, (response: PokerResponse) => {
      if (!response.ok) setMessage(response.reason ?? "Unable to remove AI player.");
    });
  }

  function handlePokerAction(action: "fold" | "check" | "call" | "raise" | "all-in", amount?: number) {
    if (!pokerState) return;
    socket.emit("poker:action", { code: pokerState.code, action, amount }, (response: PokerResponse) => {
      if (!response.ok) setMessage(response.reason ?? "Poker action was rejected.");
    });
  }

  // Poker Autopilot temporarily delegates the viewer's existing seat to the same server-side AI used by computer seats.
  function handlePokerAutopilotChange(mode: "off" | "semi" | "full") {
    if (!pokerState || pokerState.isSpectator) return;
    setIsUpdatingPokerAutopilot(true);
    setMessage(mode === "off" ? "Returning Poker control to you..." : mode === "full" ? "Starting Poker Full Auto..." : "Starting Poker Semi Auto...");
    socket.emit("poker:set-autopilot", { code: pokerState.code, mode }, (response: PokerResponse) => {
      setIsUpdatingPokerAutopilot(false);
      if (!response.ok) {
        setMessage(response.reason ?? "Unable to update Poker Autopilot.");
        return;
      }
      setMessage(mode === "off" ? "You have control of your Poker seat again." : mode === "full" ? "Poker Full Auto is active until you Take Control." : "Poker Semi Auto is active for this hand.");
    });
  }

  function handlePokerNextHand() {
    if (!pokerState) return;
    socket.emit("poker:next-hand", { code: pokerState.code }, (response: PokerResponse) => {
      if (!response.ok) setMessage(response.reason ?? "Unable to deal next hand.");
    });
  }

  function handlePokerForfeit() {
    if (!pokerState || pokerState.isSpectator) return;
    const code = pokerState.code;
    socket.emit("poker:forfeit", { code }, (response: PokerResponse) => {
      if (!response.ok) { setMessage(response.reason ?? "Unable to forfeit the Poker table."); return; }
      clearPokerSession(); setPokerSavedSession(null); setPokerRecoveryCode(""); setPokerState(null); setSelectedGame("poker"); setRoomCode(code); updateBrowserPath("/"); setMessage("Poker seat forfeited.");
    });
  }

  function handlePokerEndTable() {
    if (!pokerState) return;
    const code = pokerState.code;
    socket.emit("poker:end-table", { code }, (response: PokerResponse) => {
      if (!response.ok) { setMessage(response.reason ?? "Unable to end the Poker table."); return; }
      clearPokerSession(); setPokerSavedSession(null); setPokerRecoveryCode(""); setPokerState(null); setSelectedGame("poker"); setRoomCode(code); updateBrowserPath("/"); setMessage("Poker table ended and archived.");
    });
  }

  // Leaving the Poker screen keeps the recovery slot alive; the saved seat can be resumed from the Game Room.
  function handleLeavePoker() {
    if (!pokerState) return;
    const previousCode = pokerState.code;
    socket.emit("poker:leave", { code: previousCode, preserveSeat: true }, () => undefined);
    setPokerState(null);
    setSelectedGame("poker");
    updateBrowserPath("/");
    setRoomCode(previousCode);
    setMessage("Returned to the Game Room. Your poker seat is saved for recovery.");
  }

  function applyBlackjackResponse(response: BlackjackResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null); setBlackjackState(response.state); setWhotState(null); setPokerState(null); setSelectedGame("blackjack"); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) { const session = { code: response.code, playerName: name, reconnectToken: response.reconnectToken }; saveCardSession(BLACKJACK_SESSION_KEY, session); setBlackjackSavedSession(session); setBlackjackRecoveryCode(response.reconnectToken); }
    updateBrowserPath(`/blackjack/${response.code}`); setMessage(""); return true;
  }
  function applyWhotResponse(response: WhotResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null); setWhotState(response.state); setBlackjackState(null); setPokerState(null); setSelectedGame("whot"); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) { const session = { code: response.code, playerName: name, reconnectToken: response.reconnectToken }; saveCardSession(WHOT_SESSION_KEY, session); setWhotSavedSession(session); setWhotRecoveryCode(response.reconnectToken); }
    updateBrowserPath(`/whot/${response.code}`); setMessage(""); return true;
  }
  function createBlackjack(event: FormEvent<HTMLFormElement>, options: { aiCount: number; aiDifficulty: BlackjackAiDifficulty }) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) { setMessage("Enter your name and room code first."); return; } setIsCreating(true); socket.emit("blackjack:create", { code: roomCode, playerName, startingChips: 1000, minimumBet: 25, matchMode: blackjackMatchMode, aiCount: options.aiCount, aiDifficulty: options.aiDifficulty }, (response: BlackjackResponse) => { setIsCreating(false); if (!applyBlackjackResponse(response, playerName)) setMessage(response.reason ?? "Unable to create Blackjack table."); }); }
  function joinBlackjack() { if (!playerName.trim() || !roomCode.trim()) { setMessage("Enter your name and Blackjack room code."); return; } setIsJoining(true); socket.emit("blackjack:join", { code: roomCode, playerName }, (response: BlackjackResponse) => { setIsJoining(false); if (!applyBlackjackResponse(response, playerName)) setMessage(response.reason ?? "Unable to join Blackjack table."); }); }
  function spectateBlackjack() { if (!roomCode.trim()) return setMessage("Enter the Blackjack room code."); setIsJoining(true); socket.emit("blackjack:spectate", { code: roomCode, playerName: playerName || "Spectator" }, (response: BlackjackResponse) => { setIsJoining(false); if (!applyBlackjackResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? "Unable to spectate Blackjack."); }); }
  function recoverBlackjack(session: SavedSession) { setIsRecovering(true); socket.emit("blackjack:reconnect", session, (response: BlackjackResponse) => { setIsRecovering(false); if (!applyBlackjackResponse(response, session.playerName)) setMessage(response.reason ?? "Blackjack table could not be recovered."); }); }
  function createWhot(event: FormEvent<HTMLFormElement>, options: { aiCount: number; aiDifficulty: WhotAiDifficulty }) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) { setMessage("Enter your name and room code first."); return; } setIsCreating(true); socket.emit("whot:create", { code: roomCode, playerName, matchMode: whotMatchMode, aiCount: options.aiCount, aiDifficulty: options.aiDifficulty }, (response: WhotResponse) => { setIsCreating(false); if (!applyWhotResponse(response, playerName)) setMessage(response.reason ?? "Unable to create WHOT room."); }); }
  function joinWhot() { if (!playerName.trim() || !roomCode.trim()) { setMessage("Enter your name and WHOT room code."); return; } setIsJoining(true); socket.emit("whot:join", { code: roomCode, playerName }, (response: WhotResponse) => { setIsJoining(false); if (!applyWhotResponse(response, playerName)) setMessage(response.reason ?? "Unable to join WHOT room."); }); }
  function spectateWhot() { if (!roomCode.trim()) return setMessage("Enter the WHOT room code."); setIsJoining(true); socket.emit("whot:spectate", { code: roomCode, playerName: playerName || "Spectator" }, (response: WhotResponse) => { setIsJoining(false); if (!applyWhotResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? "Unable to spectate WHOT."); }); }
  function recoverWhot(session: SavedSession) { setIsRecovering(true); socket.emit("whot:reconnect", session, (response: WhotResponse) => { setIsRecovering(false); if (!applyWhotResponse(response, session.playerName)) setMessage(response.reason ?? "WHOT room could not be recovered."); }); }
  function forfeitBlackjack() { if (!blackjackState || blackjackState.isSpectator) return; const code = blackjackState.code; socket.emit("blackjack:forfeit", { code }, (response: BlackjackResponse) => { if (!response.ok) { setMessage(response.reason ?? "Unable to forfeit Blackjack."); return; } clearCardSession(BLACKJACK_SESSION_KEY); setBlackjackSavedSession(null); setBlackjackRecoveryCode(""); setBlackjackState(null); setSelectedGame("blackjack"); updateBrowserPath("/"); setRoomCode(code); setMessage("Blackjack seat forfeited."); }); }
  function forfeitWhot() { if (!whotState || whotState.isSpectator) return; const code = whotState.code; socket.emit("whot:forfeit", { code }, (response: WhotResponse) => { if (!response.ok) { setMessage(response.reason ?? "Unable to forfeit WHOT."); return; } clearCardSession(WHOT_SESSION_KEY); setWhotSavedSession(null); setWhotRecoveryCode(""); setWhotState(null); setSelectedGame("whot"); updateBrowserPath("/"); setRoomCode(code); setMessage("WHOT seat forfeited."); }); }
  function endBlackjackTable() { if (!blackjackState) return; const code = blackjackState.code; socket.emit("blackjack:end-table", { code }, (response: BlackjackResponse) => { if (!response.ok) { setMessage(response.reason ?? "Unable to end Blackjack table."); return; } clearCardSession(BLACKJACK_SESSION_KEY); setBlackjackSavedSession(null); setBlackjackRecoveryCode(""); setBlackjackState(null); setSelectedGame("blackjack"); updateBrowserPath("/"); setRoomCode(code); setMessage("Blackjack table ended and archived."); }); }
  function endWhotGame() { if (!whotState) return; const code = whotState.code; socket.emit("whot:end-game", { code }, (response: WhotResponse) => { if (!response.ok) { setMessage(response.reason ?? "Unable to end WHOT game."); return; } clearCardSession(WHOT_SESSION_KEY); setWhotSavedSession(null); setWhotRecoveryCode(""); setWhotState(null); setSelectedGame("whot"); updateBrowserPath("/"); setRoomCode(code); setMessage("WHOT game ended and archived."); }); }
  function leaveBlackjack() { if (!blackjackState) return; const code = blackjackState.code; socket.emit("blackjack:leave", { code }, () => undefined); setBlackjackState(null); setSelectedGame("blackjack"); updateBrowserPath("/"); setRoomCode(code); setMessage("Returned to the Game Room. Your Blackjack seat is recoverable."); }
  function leaveWhot() { if (!whotState) return; const code = whotState.code; socket.emit("whot:leave", { code }, () => undefined); setWhotState(null); setSelectedGame("whot"); updateBrowserPath("/"); setRoomCode(code); setMessage("Returned to the Game Room. Your WHOT seat is recoverable."); }

  function applyLudoResponse(response: LudoResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null); setLudoState(response.state); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame("ludo"); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) { const session = { code: response.code, playerName: name, reconnectToken: response.reconnectToken }; saveCardSession(LUDO_SESSION_KEY, session); setLudoSavedSession(session); setLudoRecoveryCode(response.reconnectToken); }
    updateBrowserPath(`/ludo/${response.code}`); setMessage(""); return true;
  }
  function createLudo(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) { setMessage("Enter your name and room code first."); return; } setIsCreating(true); socket.emit("ludo:create", { code: roomCode, playerName, matchMode: ludoMatchMode }, (response: LudoResponse) => { setIsCreating(false); if (!applyLudoResponse(response, playerName)) setMessage(response.reason ?? "Unable to create Ludo room."); }); }
  function joinLudo() { if (!playerName.trim() || !roomCode.trim()) { setMessage("Enter your name and Ludo room code."); return; } setIsJoining(true); socket.emit("ludo:join", { code: roomCode, playerName }, (response: LudoResponse) => { setIsJoining(false); if (!applyLudoResponse(response, playerName)) setMessage(response.reason ?? "Unable to join Ludo room."); }); }
  function spectateLudo() { if (!roomCode.trim()) return setMessage("Enter the Ludo room code."); setIsJoining(true); socket.emit("ludo:spectate", { code: roomCode, playerName: playerName || "Spectator" }, (response: LudoResponse) => { setIsJoining(false); if (!applyLudoResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? "Unable to spectate Ludo."); }); }
  function recoverLudo(session: SavedSession) { setIsRecovering(true); socket.emit("ludo:reconnect", session, (response: LudoResponse) => { setIsRecovering(false); if (!applyLudoResponse(response, session.playerName)) setMessage(response.reason ?? "Ludo room could not be recovered."); }); }
  function forfeitLudo() { if (!ludoState || ludoState.isSpectator) return; const code = ludoState.code; socket.emit("ludo:forfeit", { code }, (response: LudoResponse) => { if (!response.ok) { setMessage(response.reason ?? "Unable to forfeit Ludo."); return; } clearCardSession(LUDO_SESSION_KEY); setLudoSavedSession(null); setLudoRecoveryCode(""); setLudoState(null); setSelectedGame("ludo"); updateBrowserPath("/"); setRoomCode(code); setMessage("Ludo seat forfeited."); }); }
  function endLudoGame() { if (!ludoState) return; const code = ludoState.code; socket.emit("ludo:end-game", { code }, (response: LudoResponse) => { if (!response.ok) { setMessage(response.reason ?? "Unable to end Ludo game."); return; } clearCardSession(LUDO_SESSION_KEY); setLudoSavedSession(null); setLudoRecoveryCode(""); setLudoState(null); setSelectedGame("ludo"); updateBrowserPath("/"); setRoomCode(code); setMessage("Ludo game ended and archived."); }); }
  function leaveLudo() { if (!ludoState) return; const code = ludoState.code; socket.emit("ludo:leave", { code }, () => undefined); setLudoState(null); setSelectedGame("ludo"); updateBrowserPath("/"); setRoomCode(code); setMessage("Returned to the Game Room. Your Ludo seat is recoverable."); }

  function applyConnectFourResponse(response: ConnectFourResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null); setConnectFourState(response.state); setHiddenDictatorState(null); setLudoState(null); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame("connect-four"); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) { const session = { code: response.code, playerName: name, reconnectToken: response.reconnectToken }; saveCardSession(CONNECT_FOUR_SESSION_KEY, session); setConnectFourSavedSession(session); setConnectFourRecoveryCode(response.reconnectToken); }
    updateBrowserPath(`/connect-four/${response.code}`); setMessage(""); return true;
  }
  function createConnectFour(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) return setMessage("Enter your name and room code first."); setIsCreating(true); socket.emit("connect-four:create", { code: roomCode, playerName, matchMode: connectFourMatchMode, bestOf: connectFourBestOf }, (response: ConnectFourResponse) => { setIsCreating(false); if (!applyConnectFourResponse(response, playerName)) setMessage(response.reason ?? "Unable to create Connect Four room."); }); }
  function joinConnectFour() { if (!playerName.trim() || !roomCode.trim()) return setMessage("Enter your name and Connect Four room code."); setIsJoining(true); socket.emit("connect-four:join", { code: roomCode, playerName }, (response: ConnectFourResponse) => { setIsJoining(false); if (!applyConnectFourResponse(response, playerName)) setMessage(response.reason ?? "Unable to join Connect Four."); }); }
  function spectateConnectFour() { if (!roomCode.trim()) return setMessage("Enter the Connect Four room code."); setIsJoining(true); socket.emit("connect-four:spectate", { code: roomCode, playerName: playerName || "Spectator" }, (response: ConnectFourResponse) => { setIsJoining(false); if (!applyConnectFourResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? "Unable to spectate Connect Four."); }); }
  function recoverConnectFour(session: SavedSession) { setIsRecovering(true); socket.emit("connect-four:reconnect", session, (response: ConnectFourResponse) => { setIsRecovering(false); if (!applyConnectFourResponse(response, session.playerName)) setMessage(response.reason ?? "Connect Four room could not be recovered."); }); }
  function forfeitConnectFour() { if (!connectFourState || connectFourState.isSpectator) return; const code = connectFourState.code; socket.emit("connect-four:forfeit", { code }, (response: ConnectFourResponse) => { if (!response.ok) return setMessage(response.reason ?? "Unable to forfeit Connect Four."); clearCardSession(CONNECT_FOUR_SESSION_KEY); setConnectFourSavedSession(null); setConnectFourRecoveryCode(""); setConnectFourState(null); setSelectedGame("connect-four"); updateBrowserPath("/"); setRoomCode(code); setMessage("Connect Four seat forfeited."); }); }
  function endConnectFour() { if (!connectFourState) return; const code=connectFourState.code; socket.emit("connect-four:end-game", { code }, (response: ConnectFourResponse) => { if (!response.ok) return setMessage(response.reason ?? "Unable to end Connect Four."); clearCardSession(CONNECT_FOUR_SESSION_KEY); setConnectFourSavedSession(null); setConnectFourRecoveryCode(""); setConnectFourState(null); setSelectedGame("connect-four"); updateBrowserPath("/"); setRoomCode(code); setMessage("Connect Four game ended and archived."); }); }
  function leaveConnectFour() { if (!connectFourState) return; const code=connectFourState.code; socket.emit("connect-four:leave", { code }, () => undefined); setConnectFourState(null); setSelectedGame("connect-four"); updateBrowserPath("/"); setRoomCode(code); setMessage("Returned to Game Room. Your Connect Four seat is recoverable."); }

  function applyAyoResponse(response: AyoResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.state) return false;
    const code = response.code ?? response.state.code;
    setAyoState(response.state); setWordBoardState(null); setClassicState(null); setWordArenaState(null); setHiddenDictatorState(null); setConnectFourState(null); setLudoState(null); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame("ayo"); setRoomCode(code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) { const session={code,playerName:name,reconnectToken:response.reconnectToken}; saveCardSession(AYO_SESSION_KEY,session); setAyoSavedSession(session); setAyoRecoveryCode(response.reconnectToken); }
    updateBrowserPath(`/ayo/${code}`); setMessage(""); return true;
  }
  function createAyo(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if(!playerName.trim()||!roomCode.trim()) return setMessage("Enter your name and room code first."); setIsCreating(true); socket.emit("ayo:create",{code:roomCode,playerName,matchMode:ayoMatchMode},(response:AyoResponse)=>{setIsCreating(false);if(!applyAyoResponse(response,playerName))setMessage(response.reason??"Unable to create Ayo room.")}); }
  function joinAyo(){if(!playerName.trim()||!roomCode.trim())return setMessage("Enter your name and Ayo room code.");setIsJoining(true);socket.emit("ayo:join",{code:roomCode,playerName},(response:AyoResponse)=>{setIsJoining(false);if(!applyAyoResponse(response,playerName))setMessage(response.reason??"Unable to join Ayo.")});}
  function spectateAyo(){if(!roomCode.trim())return setMessage("Enter the Ayo room code.");setIsJoining(true);socket.emit("ayo:spectate",{code:roomCode,playerName:playerName||"Spectator"},(response:AyoResponse)=>{setIsJoining(false);if(!applyAyoResponse(response,playerName||"Spectator",true))setMessage(response.reason??"Unable to spectate Ayo.")});}
  function recoverAyo(session:SavedSession){setIsRecovering(true);socket.emit("ayo:reconnect",session,(response:AyoResponse)=>{setIsRecovering(false);if(!applyAyoResponse(response,session.playerName))setMessage(response.reason??"Ayo room could not be recovered.")});}
  function forfeitAyo(){if(!ayoState||ayoState.isSpectator)return;const code=ayoState.code;socket.emit("ayo:forfeit",{code},(response:AyoResponse)=>{if(!response.ok)return setMessage(response.reason??"Unable to forfeit Ayo.");clearCardSession(AYO_SESSION_KEY);setAyoSavedSession(null);setAyoRecoveryCode("");setAyoState(null);setSelectedGame("ayo");updateBrowserPath("/");setRoomCode(code);setMessage("Ayo seat forfeited.")});}
  function endAyo(){if(!ayoState)return;const code=ayoState.code;socket.emit("ayo:end-game",{code},(response:AyoResponse)=>{if(!response.ok)return setMessage(response.reason??"Unable to end Ayo.");clearCardSession(AYO_SESSION_KEY);setAyoSavedSession(null);setAyoRecoveryCode("");setAyoState(null);setSelectedGame("ayo");updateBrowserPath("/");setRoomCode(code);setMessage("Ayo game ended and archived.")});}
  function leaveAyo(){if(!ayoState)return;const code=ayoState.code;socket.emit("ayo:leave",{code},()=>undefined);setAyoState(null);setSelectedGame("ayo");updateBrowserPath("/");setRoomCode(code);setMessage("Returned to Game Room. Your Ayo seat is recoverable.");}

  function applyWordBoardResponse(response: WordBoardResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.state) return false;
    const code=response.code??response.state.code;
    setWordBoardState(response.state); setAyoState(null); setClassicState(null); setWordArenaState(null); setHiddenDictatorState(null); setConnectFourState(null); setLudoState(null); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame("word-board"); setRoomCode(code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if(!spectator&&response.reconnectToken){const session={code,playerName:name,reconnectToken:response.reconnectToken};saveCardSession(WORD_BOARD_SESSION_KEY,session);setWordBoardSavedSession(session);setWordBoardRecoveryCode(response.reconnectToken);}
    updateBrowserPath(`/word-board/${code}`);setMessage("");return true;
  }
  function createWordBoard(event:FormEvent<HTMLFormElement>, options: { dictionaryMode: "standard" | "challenge" | "open" }){event.preventDefault();if(!playerName.trim()||!roomCode.trim())return setMessage("Enter your name and room code first.");setIsCreating(true);socket.emit("word-board:create",{code:roomCode,playerName,matchMode:"casual",dictionaryMode:options.dictionaryMode},(response:WordBoardResponse)=>{setIsCreating(false);if(!applyWordBoardResponse(response,playerName))setMessage(response.reason??"Unable to create Word Board room.")});}
  function joinWordBoard(){if(!playerName.trim()||!roomCode.trim())return setMessage("Enter your name and Word Board room code.");setIsJoining(true);socket.emit("word-board:join",{code:roomCode,playerName},(response:WordBoardResponse)=>{setIsJoining(false);if(!applyWordBoardResponse(response,playerName))setMessage(response.reason??"Unable to join Word Board.")});}
  function spectateWordBoard(){if(!roomCode.trim())return setMessage("Enter the Word Board room code.");setIsJoining(true);socket.emit("word-board:spectate",{code:roomCode,playerName:playerName||"Spectator"},(response:WordBoardResponse)=>{setIsJoining(false);if(!applyWordBoardResponse(response,playerName||"Spectator",true))setMessage(response.reason??"Unable to spectate Word Board.")});}
  function recoverWordBoard(session:SavedSession){setIsRecovering(true);socket.emit("word-board:reconnect",session,(response:WordBoardResponse)=>{setIsRecovering(false);if(!applyWordBoardResponse(response,session.playerName))setMessage(response.reason??"Word Board room could not be recovered.")});}
  function forfeitWordBoard(){if(!wordBoardState||wordBoardState.isSpectator)return;const code=wordBoardState.code;socket.emit("word-board:forfeit",{code},(response:WordBoardResponse)=>{if(!response.ok)return setMessage(response.reason??"Unable to forfeit Word Board.");clearCardSession(WORD_BOARD_SESSION_KEY);setWordBoardSavedSession(null);setWordBoardRecoveryCode("");setWordBoardState(null);setSelectedGame("word-board");updateBrowserPath("/");setRoomCode(code);setMessage("Word Board seat forfeited.")});}
  function endWordBoard(){if(!wordBoardState)return;const code=wordBoardState.code;socket.emit("word-board:end-game",{code},(response:WordBoardResponse)=>{if(!response.ok)return setMessage(response.reason??"Unable to end Word Board.");clearCardSession(WORD_BOARD_SESSION_KEY);setWordBoardSavedSession(null);setWordBoardRecoveryCode("");setWordBoardState(null);setSelectedGame("word-board");updateBrowserPath("/");setRoomCode(code);setMessage("Word Board ended and archived.")});}
  function leaveWordBoard(){if(!wordBoardState)return;const code=wordBoardState.code;socket.emit("word-board:leave",{code},()=>undefined);setWordBoardState(null);setSelectedGame("word-board");updateBrowserPath("/");setRoomCode(code);setMessage("Returned to Game Room. Your Word Board seat is recoverable.");}

  function applyHiddenDictatorResponse(response: HiddenDictatorResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null); setHiddenDictatorState(response.state); setConnectFourState(null); setLudoState(null); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame("hidden-dictator"); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) { const session = { code: response.code, playerName: name, reconnectToken: response.reconnectToken }; saveCardSession(HIDDEN_DICTATOR_SESSION_KEY, session); setHiddenDictatorSavedSession(session); setHiddenDictatorRecoveryCode(response.reconnectToken); }
    updateBrowserPath(`/hidden-dictator/${response.code}`); setMessage(""); return true;
  }
  function createHiddenDictator(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) return setMessage("Enter your name and room code first."); setIsCreating(true); socket.emit("hidden-dictator:create", { code: roomCode, playerName, matchMode: hiddenDictatorMatchMode }, (response: HiddenDictatorResponse) => { setIsCreating(false); if (!applyHiddenDictatorResponse(response, playerName)) setMessage(response.reason ?? "Unable to create Hidden Dictator room."); }); }
  function joinHiddenDictator() { if (!playerName.trim() || !roomCode.trim()) return setMessage("Enter your name and Hidden Dictator room code."); setIsJoining(true); socket.emit("hidden-dictator:join", { code: roomCode, playerName }, (response: HiddenDictatorResponse) => { setIsJoining(false); if (!applyHiddenDictatorResponse(response, playerName)) setMessage(response.reason ?? "Unable to join Hidden Dictator."); }); }
  function spectateHiddenDictator() { if (!roomCode.trim()) return setMessage("Enter the Hidden Dictator room code."); setIsJoining(true); socket.emit("hidden-dictator:spectate", { code: roomCode, playerName: playerName || "Spectator" }, (response: HiddenDictatorResponse) => { setIsJoining(false); if (!applyHiddenDictatorResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? "Unable to spectate Hidden Dictator."); }); }
  function recoverHiddenDictator(session: SavedSession) { setIsRecovering(true); socket.emit("hidden-dictator:reconnect", session, (response: HiddenDictatorResponse) => { setIsRecovering(false); if (!applyHiddenDictatorResponse(response, session.playerName)) setMessage(response.reason ?? "Hidden Dictator room could not be recovered."); }); }
  function forfeitHiddenDictator() { if (!hiddenDictatorState || hiddenDictatorState.isSpectator) return; const code=hiddenDictatorState.code; socket.emit("hidden-dictator:forfeit", { code }, (response: HiddenDictatorResponse) => { if (!response.ok) return setMessage(response.reason ?? "Unable to forfeit Hidden Dictator."); clearCardSession(HIDDEN_DICTATOR_SESSION_KEY); setHiddenDictatorSavedSession(null); setHiddenDictatorRecoveryCode(""); setHiddenDictatorState(null); setSelectedGame("hidden-dictator"); updateBrowserPath("/"); setRoomCode(code); setMessage("Hidden Dictator seat forfeited."); }); }
  function endHiddenDictator() { if (!hiddenDictatorState) return; const code=hiddenDictatorState.code; socket.emit("hidden-dictator:end-game", { code }, (response: HiddenDictatorResponse) => { if (!response.ok) return setMessage(response.reason ?? "Unable to end Hidden Dictator."); clearCardSession(HIDDEN_DICTATOR_SESSION_KEY); setHiddenDictatorSavedSession(null); setHiddenDictatorRecoveryCode(""); setHiddenDictatorState(null); setSelectedGame("hidden-dictator"); updateBrowserPath("/"); setRoomCode(code); setMessage("Hidden Dictator game ended and archived."); }); }
  function leaveHiddenDictator() { if (!hiddenDictatorState) return; const code=hiddenDictatorState.code; socket.emit("hidden-dictator:leave", { code }, () => undefined); setHiddenDictatorState(null); setSelectedGame("hidden-dictator"); updateBrowserPath("/"); setRoomCode(code); setMessage("Returned to Game Room. Your Hidden Dictator seat is recoverable."); }

  function updateWordArenaSavedSession(game: WordArenaGameId, session: SavedSession | null) {
    setWordArenaSavedSessions((current) => ({ ...current, [game]: session }));
    setWordArenaRecoveryCodes((current) => ({ ...current, [game]: session?.reconnectToken ?? "" }));
    if (session) saveCardSession(WORD_ARENA_SESSION_KEYS[game], session); else clearCardSession(WORD_ARENA_SESSION_KEYS[game]);
  }
  function applyWordArenaResponse(response: WordArenaResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(null); setWordArenaState(response.state); setHiddenDictatorState(null); setConnectFourState(null); setLudoState(null); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame(response.state.game); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    if (!spectator && response.reconnectToken) updateWordArenaSavedSession(response.state.game, { code: response.code, playerName: name, reconnectToken: response.reconnectToken });
    updateBrowserPath(`/${response.state.game}/${response.code}`); setMessage(""); return true;
  }
  function createWordArena(game: WordArenaGameId, event: FormEvent<HTMLFormElement>, options: WordArenaCreateOptions) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) return setMessage("Enter your name and room code first."); setIsCreating(true); socket.emit(`${game}:create`, { code: roomCode, playerName, ...options }, (response: WordArenaResponse) => { setIsCreating(false); if (!applyWordArenaResponse(response, playerName)) setMessage(response.reason ?? `Unable to create ${GAME_BY_ID[game].name} room.`); }); }
  function joinWordArena(game: WordArenaGameId) { if (!playerName.trim() || !roomCode.trim()) return setMessage(`Enter your name and ${GAME_BY_ID[game].name} room code.`); setIsJoining(true); socket.emit(`${game}:join`, { code: roomCode, playerName }, (response: WordArenaResponse) => { setIsJoining(false); if (!applyWordArenaResponse(response, playerName)) setMessage(response.reason ?? `Unable to join ${GAME_BY_ID[game].name}.`); }); }
  function spectateWordArena(game: WordArenaGameId) { if (!roomCode.trim()) return setMessage(`Enter the ${GAME_BY_ID[game].name} room code.`); setIsJoining(true); socket.emit(`${game}:spectate`, { code: roomCode, playerName: playerName || "Spectator" }, (response: WordArenaResponse) => { setIsJoining(false); if (!applyWordArenaResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? `Unable to spectate ${GAME_BY_ID[game].name}.`); }); }
  function recoverWordArena(game: WordArenaGameId, session: SavedSession) { setIsRecovering(true); socket.emit(`${game}:reconnect`, session, (response: WordArenaResponse) => { setIsRecovering(false); if (!applyWordArenaResponse(response, session.playerName)) setMessage(response.reason ?? `${GAME_BY_ID[game].name} room could not be recovered.`); }); }
  function forfeitWordArena() { if (!wordArenaState || wordArenaState.isSpectator) return; const game=wordArenaState.game, code=wordArenaState.code; socket.emit(`${game}:forfeit`, { code }, (response: WordArenaResponse) => { if (!response.ok) return setMessage(response.reason ?? `Unable to leave ${wordArenaState.gameTitle}.`); updateWordArenaSavedSession(game, null); setWordArenaState(null); setSelectedGame(game); updateBrowserPath("/"); setRoomCode(code); setMessage(`${GAME_BY_ID[game].name} seat forfeited.`); }); }
  function endWordArena() { if (!wordArenaState) return; const game=wordArenaState.game, code=wordArenaState.code; socket.emit(`${game}:end-game`, { code }, (response: WordArenaResponse) => { if (!response.ok) return setMessage(response.reason ?? `Unable to end ${wordArenaState.gameTitle}.`); updateWordArenaSavedSession(game, null); setWordArenaState(null); setSelectedGame(game); updateBrowserPath("/"); setRoomCode(code); setMessage(`${GAME_BY_ID[game].name} game ended and archived.`); }); }
  function leaveWordArena() { if (!wordArenaState) return; const game=wordArenaState.game, code=wordArenaState.code; socket.emit(`${game}:leave`, { code }, () => undefined); setWordArenaState(null); setSelectedGame(game); updateBrowserPath("/"); setRoomCode(code); setMessage(`Returned to Game Room. Your ${GAME_BY_ID[game].name} seat is recoverable.`); }

  function updateClassicSavedSession(game: ClassicGameId, session: SavedSession | null) {
    setClassicSavedSessions((current) => ({ ...current, [game]: session }));
    setClassicRecoveryCodes((current) => ({ ...current, [game]: session?.reconnectToken ?? "" }));
    if (session) saveCardSession(CLASSIC_SESSION_KEYS[game], session); else clearCardSession(CLASSIC_SESSION_KEYS[game]);
  }
  function applyClassicResponse(response: ClassicResponse, name: string, spectator = false): boolean {
    if (!response.ok || !response.code || !response.state) return false;
    setClassicState(response.state); setWordArenaState(null); setHiddenDictatorState(null); setConnectFourState(null); setLudoState(null); setWhotState(null); setBlackjackState(null); setPokerState(null); setSelectedGame(response.state.game); setRoomCode(response.code); setPlayerName(name); setInviteCode(null); setLobby(null); setGameStarted(false); setGameState(null);
    setClassicMatchModes((current) => ({ ...current, [response.state!.game]: response.state!.matchMode }));
    if (!spectator && response.reconnectToken) updateClassicSavedSession(response.state.game, { code: response.code, playerName: name, reconnectToken: response.reconnectToken });
    updateBrowserPath(`/${response.state.game}/${response.code}`); setMessage(""); return true;
  }
  function createClassic(game: ClassicGameId, event: FormEvent<HTMLFormElement>, options: ClassicCreateOptions) { event.preventDefault(); if (!playerName.trim() || !roomCode.trim()) return setMessage("Enter your name and room code first."); setIsCreating(true); socket.emit(`${game}:create`, { code: roomCode, playerName, ...options }, (response: ClassicResponse) => { setIsCreating(false); if (!applyClassicResponse(response, playerName)) setMessage(response.reason ?? `Unable to create ${GAME_BY_ID[game].name} room.`); }); }
  function joinClassic(game: ClassicGameId) { if (!playerName.trim() || !roomCode.trim()) return setMessage(`Enter your name and ${GAME_BY_ID[game].name} room code.`); setIsJoining(true); socket.emit(`${game}:join`, { code: roomCode, playerName }, (response: ClassicResponse) => { setIsJoining(false); if (!applyClassicResponse(response, playerName)) setMessage(response.reason ?? `Unable to join ${GAME_BY_ID[game].name}.`); }); }
  function spectateClassic(game: ClassicGameId) { if (!roomCode.trim()) return setMessage(`Enter the ${GAME_BY_ID[game].name} room code.`); setIsJoining(true); socket.emit(`${game}:spectate`, { code: roomCode, playerName: playerName || "Spectator" }, (response: ClassicResponse) => { setIsJoining(false); if (!applyClassicResponse(response, playerName || "Spectator", true)) setMessage(response.reason ?? `Unable to spectate ${GAME_BY_ID[game].name}.`); }); }
  function recoverClassic(game: ClassicGameId, session: SavedSession) { setIsRecovering(true); socket.emit(`${game}:reconnect`, session, (response: ClassicResponse) => { setIsRecovering(false); if (!applyClassicResponse(response, session.playerName)) setMessage(response.reason ?? `${GAME_BY_ID[game].name} room could not be recovered.`); }); }
  function forfeitClassic() { if (!classicState || classicState.isSpectator) return; const game=classicState.game, code=classicState.code; socket.emit(`${game}:forfeit`, { code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) return setMessage(response.reason ?? `Unable to forfeit ${classicState.gameTitle}.`); updateClassicSavedSession(game, null); setClassicState(null); setSelectedGame(game); updateBrowserPath("/"); setRoomCode(code); setMessage(`${GAME_BY_ID[game].name} seat forfeited.`); }); }
  function leaveClassic() { if (!classicState) return; const game=classicState.game, code=classicState.code; socket.emit(`${game}:leave`, { code }, () => undefined); setClassicState(null); setSelectedGame(game); updateBrowserPath("/"); setRoomCode(code); setMessage(`Returned to Game Room. Your ${GAME_BY_ID[game].name} seat is recoverable.`); }

  const currentLobbyPlayer =
    lobby?.players.find(
      (player) =>
        player.id === lobby.playerId,
    );
  const isHost =
    currentLobbyPlayer?.isHost ?? false;
  const currentGamePlayer =
    gameState?.players.find(
      (player) =>
        player.id === lobby?.playerId,
    );
  const autopilotActive =
    Boolean(
      currentGamePlayer &&
      !currentGamePlayer.isAi &&
      currentGamePlayer.autopilotEnabled,
    );
  const activeMegaTurnPlayer = gameState?.players[gameState.currentPlayerIndex];
  const megaRollTimerSeconds = gameState?.turnRollDeadline &&
    gameState.turnRollDeadlinePlayerId === activeMegaTurnPlayer?.id &&
    gameState.turnPhase === "roll" &&
    activeMegaTurnPlayer &&
    !activeMegaTurnPlayer.isAi &&
    !activeMegaTurnPlayer.autopilotEnabled
      ? Math.max(0, Math.ceil((gameState.turnRollDeadline - localClock.getTime()) / 1000))
      : null;
  const megaRollTimerLabel = megaRollTimerSeconds == null
    ? null
    : `${Math.floor(megaRollTimerSeconds / 60)}:${String(megaRollTimerSeconds % 60).padStart(2, "0")}`;
  const viewerIsSpectator = Boolean(isSpectator || currentGamePlayer?.isBankrupt);
  const nonBankruptPlayers = gameState?.players.filter((player) => !player.isBankrupt) ?? [];
  // Desktop Mega Board uses balanced player rails so the square board stays centred
  // while both sides of a wide viewport carry useful match information.
  const dualRailSplitIndex = Math.ceil(nonBankruptPlayers.length / 2);
  const leftRailPlayers = nonBankruptPlayers.slice(0, dualRailSplitIndex);
  const rightRailPlayers = nonBankruptPlayers.slice(dualRailSplitIndex);
  const activeRecoveryKey =
    savedSession &&
    savedSession.code === lobby?.code
      ? savedSession.reconnectToken
      : null;

  const theme = {
    pageBackground: "var(--hgr-page)",
    cardBackground: "var(--hgr-surface)",
    secondaryBackground: "var(--hgr-surface-soft)",
    inputBackground: "var(--hgr-surface-raised)",
    text: "var(--hgr-text)",
    mutedText: "var(--hgr-muted)",
    border: "var(--hgr-border)",
  };
  const toggleDarkMode = () => { const next = darkMode ? "light" : "dark"; localStorage.setItem(THEME_KEY, next); setThemeMode(next); };

  const activeTabGameId: GameId | null =
    classicState?.game ??
    wordArenaState?.game ??
    (ayoState ? "ayo" : null) ??
    (wordBoardState ? "word-board" : null) ??
    (connectFourState ? "connect-four" : null) ??
    (hiddenDictatorState ? "hidden-dictator" : null) ??
    (blackjackState ? "blackjack" : null) ??
    (ludoState ? "ludo" : null) ??
    (whotState ? "whot" : null) ??
    (pokerState ? "poker" : null) ??
    (!megaBoardParked && (lobby || gameState || gameStarted) ? "mega-board" : null);

  useEffect(() => {
    let favicon = document.getElementById("halieus-dynamic-favicon") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.id = "halieus-dynamic-favicon";
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    if (activeTabGameId) {
      const game = GAME_BY_ID[activeTabGameId];
      document.title = `${game.name} · Halieus Game Room`;
      favicon.type = "image/svg+xml";
      favicon.sizes = "any";
      favicon.href = game.icon;
      return;
    }

    // Browser/tab identity uses the canonical H from assets/branding/icon-sets/glyphs.
    // Installed PWA/Apple-touch artwork remains the approved rendered PNG reference.
    document.title = "Halieus Game Room";
    favicon.type = "image/svg+xml";
    favicon.sizes = "any";
    favicon.href = "/halieus-mark.svg?v=4.5.3-icon-set";
  }, [activeTabGameId]);

  const toggleSound = () =>
    setSoundEnabled((current) => !current);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (!stableFullscreenAvailable()) {
      setMessage(fullscreenUnavailableMessage());
      return;
    }

    void document.documentElement
      .requestFullscreen()
      .catch(() => {
        setMessage("Full-screen mode is not available in this browser.");
      });
  };

  if (classicState) {
    return <>
      <ClassicTableScreen
        state={classicState}
        connectionStatus={connectionStatus}
        message={message}
        darkMode={darkMode}
        theme={theme}
        soundEnabled={soundEnabled}
        recoveryKey={classicRecoveryCodes[classicState.game] || null}
        onToggleFullscreen={toggleFullscreen}
        onToggleDarkMode={toggleDarkMode}
        onToggleSound={toggleSound}
        onStart={() => socket.emit(`${classicState.game}:start`, { code: classicState.code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? `Unable to start ${classicState.gameTitle}.`); })}
        onAddAi={(difficulty: ClassicAiDifficulty) => socket.emit(`${classicState.game}:add-ai`, { code: classicState.code, matchId: classicState.matchId, difficulty }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? `Unable to add ${classicState.gameTitle} AI.`); })}
        onRemoveAi={(playerId) => socket.emit(`${classicState.game}:remove-ai`, { code: classicState.code, matchId: classicState.matchId, playerId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? `Unable to remove ${classicState.gameTitle} AI.`); })}
        onCheatPlay={(cardIds) => socket.emit("cheat:play", { code: classicState.code, matchId: classicState.matchId, cardIds }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? "Cheat play rejected."); })}
        onCheatAccept={() => socket.emit("cheat:accept", { code: classicState.code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to accept that claim."); })}
        onCheatCall={() => socket.emit("cheat:call", { code: classicState.code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to call Cheat."); })}
        onDominoPlay={(tileId, side) => socket.emit("dominoes:play", { code: classicState.code, matchId: classicState.matchId, tileId, side }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? "That Dominoes move is unavailable."); })}
        onDominoDraw={() => socket.emit("dominoes:draw", { code: classicState.code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to draw a domino."); })}
        onDominoPass={() => socket.emit("dominoes:pass", { code: classicState.code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to pass."); })}
        onEndGame={() => socket.emit(`${classicState.game}:end-game`, { code: classicState.code, matchId: classicState.matchId }, (response: ClassicResponse) => { if (!response.ok) setMessage(response.reason ?? `Unable to end ${classicState.gameTitle}.`); })}
        onForfeit={forfeitClassic}
        onLeave={leaveClassic}
        roomActivity={<RoomChatPanel embedded game={classicState.game} code={classicState.code} accent={GAME_BY_ID[classicState.game].accent} spectatorCount={classicState.spectatorCount} gameLog={classicState.actionLog.map((entry) => ({ id: `${classicState.game}-${entry.sequence}`, at: entry.at, label: entry.detail }))} />}
      />
    </>;
  }

  if (wordArenaState) {
    return <>
      <WordArenaScreen state={wordArenaState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} soundEnabled={soundEnabled} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={() => socket.emit(`${wordArenaState.game}:start`, { code: wordArenaState.code }, (response: WordArenaResponse) => { if (!response.ok) setMessage(response.reason ?? `Unable to start ${wordArenaState.gameTitle}.`); })} onNextRound={() => socket.emit(`${wordArenaState.game}:next-round`, { code: wordArenaState.code }, (response: WordArenaResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to start the next round."); })} onSubmit={(value) => socket.emit(`${wordArenaState.game}:submit`, { code: wordArenaState.code, value }, (response: WordArenaResponse) => { if (!response.ok) setMessage(response.reason ?? "That answer was rejected."); })} onClue={(value) => socket.emit("password:clue", { code: wordArenaState.code, value }, (response: WordArenaResponse) => { if (!response.ok) setMessage(response.reason ?? "That clue was rejected."); })} onEndGame={endWordArena} onForfeit={forfeitWordArena} onLeave={leaveWordArena} roomActivity={<RoomChatPanel embedded game={wordArenaState.game} code={wordArenaState.code} accent={GAME_BY_ID[wordArenaState.game].accent} spectatorCount={wordArenaState.spectatorCount} gameLog={wordArenaState.actionLog.map((entry) => ({ id: `${wordArenaState.game}-${entry.sequence}`, at: entry.at, label: entry.detail }))} />} />
    </>;
  }

  if (ayoState) {
    return <AyoScreen state={ayoState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} soundEnabled={soundEnabled} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={()=>socket.emit("ayo:start",{code:ayoState.code},(r:AyoResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to start Ayo.")})} onAddAi={(difficulty:AyoAiDifficulty)=>socket.emit("ayo:add-ai",{code:ayoState.code,difficulty},(r:AyoResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to add Ayo AI.")})} onRemoveAi={(playerId)=>socket.emit("ayo:remove-ai",{code:ayoState.code,playerId},(r:AyoResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to remove Ayo AI.")})} onSow={(pit)=>socket.emit("ayo:sow",{code:ayoState.code,pit},(r:AyoResponse)=>{if(!r.ok)setMessage(r.reason??"That Ayo move is unavailable.")})} onEndGame={endAyo} onForfeit={forfeitAyo} onLeave={leaveAyo} roomActivity={<RoomChatPanel embedded game="ayo" code={ayoState.code} accent="#b87938" spectatorCount={ayoState.spectatorCount} gameLog={ayoState.actionLog.map(e=>({id:`ayo-${e.sequence}`,at:e.at,label:e.detail}))}/>} />;
  }
  if (wordBoardState) {
    return <WordBoardScreen state={wordBoardState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} soundEnabled={soundEnabled} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={()=>socket.emit("word-board:start",{code:wordBoardState.code},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to start Word Board.")})} onAddAi={(difficulty:WordBoardAiDifficulty)=>socket.emit("word-board:add-ai",{code:wordBoardState.code,difficulty},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to add Word Board AI.")})} onRemoveAi={(playerId)=>socket.emit("word-board:remove-ai",{code:wordBoardState.code,playerId},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to remove Word Board AI.")})} onPlay={(placements:WordBoardPlacement[])=>socket.emit("word-board:play",{code:wordBoardState.code,placements},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"That word cannot be played.")})} onPass={()=>socket.emit("word-board:pass",{code:wordBoardState.code},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to pass.")})} onExchange={(tileIds)=>socket.emit("word-board:exchange",{code:wordBoardState.code,tileIds},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"Unable to exchange those tiles.")})} onChallenge={()=>socket.emit("word-board:challenge",{code:wordBoardState.code},(r:WordBoardResponse)=>{if(!r.ok)setMessage(r.reason??"Challenge unavailable.")})} onEndGame={endWordBoard} onForfeit={forfeitWordBoard} onLeave={leaveWordBoard} roomActivity={<RoomChatPanel embedded game="word-board" code={wordBoardState.code} accent="#5b79a6" spectatorCount={wordBoardState.spectatorCount} gameLog={wordBoardState.actionLog.map(e=>({id:`word-board-${e.sequence}`,at:e.at,label:e.detail}))}/>} />;
  }

  if (connectFourState) {
    return <>
      <ConnectFourScreen state={connectFourState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} soundEnabled={soundEnabled} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={() => socket.emit("connect-four:start", { code: connectFourState.code }, (response: ConnectFourResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to start Connect Four."); })} onNextRound={() => socket.emit("connect-four:next-round", { code: connectFourState.code }, (response: ConnectFourResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to start the next Connect Four round."); })} onAddAi={(difficulty: ConnectFourAiDifficulty) => socket.emit("connect-four:add-ai", { code: connectFourState.code, difficulty }, (response: ConnectFourResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to add Connect Four AI."); })} onRemoveAi={(playerId) => socket.emit("connect-four:remove-ai", { code: connectFourState.code, playerId }, (response: ConnectFourResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to remove Connect Four AI."); })} onDrop={(column) => socket.emit("connect-four:drop", { code: connectFourState.code, column }, (response: ConnectFourResponse) => { if (!response.ok) setMessage(response.reason ?? "That Connect Four move is unavailable."); })} onEndGame={endConnectFour} onForfeit={forfeitConnectFour} onLeave={leaveConnectFour} roomActivity={<RoomChatPanel embedded game="connect-four" code={connectFourState.code} accent="#2563eb" spectatorCount={connectFourState.spectatorCount} gameLog={connectFourState.actionLog.map((entry) => ({ id: `connect-four-${entry.sequence}`, at: entry.at, label: entry.detail }))} />} />
    </>;
  }

  if (hiddenDictatorState) {
    return <>
      <HiddenDictatorScreen state={hiddenDictatorState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} soundEnabled={soundEnabled} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={() => socket.emit("hidden-dictator:start", { code: hiddenDictatorState.code }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to start Hidden Dictator."); })} onAddAi={(difficulty: HiddenDictatorAiDifficulty) => socket.emit("hidden-dictator:add-ai", { code: hiddenDictatorState.code, difficulty }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to add Hidden Dictator AI."); })} onRemoveAi={(playerId) => socket.emit("hidden-dictator:remove-ai", { code: hiddenDictatorState.code, playerId }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to remove Hidden Dictator AI."); })} onNominate={(playerId) => socket.emit("hidden-dictator:nominate", { code: hiddenDictatorState.code, playerId }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "That nomination is unavailable."); })} onVote={(vote) => socket.emit("hidden-dictator:vote", { code: hiddenDictatorState.code, vote }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "Vote rejected."); })} onSpeakerDiscard={(index) => socket.emit("hidden-dictator:speaker-discard", { code: hiddenDictatorState.code, index }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "Policy discard rejected."); })} onDeputyEnact={(index) => socket.emit("hidden-dictator:deputy-enact", { code: hiddenDictatorState.code, index }, (response: HiddenDictatorResponse) => { if (!response.ok) setMessage(response.reason ?? "Policy choice rejected."); })} onEndGame={endHiddenDictator} onForfeit={forfeitHiddenDictator} onLeave={leaveHiddenDictator} />
      <RoomChatPanel game="hidden-dictator" code={hiddenDictatorState.code} accent="#b91c1c" spectatorCount={hiddenDictatorState.spectatorCount} gameLog={hiddenDictatorState.actionLog.map((entry) => ({ id: `hidden-dictator-${entry.sequence}`, at: entry.at, label: entry.detail }))} />
    </>;
  }

  if (blackjackState) {
    return <>
      <BlackjackScreen state={blackjackState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} playerName={playerName} soundEnabled={soundEnabled} recoveryKey={blackjackRecoveryCode || null} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={() => socket.emit("blackjack:start", { code: blackjackState.code }, (response: BlackjackResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to deal Blackjack."); })} onAddAi={(difficulty: BlackjackAiDifficulty) => socket.emit("blackjack:add-ai", { code: blackjackState.code, difficulty }, (response: BlackjackResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to add Blackjack AI."); })} onRemoveAi={(playerId) => socket.emit("blackjack:remove-ai", { code: blackjackState.code, playerId }, (response: BlackjackResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to remove Blackjack AI."); })} onAction={(action: BlackjackAction) => socket.emit("blackjack:action", { code: blackjackState.code, action }, (response: BlackjackResponse) => { if (!response.ok) setMessage(response.reason ?? "Blackjack action rejected."); })} onNextRound={() => socket.emit("blackjack:next-round", { code: blackjackState.code }, (response: BlackjackResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to deal next round."); })} onEndTable={endBlackjackTable} onForfeit={forfeitBlackjack} onLeave={leaveBlackjack} roomActivity={<RoomChatPanel embedded game="blackjack" code={blackjackState.code} accent="#2563eb" spectatorCount={blackjackState.spectatorCount} gameLog={blackjackState.started ? [{ id: `blackjack-${blackjackState.roundNumber}-${blackjackState.updatedAt}`, at: blackjackState.updatedAt, label: blackjackState.status }] : []} />} />
    </>;
  }
  if (ludoState) {
    return <>
      <LudoScreen state={ludoState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} soundEnabled={soundEnabled} recoveryKey={ludoRecoveryCode || null} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={() => socket.emit("ludo:start", { code: ludoState.code }, (response: LudoResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to start Ludo."); })} onAddAi={(difficulty: LudoAiDifficulty) => socket.emit("ludo:add-ai", { code: ludoState.code, difficulty }, (response: LudoResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to add Ludo AI."); })} onRemoveAi={(playerId) => socket.emit("ludo:remove-ai", { code: ludoState.code, playerId }, (response: LudoResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to remove Ludo AI."); })} onRoll={() => socket.emit("ludo:roll", { code: ludoState.code }, (response: LudoResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to roll Ludo dice."); })} onMove={(pieceId) => socket.emit("ludo:move", { code: ludoState.code, pieceId }, (response: LudoResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to move that Ludo piece."); })} onAutopilotChange={(enabled) => socket.emit("ludo:set-autopilot", { code: ludoState.code, enabled }, (response: LudoResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to change Ludo Autopilot."); })} onEndGame={endLudoGame} onForfeit={forfeitLudo} onLeave={leaveLudo} roomActivity={<RoomChatPanel embedded game="ludo" code={ludoState.code} accent="#d97706" spectatorCount={ludoState.spectatorCount} gameLog={ludoState.actionLog.map((entry) => ({ id: `ludo-${entry.sequence}`, at: entry.at, label: entry.detail }))} />} />
    </>;
  }

  if (whotState) {
    return <>
      <WhotScreen state={whotState} connectionStatus={connectionStatus} message={message} darkMode={darkMode} theme={theme} playerName={playerName} soundEnabled={soundEnabled} recoveryKey={whotRecoveryCode || null} onToggleFullscreen={toggleFullscreen} onToggleDarkMode={toggleDarkMode} onToggleSound={toggleSound} onStart={() => socket.emit("whot:start", { code: whotState.code }, (response: WhotResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to start WHOT."); })} onAddAi={(difficulty: WhotAiDifficulty) => socket.emit("whot:add-ai", { code: whotState.code, difficulty }, (response: WhotResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to add WHOT AI."); })} onRemoveAi={(playerId) => socket.emit("whot:remove-ai", { code: whotState.code, playerId }, (response: WhotResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to remove WHOT AI."); })} onPlay={(cardId: string, requestedShape?: WhotShape) => socket.emit("whot:play", { code: whotState.code, cardId, requestedShape }, (response: WhotResponse) => { if (!response.ok) setMessage(response.reason ?? "WHOT card rejected."); })} onDraw={() => socket.emit("whot:draw", { code: whotState.code }, (response: WhotResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to draw WHOT card."); })} onAutopilotChange={(enabled: boolean) => socket.emit("whot:set-autopilot", { code: whotState.code, enabled }, (response: WhotResponse) => { if (!response.ok) setMessage(response.reason ?? "Unable to change WHOT Autopilot."); })} onEndGame={endWhotGame} onForfeit={forfeitWhot} onLeave={leaveWhot} roomActivity={<RoomChatPanel embedded game="whot" code={whotState.code} accent="#8b1e2d" spectatorCount={whotState.spectatorCount} gameLog={whotState.actionLog.map((entry) => ({ id: `whot-${entry.sequence}`, at: entry.at, label: entry.detail }))} />} />
    </>;
  }

  if (pokerState) {
    return (
      <>
        <PokerScreen
          state={pokerState}
          connectionStatus={connectionStatus}
          message={message}
          darkMode={darkMode}
          theme={theme}
          soundEnabled={soundEnabled}
          recoveryKey={pokerRecoveryCode || null}
          isUpdatingAutopilot={isUpdatingPokerAutopilot}
          onToggleDarkMode={toggleDarkMode}
          onToggleSound={toggleSound}
          onToggleFullscreen={toggleFullscreen}
          onAutopilotChange={handlePokerAutopilotChange}
          onStart={handlePokerStart}
          onAiDifficultyChange={handlePokerAiDifficultyChange}
          onAddAi={handlePokerAddAi}
          onRemoveAi={handlePokerRemoveAi}
          onAction={handlePokerAction}
          onNextHand={handlePokerNextHand}
          onForfeit={handlePokerForfeit}
          onEndTable={handlePokerEndTable}
          onLeave={handleLeavePoker}
          onOpenLeaderboard={() => setPokerLeaderboardOpen(true)}
          roomActivity={<RoomChatPanel embedded game="poker" code={pokerState.code} accent="#be123c" spectatorCount={pokerState.spectatorCount} gameLog={pokerState.actionLog.map((entry) => ({ id: `poker-${entry.sequence}`, at: entry.at, label: entry.detail }))} />}
        />
        {pokerLeaderboardOpen && <PokerLeaderboardModal theme={theme} onClose={() => setPokerLeaderboardOpen(false)} />}
      </>
    );
  }

  if (
    !megaBoardParked &&
    gameStarted &&
    gameState?.phase === "finished"
  ) {
    return (
      <>
        <WinnerScreen
          gameState={gameState}
          darkMode={darkMode}
          theme={theme}
          onToggleDarkMode={toggleDarkMode}
          isHost={isHost}
          onExit={
            isSpectator
              ? handleLeaveSpectator
              : isHost
                ? handleEndRoom
                : handleLeaveGame
          }
        />
        {lobby && <RoomChatPanel game="mega-board" code={lobby.code} accent="var(--hgr-brand)" spectatorCount={spectators.length} spectatorNames={spectators.map((spectator) => spectator.name)} gameLog={(gameState?.activityLog ?? []).map((entry) => ({ id: entry.id, at: entry.at, label: entry.message }))} />}
      </>
    );
  }

  if (!megaBoardParked && gameStarted && lobby && gameState?.phase === "ordering") {
    return (
      <>
        <TurnOrderScreen
          lobby={lobby}
          gameState={gameState}
          message={message}
          darkMode={darkMode}
          theme={theme}
          onToggleDarkMode={toggleDarkMode}
          onOrderRoll={handleOrderRoll}
          onSelectToken={handleSelectMegaToken}
          onBackToGameRoom={handleBackToGameRoom}
          onOpenMenu={() => {
            setPlayersDrawerOpen(false);
            setSelectedPlayerDetailId(null);
            setTurnActionsCloseSignal((value) => value + 1);
            setGameMenuOpen(true);
          }}
        />
        <GameMenu
          open={gameMenuOpen}
          isHost={isHost}
          gameStarted={gameStarted}
          roomCode={lobby.code}
          recoveryKey={activeRecoveryKey}
          playerName={playerName}
          isSpectator={isSpectator}
          darkMode={darkMode}
          soundEnabled={soundEnabled}
          turnTimerSeconds={gameState?.turnTimerSeconds}
          isUpdatingTurnTimer={isUpdatingTurnTimer}
          onToggleDarkMode={toggleDarkMode}
          onToggleSound={toggleSound}
          onToggleFullscreen={toggleFullscreen}
          onTurnTimerChange={handleTurnTimerChange}
          onClose={() =>
            setGameMenuOpen(false)
          }
          onLeave={isSpectator ? handleLeaveSpectator : handleLeaveGame}
          onExportReport={() => downloadGameReport(gameState)}
          onEndRoom={handleEndRoom}
        />
        <RoomChatPanel game="mega-board" code={lobby.code} accent="var(--hgr-brand)" spectatorCount={spectators.length} spectatorNames={spectators.map((spectator) => spectator.name)} gameLog={(gameState?.activityLog ?? []).map((entry) => ({ id: entry.id, at: entry.at, label: entry.message }))} />
      </>
    );
  }

  if (!megaBoardParked && gameStarted && lobby && gameState) {
    return (
      <main
        className="game-page mega-live-page"
        style={{
          ...styles.gamePage,
          background: theme.pageBackground,
          color: theme.text,
        }}
      >
        <GameChrome
          accent="var(--hgr-brand)"
          className="mega-game-chrome"
          onBackToGameRoom={handleBackToGameRoom}
          onOpenMenu={() => {
            setPlayersDrawerOpen(false);
            setTurnActionsCloseSignal((value) => value + 1);
            setGameMenuOpen(true);
          }}
        />

        <GameMenu
          open={gameMenuOpen}
          isHost={isHost}
          gameStarted={gameStarted}
          roomCode={lobby.code}
          recoveryKey={activeRecoveryKey}
          playerName={playerName}
          isSpectator={isSpectator}
          darkMode={darkMode}
          soundEnabled={soundEnabled}
          turnTimerSeconds={gameState?.turnTimerSeconds}
          isUpdatingTurnTimer={isUpdatingTurnTimer}
          onToggleDarkMode={toggleDarkMode}
          onToggleSound={toggleSound}
          onToggleFullscreen={toggleFullscreen}
          onTurnTimerChange={handleTurnTimerChange}
          onClose={() =>
            setGameMenuOpen(false)
          }
          onLeave={isSpectator ? handleLeaveSpectator : handleLeaveGame}
          onForfeit={handleForfeitGame}
          onOpenHistory={() => {
            setGameMenuOpen(false);
            setPlayersDrawerOpen(false);
            setTurnActionPanel("history");
            setTurnActionsOpenSignal((value) => value + 1);
          }}
          onExportReport={() => downloadGameReport(gameState)}
          onEndRoom={handleEndRoom}
        />

        {availablePropertiesOpen && (
          <AvailablePropertiesModal
            gameState={gameState}
            theme={theme}
            onClose={() => setAvailablePropertiesOpen(false)}
          />
        )}

        {selectedPlayerDetailId && (
          <PlayerDetailsModal
            gameState={gameState}
            playerId={selectedPlayerDetailId}
            viewerPlayerId={lobby.playerId}
            isSpectator={viewerIsSpectator}
            theme={theme}
            onClose={() => setSelectedPlayerDetailId(null)}
            onManageProperties={() => {
              setSelectedPlayerDetailId(null);
              setTurnActionPanel("properties");
              setTurnActionsOpenSignal((value) => value + 1);
            }}
            onMakeDeal={(recipientId) => {
              setSelectedPlayerDetailId(null);
              publishLiveTradeDraft(emptyTradeDraft([recipientId]));
              setTurnActionPanel("trade");
              setTurnActionsOpenSignal((value) => value + 1);
            }}
          />
        )}

        <header className="game-header card-game-header card-game-header-polished mega-active-header">
          <div className="card-game-brand-lockup mega-game-brand-lockup">
            <GameBrandIcon game="mega-board" className="card-game-letter-token" />
            <div><p>Halieus Game Room</p><h1>Mega Board</h1></div>
          </div>
          <div className="card-game-meta game-header-details mega-game-meta">
            <span><small>Room</small><strong>{lobby.code}</strong></span>
            <span><small>Match</small><strong>{blitz ? "⚡ Blitz" : ranked ? "🏆 Ranked" : "Casual"}</strong></span>
            <span><small>Players</small><strong>{gameState.players.length}</strong></span>
            <span><small>Duration</small><strong>{formatDuration(Math.max(0, localClock.getTime() - (gameState.gameStartedAt ?? localClock.getTime())))}</strong></span>
            {megaRollTimerLabel && activeMegaTurnPlayer ? (
              <span
                className={`mega-roll-timer ${megaRollTimerSeconds != null && megaRollTimerSeconds <= 10 ? "is-urgent" : ""}`}
                title={`${activeMegaTurnPlayer.name} has until this timer reaches zero to roll before Autopilot takes over.`}
              >
                <small>{activeMegaTurnPlayer.id === lobby.playerId ? "Roll timer" : `${activeMegaTurnPlayer.name} · auto in`}</small>
                <strong>{megaRollTimerLabel}</strong>
              </span>
            ) : (
              <span><small>Time</small><strong>{localClock.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong></span>
            )}
            <span className={connectionStatus === "Connected" ? "is-online" : ""}><small>Status</small><strong>{connectionStatus}</strong></span>
            {!viewerIsSpectator && currentGamePlayer && !currentGamePlayer.isAi && !currentGamePlayer.isBankrupt && (
              <AutopilotControl active={autopilotActive} updating={isUpdatingAutopilot} compact onChange={handleAutopilotChange} />
            )}
          </div>
        </header>

        <button
          type="button"
          className="tablet-players-trigger"
          aria-expanded={playersDrawerOpen}
          aria-controls="tablet-players-drawer"
          onClick={() => {
            setGameMenuOpen(false);
            setTurnActionsCloseSignal((value) => value + 1);
            setPlayersDrawerOpen(true);
          }}
        >
          <span aria-hidden="true">👥</span>
          <strong>Players</strong>
          <small>{gameState.players.length}</small>
        </button>

        {playersDrawerOpen && (
          <div
            className="tablet-players-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setPlayersDrawerOpen(false);
              }
            }}
          >
            <aside
              id="tablet-players-drawer"
              className="tablet-players-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Players and spectators"
            >
              <header className="tablet-players-drawer-header">
                <div>
                  <span>Match</span>
                  <strong>Players</strong>
                </div>
                <button
                  type="button"
                  aria-label="Close players"
                  onClick={() => setPlayersDrawerOpen(false)}
                >
                  ×
                </button>
              </header>
              <PlayerRail
                lobby={lobby}
                gameState={gameState}
                isSpectator={viewerIsSpectator}
                spectators={spectators}
                onPlayerSelect={(playerId) => {
                  setPlayersDrawerOpen(false);
                  setGameMenuOpen(false);
                  setTurnActionsCloseSignal((value) => value + 1);
                  setSelectedPlayerDetailId(playerId);
                }}
                theme={theme}
              />
            </aside>
          </div>
        )}

        {lobby.hostDisconnectDeadline && (
          <div
            className="host-warning game-host-warning"
            role="status"
          >
            The host is reconnecting. The game
            closes automatically if they do not
            return within 90 seconds.
          </div>
        )}

        <div
          className={`game-layout mega-live-layout-v3 ${autopilotActive ? "autopilot-active-layout" : ""}`}
          style={styles.gameLayout}
        >
          <PlayerRail
            className="player-rail-side player-rail-side-left mega-live-player-rail"
            lobby={lobby}
            gameState={gameState}
            players={leftRailPlayers}
            headerTitle="Table"
            isSpectator={viewerIsSpectator}
            spectators={spectators}
            showSpectators={rightRailPlayers.length === 0}
            onPlayerSelect={(playerId) => {
              setGameMenuOpen(false);
              setTurnActionsCloseSignal((value) => value + 1);
              setSelectedPlayerDetailId(playerId);
            }}
            theme={theme}
          />

          <GameBoard
            roomCode={lobby.code}
            playerId={lobby.playerId}
            gameState={gameState}
            darkMode={darkMode}
            message={message}
            isSpectator={viewerIsSpectator}
            isResolvingPurchase={isResolvingPurchase}
            isSubmittingRoll={isSubmittingRoll}
            isResolvingCard={isResolvingCard}
            isResolvingAuction={isResolvingAuction}
            isResolvingJail={isResolvingJail}
            isResolvingSpeedDie={isResolvingSpeedDie}
            isResolvingMega={isResolvingMega}
            theme={theme}
            onRollDice={handleRollDice}
            onEndTurn={handleEndTurn}
            onPurchase={handlePurchaseProperty}
            onDeclinePurchase={handleDeclinePurchase}
            onCardContinue={handleCardContinue}
            onAuctionBid={handleAuctionBid}
            onAuctionWithdraw={handleAuctionWithdraw}
            onJailRoll={handleJailRoll}
            onJailPayFine={handleJailPayFine}
            onJailUseCard={handleJailUseCard}
            onSpeedDieTripleMove={handleSpeedDieTripleMove}
            onSpeedDieBusMove={handleSpeedDieBusMove}
            onSpeedDieMrMonopoly={handleSpeedDieMrMonopoly}
            onStartBusTicket={handleStartBusTicket}
            onBusTicketMove={handleBusTicketMove}
            onBusTicketCancel={handleBusTicketCancel}
            onBirthdayCash={handleBirthdayCash}
            onBirthdayTicket={handleBirthdayTicket}
            onAuctionSpaceSelect={handleAuctionSpaceSelect}
            onOpenBank={() => setAvailablePropertiesOpen(true)}
            onOpenActionPanel={(panel) => {
              setPlayersDrawerOpen(false);
              setSelectedPlayerDetailId(null);
              setGameMenuOpen(false);
              setTurnActionPanel(panel);
              setTurnActionsOpenSignal((value) => value + 1);
            }}
          />

          <LiveTradeOverlay gameState={gameState} livePreview={liveTradePreview} viewerPlayerId={lobby.playerId} />

          {rightRailPlayers.length > 0 && (
            <PlayerRail
              className="player-rail-side player-rail-side-right mega-live-player-rail"
              lobby={lobby}
              gameState={gameState}
              players={rightRailPlayers}
              headerTitle="Table"
              isSpectator={viewerIsSpectator}
              spectators={spectators}
              showSpectators={true}
              onPlayerSelect={(playerId) => {
                setGameMenuOpen(false);
                setTurnActionsCloseSignal((value) => value + 1);
                setSelectedPlayerDetailId(playerId);
              }}
              theme={theme}
            />
          )}

          <div className="right-game-stack">
            <GameSidebar
              lobby={lobby}
              gameState={gameState}
              connectionStatus={connectionStatus}
              isSpectator={viewerIsSpectator}
              isBuilding={isBuilding}
              isManagingAsset={isManagingAsset}
              isSubmittingTrade={isSubmittingTrade}
              isResolvingDebt={isResolvingDebt}
              tradeDraft={tradeDraft}
              theme={theme}
              onBuild={handleBuildProperty}
              onBuildTo={handleBuildToProperty}
              onBuildGroupTo={handleBuildGroupToProperty}
              onMortgage={handleMortgage}
              onUnmortgage={handleUnmortgage}
              onSellBuilding={handleSellBuilding}
              onBuildDepot={handleBuildDepot}
              onSellDepot={handleSellDepot}
              onTradeDraftChange={publishLiveTradeDraft}
              onTradePropose={handleTradePropose}
              onTradeAccept={handleTradeAccept}
              onTradeDecline={handleTradeDecline}
              onRejectAllTrades={handleRejectAllTrades}
              onPayDebt={handlePayDebt}
              onAutoLiquidateDebt={handleAutoLiquidateDebt}
              onDeclareBankruptcy={handleDeclareBankruptcy}
              closeSignal={turnActionsCloseSignal}
              openSignal={turnActionsOpenSignal}
              openPanel={turnActionPanel}
              onOpenChange={(open, panel) => {
                if (open) {
                  setPlayersDrawerOpen(false);
                  setGameMenuOpen(false);
                } else if (panel === "trade" && !gameState.pendingTrade && liveTradePreview) {
                  closeLiveTradeDraft();
                }
              }}
            />
          </div>
        </div>
        <ConfirmDialog open={bankruptcyConfirmOpen} title="Declare bankruptcy?" message="You will leave active play, surrender the remaining estate according to the game rules, and continue watching as a spectator." confirmLabel="Declare bankruptcy" destructive onCancel={() => setBankruptcyConfirmOpen(false)} onConfirm={() => { setBankruptcyConfirmOpen(false); handleDebtAction("game:declare-bankruptcy", "Declaring bankruptcy..."); }} />
        <RoomChatPanel game="mega-board" code={lobby.code} accent="var(--hgr-brand)" spectatorCount={spectators.length} spectatorNames={spectators.map((spectator) => spectator.name)} gameLog={(gameState?.activityLog ?? []).map((entry) => ({ id: entry.id, at: entry.at, label: entry.message }))} />
      </main>
    );
  }

  if (!megaBoardParked && lobby) {
    return (
      <>
        <LobbyScreen
          lobby={lobby}
          connectionStatus={connectionStatus}
          ranked={ranked}
          blitz={blitz}
          message={message}
          darkMode={darkMode}
          theme={theme}
          onToggleDarkMode={toggleDarkMode}
          onStartGame={handleStartGame}
          recoveryKey={activeRecoveryKey}
          onLeaveLobby={
            isHost
              ? handleEndRoom
              : handleLeaveGame
          }
          onBackToGameRoom={handleBackToGameRoom}
          onAddAi={handleAddAi}
          onRemoveAi={handleRemoveAi}
          onBoardStyleChange={(style) => new Promise<void>((resolve, reject) => {
            const previousStyle = lobby.boardStyle ?? "classic-board";
            // Cosmetic selection should feel immediate. The server remains
            // authoritative; a rejected choice rolls back to the prior board.
            setLobby(current => current ? { ...current, boardStyle: style } : current);
            socket.emit("game:set-board-style", { code: lobby.code, style }, (response: GameResponse) => {
              if (!response.ok) {
                setLobby(current => current ? { ...current, boardStyle: previousStyle } : current);
                reject(new Error(response.reason ?? "Unable to change Room Style."));
                return;
              }
              if (response.room) setLobby(current => current ? { ...current, boardStyle: response.room!.boardStyle } : current);
              resolve();
            });
          })}
          onTurnTimerChange={handleTurnTimerChange}
          isUpdatingTurnTimer={isUpdatingTurnTimer}
          betaMode={betaMode}
        />
        <RoomChatPanel game="mega-board" code={lobby.code} accent="var(--hgr-brand)" spectatorCount={spectators.length} spectatorNames={spectators.map((spectator) => spectator.name)} gameLog={(gameState?.activityLog ?? []).map((entry) => ({ id: entry.id, at: entry.at, label: entry.message }))} />
      </>
    );
  }

  // 4.0.0: normal authenticated root visits get one short branded arrival per browsing session.
  // Direct room links and active recovery routes still bypass presentation entirely.

  if (!guestAccessRequested && !authStatus) {
    // Normal access resolution is intentionally textless. The static Halieus
    // first-paint curtain remains above this surface until auth is resolved,
    // so network latency never becomes a user-facing technical loading page.
    return (
      <main className={`account-loading-screen ${darkMode ? "is-dark" : "is-light"}`} aria-live={authLoadError ? "polite" : "off"}>
        {authLoadError && (
          <div className="account-loading-error">
            <strong>Halieus couldn’t connect.</strong>
            <span>{authLoadError}</span>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
      </main>
    );
  }

  if (!guestAccessRequested && authStatus && !authStatus.authenticated) {
    return <AccountPortal authStatus={authStatus} darkMode={darkMode} onAuthenticated={applyAuthenticatedAccount} onToggleDarkMode={toggleDarkMode} returnPath={directGuestRoute ? currentRoomReturnPath() : null} />;
  }

  const showSiteIntro = !directGuestRoute && !hasRecoverableSession && Boolean(authStatus?.authenticated) && !siteIntroSeen;

  if (inviteCode) {
    return (
      <InviteJoinScreen
        connectionStatus={connectionStatus}
        roomCode={inviteCode}
        playerName={playerName}
        message={message}
        preview={invitePreview}
        isLoading={isLoadingInvite}
        isJoining={isJoining}
        isRecovering={isRecovering}
        canResumeSavedSeat={
          savedSession?.code ===
          inviteCode
        }
        darkMode={darkMode}
        theme={theme}
        onToggleDarkMode={toggleDarkMode}
        onPlayerNameChange={setPlayerName}
        playerNameLocked={Boolean(authStatus?.authenticated && authStatus.account)}
        onJoin={handleJoinGame}
        onRefresh={handleRefreshInvite}
        onResumeSavedSeat={
          handleResumeSavedSession
        }
        onGoHome={handleInviteGoHome}
      />
    );
  }

  return (
    <>
    {/* Mount the real destination before starting any intro fade. */}
    <div ref={(node) => node?.toggleAttribute("inert", showSiteIntro)} aria-hidden={showSiteIntro || undefined}>
    <HomeScreen
      connectionStatus={connectionStatus}
      selectedGame={selectedGame}
      playerName={playerName}
      roomCode={roomCode}
      ranked={ranked}
      blitz={blitz}
      freeParkingJackpotEnabled={freeParkingJackpotEnabled}
      message={message}
      recoveryCode={recoveryCode}
      pokerRecoveryCode={pokerRecoveryCode}
      blackjackRecoveryCode={blackjackRecoveryCode}
      whotRecoveryCode={whotRecoveryCode}
      ludoRecoveryCode={ludoRecoveryCode}
      connectFourRecoveryCode={connectFourRecoveryCode}
      ayoRecoveryCode={ayoRecoveryCode}
      wordBoardRecoveryCode={wordBoardRecoveryCode}
      hiddenDictatorRecoveryCode={hiddenDictatorRecoveryCode}
      savedSession={savedSession}
      pokerSavedSession={pokerSavedSession}
      blackjackSavedSession={blackjackSavedSession}
      whotSavedSession={whotSavedSession}
      ludoSavedSession={ludoSavedSession}
      connectFourSavedSession={connectFourSavedSession}
      ayoSavedSession={ayoSavedSession}
      wordBoardSavedSession={wordBoardSavedSession}
      hiddenDictatorSavedSession={hiddenDictatorSavedSession}
      pokerStartingChips={pokerStartingChips}
      pokerSmallBlind={pokerSmallBlind}
      pokerBigBlind={pokerBigBlind}
      pokerMatchMode={pokerMatchMode}
      pokerVariant={pokerVariant}
      whotMatchMode={whotMatchMode}
      ludoMatchMode={ludoMatchMode}
      blackjackMatchMode={blackjackMatchMode}
      connectFourMatchMode={connectFourMatchMode}
      connectFourBestOf={connectFourBestOf}
      ayoMatchMode={ayoMatchMode}
      hiddenDictatorMatchMode={hiddenDictatorMatchMode}
      isCreating={isCreating}
      isJoining={isJoining}
      isRecovering={isRecovering}
      darkMode={darkMode}
      account={authStatus?.account ?? null}
      betaMode={betaMode}
      onOpenAccount={() => setAccountPanelOpen(true)}
      theme={theme}
      themeMode={themeMode}
      themeProfileId={themeProfileId}
      onToggleDarkMode={toggleDarkMode}
      onGameSelect={(game) => { setSelectedGame(game); setMessage(""); }}
      onPlayerNameChange={setPlayerName}
      onRoomCodeChange={setRoomCode}
      onRecoveryCodeChange={setRecoveryCode}
      onPokerRecoveryCodeChange={setPokerRecoveryCode}
      onBlackjackRecoveryCodeChange={setBlackjackRecoveryCode}
      onWhotRecoveryCodeChange={setWhotRecoveryCode}
      onLudoRecoveryCodeChange={setLudoRecoveryCode}
      onConnectFourRecoveryCodeChange={setConnectFourRecoveryCode}
      onAyoRecoveryCodeChange={setAyoRecoveryCode}
      onWordBoardRecoveryCodeChange={setWordBoardRecoveryCode}
      onHiddenDictatorRecoveryCodeChange={setHiddenDictatorRecoveryCode}
      onPokerStartingChipsChange={setPokerStartingChips}
      onPokerSmallBlindChange={setPokerSmallBlind}
      onPokerBigBlindChange={setPokerBigBlind}
      onPokerMatchModeChange={setPokerMatchMode}
      onPokerVariantChange={setPokerVariant}
      onWhotMatchModeChange={setWhotMatchMode}
      onLudoMatchModeChange={setLudoMatchMode}
      onBlackjackMatchModeChange={setBlackjackMatchMode}
      onConnectFourMatchModeChange={setConnectFourMatchMode}
      onConnectFourBestOfChange={setConnectFourBestOf}
      onAyoMatchModeChange={setAyoMatchMode}
      onHiddenDictatorMatchModeChange={setHiddenDictatorMatchMode}
      onGenerateRoomCode={() => setRoomCode(generateRoomCode())}
      onOpenLeaderboard={handleOpenLeaderboard}
      onOpenPokerLeaderboard={() => setPokerLeaderboardOpen(true)}
      onMatchModeChange={(mode) => {
        setRanked(mode === "ranked");
        setBlitz(mode === "blitz");
        if (mode === "ranked") setFreeParkingJackpotEnabled(false);
      }}
      onFreeParkingJackpotChange={setFreeParkingJackpotEnabled}
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
      onSpectateGame={handleSpectateGame}
      onManualReconnect={
        handleManualReconnect
      }
      onResumeSavedSession={
        handleResumeSavedSession
      }
      onForgetSavedSession={handleForgetSavedSession}
      onCreatePoker={handleCreatePoker}
      onJoinPoker={handleJoinPoker}
      onSpectatePoker={handleSpectatePoker}
      onManualPokerReconnect={() => recoverPoker({ code: roomCode, playerName, reconnectToken: pokerRecoveryCode })}
      onResumePokerSession={() => { if (pokerSavedSession) recoverPoker(pokerSavedSession); }}
      onForgetPokerSession={() => { clearPokerSession(); setPokerSavedSession(null); setPokerRecoveryCode(""); setMessage("Saved poker seat forgotten."); }}
      onCreateBlackjack={createBlackjack}
      onJoinBlackjack={joinBlackjack}
      onSpectateBlackjack={spectateBlackjack}
      onManualBlackjackReconnect={() => recoverBlackjack({ code: roomCode, playerName, reconnectToken: blackjackRecoveryCode })}
      onResumeBlackjackSession={() => { if (blackjackSavedSession) recoverBlackjack(blackjackSavedSession); }}
      onForgetBlackjackSession={() => { clearCardSession(BLACKJACK_SESSION_KEY); setBlackjackSavedSession(null); setBlackjackRecoveryCode(""); setMessage("Saved Blackjack seat forgotten."); }}
      onCreateWhot={createWhot}
      onJoinWhot={joinWhot}
      onSpectateWhot={spectateWhot}
      onManualWhotReconnect={() => recoverWhot({ code: roomCode, playerName, reconnectToken: whotRecoveryCode })}
      onResumeWhotSession={() => { if (whotSavedSession) recoverWhot(whotSavedSession); }}
      onForgetWhotSession={() => { clearCardSession(WHOT_SESSION_KEY); setWhotSavedSession(null); setWhotRecoveryCode(""); setMessage("Saved WHOT seat forgotten."); }}
      onCreateLudo={createLudo}
      onJoinLudo={joinLudo}
      onSpectateLudo={spectateLudo}
      onManualLudoReconnect={() => recoverLudo({ code: roomCode, playerName, reconnectToken: ludoRecoveryCode })}
      onResumeLudoSession={() => { if (ludoSavedSession) recoverLudo(ludoSavedSession); }}
      onForgetLudoSession={() => { clearCardSession(LUDO_SESSION_KEY); setLudoSavedSession(null); setLudoRecoveryCode(""); setMessage("Saved Ludo seat forgotten."); }}
      onCreateConnectFour={createConnectFour}
      onCreateAyo={createAyo}
      onJoinAyo={joinAyo}
      onSpectateAyo={spectateAyo}
      onManualAyoReconnect={() => recoverAyo({ code: roomCode, playerName, reconnectToken: ayoRecoveryCode })}
      onResumeAyoSession={() => { if (ayoSavedSession) recoverAyo(ayoSavedSession); }}
      onForgetAyoSession={() => { clearCardSession(AYO_SESSION_KEY); setAyoSavedSession(null); setAyoRecoveryCode(""); setMessage("Saved Ayo seat forgotten."); }}
      onCreateWordBoard={createWordBoard}
      onJoinWordBoard={joinWordBoard}
      onSpectateWordBoard={spectateWordBoard}
      onManualWordBoardReconnect={() => recoverWordBoard({ code: roomCode, playerName, reconnectToken: wordBoardRecoveryCode })}
      onResumeWordBoardSession={() => { if (wordBoardSavedSession) recoverWordBoard(wordBoardSavedSession); }}
      onForgetWordBoardSession={() => { clearCardSession(WORD_BOARD_SESSION_KEY); setWordBoardSavedSession(null); setWordBoardRecoveryCode(""); setMessage("Saved Word Board seat forgotten."); }}
      onJoinConnectFour={joinConnectFour}
      onSpectateConnectFour={spectateConnectFour}
      onManualConnectFourReconnect={() => recoverConnectFour({ code: roomCode, playerName, reconnectToken: connectFourRecoveryCode })}
      onResumeConnectFourSession={() => { if (connectFourSavedSession) recoverConnectFour(connectFourSavedSession); }}
      onForgetConnectFourSession={() => { clearCardSession(CONNECT_FOUR_SESSION_KEY); setConnectFourSavedSession(null); setConnectFourRecoveryCode(""); setMessage("Saved Connect Four seat forgotten."); }}
      onCreateHiddenDictator={createHiddenDictator}
      onJoinHiddenDictator={joinHiddenDictator}
      onSpectateHiddenDictator={spectateHiddenDictator}
      onManualHiddenDictatorReconnect={() => recoverHiddenDictator({ code: roomCode, playerName, reconnectToken: hiddenDictatorRecoveryCode })}
      onResumeHiddenDictatorSession={() => { if (hiddenDictatorSavedSession) recoverHiddenDictator(hiddenDictatorSavedSession); }}
      onForgetHiddenDictatorSession={() => { clearCardSession(HIDDEN_DICTATOR_SESSION_KEY); setHiddenDictatorSavedSession(null); setHiddenDictatorRecoveryCode(""); setMessage("Saved Hidden Dictator seat forgotten."); }}
      classicSavedSessions={classicSavedSessions}
      classicRecoveryCodes={classicRecoveryCodes}
      classicMatchModes={classicMatchModes}
      onClassicRecoveryCodeChange={(game, value) => setClassicRecoveryCodes((current) => ({ ...current, [game]: value }))}
      onClassicMatchModeChange={(game, value) => setClassicMatchModes((current) => ({ ...current, [game]: value }))}
      onCreateClassic={createClassic}
      onJoinClassic={joinClassic}
      onSpectateClassic={spectateClassic}
      onManualClassicReconnect={(game) => recoverClassic(game, { code: roomCode, playerName, reconnectToken: classicRecoveryCodes[game] })}
      onResumeClassicSession={(game) => { const session = classicSavedSessions[game]; if (session) recoverClassic(game, session); }}
      onForgetClassicSession={(game) => { updateClassicSavedSession(game, null); setMessage(`Saved ${GAME_BY_ID[game].name} seat forgotten.`); }}
      wordArenaSavedSessions={wordArenaSavedSessions}
      wordArenaRecoveryCodes={wordArenaRecoveryCodes}
      onWordArenaRecoveryCodeChange={(game, value) => setWordArenaRecoveryCodes((current) => ({ ...current, [game]: value }))}
      onCreateWordArena={createWordArena}
      onJoinWordArena={joinWordArena}
      onSpectateWordArena={spectateWordArena}
      onManualWordArenaReconnect={(game) => recoverWordArena(game, { code: roomCode, playerName, reconnectToken: wordArenaRecoveryCodes[game] })}
      onResumeWordArenaSession={(game) => { const session = wordArenaSavedSessions[game]; if (session) recoverWordArena(game, session); }}
      onForgetWordArenaSession={(game) => { updateWordArenaSavedSession(game, null); setMessage(`Saved ${GAME_BY_ID[game].name} seat forgotten.`); }}
    />
    {accountPanelOpen && authStatus?.account && <AccountPanel account={authStatus.account} betaMode={betaMode} onEnterBetaMode={enterBetaTestMode} onExitBetaMode={exitBetaTestMode} onClose={() => setAccountPanelOpen(false)} onAccountChange={(account) => { const previousName = authStatus.account?.displayName; applyAuthenticatedAccount(account); if (!betaMode && (!playerName.trim() || playerName === previousName)) setPlayerName(account.displayName); }} onLogout={() => void signOutAccount()} />}
    {leaderboardOpen && (
      <LeaderboardModal
        entries={leaderboardEntries}
        recentMatches={recentRankedMatches}
        loading={leaderboardLoading}
        error={leaderboardError}
        theme={theme}
        onClose={() => setLeaderboardOpen(false)}
        onRefresh={loadRankedLeaderboard}
      />
    )}
    {pokerLeaderboardOpen && <PokerLeaderboardModal theme={theme} onClose={() => setPokerLeaderboardOpen(false)} />}
    </div>
    {showSiteIntro && <HalieusIntro displayName={authStatus?.account?.displayName} onEnter={completeSiteIntro} />}
    </>
  );
}
