import type {
  GameActivityKind,
  GameState,
  GlobalGameNotice,
} from "../../../../../shared/games/mega-board/game-state.js";
import { captureStats, ensurePlayerStats } from "./stats.js";

const MAX_ACTIVITY_ITEMS = 5000;
const MAX_GLOBAL_NOTICES = 48;

const ACTION_NOTICE_TITLES: Record<GameActivityKind, string> = {
  game: "🎮 Game update",
  roll: "🎲 Roll",
  purchase: "🏠 Property action",
  auction: "🔨 Auction",
  card: "🃏 Card",
  jail: "🚔 Jail",
  building: "🏗️ Development",
  mortgage: "🏦 Asset action",
  trade: "🤝 Trade",
  debt: "💳 Debt",
  mega: "🚌 Mega action",
  turn: "⏭️ Turn",
};

export function pushGlobalNotice(
  gameState: GameState,
  notice: Omit<GlobalGameNotice, "id" | "createdAt"> & {
    id?: string;
    createdAt?: number;
  },
): GlobalGameNotice {
  const fullNotice: GlobalGameNotice = {
    id: notice.id ?? `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: notice.createdAt ?? Date.now(),
    kind: notice.kind,
    title: notice.title,
    message: notice.message,
    ...(notice.playerId ? { playerId: notice.playerId } : {}),
    ...(notice.presentation ? { presentation: notice.presentation } : {}),
    ...(notice.steps?.length ? { steps: notice.steps } : {}),
    ...(notice.durationMs ? { durationMs: notice.durationMs } : {}),
  };

  gameState.lastGlobalNotice = fullNotice;
  gameState.globalNotices ??= [];

  const previous = gameState.globalNotices.at(-1);
  if (
    !previous ||
    previous.message !== fullNotice.message ||
    fullNotice.createdAt - previous.createdAt >= 450
  ) {
    gameState.globalNotices.push(fullNotice);
  }

  if (gameState.globalNotices.length > MAX_GLOBAL_NOTICES) {
    gameState.globalNotices.splice(
      0,
      gameState.globalNotices.length - MAX_GLOBAL_NOTICES,
    );
  }

  return fullNotice;
}

export function recordActivity(
  gameState: GameState,
  message: string,
  kind: GameActivityKind = "game",
  playerId?: string,
  options?: { announce?: boolean },
): void {
  const clean = message.trim();
  if (!clean) return;

  gameState.activityLog ??= [];

  const previous = gameState.activityLog.at(-1);
  if (
    previous &&
    previous.message === clean &&
    Date.now() - previous.at < 500
  ) {
    return;
  }

  const eliminationTurn = playerId && /bankrupt|forfeit|eliminat/i.test(clean)
    ? gameState.playerStats?.[playerId]?.eliminatedTurn
    : null;

  gameState.activityLog.push({
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    turnNumber: eliminationTurn ?? gameState.turnNumber,
    kind,
    message: clean,
    ...(playerId ? { playerId } : {}),
  });

  if (playerId) {
    const player = gameState.players.find((candidate) => candidate.id === playerId);
    if (player) {
      const stats = ensurePlayerStats(gameState, player);
      stats.actions += 1;
      if (kind === "purchase" && /\b(bought|purchased)\b/i.test(clean)) stats.purchases += 1;
      else if (kind === "auction") stats.auctionEvents += 1;
      else if (kind === "trade") stats.tradeEvents += 1;
      else if (kind === "building") stats.buildingEvents += 1;
      else if (kind === "mortgage") stats.mortgageEvents += 1;
      else if (kind === "debt") stats.debtEvents += 1;
      else if (kind === "jail") stats.jailEvents += 1;
    }

    const recentSpecificNotice = gameState.lastGlobalNotice;
    const alreadyCoveredBySpecificNotice = Boolean(
      recentSpecificNotice &&
      recentSpecificNotice.kind !== "player-action" &&
      Date.now() - recentSpecificNotice.createdAt < 1400 &&
      (!recentSpecificNotice.playerId || recentSpecificNotice.playerId === playerId)
    );

    const shouldAutoAnnounce =
      options?.announce !== false &&
      (kind === "mortgage" || kind === "debt" || kind === "mega");

    // Roll/turn/card/purchase/auction/build/trade/jail events either have a
    // dedicated live presentation or push a purpose-built notice. Generating a
    // second generic notice for every activity was the main source of delayed
    // narration during rapid AI/autopilot turns.
    if (shouldAutoAnnounce && !alreadyCoveredBySpecificNotice) {
      pushGlobalNotice(gameState, {
        kind: "player-action",
        title: ACTION_NOTICE_TITLES[kind],
        message: clean,
        playerId,
        durationMs: 2200,
      });
    }
  }

  captureStats(gameState);

  if (gameState.activityLog.length > MAX_ACTIVITY_ITEMS) {
    gameState.activityLog.splice(
      0,
      gameState.activityLog.length - MAX_ACTIVITY_ITEMS,
    );
  }
}
