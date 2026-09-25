import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type {
  HalieusAccountSummary,
  HalieusGameInviteSummary,
  HalieusGameRequestSummary,
  HalieusPersonalStats,
  HalieusPlayerDirectoryEntry,
  HalieusQuickPlayProfile,
  HalieusQuickPlayPreference,
} from "../../../../shared/platform/accounts";
import type { BlackjackAiDifficulty, BlackjackMatchMode } from "../../../../shared/games/blackjack/types";
import type { ConnectFourBestOf, ConnectFourMatchMode } from "../../../../shared/games/connect-four/types";
import type { HiddenDictatorMatchMode } from "../../../../shared/games/hidden-dictator/types";
import type { LudoMatchMode } from "../../../../shared/games/ludo/types";
import type { WhotAiDifficulty, WhotMatchMode } from "../../../../shared/games/whot/types";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games";
import type { HalieusGameRatings } from "../skins";
import type { HalieusGuildInvitation } from "../../../../shared/platform/guilds";
import type { WordArenaCreateOptions, WordArenaGameId, WordArenaMatchMode, WordGameMode } from "../../../../shared/games/word-arena/types";
import type { ClassicAiDifficulty, ClassicCreateOptions, ClassicGameId, ClassicMatchMode } from "../../../../shared/games/classic-table/types";
import { accountApi } from "../accounts/api";
import { ACTIVE_GAME_CATALOG, ACTIVE_GAME_IDS, FUTURE_GAME_QUEUE, GAME_BY_ID, type GameId } from "../games/catalog";
import { ThemeButton } from "./ThemeButton";
import { SkinLibraryButton } from "./SkinLibraryButton";
import { InstallAppButton } from "./InstallAppButton";
import { NotificationPermissionButton } from "./NotificationPermissionButton";
import { GameBrandIcon } from "./GameBrandIcon";
import { GuildsPanel } from "./GuildsPanel";
import { HgrIcon } from "./HgrIcon";
import { HalieusBrandMark } from "./HalieusBrandMark";
import { PlayerIdentityCard, type PlayerIdentityAction } from "./PlayerIdentityCard";
import { APP_RELEASE_LABEL, RELEASE_FINGERPRINT } from "../../version";

export type GameSelection = GameId;
export interface SavedSessionSummary { code: string; reconnectToken: string; playerName: string; }
type HomeView = "home" | "games" | "players" | "guilds";
type DiscoveryShelf = "featured" | "most-played" | "recommended" | "recent" | "friends";

type PokerVariant = "texas-holdem" | "omaha" | "five-card-draw" | "seven-card-stud";

interface HomeScreenProps {
  connectionStatus: string; selectedGame: GameSelection; playerName: string; roomCode: string; ranked: boolean; blitz: boolean; freeParkingJackpotEnabled: boolean; message: string;
  recoveryCode: string; pokerRecoveryCode: string; blackjackRecoveryCode: string; whotRecoveryCode: string; ludoRecoveryCode: string; connectFourRecoveryCode: string; ayoRecoveryCode: string; wordBoardRecoveryCode: string; hiddenDictatorRecoveryCode: string;
  savedSession: SavedSessionSummary | null; pokerSavedSession: SavedSessionSummary | null; blackjackSavedSession: SavedSessionSummary | null; whotSavedSession: SavedSessionSummary | null; ludoSavedSession: SavedSessionSummary | null; connectFourSavedSession: SavedSessionSummary | null; ayoSavedSession: SavedSessionSummary | null; wordBoardSavedSession: SavedSessionSummary | null; hiddenDictatorSavedSession: SavedSessionSummary | null;
  pokerStartingChips: number; pokerSmallBlind: number; pokerBigBlind: number; pokerMatchMode: "casual" | "ranked"; pokerVariant: PokerVariant; whotMatchMode: WhotMatchMode; ludoMatchMode: LudoMatchMode; blackjackMatchMode: BlackjackMatchMode; connectFourMatchMode: ConnectFourMatchMode; connectFourBestOf: ConnectFourBestOf; hiddenDictatorMatchMode: HiddenDictatorMatchMode;
  isCreating: boolean; isJoining: boolean; isRecovering: boolean; darkMode: boolean; account: HalieusAccountSummary | null; betaMode: boolean; skinRatings: HalieusGameRatings; onOpenAccount: () => void;
  theme: { pageBackground: string; cardBackground: string; secondaryBackground: string; inputBackground: string; text: string; mutedText: string; border: string; };
  onToggleDarkMode: () => void; onGameSelect: (game: GameSelection) => void; onPlayerNameChange: (value: string) => void; onRoomCodeChange: (value: string) => void;
  onRecoveryCodeChange: (value: string) => void; onPokerRecoveryCodeChange: (value: string) => void; onBlackjackRecoveryCodeChange: (value: string) => void; onWhotRecoveryCodeChange: (value: string) => void; onLudoRecoveryCodeChange: (value: string) => void; onConnectFourRecoveryCodeChange: (value: string) => void; onAyoRecoveryCodeChange: (value: string) => void; onWordBoardRecoveryCodeChange: (value: string) => void; onHiddenDictatorRecoveryCodeChange: (value: string) => void;
  onPokerStartingChipsChange: (value: number) => void; onPokerSmallBlindChange: (value: number) => void; onPokerBigBlindChange: (value: number) => void; onPokerMatchModeChange: (value: "casual" | "ranked") => void; onPokerVariantChange: (value: PokerVariant) => void; onWhotMatchModeChange: (value: WhotMatchMode) => void; onLudoMatchModeChange: (value: LudoMatchMode) => void; onBlackjackMatchModeChange: (value: BlackjackMatchMode) => void; onConnectFourMatchModeChange: (value: ConnectFourMatchMode) => void; onConnectFourBestOfChange: (value: ConnectFourBestOf) => void; onHiddenDictatorMatchModeChange: (value: HiddenDictatorMatchMode) => void;
  onGenerateRoomCode: () => void; onOpenLeaderboard: () => void; onOpenPokerLeaderboard: () => void; onMatchModeChange: (mode: "casual" | "ranked" | "blitz") => void; onFreeParkingJackpotChange: (value: boolean) => void;
  onCreateGame: (event: FormEvent<HTMLFormElement>) => void; onJoinGame: () => void; onSpectateGame: () => void; onManualReconnect: () => void; onResumeSavedSession: () => void; onForgetSavedSession: () => void;
  onCreatePoker: (event: FormEvent<HTMLFormElement>) => void; onJoinPoker: () => void; onSpectatePoker: () => void; onManualPokerReconnect: () => void; onResumePokerSession: () => void; onForgetPokerSession: () => void;
  onCreateBlackjack: (event: FormEvent<HTMLFormElement>, options: { aiCount: number; aiDifficulty: BlackjackAiDifficulty }) => void; onJoinBlackjack: () => void; onSpectateBlackjack: () => void; onManualBlackjackReconnect: () => void; onResumeBlackjackSession: () => void; onForgetBlackjackSession: () => void;
  onCreateWhot: (event: FormEvent<HTMLFormElement>, options: { aiCount: number; aiDifficulty: WhotAiDifficulty }) => void; onJoinWhot: () => void; onSpectateWhot: () => void; onManualWhotReconnect: () => void; onResumeWhotSession: () => void; onForgetWhotSession: () => void;
  onCreateLudo: (event: FormEvent<HTMLFormElement>) => void; onJoinLudo: () => void; onSpectateLudo: () => void; onManualLudoReconnect: () => void; onResumeLudoSession: () => void; onForgetLudoSession: () => void;
  onCreateConnectFour: (event: FormEvent<HTMLFormElement>) => void; onJoinConnectFour: () => void; onSpectateConnectFour: () => void; onManualConnectFourReconnect: () => void; onResumeConnectFourSession: () => void; onForgetConnectFourSession: () => void;
  onCreateAyo: (event: FormEvent<HTMLFormElement>) => void; onJoinAyo: () => void; onSpectateAyo: () => void; onManualAyoReconnect: () => void; onResumeAyoSession: () => void; onForgetAyoSession: () => void;
  onCreateWordBoard: (event: FormEvent<HTMLFormElement>, options: { dictionaryMode: "standard" | "challenge" | "open" }) => void; onJoinWordBoard: () => void; onSpectateWordBoard: () => void; onManualWordBoardReconnect: () => void; onResumeWordBoardSession: () => void; onForgetWordBoardSession: () => void;
  onCreateHiddenDictator: (event: FormEvent<HTMLFormElement>) => void; onJoinHiddenDictator: () => void; onSpectateHiddenDictator: () => void; onManualHiddenDictatorReconnect: () => void; onResumeHiddenDictatorSession: () => void; onForgetHiddenDictatorSession: () => void;
  classicRecoveryCodes: Record<ClassicGameId, string>; classicSavedSessions: Record<ClassicGameId, SavedSessionSummary | null>; classicMatchModes: Record<ClassicGameId, ClassicMatchMode>;
  onClassicRecoveryCodeChange: (game: ClassicGameId, value: string) => void; onClassicMatchModeChange: (game: ClassicGameId, value: ClassicMatchMode) => void; onCreateClassic: (game: ClassicGameId, event: FormEvent<HTMLFormElement>, options: ClassicCreateOptions) => void; onJoinClassic: (game: ClassicGameId) => void; onSpectateClassic: (game: ClassicGameId) => void; onManualClassicReconnect: (game: ClassicGameId) => void; onResumeClassicSession: (game: ClassicGameId) => void; onForgetClassicSession: (game: ClassicGameId) => void;
  wordArenaSavedSessions: Record<WordArenaGameId, SavedSessionSummary | null>; wordArenaRecoveryCodes: Record<WordArenaGameId, string>;
  onWordArenaRecoveryCodeChange: (game: WordArenaGameId, value: string) => void; onCreateWordArena: (game: WordArenaGameId, event: FormEvent<HTMLFormElement>, options: WordArenaCreateOptions) => void; onJoinWordArena: (game: WordArenaGameId) => void; onSpectateWordArena: (game: WordArenaGameId) => void; onManualWordArenaReconnect: (game: WordArenaGameId) => void; onResumeWordArenaSession: (game: WordArenaGameId) => void; onForgetWordArenaSession: (game: WordArenaGameId) => void;
}

const GAMES = ACTIVE_GAME_CATALOG;
const GAME_GROUPS = [
  { id: "board", label: "Board & Strategy", description: "Long-form tables, races and head-to-head board play." },
  { id: "social", label: "Social & Party", description: "Conversation-led games built around the room." },
  { id: "cards", label: "Cards & Casino", description: "Hands, tables and quick repeat rounds." },
] as const;
const EMPTY_STATS: HalieusPersonalStats = { played: 0, wins: 0, winRate: 0, byGame: GAMES.map((game) => ({ game: game.id, gameTitle: game.name, played: 0, wins: 0, winRate: 0 })), recent: [] };

export function HomeScreen(props: HomeScreenProps) {
  const {
    connectionStatus, selectedGame, playerName, roomCode, ranked, blitz, freeParkingJackpotEnabled, message,
    recoveryCode, pokerRecoveryCode, blackjackRecoveryCode, whotRecoveryCode, ludoRecoveryCode, connectFourRecoveryCode, ayoRecoveryCode, wordBoardRecoveryCode, hiddenDictatorRecoveryCode,
    savedSession, pokerSavedSession, blackjackSavedSession, whotSavedSession, ludoSavedSession, connectFourSavedSession, ayoSavedSession, wordBoardSavedSession, hiddenDictatorSavedSession,
    pokerStartingChips, pokerSmallBlind, pokerBigBlind, pokerMatchMode, pokerVariant, whotMatchMode, ludoMatchMode, blackjackMatchMode, connectFourMatchMode, connectFourBestOf, hiddenDictatorMatchMode,
    isCreating, isJoining, isRecovering, darkMode, account, betaMode, skinRatings, onOpenAccount, theme, onToggleDarkMode, onGameSelect, onPlayerNameChange, onRoomCodeChange,
    onRecoveryCodeChange, onPokerRecoveryCodeChange, onBlackjackRecoveryCodeChange, onWhotRecoveryCodeChange, onLudoRecoveryCodeChange, onConnectFourRecoveryCodeChange, onAyoRecoveryCodeChange, onWordBoardRecoveryCodeChange, onHiddenDictatorRecoveryCodeChange,
    onPokerStartingChipsChange, onPokerSmallBlindChange, onPokerBigBlindChange, onPokerMatchModeChange, onPokerVariantChange, onWhotMatchModeChange, onLudoMatchModeChange, onBlackjackMatchModeChange, onConnectFourMatchModeChange, onConnectFourBestOfChange, onHiddenDictatorMatchModeChange,
    onGenerateRoomCode, onOpenLeaderboard, onOpenPokerLeaderboard, onMatchModeChange, onFreeParkingJackpotChange,
    onCreateGame, onJoinGame, onSpectateGame, onManualReconnect, onResumeSavedSession, onForgetSavedSession,
    onCreatePoker, onJoinPoker, onSpectatePoker, onManualPokerReconnect, onResumePokerSession, onForgetPokerSession,
    onCreateBlackjack, onJoinBlackjack, onSpectateBlackjack, onManualBlackjackReconnect, onResumeBlackjackSession, onForgetBlackjackSession,
    onCreateWhot, onJoinWhot, onSpectateWhot, onManualWhotReconnect, onResumeWhotSession, onForgetWhotSession,
    onCreateLudo, onJoinLudo, onSpectateLudo, onManualLudoReconnect, onResumeLudoSession, onForgetLudoSession,
    onCreateConnectFour, onJoinConnectFour, onSpectateConnectFour, onManualConnectFourReconnect, onResumeConnectFourSession, onForgetConnectFourSession,
    onCreateAyo, onJoinAyo, onSpectateAyo, onManualAyoReconnect, onResumeAyoSession, onForgetAyoSession,
    onCreateWordBoard, onJoinWordBoard, onSpectateWordBoard, onManualWordBoardReconnect, onResumeWordBoardSession, onForgetWordBoardSession,
    onCreateHiddenDictator, onJoinHiddenDictator, onSpectateHiddenDictator, onManualHiddenDictatorReconnect, onResumeHiddenDictatorSession, onForgetHiddenDictatorSession,
    classicRecoveryCodes, classicSavedSessions, classicMatchModes, onClassicRecoveryCodeChange, onClassicMatchModeChange, onCreateClassic, onJoinClassic, onSpectateClassic, onManualClassicReconnect, onResumeClassicSession, onForgetClassicSession,
    wordArenaSavedSessions, wordArenaRecoveryCodes, onWordArenaRecoveryCodeChange, onCreateWordArena, onJoinWordArena, onSpectateWordArena, onManualWordArenaReconnect, onResumeWordArenaSession, onForgetWordArenaSession,
  } = props;

  const [view, setView] = useState<HomeView>("home");
  const [joinOpen, setJoinOpen] = useState(false);
  const [buildInfoOpen, setBuildInfoOpen] = useState(false);
  const [rankedLeaderboardGame, setRankedLeaderboardGame] = useState<GameId | null>(null);
  const [joinIntent, setJoinIntent] = useState<"join" | "watch">("join");
  const [createOpen, setCreateOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [directory, setDirectory] = useState<HalieusPlayerDirectoryEntry[]>([]);
  const [personalStats, setPersonalStats] = useState<HalieusPersonalStats>(EMPTY_STATS);
  const [quickPlay, setQuickPlay] = useState<HalieusQuickPlayProfile>({ preferences: [] });
  const [dataError, setDataError] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<HalieusPersonalStats>(EMPTY_STATS);
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const fullscreenSupported = typeof document.documentElement.requestFullscreen === "function";
  const [liveRooms, setLiveRooms] = useState<HalieusLiveRoomSummary[]>([]);
  const [gameInvites, setGameInvites] = useState<HalieusGameInviteSummary[]>([]);
  const [gameRequests, setGameRequests] = useState<HalieusGameRequestSummary[]>([]);
  const [guildInvites, setGuildInvites] = useState<HalieusGuildInvitation[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [requestGameId, setRequestGameId] = useState<GameId>("mega-board");
  const [requestingPlayerId, setRequestingPlayerId] = useState<string | null>(null);
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerFilter, setPlayerFilter] = useState<"all" | "online" | "in-game" | "offline">("all");
  const [wordArenaMatchMode, setWordArenaMatchMode] = useState<WordArenaMatchMode>("casual");
  const [wordBoardDictionaryMode, setWordBoardDictionaryMode] = useState<"standard" | "challenge" | "open">("standard");
  const [wordArenaTargetScore, setWordArenaTargetScore] = useState(5);
  const [wordGameMode, setWordGameMode] = useState<WordGameMode>("daily");
  const [blackjackAiCount, setBlackjackAiCount] = useState(1);
  const [blackjackAiDifficulty, setBlackjackAiDifficulty] = useState<BlackjackAiDifficulty>("normal");
  const [whotAiCount, setWhotAiCount] = useState(1);
  const [whotAiDifficulty, setWhotAiDifficulty] = useState<WhotAiDifficulty>("normal");
  const [classicAiCount, setClassicAiCount] = useState(1);
  const [classicAiDifficulty, setClassicAiDifficulty] = useState<ClassicAiDifficulty>("normal");
  const [featuredRotationIndex, setFeaturedRotationIndex] = useState(0);
  const [discoveryShelf, setDiscoveryShelf] = useState<DiscoveryShelf>("featured");

  const selected = GAME_BY_ID[selectedGame];
  const selectedPlayer = directory.find((entry) => entry.id === selectedPlayerId) ?? null;
  const playerAccent = account?.playerColor || "#8b5cf6";
  const gameAccent = selected.accent;
  const disabled = isCreating || isJoining || isRecovering || connectionStatus !== "Connected";
  const pokerSelected = selectedGame === "poker";
  const blackjackSelected = selectedGame === "blackjack";
  const whotSelected = selectedGame === "whot";
  const ludoSelected = selectedGame === "ludo";
  const megaSelected = selectedGame === "mega-board";
  const connectFourSelected = selectedGame === "connect-four";
  const ayoSelected = selectedGame === "ayo";
  const wordBoardSelected = selectedGame === "word-board";
  const hiddenDictatorSelected = selectedGame === "hidden-dictator";
  const wordArenaSelected = selectedGame === "word-game" || selectedGame === "password" || selectedGame === "anagrams-race";
  const selectedWordArenaGame = wordArenaSelected ? selectedGame as WordArenaGameId : null;
  const classicSelected = selectedGame === "cheat" || selectedGame === "dominoes";
  const selectedClassicGame = classicSelected ? selectedGame as ClassicGameId : null;

  const savedSeats = useMemo(() => [
    { game: "Mega Board", id: "mega-board" as const, session: savedSession, resume: onResumeSavedSession, forget: onForgetSavedSession },
    { game: "Poker", id: "poker" as const, session: pokerSavedSession, resume: onResumePokerSession, forget: onForgetPokerSession },
    { game: "Blackjack", id: "blackjack" as const, session: blackjackSavedSession, resume: onResumeBlackjackSession, forget: onForgetBlackjackSession },
    { game: "WHOT", id: "whot" as const, session: whotSavedSession, resume: onResumeWhotSession, forget: onForgetWhotSession },
    { game: "Cheat", id: "cheat" as const, session: classicSavedSessions.cheat, resume: () => onResumeClassicSession("cheat"), forget: () => onForgetClassicSession("cheat") },
    { game: "Dominoes", id: "dominoes" as const, session: classicSavedSessions.dominoes, resume: () => onResumeClassicSession("dominoes"), forget: () => onForgetClassicSession("dominoes") },
    { game: "Ludo", id: "ludo" as const, session: ludoSavedSession, resume: onResumeLudoSession, forget: onForgetLudoSession },
    { game: "Hidden Dictator", id: "hidden-dictator" as const, session: hiddenDictatorSavedSession, resume: onResumeHiddenDictatorSession, forget: onForgetHiddenDictatorSession },
    { game: "Connect Four", id: "connect-four" as const, session: connectFourSavedSession, resume: onResumeConnectFourSession, forget: onForgetConnectFourSession },
    { game: "Ayo", id: "ayo" as const, session: ayoSavedSession, resume: onResumeAyoSession, forget: onForgetAyoSession },
    { game: "Word Board", id: "word-board" as const, session: wordBoardSavedSession, resume: onResumeWordBoardSession, forget: onForgetWordBoardSession },
    { game: "Word Game", id: "word-game" as const, session: wordArenaSavedSessions["word-game"], resume: () => onResumeWordArenaSession("word-game"), forget: () => onForgetWordArenaSession("word-game") },
    { game: "Password", id: "password" as const, session: wordArenaSavedSessions.password, resume: () => onResumeWordArenaSession("password"), forget: () => onForgetWordArenaSession("password") },
    { game: "Anagrams Race", id: "anagrams-race" as const, session: wordArenaSavedSessions["anagrams-race"], resume: () => onResumeWordArenaSession("anagrams-race"), forget: () => onForgetWordArenaSession("anagrams-race") },
  ].filter((entry) => entry.session), [savedSession, pokerSavedSession, blackjackSavedSession, whotSavedSession, classicSavedSessions, ludoSavedSession, hiddenDictatorSavedSession, connectFourSavedSession, ayoSavedSession, wordBoardSavedSession, wordArenaSavedSessions]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [people, stats, quick, live, invites, requests, guildInvitations] = await Promise.all([
          accountApi<{ ok: true; players: HalieusPlayerDirectoryEntry[] }>("/accounts/directory"),
          accountApi<{ ok: true; stats: HalieusPersonalStats }>("/accounts/me/stats"),
          accountApi<{ ok: true; profile: HalieusQuickPlayProfile }>("/accounts/me/quick-play"),
          accountApi<{ ok: true; rooms: HalieusLiveRoomSummary[] }>("/accounts/live-games"),
          accountApi<{ ok: true; invites: HalieusGameInviteSummary[] }>("/accounts/game-invites"),
          accountApi<{ ok: true; requests: HalieusGameRequestSummary[] }>("/accounts/game-requests"),
          accountApi<{ ok: true; invitations: HalieusGuildInvitation[] }>("/guilds/invitations"),
        ]);
        if (!cancelled) { setDirectory(people.players); setPersonalStats(stats.stats); setQuickPlay(quick.profile); setLiveRooms(live.rooms.filter((room) => ACTIVE_GAME_IDS.has(room.game))); setGameInvites(invites.invites.filter((invite) => ACTIVE_GAME_IDS.has(invite.game as GameId))); setGameRequests(requests.requests.filter((request) => ACTIVE_GAME_IDS.has(request.game as GameId))); setGuildInvites(guildInvitations.invitations.filter((invitation) => invitation.status === "pending")); setDataError(""); }
      } catch (error) {
        if (!cancelled) setDataError(error instanceof Error ? error.message : "Player data is temporarily unavailable.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [account?.id]);

  useEffect(() => {
    const incoming = gameRequests.find((request) => request.recipientAccountId === account?.id && request.status === "pending");
    if (!incoming || typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    const tag = `halieus-request-${incoming.id}`;
    void navigator.serviceWorker?.ready.then((registration) => registration.showNotification("Halieus Game Request", { body: `${incoming.senderDisplayName} wants to play ${incoming.gameTitle}.`, icon: "/app-icon-192.png", tag, data: { url: "/" } })).catch(() => undefined);
  }, [gameRequests, account?.id]);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (view !== "players" || !selectedPlayerId) return;
    let cancelled = false;
    setPlayerStatsLoading(true);
    void accountApi<{ ok: true; stats: HalieusPersonalStats }>(`/accounts/players/${encodeURIComponent(selectedPlayerId)}/stats`)
      .then((result) => { if (!cancelled) setSelectedPlayerStats(result.stats); })
      .catch(() => { if (!cancelled) setSelectedPlayerStats(EMPTY_STATS); })
      .finally(() => { if (!cancelled) setPlayerStatsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPlayerId, view]);

  const joinAction = classicSelected && selectedClassicGame ? () => onJoinClassic(selectedClassicGame) : wordArenaSelected && selectedWordArenaGame ? () => onJoinWordArena(selectedWordArenaGame) : pokerSelected ? onJoinPoker : blackjackSelected ? onJoinBlackjack : whotSelected ? onJoinWhot : ludoSelected ? onJoinLudo : connectFourSelected ? onJoinConnectFour : ayoSelected ? onJoinAyo : wordBoardSelected ? onJoinWordBoard : hiddenDictatorSelected ? onJoinHiddenDictator : onJoinGame;
  const spectateAction = classicSelected && selectedClassicGame ? () => onSpectateClassic(selectedClassicGame) : wordArenaSelected && selectedWordArenaGame ? () => onSpectateWordArena(selectedWordArenaGame) : pokerSelected ? onSpectatePoker : blackjackSelected ? onSpectateBlackjack : whotSelected ? onSpectateWhot : ludoSelected ? onSpectateLudo : connectFourSelected ? onSpectateConnectFour : ayoSelected ? onSpectateAyo : wordBoardSelected ? onSpectateWordBoard : hiddenDictatorSelected ? onSpectateHiddenDictator : onSpectateGame;
  const createAction = classicSelected && selectedClassicGame ? (event: FormEvent<HTMLFormElement>) => onCreateClassic(selectedClassicGame, event, { matchMode: classicMatchModes[selectedClassicGame], aiCount: classicAiCount, aiDifficulty: classicAiDifficulty }) : wordArenaSelected && selectedWordArenaGame ? (event: FormEvent<HTMLFormElement>) => onCreateWordArena(selectedWordArenaGame, event, selectedWordArenaGame === "word-game" ? { matchMode: "casual", aiCount: 0, aiDifficulty: "normal", targetScore: 1, wordGameMode } : { matchMode: wordArenaMatchMode, aiCount: 0, aiDifficulty: "normal", targetScore: Math.min(9, Math.max(3, wordArenaTargetScore)) }) : pokerSelected ? onCreatePoker : blackjackSelected ? (event: FormEvent<HTMLFormElement>) => onCreateBlackjack(event, { aiCount: blackjackAiCount, aiDifficulty: blackjackAiDifficulty }) : whotSelected ? (event: FormEvent<HTMLFormElement>) => onCreateWhot(event, { aiCount: whotAiCount, aiDifficulty: whotAiDifficulty }) : ludoSelected ? onCreateLudo : connectFourSelected ? onCreateConnectFour : ayoSelected ? onCreateAyo : wordBoardSelected ? (event: FormEvent<HTMLFormElement>) => onCreateWordBoard(event, { dictionaryMode: wordBoardDictionaryMode }) : hiddenDictatorSelected ? onCreateHiddenDictator : onCreateGame;
  const activeRecovery = classicSelected && selectedClassicGame ? classicRecoveryCodes[selectedClassicGame] : wordArenaSelected && selectedWordArenaGame ? wordArenaRecoveryCodes[selectedWordArenaGame] : pokerSelected ? pokerRecoveryCode : blackjackSelected ? blackjackRecoveryCode : whotSelected ? whotRecoveryCode : ludoSelected ? ludoRecoveryCode : connectFourSelected ? connectFourRecoveryCode : ayoSelected ? ayoRecoveryCode : wordBoardSelected ? wordBoardRecoveryCode : hiddenDictatorSelected ? hiddenDictatorRecoveryCode : recoveryCode;
  const recoveryChange = classicSelected && selectedClassicGame ? (value: string) => onClassicRecoveryCodeChange(selectedClassicGame, value) : wordArenaSelected && selectedWordArenaGame ? (value: string) => onWordArenaRecoveryCodeChange(selectedWordArenaGame, value) : pokerSelected ? onPokerRecoveryCodeChange : blackjackSelected ? onBlackjackRecoveryCodeChange : whotSelected ? onWhotRecoveryCodeChange : ludoSelected ? onLudoRecoveryCodeChange : connectFourSelected ? onConnectFourRecoveryCodeChange : ayoSelected ? onAyoRecoveryCodeChange : wordBoardSelected ? onWordBoardRecoveryCodeChange : hiddenDictatorSelected ? onHiddenDictatorRecoveryCodeChange : onRecoveryCodeChange;
  const manualReconnect = classicSelected && selectedClassicGame ? () => onManualClassicReconnect(selectedClassicGame) : wordArenaSelected && selectedWordArenaGame ? () => onManualWordArenaReconnect(selectedWordArenaGame) : pokerSelected ? onManualPokerReconnect : blackjackSelected ? onManualBlackjackReconnect : whotSelected ? onManualWhotReconnect : ludoSelected ? onManualLudoReconnect : connectFourSelected ? onManualConnectFourReconnect : ayoSelected ? onManualAyoReconnect : wordBoardSelected ? onManualWordBoardReconnect : hiddenDictatorSelected ? onManualHiddenDictatorReconnect : onManualReconnect;

  const quickPreferenceByGame = useMemo(() => new Map(quickPlay.preferences.map((preference) => [preference.game, preference])), [quickPlay.preferences]);
  const quickGames = useMemo(() => {
    const played = [...personalStats.byGame].sort((a, b) => b.played - a.played || GAMES.findIndex((game) => game.id === a.game) - GAMES.findIndex((game) => game.id === b.game));
    const ordered = played.filter((row) => row.played > 0 && ACTIVE_GAME_IDS.has(row.game as GameId)).map((row) => row.game as GameId);
    for (const game of GAMES) if (!ordered.includes(game.id)) ordered.push(game.id);
    return ordered.slice(0, 7);
  }, [personalStats.byGame]);
  const currentSeat = savedSeats[0] ?? null;
  const recommendationRotation = quickGames.length ? quickGames : GAMES.map((game) => game.id);
  const featureRotation = useMemo(() => {
    const ids = [...(currentSeat ? [currentSeat.id] : []), ...recommendationRotation];
    return ids.filter((game, index) => ids.indexOf(game) === index);
  }, [currentSeat, recommendationRotation]);
  const featuredGameId = featureRotation[featuredRotationIndex % Math.max(1, featureRotation.length)] ?? selectedGame;
  const featuredGame = GAME_BY_ID[featuredGameId];
  const featuredSeat = currentSeat?.id === featuredGameId ? currentSeat : null;
  useEffect(() => {
    if (featureRotation.length < 2 || view !== "home") return;
    const timer = window.setInterval(() => setFeaturedRotationIndex((current) => (current + 1) % featureRotation.length), 11_000);
    return () => window.clearInterval(timer);
  }, [featureRotation.length, view]);
  function previousFeature() { setFeaturedRotationIndex((current) => (current - 1 + featureRotation.length) % Math.max(1, featureRotation.length)); }
  function nextFeature() { setFeaturedRotationIndex((current) => (current + 1) % Math.max(1, featureRotation.length)); }

  const onlinePlayers = directory.filter((person) => person.online);
  const recentPlayers = useMemo(() => directory
    .filter((person) => person.id !== account?.id)
    .slice()
    .sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0))
    .slice(0, 8), [account?.id, directory]);
  const activeGameRequests = useMemo(() => gameRequests.filter((request) => request.status === "pending" || request.status === "accepted"), [gameRequests]);
  const inboxCount = activeGameRequests.length + gameInvites.length + guildInvites.length;
  const discoveryGames = useMemo(() => {
    const mostPlayed = [...personalStats.byGame]
      .filter((row) => row.played > 0 && ACTIVE_GAME_IDS.has(row.game as GameId))
      .sort((a, b) => b.played - a.played)
      .map((row) => row.game as GameId);
    const recent = [...new Set(personalStats.recent.map((item) => item.game as GameId))]
      .filter((game) => ACTIVE_GAME_IDS.has(game));
    // Friend relationships are not yet a canonical platform data source.
    // Do not infer "friends" from every live room: an empty shelf is more truthful
    // than recommending unrelated active games under a Friends label.
    const friends: GameId[] = [];
    const unplayed = GAMES.filter((game) => !personalStats.byGame.some((row) => row.game === game.id && row.played > 0)).map((game) => game.id);
    const recommended = [...unplayed, ...quickGames].filter((game, index, values) => values.indexOf(game) === index);
    const shelves: Record<DiscoveryShelf, GameId[]> = {
      featured: quickGames,
      "most-played": mostPlayed.length ? mostPlayed : quickGames,
      recommended: recommended.length ? recommended : quickGames,
      recent: recent.length ? recent : quickGames,
      friends,
    };
    return shelves[discoveryShelf].slice(0, 4);
  }, [discoveryShelf, liveRooms, personalStats.byGame, personalStats.recent, quickGames]);
  const liveRoomByPlayerName = useMemo(() => {
    const map = new Map<string, HalieusLiveRoomSummary>();
    liveRooms.forEach((room) => room.humanPlayers.forEach((name) => map.set(name.trim().toLowerCase(), room)));
    return map;
  }, [liveRooms]);
  const filteredDirectory = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    return directory.filter((person) => {
      const liveRoom = liveRoomByPlayerName.get(person.displayName.trim().toLowerCase());
      const matchesFilter = playerFilter === "all"
        || (playerFilter === "online" && person.online)
        || (playerFilter === "in-game" && Boolean(liveRoom))
        || (playerFilter === "offline" && !person.online);
      const matchesSearch = !query || `${person.displayName} ${person.username}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [directory, liveRoomByPlayerName, playerFilter, playerSearch]);
  const selectedPlayerRoom = selectedPlayer ? liveRoomByPlayerName.get(selectedPlayer.displayName.trim().toLowerCase()) ?? null : null;
  const ownLiveRoom = useMemo(() => {
    const savedCodes = new Set(savedSeats.map((entry) => `${entry.id}:${entry.session?.code ?? ""}`));
    return liveRooms.find((room) => savedCodes.has(`${room.game}:${room.code}`))
      ?? (account ? liveRoomByPlayerName.get(account.displayName.trim().toLowerCase()) ?? null : null);
  }, [account, liveRoomByPlayerName, liveRooms, savedSeats]);
  const selectedPlayerFavourite = useMemo(() => {
    const played = selectedPlayerStats.byGame.filter((row) => row.played > 0).sort((a, b) => b.played - a.played || b.winRate - a.winRate);
    return played[0] ?? null;
  }, [selectedPlayerStats.byGame]);
  const selectedPlayerStreak = useMemo(() => {
    let wins = 0;
    for (const item of selectedPlayerStats.recent) {
      if (!item.won) break;
      wins += 1;
    }
    return wins;
  }, [selectedPlayerStats.recent]);

  function quickLabel(game: GameId, preference?: HalieusQuickPlayPreference): string {
    const mode = preference?.matchMode === "ranked" ? "Ranked" : preference?.matchMode === "blitz" ? "Blitz" : "Casual";
    if (game === "poker") return `${mode} · ${preference?.pokerStartingChips ?? 5000} · ${preference?.pokerSmallBlind ?? 25}/${preference?.pokerBigBlind ?? 50}`;
    if (game === "connect-four") return `${mode} · Best of ${preference?.connectFourBestOf ?? 3}`;
    return mode;
  }

  function applyQuickPlay(game: GameId) {
    if (!ACTIVE_GAME_IDS.has(game)) return;
    const preference = quickPreferenceByGame.get(game);
    const mode = preference?.matchMode ?? "casual";
    if (game === "mega-board") onMatchModeChange(mode === "blitz" ? "blitz" : mode === "ranked" ? "ranked" : "casual");
    if (game === "poker") {
      onPokerMatchModeChange(mode === "ranked" ? "ranked" : "casual");
      onPokerVariantChange(preference?.pokerVariant ?? "texas-holdem");
      onPokerStartingChipsChange(preference?.pokerStartingChips ?? 5000);
      onPokerSmallBlindChange(preference?.pokerSmallBlind ?? 25);
      onPokerBigBlindChange(preference?.pokerBigBlind ?? 50);
    }
    if (game === "whot") onWhotMatchModeChange(mode === "ranked" ? "ranked" : "casual");
    if (game === "ludo") onLudoMatchModeChange(mode === "ranked" ? "ranked" : "casual");
    if (game === "blackjack") onBlackjackMatchModeChange(mode === "ranked" ? "ranked" : "casual");
    if (game === "connect-four") { onConnectFourMatchModeChange(mode === "ranked" ? "ranked" : "casual"); onConnectFourBestOfChange(preference?.connectFourBestOf ?? 3); }
    if (game === "hidden-dictator") onHiddenDictatorMatchModeChange(mode === "ranked" ? "ranked" : "casual");
    if (game === "cheat" || game === "dominoes") onClassicMatchModeChange(game, mode === "ranked" ? "ranked" : "casual");
    onGenerateRoomCode();
    onGameSelect(game); setShowRecovery(false); setCreateOpen(true);
  }

  function selectGame(game: GameSelection, openGames = false) { onGameSelect(game); setShowRecovery(false); if (openGames) setView("games"); }
  function prepareCreate(game: GameSelection, guildRoomCode: string | null = null) {
    onGameSelect(game); setShowRecovery(false); setView("games");
    if (guildRoomCode) onRoomCodeChange(guildRoomCode);
    else onGenerateRoomCode();
    if (game === "word-game") { setWordArenaMatchMode("casual"); setWordArenaTargetScore(1); setWordGameMode("daily"); }
    else if (game === "password" || game === "anagrams-race") { setWordArenaMatchMode("casual"); setWordArenaTargetScore(5); }
    else if (game === "blackjack") { setBlackjackAiCount((current) => current === 0 ? 1 : current); setBlackjackAiDifficulty("normal"); }
    else if (game === "whot") { setWhotAiCount((current) => current === 0 ? 1 : current); setWhotAiDifficulty("normal"); }
    else if (game === "cheat" || game === "dominoes") { setClassicAiCount((current) => current === 0 ? 1 : current); setClassicAiDifficulty("normal"); onClassicMatchModeChange(game, "casual"); }
    setCreateOpen(true);
  }
  function openCreate(game: GameSelection) { prepareCreate(game); }
  // Guilds reserve a normal HGR room code before opening the existing game
  // setup. The game module remains authoritative once Create is confirmed.
  function openGuildCreate(game: GameId, roomCode: string) { prepareCreate(game, roomCode); }
  function openJoin(intent: "join" | "watch" = "join") { setJoinIntent(intent); setJoinOpen(true); setShowRecovery(false); }
  function openLiveRoom(room: HalieusLiveRoomSummary, intent: "join" | "watch") {
    onGameSelect(room.game);
    onRoomCodeChange(room.code);
    setJoinIntent(intent);
    setJoinOpen(true);
    setShowRecovery(false);
    setMobileMenuOpen(false);
  }
  async function invitePlayerToOwnRoom(person: HalieusPlayerDirectoryEntry) {
    if (!ownLiveRoom || person.id === account?.id) return;
    setInvitingPlayerId(person.id);
    setInviteNotice("");
    try {
      await accountApi<{ ok: true; invite: HalieusGameInviteSummary }>("/accounts/game-invites", {
        method: "POST",
        body: JSON.stringify({ recipientAccountId: person.id, game: ownLiveRoom.game, roomCode: ownLiveRoom.code }),
      });
      setInviteNotice(`Invite sent to ${person.displayName} for ${ownLiveRoom.gameTitle} · ${ownLiveRoom.code}.`);
    } catch (error) {
      setInviteNotice(error instanceof Error ? error.message : "Unable to send that game invite.");
    } finally {
      setInvitingPlayerId(null);
    }
  }

  async function requestGame(person: HalieusPlayerDirectoryEntry) {
    if (person.id === account?.id) return;
    setRequestingPlayerId(person.id); setInviteNotice("");
    try {
      const result = await accountApi<{ ok: true; request: HalieusGameRequestSummary }>("/accounts/game-requests", { method: "POST", body: JSON.stringify({ recipientAccountId: person.id, game: requestGameId }) });
      setGameRequests((current) => [result.request, ...current.filter((item) => item.id !== result.request.id)]);
      setInviteNotice(`Game request sent to ${person.displayName} for ${GAME_BY_ID[requestGameId].name}.`);
    } catch (error) { setInviteNotice(error instanceof Error ? error.message : "Unable to send that game request."); }
    finally { setRequestingPlayerId(null); }
  }

  function playerCardActions(person: HalieusPlayerDirectoryEntry): PlayerIdentityAction[] {
    const actions: PlayerIdentityAction[] = [];
    const liveRoom = liveRoomByPlayerName.get(person.displayName.trim().toLowerCase()) ?? null;

    actions.push({
      id: "view-profile",
      label: "View profile",
      detail: "Stats, recent games and player actions",
      onSelect: () => { setSelectedPlayerId(person.id); setView("players"); },
    });

    if (liveRoom?.joinable) {
      actions.push({
        id: "join-live-room",
        label: "Join their game",
        detail: `${liveRoom.gameTitle} · ${liveRoom.code}`,
        onSelect: () => openLiveRoom(liveRoom, "join"),
      });
    }
    if (liveRoom?.spectatable) {
      actions.push({
        id: "spectate-live-room",
        label: "Spectate",
        detail: `${liveRoom.gameTitle} · ${liveRoom.code}`,
        onSelect: () => openLiveRoom(liveRoom, "watch"),
      });
    }
    if (person.id !== account?.id) {
      actions.push({
        id: "request-game",
        label: "Request a game…",
        detail: "Choose the game from their profile",
        onSelect: () => { setSelectedPlayerId(person.id); setView("players"); setInviteNotice(""); },
      });
      if (ownLiveRoom) {
        actions.push({
          id: "invite-active-room",
          label: "Invite to my room",
          detail: `${ownLiveRoom.gameTitle} · ${ownLiveRoom.code}`,
          disabled: invitingPlayerId === person.id,
          onSelect: () => void invitePlayerToOwnRoom(person),
        });
      }
    }

    actions.push({
      id: "copy-username",
      label: "Copy username",
      detail: `@${person.username}`,
      onSelect: () => {
        const value = `@${person.username}`;
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(value)
            .then(() => setInviteNotice(`${value} copied.`))
            .catch(() => setInviteNotice(`Username: ${value}`));
        } else {
          setInviteNotice(`Username: ${value}`);
        }
      },
    });
    return actions;
  }

  async function respondGameRequest(requestId: string, action: "accept" | "decline") {
    try {
      const result = await accountApi<{ ok: true; request: HalieusGameRequestSummary }>(`/accounts/game-requests/${encodeURIComponent(requestId)}/respond`, { method: "POST", body: JSON.stringify({ action }) });
      setGameRequests((current) => current.map((item) => item.id === requestId ? result.request : item));
      if (action === "accept") { onGameSelect(result.request.game as GameId); if (result.request.roomCode) onRoomCodeChange(result.request.roomCode); else onGenerateRoomCode(); setView("games"); setCreateOpen(true); }
    } catch (error) { setDataError(error instanceof Error ? error.message : "Unable to update that game request."); }
  }

  async function cancelGameRequest(requestId: string) {
    try {
      const result = await accountApi<{ ok: true; request: HalieusGameRequestSummary }>(`/accounts/game-requests/${encodeURIComponent(requestId)}/cancel`, { method: "POST" });
      setGameRequests((current) => current.map((item) => item.id === requestId ? result.request : item));
    } catch (error) { setDataError(error instanceof Error ? error.message : "Unable to cancel that game request."); }
  }

  async function dismissGameInvite(inviteId: string) {
    setGameInvites((current) => current.filter((invite) => invite.id !== inviteId));
    try {
      await accountApi<{ ok: true }>(`/accounts/game-invites/${encodeURIComponent(inviteId)}/dismiss`, { method: "POST" });
    } catch { /* the next poll will reconcile server state */ }
  }

  async function respondGuildInvitation(invitation: HalieusGuildInvitation, action: "accept" | "decline") {
    try {
      await accountApi<{ ok: true; invitation: HalieusGuildInvitation }>(
        `/guilds/invitations/${encodeURIComponent(invitation.id)}/respond`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setGuildInvites((current) => current.filter((item) => item.id !== invitation.id));
      if (action === "accept") {
        setInboxOpen(false);
        setView("guilds");
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to respond to that guild invitation.");
    }
  }

  async function openAcceptedGameRequest(request: HalieusGameRequestSummary) {
    const incoming = request.recipientAccountId === account?.id;
    try {
      const result = await accountApi<{ ok: true; request: HalieusGameRequestSummary }>(`/accounts/game-requests/${encodeURIComponent(request.id)}/close`, { method: "POST" });
      setGameRequests((current) => current.map((item) => item.id === request.id ? result.request : item));
    } catch { /* launch can still proceed; the next poll will reconcile */ }
    onGameSelect(request.game as GameId);
    if (request.roomCode) onRoomCodeChange(request.roomCode);
    setInboxOpen(false);
    setView("games");
    if (incoming) setCreateOpen(true);
    else { setJoinIntent("join"); setJoinOpen(true); }
  }
  async function toggleFullscreen() {
    setFullscreenNotice("");
    if (!fullscreenSupported) {
      setFullscreenNotice("Full screen is not available in this browser or installed window.");
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenNotice("Full screen was blocked by this browser or installed window.");
    }
  }

  function openRankedLeaderboard(game: GameId) {
    if (game === "mega-board") { onOpenLeaderboard(); return; }
    if (game === "poker") { onOpenPokerLeaderboard(); return; }
    setRankedLeaderboardGame(game);
  }

  function rankedLeaderboardAction(game: GameId, active: boolean) {
    if (!active) return null;
    return <button type="button" className="button-muted ranked-universal-leaderboard-button" onClick={() => openRankedLeaderboard(game)}>🏆 View {GAME_BY_ID[game].name} leaderboard</button>;
  }

  // Room-entry overlays are portalled outside the animated Games view so fixed
  // positioning is always relative to the real browser viewport. If Halieus is
  // ever fullscreened on a node other than <html>, keep the overlay inside that
  // fullscreen tree so the browser does not hide it.
  const overlayHost = typeof document === "undefined"
    ? null
    : document.fullscreenElement instanceof HTMLElement && document.fullscreenElement !== document.documentElement
      ? document.fullscreenElement
      : document.body;

  const createOverlay = createOpen && overlayHost ? createPortal(
    <div className="halieus-create-backdrop halieus-viewport-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setCreateOpen(false)}>
      <section className="halieus-create-panel halieus-create-modal panel-enter" style={{ borderColor: `color-mix(in srgb, ${gameAccent} 42%, ${theme.border})`, ["--game-create-accent" as string]: gameAccent }} role="dialog" aria-modal="true" aria-label={`Create ${selected.name} room`}>
        <header className="halieus-create-modal-head"><div className="halieus-create-brand"><GameBrandIcon game={selectedGame} /><div><p>{selected.name.toUpperCase()}</p><h2>Create {pokerSelected || blackjackSelected ? "a table" : "a room"}</h2><span>{selected.subtitle}</span></div></div><button type="button" className="halieus-create-close" onClick={() => setCreateOpen(false)} aria-label="Close room setup">×</button></header>
        <div className="halieus-game-options">
          {megaSelected && <><div className="match-tabs is-three-mode" role="group" aria-label="Mega Board match type"><button type="button" className={!ranked && !blitz ? "active" : ""} onClick={() => onMatchModeChange("casual")}>Casual</button><button type="button" className={ranked ? "active" : ""} onClick={() => onMatchModeChange("ranked")}>🏆 Ranked</button><button type="button" className={blitz ? "active" : ""} onClick={() => onMatchModeChange("blitz")}>⚡ Blitz</button></div>{rankedLeaderboardAction("mega-board", ranked)}{!ranked && <label className="free-parking-toggle"><input type="checkbox" checked={freeParkingJackpotEnabled} onChange={(event) => onFreeParkingJackpotChange(event.target.checked)} /><span><strong>Free Parking jackpot</strong><small>Taxes and eligible Bank fines build the pot.</small></span></label>}</>}
          {pokerSelected && <><div className="match-tabs is-two-mode" role="group" aria-label="Poker match type"><button type="button" className={pokerMatchMode === "casual" ? "active" : ""} onClick={() => onPokerMatchModeChange("casual")}>Casual</button><button type="button" className={pokerMatchMode === "ranked" ? "active" : ""} onClick={() => onPokerMatchModeChange("ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction("poker", pokerMatchMode === "ranked")}<div className="poker-variant-picker"><p>POKER VARIANT</p><button type="button" className="poker-variant-live" aria-pressed={pokerVariant === "texas-holdem"} onClick={() => onPokerVariantChange("texas-holdem")}><span>♠</span><div><strong>Texas Hold’em</strong><small>Live now</small></div><b>Play</b></button><div className="poker-variant-roadmap"><span>Omaha <i>Coming soon</i></span><span>Five-Card Draw <i>Planned</i></span><span>Seven-Card Stud <i>Planned</i></span></div></div><div className="poker-home-settings"><label>Starting stack<select value={pokerStartingChips} onChange={(event) => onPokerStartingChipsChange(Number(event.target.value))}><option value={2500}>Quick · 2,500</option><option value={5000}>Standard · 5,000</option><option value={10000}>Deep · 10,000</option></select></label><label>Blinds<select value={`${pokerSmallBlind}/${pokerBigBlind}`} onChange={(event) => { const [small, big] = event.target.value.split("/").map(Number); onPokerSmallBlindChange(small); onPokerBigBlindChange(big); }}><option value="10/20">10 / 20</option><option value="25/50">25 / 50</option><option value="50/100">50 / 100</option></select></label></div></>}
          {whotSelected && <><div className="match-tabs is-two-mode" role="group" aria-label="WHOT match type"><button type="button" className={whotMatchMode === "casual" ? "active" : ""} onClick={() => onWhotMatchModeChange("casual")}>Casual</button><button type="button" className={whotMatchMode === "ranked" ? "active" : ""} onClick={() => onWhotMatchModeChange("ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction("whot", whotMatchMode === "ranked")}<div className="word-arena-create-settings"><label>AI players<select value={whotAiCount} onChange={(event) => setWhotAiCount(Number(event.target.value))}>{Array.from({ length: 8 }, (_, value) => <option key={value} value={value}>{value === 0 ? "None" : `${value} AI player${value === 1 ? "" : "s"}`}</option>)}</select></label><label>AI difficulty<select value={whotAiDifficulty} disabled={whotAiCount === 0} onChange={(event) => setWhotAiDifficulty(event.target.value as WhotAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label></div><div className="halieus-rule-note"><strong>WHOT · rebuilt</strong><small>Classic shedding · action cards 1 / 2 / 5 / 8 / 14 / 20 · {1 + whotAiCount} starting seat{whotAiCount === 0 ? "" : "s"}.</small></div></>}
          {ludoSelected && <><div className="match-tabs is-two-mode" role="group" aria-label="Ludo match type"><button type="button" className={ludoMatchMode === "casual" ? "active" : ""} onClick={() => onLudoMatchModeChange("casual")}>Casual</button><button type="button" className={ludoMatchMode === "ranked" ? "active" : ""} onClick={() => onLudoMatchModeChange("ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction("ludo", ludoMatchMode === "ranked")}</>}
          {blackjackSelected && <><div className="match-tabs is-two-mode" role="group" aria-label="Blackjack match type"><button type="button" className={blackjackMatchMode === "casual" ? "active" : ""} onClick={() => onBlackjackMatchModeChange("casual")}>Casual</button><button type="button" className={blackjackMatchMode === "ranked" ? "active" : ""} onClick={() => onBlackjackMatchModeChange("ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction("blackjack", blackjackMatchMode === "ranked")}<div className="word-arena-create-settings"><label>AI players<select value={blackjackAiCount} onChange={(event) => setBlackjackAiCount(Number(event.target.value))}>{Array.from({ length: 5 }, (_, value) => <option key={value} value={value}>{value === 0 ? "None" : `${value} AI player${value === 1 ? "" : "s"}`}</option>)}</select></label><label>AI difficulty<select value={blackjackAiDifficulty} disabled={blackjackAiCount === 0} onChange={(event) => setBlackjackAiDifficulty(event.target.value as BlackjackAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label></div><div className="halieus-rule-note"><strong>Blackjack · rebuilt</strong><small>6 decks · dealer stands soft 17 · blackjack 3:2 · virtual chips only · {1 + blackjackAiCount} starting seat{blackjackAiCount === 0 ? "" : "s"}.</small></div></>}
          {ayoSelected && <div className="halieus-rule-note"><strong>Ayo · Traditional Yoruba rules</strong><small>2 players · 12 houses · 48 seeds · relay sowing · server-authoritative captures and feeding.</small></div>}
          {wordBoardSelected && <><div className="match-tabs is-three-mode" role="group" aria-label="Word Board dictionary mode"><button type="button" className={wordBoardDictionaryMode === "standard" ? "active" : ""} onClick={() => setWordBoardDictionaryMode("standard")}>Standard</button><button type="button" className={wordBoardDictionaryMode === "challenge" ? "active" : ""} onClick={() => setWordBoardDictionaryMode("challenge")}>Challenge</button><button type="button" className={wordBoardDictionaryMode === "open" ? "active" : ""} onClick={() => setWordBoardDictionaryMode("open")}>Open / slang</button></div><div className="halieus-rule-note"><strong>Word Board · HGR original</strong><small>2–4 players · 15×15 crossword table · seven-tile racks · {wordBoardDictionaryMode === "challenge" ? "the next player may challenge the previous play" : wordBoardDictionaryMode === "open" ? "broader informal/slang vocabulary is accepted" : "standard English words are checked automatically"} · premium squares.</small></div></>}
          {connectFourSelected && <><div className="match-tabs is-two-mode" role="group" aria-label="Connect Four match type"><button type="button" className={connectFourMatchMode === "casual" ? "active" : ""} onClick={() => onConnectFourMatchModeChange("casual")}>Casual</button><button type="button" className={connectFourMatchMode === "ranked" ? "active" : ""} onClick={() => onConnectFourMatchModeChange("ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction("connect-four", connectFourMatchMode === "ranked")}<div className="connect-four-series-picker"><p>MATCH FORMAT</p>{([1,3,5] as ConnectFourBestOf[]).map((value) => <button type="button" key={value} className={connectFourBestOf === value ? "is-active" : ""} onClick={() => onConnectFourBestOfChange(value)}>Best of {value}</button>)}</div><div className="halieus-rule-note"><strong>Connect Four</strong><small>Two-player quick duel. Win {Math.floor(connectFourBestOf / 2) + 1} round{connectFourBestOf === 1 ? "" : "s"} to take the match.</small></div></>}
          {hiddenDictatorSelected && <><div className="match-tabs is-two-mode" role="group" aria-label="Hidden Dictator match type"><button type="button" className={hiddenDictatorMatchMode === "casual" ? "active" : ""} onClick={() => onHiddenDictatorMatchModeChange("casual")}>Casual</button><button type="button" className={hiddenDictatorMatchMode === "ranked" ? "active" : ""} onClick={() => onHiddenDictatorMatchModeChange("ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction("hidden-dictator", hiddenDictatorMatchMode === "ranked")}<div className="halieus-rule-note"><strong>Hidden Dictator · Beta</strong><small>5–10 players · hidden roles · government votes · private policy decisions.</small></div></>}
          {selectedClassicGame && <><div className="match-tabs is-two-mode" role="group" aria-label={`${selected.name} match type`}><button type="button" className={classicMatchModes[selectedClassicGame] === "casual" ? "active" : ""} onClick={() => onClassicMatchModeChange(selectedClassicGame, "casual")}>Casual</button><button type="button" className={classicMatchModes[selectedClassicGame] === "ranked" ? "active" : ""} onClick={() => onClassicMatchModeChange(selectedClassicGame, "ranked")}>🏆 Ranked</button></div>{rankedLeaderboardAction(selectedClassicGame, classicMatchModes[selectedClassicGame] === "ranked")}<div className="word-arena-create-settings"><label>AI players<select value={classicAiCount} onChange={(event) => setClassicAiCount(Number(event.target.value))}>{Array.from({ length: selectedClassicGame === "cheat" ? 6 : 4 }, (_, value) => <option key={value} value={value}>{value === 0 ? "None" : `${value} AI player${value === 1 ? "" : "s"}`}</option>)}</select></label><label>AI difficulty<select value={classicAiDifficulty} disabled={classicAiCount === 0} onChange={(event) => setClassicAiDifficulty(event.target.value as ClassicAiDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label></div><div className="halieus-rule-note"><strong>{selected.name}</strong><small>{selectedClassicGame === "cheat" ? `2–6 players · hidden cards · bluff the required rank · Call Cheat to challenge · ${1 + classicAiCount} starting seats.` : `2–4 players · double-six set · draw from the boneyard when blocked · ${1 + classicAiCount} starting seats.`}</small></div></>}
          {selectedWordArenaGame === "word-game" && <><div className="match-tabs is-two-mode" role="group" aria-label="Word Game puzzle type"><button type="button" className={wordGameMode === "daily" ? "active" : ""} onClick={() => setWordGameMode("daily")}>Daily Puzzle</button><button type="button" className={wordGameMode === "practice" ? "active" : ""} onClick={() => setWordGameMode("practice")}>Practice</button></div><div className="halieus-rule-note"><strong>{wordGameMode === "daily" ? "Daily Puzzle" : "Practice Puzzle"}</strong><small>{wordGameMode === "daily" ? "Single-player · the same five-letter puzzle for everyone today · your first completed attempt counts toward the leaderboard." : "Single-player · six guesses · random practice puzzle · does not affect daily rank or streaks."}</small></div></>}
          {(selectedWordArenaGame === "password" || selectedWordArenaGame === "anagrams-race") && <>
            <div className="match-tabs is-two-mode" role="group" aria-label={`${selected.name} match type`}><button type="button" className={wordArenaMatchMode === "casual" ? "active" : ""} onClick={() => setWordArenaMatchMode("casual")}>Casual</button><button type="button" className={wordArenaMatchMode === "ranked" ? "active" : ""} onClick={() => setWordArenaMatchMode("ranked")}>🏆 Ranked</button></div>{selectedWordArenaGame && rankedLeaderboardAction(selectedWordArenaGame, wordArenaMatchMode === "ranked")}
            <div className="word-arena-create-settings is-human-only">
              <label>Points to win<select value={wordArenaTargetScore} onChange={(event) => setWordArenaTargetScore(Number(event.target.value))}>{[3,5,7,9].map((value) => <option key={value} value={value}>First to {value}</option>)}</select><small>Choose the length of this {wordArenaMatchMode === "casual" ? "casual" : "ranked"} match.</small></label>
              <div className="word-arena-human-only-note"><strong>Human players only</strong><small>{selectedWordArenaGame === "password" ? "Password relies on human clue-giving and interpretation." : "Anagrams Race is a human speed contest; computer opponents are intentionally disabled."}</small></div>
            </div>
            <div className="halieus-rule-note"><strong>{selected.name}</strong><small>{selectedWordArenaGame === "password" ? `2–8 human players · rotating clue giver · one-word clues · first to ${wordArenaTargetScore} points.` : `2–8 human players · shared scrambled word · first correct solve scores · first to ${wordArenaTargetScore} points.`}</small></div>
          </>}
        </div>
        <form onSubmit={createAction} className="modern-form halieus-create-form">
          <label>Your player identity<input value={playerName} onChange={(event) => onPlayerNameChange(event.target.value)} readOnly={Boolean(account && !betaMode)} maxLength={24} /><small>{betaMode ? "Test identity · results are excluded from your account record." : account ? `Using ${account.displayName} from your Halieus account.` : "This name appears in the room."}</small></label>
          <label>New room code<div className="input-action-row"><input value={roomCode} onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={6} /><button type="button" className="button-muted compact-button" onClick={onGenerateRoomCode}>Generate</button></div></label>
          <button type="submit" disabled={disabled} className="button-primary full-button">{isCreating ? "Creating…" : pokerSelected || blackjackSelected ? `Create ${selected.name} table` : `Create ${selected.name} room`}</button>
        </form>
      </section>
    </div>,
    overlayHost,
  ) : null;

  const genericRankedLeaderboardOverlay = rankedLeaderboardGame && overlayHost ? createPortal(
    <div className="leaderboard-backdrop leaderboard-backdrop-global" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setRankedLeaderboardGame(null)}>
      <section className="leaderboard-modal glass-card halieus-generic-ranked-leaderboard" role="dialog" aria-modal="true" aria-label={`${GAME_BY_ID[rankedLeaderboardGame].name} Ranked leaderboard`} style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text, ["--game-icon-accent" as string]: GAME_BY_ID[rankedLeaderboardGame].accent }}>
        <header className="leaderboard-header">
          <div className="halieus-ranked-modal-title"><img src={GAME_BY_ID[rankedLeaderboardGame].icon} alt="" /><div><p className="modal-eyebrow">Ranked · {GAME_BY_ID[rankedLeaderboardGame].name}</p><h2>🏆 Leaderboard</h2><small style={{ color: theme.mutedText }}>Ranked standings are separated by game.</small></div></div>
          <div className="leaderboard-header-actions"><button type="button" className="button-ghost leaderboard-close" aria-label="Close leaderboard" onClick={() => setRankedLeaderboardGame(null)}>✕</button></div>
        </header>
        <div className="leaderboard-empty-state" style={{ borderColor: theme.border }}>
          <div aria-hidden="true">🏆</div><strong>No completed Ranked {GAME_BY_ID[rankedLeaderboardGame].name} results yet</strong><span style={{ color: theme.mutedText }}>This leaderboard is ready for Ranked results. Completed competitive records for this game will populate here as its rating table is activated.</span>
        </div>
      </section>
    </div>,
    overlayHost,
  ) : null;

  const inboxOverlay = inboxOpen && overlayHost ? createPortal(
    <div className="halieus-inbox-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setInboxOpen(false)}>
      <section className="halieus-inbox-panel panel-enter" role="dialog" aria-modal="true" aria-label="Halieus inbox">
        <header>
          <div><p>PLAYER INBOX</p><h2>Requests & invitations</h2><span>Game and guild requests stay inside Halieus, so you do not need to move codes through another app.</span></div>
          <button type="button" onClick={() => setInboxOpen(false)} aria-label="Close inbox">×</button>
        </header>
        {inboxCount === 0 && <div className="halieus-inbox-empty"><strong>You’re all caught up.</strong><span>New game requests and guild invitations will appear here.</span></div>}
        {activeGameRequests.length > 0 && <section className="halieus-inbox-group"><header><strong>Game requests</strong><b>{activeGameRequests.length}</b></header>{activeGameRequests.map((request) => {
          const incoming = request.recipientAccountId === account?.id;
          const accepted = request.status === "accepted";
          const game = GAME_BY_ID[request.game as GameId];
          return <article key={request.id} className="halieus-inbox-item" style={{ ["--inbox-accent" as string]: game.accent }}>
            <img src={game.icon} alt="" />
            <span><small>{incoming ? `${request.senderDisplayName.toUpperCase()} REQUESTED A GAME` : `REQUEST TO ${request.recipientDisplayName.toUpperCase()}`}</small><strong>{request.gameTitle}</strong><em>{accepted ? `Accepted${request.roomCode ? ` · Room ${request.roomCode}` : ""}` : incoming ? "Waiting for your response" : "Waiting for response"}</em></span>
            <div>{accepted ? <button type="button" className="button-primary" onClick={() => void openAcceptedGameRequest(request)}>{incoming ? "Create room" : "Join room"}</button> : incoming ? <><button type="button" className="button-primary" onClick={() => void respondGameRequest(request.id, "accept")}>Accept</button><button type="button" className="button-outline" onClick={() => void respondGameRequest(request.id, "decline")}>Decline</button></> : <button type="button" className="button-muted" onClick={() => void cancelGameRequest(request.id)}>Cancel</button>}</div>
          </article>;
        })}</section>}
        {gameInvites.length > 0 && <section className="halieus-inbox-group"><header><strong>Room invitations</strong><b>{gameInvites.length}</b></header>{gameInvites.map((invite) => {
          const room = liveRooms.find((candidate) => candidate.game === invite.game && candidate.code === invite.roomCode) ?? null;
          const game = GAME_BY_ID[invite.game as GameId];
          return <article key={invite.id} className="halieus-inbox-item" style={{ ["--inbox-accent" as string]: game.accent }}>
            <img src={game.icon} alt="" />
            <span><small>{invite.senderDisplayName.toUpperCase()} INVITED YOU</small><strong>{invite.gameTitle}</strong><em>Room {invite.roomCode}</em></span>
            <div>{room?.joinable && <button type="button" className="button-primary" onClick={() => { setInboxOpen(false); openLiveRoom(room, "join"); }}>Join</button>}{room?.spectatable && <button type="button" className="button-outline" onClick={() => { setInboxOpen(false); openLiveRoom(room, "watch"); }}>Spectate</button>}<button type="button" className="button-muted" onClick={() => void dismissGameInvite(invite.id)}>Dismiss</button></div>
          </article>;
        })}</section>}
        {guildInvites.length > 0 && <section className="halieus-inbox-group"><header><strong>Guild invitations</strong><b>{guildInvites.length}</b></header>{guildInvites.map((invitation) => (
          <article key={invitation.id} className="halieus-inbox-item is-guild" style={{ ["--inbox-accent" as string]: "#8b5cf6" }}>
            {invitation.guildPicture ? <img className="halieus-inbox-guild-mark is-picture" src={invitation.guildPicture} alt="" /> : <span className="halieus-inbox-guild-mark">{invitation.guildName.slice(0, 2).toUpperCase()}</span>}
            <span><small>{invitation.senderDisplayName.toUpperCase()} INVITED YOU</small><strong>{invitation.guildName}</strong><em>Guild membership request</em></span>
            <div><button type="button" className="button-primary" onClick={() => void respondGuildInvitation(invitation, "accept")}>Accept</button><button type="button" className="button-outline" onClick={() => void respondGuildInvitation(invitation, "decline")}>Decline</button></div>
          </article>
        ))}</section>}
      </section>
    </div>,
    overlayHost,
  ) : null;

  const joinOverlay = joinOpen && overlayHost ? createPortal(
    <div className="halieus-join-backdrop halieus-viewport-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setJoinOpen(false)}>
      <section className={`halieus-join-modal panel-enter ${joinIntent === "watch" ? "is-watch-mode" : ""}`} style={{ ["--game-create-accent" as string]: gameAccent }} role="dialog" aria-modal="true" aria-label={joinIntent === "watch" ? "Watch a Halieus game" : "Join a Halieus game"}><header><div><p>{joinIntent === "watch" ? "WATCH GAME" : "JOIN GAME"}</p><h2>{joinIntent === "watch" ? "Watch a room" : "Enter a room"}</h2><span>{joinIntent === "watch" ? "Choose the game and enter its room code to spectate without taking a seat." : "Choose the game, enter the code, and take your seat."}</span></div><button type="button" onClick={() => setJoinOpen(false)} aria-label="Close room entry">×</button></header><div className="halieus-join-games">{GAMES.map((game) => <button type="button" key={game.id} style={{ ["--game-card-accent" as string]: game.accent }} className={selectedGame === game.id ? "is-selected" : ""} onClick={() => selectGame(game.id)}><img src={game.icon} alt="" /><span>{game.name}</span></button>)}</div><div className="halieus-join-fields"><label>{joinIntent === "watch" ? "Watching as" : "Playing as"}<input value={betaMode ? playerName : (account?.displayName ?? playerName)} readOnly /></label><label>Room code<input autoFocus value={roomCode} onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={6} placeholder="ABC123" /></label></div><div className="halieus-join-actions">{joinIntent === "watch" ? <><button type="button" className="button-primary" disabled={disabled || !roomCode.trim()} onClick={spectateAction}>Watch {selected.name}</button><button type="button" className="button-outline" disabled={disabled || !roomCode.trim()} onClick={joinAction}>{isJoining ? "Joining…" : "Take a seat instead"}</button></> : <><button type="button" className="button-primary" disabled={disabled || !roomCode.trim()} onClick={joinAction}>{isJoining ? "Joining…" : `Join ${selected.name}`}</button><button type="button" className="button-outline" disabled={disabled || !roomCode.trim()} onClick={spectateAction}>Watch instead</button></>}</div><button type="button" className="halieus-recovery-toggle" onClick={() => setShowRecovery((current) => !current)}>🔑 Recovery key <span>{showRecovery ? "−" : "+"}</span></button>{showRecovery && <div className="halieus-join-recovery"><label>Recovery key<input value={activeRecovery} onChange={(event) => recoveryChange(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} /></label><button type="button" className="button-muted" disabled={disabled} onClick={manualReconnect}>Rejoin this seat</button></div>}{message && <p className="status-toast" role="status">{message}</p>}</section>
    </div>,
    overlayHost,
  ) : null;

  return (
    <main className={`halieus-shell page-enter game-bg-${selectedGame}`} style={{ background: theme.pageBackground, color: theme.text, ["--player-accent" as string]: playerAccent, ["--selected-game-accent" as string]: gameAccent }}>
      <div className={`halieus-game-atmosphere game-bg-${selectedGame}`} aria-hidden="true">
        {selected.motifs.concat(selected.motifs.slice(0, 3)).map((motif, index) => <span key={`${motif}-${index}`} style={{ ["--float-index" as string]: index }}>{motif}</span>)}
      </div>
      {mobileMenuOpen && <button type="button" className="halieus-mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" />}

      <aside className={`halieus-sidebar ${mobileMenuOpen ? "is-mobile-open" : ""}`} aria-label="Halieus navigation">
        <button type="button" className="halieus-mobile-drawer-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><HgrIcon name="close" size={22} /></button>
        <button type="button" className="halieus-side-brand" onClick={() => { setView("home"); setMobileMenuOpen(false); }} aria-label="Halieus Game Room home"><HalieusBrandMark /><span>Halieus Game Room</span></button>
        {account && <button type="button" className="halieus-side-account halieus-side-account-top" onClick={onOpenAccount}><span className="halieus-avatar-media" style={{ background: account.playerColor }}>{account.profilePicture ? <img src={account.profilePicture} alt="" /> : account.avatar}</span><div><strong>{account.displayName}</strong><small>@{account.username}</small></div><i aria-hidden="true"><HgrIcon name="chevron-right" size={16} /></i></button>}
        <nav className="halieus-side-nav">
          <button type="button" className={view === "home" ? "is-active" : ""} onClick={() => { setView("home"); setMobileMenuOpen(false); }}><span className="halieus-nav-icon"><HgrIcon name="home" /></span><b>Home</b></button>
          <button type="button" className={view === "games" ? "is-active" : ""} onClick={() => { setView("games"); setMobileMenuOpen(false); }}><span className="halieus-nav-icon"><HgrIcon name="games" /></span><b>Games</b></button>
          <button type="button" className={view === "players" ? "is-active" : ""} onClick={() => { setView("players"); setMobileMenuOpen(false); }}><span className="halieus-nav-icon"><HgrIcon name="players" /></span><b>Players</b></button>
          {account && <button type="button" className={view === "guilds" ? "is-active" : ""} onClick={() => { setView("guilds"); setMobileMenuOpen(false); }}><span className="halieus-nav-icon"><HgrIcon name="games" /></span><b>Guilds</b></button>}
          {account && <button type="button" className={inboxOpen ? "is-active halieus-inbox-nav" : "halieus-inbox-nav"} onClick={() => { setInboxOpen(true); setMobileMenuOpen(false); }}><span className="halieus-nav-icon"><HgrIcon name="inbox" /></span><b>Inbox</b>{inboxCount > 0 && <span className="halieus-inbox-badge">{inboxCount > 99 ? "99+" : inboxCount}</span>}</button>}
        </nav>
        <button type="button" className="halieus-global-join" onClick={() => { openJoin("join"); setMobileMenuOpen(false); }}><span className="halieus-nav-icon"><HgrIcon name="plus" /></span><b>Join Game</b></button>
        <div className="halieus-side-spacer" />
        {betaMode && <div className="halieus-beta-badge"><strong>BETA TEST</strong><span>Stats excluded</span></div>}
        <div className="halieus-side-display-controls" aria-label="Display controls">
          <button type="button" className="halieus-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit full screen" : fullscreenSupported ? "Enter full screen" : "Full screen unavailable"}><span className="halieus-nav-icon"><HgrIcon name={isFullscreen ? "minimize" : "fullscreen"} /></span><b>{isFullscreen ? "Exit Full Screen" : fullscreenSupported ? "Full Screen" : "Full Screen unavailable"}</b></button>
          <ThemeButton darkMode={darkMode} background={theme.secondaryBackground} colour={theme.text} borderColour={theme.border} onToggle={onToggleDarkMode} />
          <SkinLibraryButton stats={personalStats} betaMode={betaMode} ratings={skinRatings} />
          <InstallAppButton />
          <NotificationPermissionButton />
        </div>
        <button type="button" className="halieus-side-build-info" onClick={() => setBuildInfoOpen(true)}><span className="halieus-nav-icon"><HgrIcon name="info" /></span><b>Build Info</b></button>
        {buildInfoOpen && <div className="halieus-home-build-popover" role="dialog" aria-modal="true" aria-label="Build information"><button type="button" onClick={() => setBuildInfoOpen(false)} aria-label="Close build information"><HgrIcon name="close" size={20} /></button><p>HALIEUS GAME ROOM</p><h3>Build {APP_RELEASE_LABEL}</h3><small>Exact release</small><code>{RELEASE_FINGERPRINT}</code></div>}
        {fullscreenNotice && <small className="halieus-fullscreen-note" role="status">{fullscreenNotice}</small>}
      </aside>

      <section className="halieus-main">
        <header className="halieus-mobile-bar"><button type="button" className="halieus-mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open Halieus menu"><HgrIcon name="menu" size={22} /></button><button type="button" className="halieus-mobile-brand" onClick={() => { setView("home"); setMobileMenuOpen(false); }}><HalieusBrandMark /><strong>Halieus Game Room</strong></button><div className="halieus-mobile-actions"><button type="button" className="halieus-mobile-fullscreen" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit full screen" : fullscreenSupported ? "Enter full screen" : "Full screen unavailable"}><HgrIcon name={isFullscreen ? "minimize" : "fullscreen"} size={20} /></button>{account && <button type="button" className="halieus-mobile-inbox" onClick={() => setInboxOpen(true)} aria-label={`Open inbox${inboxCount ? `, ${inboxCount} new items` : ""}`}><HgrIcon name="inbox" size={20} />{inboxCount > 0 && <b>{inboxCount > 9 ? "9+" : inboxCount}</b>}</button>}{account && <button type="button" className="halieus-mobile-account" onClick={onOpenAccount} aria-label={`Open ${account.displayName} profile`}><span className="halieus-avatar-media" style={{ background: account.playerColor }}>{account.profilePicture ? <img src={account.profilePicture} alt="" /> : account.avatar}</span><i aria-hidden="true" /></button>}</div></header>

        {view === "home" && <section className="halieus-view view-home panel-enter">
          <section className="halieus-showcase halieus-feature-carousel" style={{ ["--feature-accent" as string]: featuredGame.accent }}>
            <div className="halieus-showcase-copy" aria-live="polite">
              <div key={featuredGameId} className="halieus-feature-copy-stage">
                <p>{betaMode ? "BETA TEST LAB" : `GAME NIGHT STARTS HERE · ${account?.displayName ? `WELCOME BACK, ${account.displayName.toUpperCase()}` : "FEATURED TABLE"}`}</p>
                <h1>{betaMode ? "Test the room before game night." : featuredSeat ? `Continue ${featuredGame.name}.` : `${featuredGame.name} is on deck.`}</h1>
                <span>{betaMode ? "Test rooms stay separate from your normal account record." : featuredSeat ? `Room ${featuredSeat.session?.code} is waiting for you.` : `${featuredGame.subtitle}. Start a room, join with a code, or watch a live table.`}</span>
                <div className="halieus-showcase-actions">
                  {featuredSeat ? <button type="button" className="button-primary" onClick={() => { selectGame(featuredSeat.id); featuredSeat.resume(); }} disabled={disabled}>Continue {featuredSeat.game}</button> : <button type="button" className="button-primary" onClick={() => openCreate(featuredGameId)}>Start {featuredGame.name}</button>}
                  <button type="button" className="button-outline" onClick={() => openJoin("join")}>Join with code</button>
                  <button type="button" className="button-outline halieus-watch-button" onClick={() => openJoin("watch")}>Watch a game</button>
                </div>
                <div className="halieus-showcase-status" aria-label="Game Room status">
                  <button type="button" onClick={() => { setView("games"); setMobileMenuOpen(false); }}><strong>{GAMES.length}</strong><span>games ready</span></button>
                  <button type="button" onClick={() => { setView("players"); setMobileMenuOpen(false); }}><strong>{onlinePlayers.length}</strong><span>players online</span></button>
                  <button type="button" onClick={() => savedSeats[0] ? savedSeats[0].resume() : setView("games")}><strong>{savedSeats.length}</strong><span>rooms to continue</span></button>
                </div>
              </div>
            </div>
            <div className="halieus-showcase-feature" aria-label={`Featured game: ${featuredGame.name}`}>
              {featureRotation.length > 1 && <button type="button" className="halieus-feature-arrow is-previous" onClick={previousFeature} aria-label="Previous featured game"><HgrIcon name="chevron-left" size={24} /></button>}
              <div key={featuredGameId} className="halieus-feature-card-stage">
                <span className="halieus-showcase-orbit" aria-hidden="true">{featuredGame.motifs.slice(0, 4).map((motif, index) => <i key={`${motif}-${index}`}>{motif}</i>)}</span>
                <img src={featuredGame.icon} alt="" />
                <div><p>{featuredSeat ? "ROOM TO CONTINUE" : "FEATURED NOW"}</p><h2>{featuredGame.name}</h2><span>{featuredSeat ? `Room ${featuredSeat.session?.code}` : featuredGame.subtitle}</span></div>
                <b>{featuredSeat ? "Continue" : featuredGame.status === "beta" ? "Beta" : "Available"}</b>
              </div>
              {featureRotation.length > 1 && <button type="button" className="halieus-feature-arrow is-next" onClick={nextFeature} aria-label="Next featured game"><HgrIcon name="chevron-right" size={24} /></button>}
              <nav className="halieus-feature-rail" aria-label="Featured games">
                {featureRotation.map((gameId, index) => {
                  const game = GAME_BY_ID[gameId];
                  return <button type="button" key={gameId} className={featuredGameId === gameId ? "is-active" : ""} onClick={() => setFeaturedRotationIndex(index)} aria-label={`Show ${game.name}`} aria-current={featuredGameId === gameId ? "true" : undefined}><img src={game.icon} alt="" /><span>{game.name}</span></button>;
                })}
              </nav>
            </div>
          </section>
          <section className="halieus-home-discovery" aria-label="Game discovery">
            <header>
              <div><p>DISCOVER</p><h2>Pick your next table</h2><span>A short shortlist for the Home screen. The full library stays under View all games.</span></div>
              <button type="button" onClick={() => { setView("games"); setMobileMenuOpen(false); }}>View all games →</button>
            </header>
            <nav className="halieus-discovery-tabs" aria-label="Game discovery filters">
              {([
                ["featured", "Featured"],
                ["most-played", "Most Played"],
                ["recommended", "Recommended"],
                ["recent", "Recently Played"],
                ["friends", "Friends Are Playing"],
              ] as Array<[DiscoveryShelf, string]>).map(([id, label]) => <button type="button" key={id} className={discoveryShelf === id ? "is-active" : ""} onClick={() => setDiscoveryShelf(id)}>{label}</button>)}
            </nav>
            <div className={`halieus-discovery-row${discoveryGames.length === 0 ? " is-empty" : ""}`}>
              {discoveryGames.map((gameId) => {
                const game = GAME_BY_ID[gameId];
                const stat = personalStats.byGame.find((row) => row.game === gameId);
                const liveCount = liveRooms.filter((room) => room.game === gameId).reduce((count, room) => count + room.humanPlayers.length, 0);
                return <button type="button" key={game.id} className={`halieus-discovery-card tone-${game.tone}`} style={{ ["--game-card-accent" as string]: game.accent }} onClick={() => applyQuickPlay(game.id)}>
                  <span className="halieus-discovery-art"><img src={game.icon} alt="" /></span>
                  <span><strong>{game.name}</strong><small>{game.subtitle}</small><em>{liveCount > 0 ? `${liveCount} playing now` : stat?.played ? `${stat.played} played` : "Try something new"}</em></span>
                  <i>Quick Play →</i>
                </button>;
              })}
              {discoveryShelf === "friends" && discoveryGames.length === 0 && <div className="halieus-discovery-empty"><span aria-hidden="true">◇</span><div><strong>No friend activity to show</strong><small>This shelf stays empty until HGR has a real friend relationship to match against live rooms.</small></div></div>}
            </div>
          </section>
          <section className="halieus-home-social-grid">
            <section className="halieus-section-card halieus-home-player-strip">
              <header><div><p>ONLINE PLAYERS</p><h2>Who’s around</h2></div><button type="button" onClick={() => setView("players")}>View all →</button></header>
              <div>{onlinePlayers.slice(0, 3).map((person) => <PlayerIdentityCard key={person.id} player={person} compact detail={liveRoomByPlayerName.has(person.displayName.trim().toLowerCase()) ? "In game" : "Online"} actions={playerCardActions(person)} onClick={() => { setSelectedPlayerId(person.id); setView("players"); }} />)}{onlinePlayers.length === 0 && <p>No other players are online right now.</p>}</div>
            </section>
            <section className="halieus-section-card halieus-home-player-strip">
              <header><div><p>RECENT PLAYERS</p><h2>Play together again</h2></div><button type="button" onClick={() => setView("players")}>View all →</button></header>
              <div>{recentPlayers.slice(0, 3).map((person) => <PlayerIdentityCard key={person.id} player={person} compact detail={person.online ? "Online" : person.lastSeenAt ? `Last seen ${new Date(person.lastSeenAt).toLocaleDateString()}` : "Offline"} actions={playerCardActions(person)} onClick={() => { setSelectedPlayerId(person.id); setView("players"); }} />)}{recentPlayers.length === 0 && <p>Your recent players will appear here.</p>}</div>
            </section>
          </section>
          {savedSeats.length > 1 && <section className="halieus-section-card halieus-continue-home halieus-continue-secondary"><header><div><p>OTHER ROOMS</p><h2>Ready to rejoin</h2></div><span>{savedSeats.length - 1}</span></header><div className="halieus-continue-list">{savedSeats.slice(1).map((entry) => <div key={entry.id} className="halieus-continue-row"><button type="button" onClick={() => { selectGame(entry.id); entry.resume(); }} disabled={disabled}><img src={GAME_BY_ID[entry.id].icon} alt="" /><span><strong>{entry.game}</strong><small>Room {entry.session?.code}</small></span><b>Continue →</b></button><button type="button" onClick={entry.forget} aria-label={`Forget ${entry.game} room`}>×</button></div>)}</div></section>}
          {liveRooms.length > 0 && <section className="halieus-live-games"><header><div><p>ACTIVE GAMES</p><h2>Players are at the table</h2><span>Join an open lobby or watch a game already in progress.</span></div><b>{liveRooms.length} live</b></header><div className="halieus-live-games-strip">{liveRooms.slice(0, 8).map((room) => { const game = GAME_BY_ID[room.game]; const elapsed = room.startedAt ? Math.max(0, Date.now() - room.startedAt) : 0; const mins = Math.floor(elapsed / 60000); return <article key={`${room.game}-${room.code}`} className={`halieus-live-game-card tone-${game.tone}`} style={{ ["--game-card-accent" as string]: game.accent }}><div className="halieus-live-game-brand"><img src={game.icon} alt="" /><span><small>{room.started ? "LIVE NOW" : "OPEN LOBBY"}</small><strong>{game.name}</strong></span><i /></div><div className="halieus-live-game-people"><strong>{room.humanPlayers.length ? room.humanPlayers.join(", ") : `${room.aiCount} AI player${room.aiCount === 1 ? "" : "s"}`}</strong><small>Room {room.code} · {room.playerCount}/{room.maximumPlayers} players{room.started ? ` · ${mins}m` : ""}</small></div><div className="halieus-live-game-actions">{room.joinable && <button type="button" className="button-primary" onClick={() => openLiveRoom(room, "join")}>Join</button>}{room.spectatable && <button type="button" className="button-outline" onClick={() => openLiveRoom(room, "watch")}>Spectate</button>}</div></article>; })}</div></section>}
          {dataError && <p className="halieus-data-note">{dataError}</p>}
        </section>}

        {view === "games" && <section className="halieus-view view-games panel-enter">
          <header className="halieus-page-heading"><div><p>GAMES</p><h1>Choose your game</h1><span>Browse the library, then open a focused room setup when you are ready to play.</span></div></header>
          <div className="halieus-games-layout is-library-only">
            <div className="halieus-game-library is-categorized">{GAME_GROUPS.map((group) => { const games = GAMES.filter((game) => game.category === group.id); if (!games.length) return null; return <section key={group.id} className={`halieus-game-category category-${group.id}`}><header><div><h2>{group.label}</h2><span>{group.description}</span></div><b>{games.length}</b></header><div>{games.map((game) => <button type="button" key={game.id} style={{ ["--game-card-accent" as string]: game.accent }} className={`halieus-library-card tone-${game.tone} ${selectedGame === game.id ? "is-selected" : ""}`} onClick={() => openCreate(game.id)}><span className="halieus-library-status">{game.status === "beta" ? "Beta" : "Available"}</span><span className="halieus-library-art"><GameBrandIcon game={game.id} /></span><span><strong>{game.name}</strong><small>{game.subtitle}</small></span><i>Create room →</i></button>)}</div></section>; })}</div>
            <section className="halieus-future-games" aria-label="Games in development"><header><div><p>IN DEVELOPMENT</p><h2>Coming next</h2><span>These are the requested replacement modules. They are visible as roadmap items only until real rooms, gameplay and QA exist.</span></div><b>{FUTURE_GAME_QUEUE.length}</b></header><div>{FUTURE_GAME_QUEUE.map((game) => <article key={game.name}><span aria-hidden="true">{game.glyph}</span><div><strong>{game.name}</strong><small>{game.subtitle}</small></div><b>Planned</b></article>)}</div></section>
          </div>
        </section>}

        {view === "players" && <section className="halieus-view view-players panel-enter">
          <header className="halieus-page-heading"><div><p>HALIEUS SOCIAL</p><h1>Players</h1><span>Find friends, see who is in a room, and open a useful game record instead of a plain contact list.</span></div><button type="button" className="button-outline halieus-open-guilds" onClick={() => { setView("guilds"); setSelectedPlayerId(null); }}>Guilds →</button></header>
          <div className="halieus-player-tools">
            <label><span>Search players</span><input value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Name or username" /></label>
            <div className="halieus-player-filters" role="group" aria-label="Player status filter">
              {(["all", "online", "in-game", "offline"] as const).map((filter) => <button type="button" key={filter} className={playerFilter === filter ? "is-active" : ""} onClick={() => setPlayerFilter(filter)}>{filter === "in-game" ? "In Game" : filter[0].toUpperCase() + filter.slice(1)}</button>)}
            </div>
          </div>
          <div className={`halieus-players-layout ${selectedPlayer ? "has-selection" : ""}`}>
            <div className="halieus-player-directory">
              {filteredDirectory.map((person) => {
                const liveRoom = liveRoomByPlayerName.get(person.displayName.trim().toLowerCase()) ?? null;
                const liveGame = liveRoom ? GAME_BY_ID[liveRoom.game] : null;
                return <PlayerIdentityCard
                  key={person.id}
                  player={person}
                  selected={selectedPlayerId === person.id}
                  className={`${person.online ? "is-online" : "is-offline"} ${liveRoom ? "is-in-game" : ""}`}
                  detail={liveRoom && liveGame ? `Playing ${liveGame.name} · ${liveRoom.code}` : person.online ? "Online" : "Offline"}
                  actions={playerCardActions(person)}
                  onClick={() => setSelectedPlayerId(person.id)}
                />;
              })}
              {filteredDirectory.length === 0 && <div className="halieus-player-empty">No players match this filter.</div>}
            </div>
            {selectedPlayer && <aside className="halieus-player-profile-card panel-enter" style={{ ["--profile-accent" as string]: selectedPlayer.playerColor }}>
              <header><span className="halieus-profile-avatar halieus-avatar-media" style={{ background: selectedPlayer.playerColor }}>{selectedPlayer.profilePicture ? <img src={selectedPlayer.profilePicture} alt="" /> : selectedPlayer.avatar}</span><div><p>{selectedPlayerRoom ? "IN A GAME" : selectedPlayer.online ? "ONLINE NOW" : "PLAYER PROFILE"}</p><h2>{selectedPlayer.displayName}</h2><small>@{selectedPlayer.username}</small></div><button type="button" onClick={() => setSelectedPlayerId(null)} aria-label="Close player profile">×</button></header>
              {selectedPlayerRoom && <section className="halieus-profile-live-room"><div><small>PLAYING NOW</small><strong>{GAME_BY_ID[selectedPlayerRoom.game].name}</strong><span>Room {selectedPlayerRoom.code} · {selectedPlayerRoom.playerCount}/{selectedPlayerRoom.maximumPlayers} players</span></div><div>{selectedPlayerRoom.joinable && <button type="button" className="button-primary" onClick={() => openLiveRoom(selectedPlayerRoom, "join")}>Join</button>}{selectedPlayerRoom.spectatable && <button type="button" className="button-outline" onClick={() => openLiveRoom(selectedPlayerRoom, "watch")}>Spectate</button>}</div></section>}
              {selectedPlayer.id !== account?.id && <section className="halieus-profile-invite-row halieus-profile-request-row"><div><small>REQUEST A GAME</small><strong>{selectedPlayer.online ? "Invite them now" : "They can accept when they return"}</strong><select value={requestGameId} onChange={(event) => setRequestGameId(event.target.value as GameId)}>{GAMES.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></div><button type="button" className="button-primary" disabled={requestingPlayerId === selectedPlayer.id} onClick={() => void requestGame(selectedPlayer)}>{requestingPlayerId === selectedPlayer.id ? "Sending…" : "Request game"}</button></section>}
              {ownLiveRoom && selectedPlayer.id !== account?.id && <section className="halieus-profile-invite-row"><div><small>YOUR ACTIVE ROOM</small><strong>Invite to {ownLiveRoom.gameTitle}</strong><span>Room {ownLiveRoom.code}</span></div><button type="button" className="button-primary" disabled={invitingPlayerId === selectedPlayer.id} onClick={() => void invitePlayerToOwnRoom(selectedPlayer)}>{invitingPlayerId === selectedPlayer.id ? "Sending…" : "Invite to game"}</button></section>}
              {inviteNotice && <p className="halieus-profile-invite-notice" role="status">{inviteNotice}</p>}
              {playerStatsLoading ? <div className="halieus-profile-loading">Loading game record…</div> : <>
                <div className="halieus-profile-summary"><article><span>Games played</span><strong>{selectedPlayerStats.played}</strong></article><article><span>Wins</span><strong>{selectedPlayerStats.wins}</strong></article><article><span>Win rate</span><strong>{selectedPlayerStats.winRate}%</strong></article><article><span>Favourite</span><strong>{selectedPlayerFavourite?.gameTitle ?? "—"}</strong></article><article><span>Win streak</span><strong>{selectedPlayerStreak}</strong></article></div>
                <section className="halieus-profile-games"><h3>Game record</h3>{selectedPlayerStats.byGame.map((row) => { const game = GAME_BY_ID[row.game as GameId]; return <article key={row.game}><img src={game?.icon} alt="" /><div><strong>{row.gameTitle}</strong><small>{row.played} played · {row.wins} won · {row.winRate}%</small></div></article>; })}</section>
                <section className="halieus-profile-recent"><h3>Recent games</h3>{selectedPlayerStats.recent.length ? selectedPlayerStats.recent.slice(0, 6).map((item, index) => <article key={`${item.roomCode}-${item.at}-${index}`}><span><strong>{item.gameTitle}</strong><small>{new Date(item.at).toLocaleDateString()} · Room {item.roomCode}</small></span><b className={item.won ? "is-win" : ""}>{item.result}</b></article>) : <div className="halieus-profile-empty">No completed games matched this account yet.</div>}</section>
              </>}
            </aside>}
          </div>
        </section>}

        {view === "guilds" && account && (
          <section className="halieus-view view-guilds panel-enter">
            <GuildsPanel
              account={account}
              liveRooms={liveRooms}
              onBackToPlayers={() => setView("players")}
              onCreateRoom={openGuildCreate}
              onOpenLiveRoom={openLiveRoom}
            />
          </section>
        )}
      </section>

      <nav className="halieus-mobile-nav" aria-label="Mobile navigation"><button type="button" className={view === "home" ? "is-active" : ""} onClick={() => { setView("home"); setMobileMenuOpen(false); }}>⌂<span>Home</span></button><button type="button" className={view === "games" ? "is-active" : ""} onClick={() => { setView("games"); setMobileMenuOpen(false); }}>▦<span>Games</span></button><button type="button" onClick={() => openJoin("join")}>＋<span>Join</span></button><button type="button" className={view === "players" || view === "guilds" ? "is-active" : ""} onClick={() => { setView("players"); setMobileMenuOpen(false); }}>◉<span>Players</span></button></nav>

      {inboxOverlay}
      {createOverlay}
      {joinOverlay}
      {genericRankedLeaderboardOverlay}
    </main>
  );
}
