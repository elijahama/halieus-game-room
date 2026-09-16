import {
  getBoardSpace,
  isPropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import {
  getGameCard,
} from "../../../../../shared/games/mega-board/cards";
import type {
  GameActivityEntry,
  GamePlayer,
  GameState,
  PlayerMatchStats,
} from "../../../../../shared/games/mega-board/game-state";
import { STARTING_CASH } from "../../../../../shared/games/mega-board/game-rules";
import { getMatchAwards } from "../../../../../shared/games/mega-board/ranked";
import { APP_VERSION } from "../../../version";

const RULE = "=".repeat(72);
const SUBRULE = "-".repeat(72);

function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}£${Math.abs(Math.round(value)).toLocaleString("en-GB")}`;
}

function formatDateTime(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "Not available";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function playerName(gameState: GameState, playerId: string | null | undefined): string {
  if (!playerId) return "Bank";
  return gameState.players.find((player) => player.id === playerId)?.name ?? "Unknown player";
}

function spaceName(spaceId: number | null | undefined): string {
  if (spaceId === null || spaceId === undefined) return "None";
  return getBoardSpace(spaceId)?.name ?? `Space ${spaceId}`;
}

function playerType(player: GamePlayer): string {
  if (player.isAi) return `AI · ${player.aiDifficulty ?? "normal"}`;
  if (player.autopilotEnabled) return `Human · Autopilot ${player.autopilotDifficulty}`;
  return "Human";
}

function developmentLabel(level: number): string {
  if (level <= 0) return "none";
  if (level <= 4) return `${level} house${level === 1 ? "" : "s"}`;
  if (level === 5) return "hotel";
  return "skyscraper";
}

function assetValue(gameState: GameState, player: GamePlayer): number {
  return player.properties.reduce((sum, spaceId) => {
    const space = getBoardSpace(spaceId);
    if (!space || !("price" in space)) return sum;
    let value = space.price;
    if (isPropertyBoardSpace(space)) {
      value += (gameState.propertyDevelopments[spaceId] ?? 0) * space.houseCost;
    }
    if (gameState.railroadDepots[spaceId] && "depotCost" in space) {
      value += space.depotCost;
    }
    return sum + value;
  }, 0);
}

function liveDevelopments(gameState: GameState, player: GamePlayer): number {
  return player.properties.reduce(
    (sum, spaceId) => sum + (gameState.propertyDevelopments[spaceId] ?? 0),
    0,
  );
}

function emptyStats(player: GamePlayer): PlayerMatchStats {
  return {
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
    peakProperties: player.properties.length,
    peakNetWorth: player.cash,
    finishPosition: null,
    eliminatedTurn: null,
    finalCash: null,
    finalProperties: null,
    finalDevelopments: null,
    finalNetWorth: null,
    history: [],
  };
}

function section(title: string, lines: string[]): string[] {
  return ["", title, SUBRULE, ...lines];
}

function activityLines(entries: GameActivityEntry[]): string[] {
  if (entries.length === 0) return ["None recorded."];
  return entries.map((entry) =>
    `[${formatDateTime(entry.at)}] Turn ${entry.turnNumber} · ${entry.kind.toUpperCase()} · ${entry.message}`,
  );
}

function buildPendingStateLines(gameState: GameState): string[] {
  const lines: string[] = [];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  lines.push(`Current player: ${currentPlayer?.name ?? "None"}`);
  lines.push(`Game phase: ${gameState.phase}`);
  lines.push(`Turn phase: ${gameState.turnPhase}`);
  lines.push(`Turn number: ${gameState.turnNumber}`);
  lines.push(`Moved this turn: ${gameState.movedThisTurn ? "YES" : "NO"}`);
  lines.push(`Awaiting reroll: ${gameState.awaitingReroll ? "YES" : "NO"}`);
  lines.push(`Consecutive doubles: ${gameState.consecutiveDoubles}`);
  lines.push(`Speed Die: ${gameState.speedDieRetired ? "RETIRED" : "ACTIVE"}`);
  lines.push(`Turn timer setting: ${gameState.turnTimerSeconds ?? "Legacy/default"} seconds`);
  lines.push(`Roll deadline: ${gameState.turnRollDeadline ? formatDateTime(gameState.turnRollDeadline) : "None"}`);
  lines.push(`Roll deadline player: ${gameState.turnRollDeadlinePlayerId ?? "None"}`);
  lines.push(`Optional-action deadline: ${gameState.optionalActionDeadline ? formatDateTime(gameState.optionalActionDeadline) : "None"}`);
  if (gameState.optionalActionDeadline) {
    const remaining = gameState.optionalActionDeadline - Date.now();
    lines.push(`Optional-action deadline status: ${remaining < 0 ? `OVERDUE by ${formatDuration(Math.abs(remaining))}` : `${formatDuration(remaining)} remaining`}`);
  }

  lines.push(`Pending purchase: ${gameState.pendingPurchase ? `${playerName(gameState, gameState.pendingPurchase.playerId)} · ${spaceName(gameState.pendingPurchase.spaceId)} · ${formatMoney(gameState.pendingPurchase.price)}` : "None"}`);
  lines.push(`Pending auction: ${gameState.pendingAuction ? `${spaceName(gameState.pendingAuction.spaceId)} · current bid ${formatMoney(gameState.pendingAuction.currentBid)} · leader ${gameState.pendingAuction.highestBidderId ? playerName(gameState, gameState.pendingAuction.highestBidderId) : "None"}` : "None"}`);
  lines.push(`Pending trade: ${gameState.pendingTrade ? (() => {
    const trade = gameState.pendingTrade;
    const participantIds = trade.participantIds ?? [trade.proposerId, trade.recipientId];
    if (trade.multiParty && participantIds.length >= 3) {
      const names = participantIds.map((id) => playerName(gameState, id)).join(" + ");
      return `${participantIds.length}-way · ${names} · ${trade.acceptedPlayerIds?.length ?? 1}/${participantIds.length} approved · ${trade.status}`;
    }
    return `${playerName(gameState, trade.proposerId)} → ${playerName(gameState, trade.recipientId)} · ${trade.status}`;
  })() : "None"}`);
  lines.push(`Pending debt: ${gameState.pendingDebt ? `${playerName(gameState, gameState.pendingDebt.debtorId)} owes ${formatMoney(gameState.pendingDebt.amount)} to ${gameState.pendingDebt.creditorShares?.length ? gameState.pendingDebt.creditorShares.map((share) => `${playerName(gameState, share.creditorId)} ${formatMoney(share.amount)}`).join(" + ") : playerName(gameState, gameState.pendingDebt.creditorId)} · ${gameState.pendingDebt.reason}` : "None"}`);
  lines.push(`Pending card: ${gameState.pendingCard ? `${playerName(gameState, gameState.pendingCard.playerId)} · ${getGameCard(gameState.pendingCard.cardId)?.title ?? gameState.pendingCard.cardId}` : "None"}`);
  lines.push(`Pending jail move: ${gameState.pendingJailMove ? `${playerName(gameState, gameState.pendingJailMove.playerId)} · dice ${gameState.pendingJailMove.diceTotal}` : "None"}`);
  lines.push(`Pending Mega action: ${gameState.pendingMegaAction ? `${playerName(gameState, gameState.pendingMegaAction.playerId)} · ${gameState.pendingMegaAction.type}` : "None"}`);
  lines.push(`Pending Speed Die action: ${gameState.pendingSpeedDieAction ? `${playerName(gameState, gameState.pendingSpeedDieAction.playerId)} · ${gameState.pendingSpeedDieAction.type}` : "None"}`);
  lines.push(`Last dice roll: ${gameState.lastDiceRoll ? `${gameState.lastDiceRoll.white1} + ${gameState.lastDiceRoll.white2}${gameState.lastDiceRoll.speed !== null ? ` + Speed Die ${gameState.lastDiceRoll.speed}` : ""} · movement ${gameState.lastDiceRoll.movementTotal}` : "None"}`);
  return lines;
}

function buildPortfolioLines(gameState: GameState, player: GamePlayer): string[] {
  if (player.properties.length === 0) return ["  Assets: none"];
  return [
    "  Assets:",
    ...[...player.properties]
      .sort((a, b) => a - b)
      .map((spaceId) => {
        const mortgaged = gameState.mortgagedProperties[spaceId] ? " · MORTGAGED" : "";
        const development = gameState.propertyDevelopments[spaceId] ?? 0;
        const depot = gameState.railroadDepots[spaceId] ? " · Train Depot" : "";
        const developmentText = development > 0 ? ` · ${developmentLabel(development)}` : "";
        return `    - ${spaceName(spaceId)}${developmentText}${depot}${mortgaged}`;
      }),
  ];
}

function buildPlayerLines(gameState: GameState): string[] {
  return gameState.players.flatMap((player, index) => {
    const stats = gameState.playerStats?.[player.id] ?? emptyStats(player);
    const finalCash = player.isBankrupt && stats.finalCash !== null ? stats.finalCash : player.cash;
    const liveNetWorth = player.cash + assetValue(gameState, player);
    const finalNetWorth = player.isBankrupt && stats.finalNetWorth !== null ? stats.finalNetWorth : liveNetWorth;
    const finalProperties = player.isBankrupt && stats.finalProperties !== null ? stats.finalProperties : player.properties.length;
    const finalDevelopments = player.isBankrupt && stats.finalDevelopments !== null ? stats.finalDevelopments : liveDevelopments(gameState, player);
    return [
      `${index + 1}. ${player.name}`,
      `  Type: ${playerType(player)}`,
      `  Status: ${player.isBankrupt ? "BANKRUPT / ELIMINATED" : player.isConnected ? "Connected" : "Disconnected / reconnecting"}`,
      `  Current location: ${spaceName(player.position)}`,
      `  Cash: ${formatMoney(finalCash)}`,
      `  Net worth: ${formatMoney(finalNetWorth)}`,
      `  Properties: ${finalProperties}`,
      `  Developments: ${finalDevelopments}`,
      `  Bus Tickets held: ${player.busTickets}`,
      `  Get Out of Jail Free cards held: ${player.getOutOfJailCards}`,
      `  In Jail: ${player.inJail ? `YES · ${player.jailTurns} turn(s)` : "NO"}`,
      `  Autopilot: ${player.autopilotEnabled ? `ON · ${player.autopilotDifficulty}` : "OFF"}`,
      ...buildPortfolioLines(gameState, player),
      "",
    ];
  });
}

function buildStatsLines(gameState: GameState): string[] {
  return gameState.players.flatMap((player) => {
    const stats = gameState.playerStats?.[player.id] ?? emptyStats(player);
    const profit = (stats.revenue ?? 0) - (stats.expenses ?? 0);
    return [
      `${player.name}`,
      `  Actions: ${stats.actions} · Rolls: ${stats.rolls} · Purchases: ${stats.purchases}`,
      `  Auctions: ${stats.auctionEvents} · Trades: ${stats.tradeEvents} · Builds: ${stats.buildingEvents} · Mortgages: ${stats.mortgageEvents}`,
      `  Cards: ${stats.cardEvents} · Jail events: ${stats.jailEvents} · Debt events: ${stats.debtEvents}`,
      `  Revenue: ${formatMoney(stats.revenue ?? 0)} · Expenses: ${formatMoney(stats.expenses ?? 0)} · Profit/loss: ${formatMoney(profit)}`,
      `  Rent collected: ${formatMoney(stats.rentCollected)} · Rent paid: ${formatMoney(stats.rentPaid)}`,
      `  Bus Tickets collected: ${stats.busTicketsCollected} · used: ${stats.busTicketsUsed}`,
      `  Kass Maneuvers: ${stats.kassManeuvers ?? 0}`,
      `  Peaks: cash ${formatMoney(stats.peakCash)} · properties ${stats.peakProperties} · net worth ${formatMoney(stats.peakNetWorth)}`,
      `  Eliminated turn: ${stats.eliminatedTurn ?? "N/A"}`,
      "",
    ];
  });
}

function winnerAward(
  gameState: GameState,
  score: (stats: PlayerMatchStats, player: GamePlayer) => number,
): string {
  const ranked = gameState.players
    .map((player, index) => ({
      player,
      index,
      stats: gameState.playerStats?.[player.id] ?? emptyStats(player),
    }))
    .map((entry) => ({ ...entry, value: score(entry.stats, entry.player) }))
    .sort((a, b) => b.value - a.value || a.index - b.index || a.player.name.localeCompare(b.player.name));
  const best = ranked[0];
  return !best || best.value <= 0 ? "No award" : `${best.player.name} · ${best.value.toLocaleString("en-GB")}`;
}

function buildAwardLines(gameState: GameState): string[] {
  return getMatchAwards(gameState).map((award) => {
    if (award.winnerIds.length === 0) return `${award.title}: No award`;
    const names = award.winnerIds
      .map((id) => gameState.players.find((player) => player.id === id)?.name ?? "Player")
      .join(" & ");
    const rankedSuffix = gameState.ranked ? ` · Ranked bonus +${award.points}` : "";
    return `${award.title}: ${names} · ${award.value.toLocaleString("en-GB")}${rankedSuffix}`;
  });
}

function buildResultLines(gameState: GameState): string[] {
  const ranked = gameState.players
    .map((player, index) => {
      const stats = gameState.playerStats?.[player.id] ?? emptyStats(player);
      const netWorth = player.isBankrupt && stats.finalNetWorth !== null
        ? stats.finalNetWorth
        : player.cash + assetValue(gameState, player);
      const cash = player.isBankrupt && stats.finalCash !== null ? stats.finalCash : player.cash;
      const properties = player.isBankrupt && stats.finalProperties !== null ? stats.finalProperties : player.properties.length;
      return { player, index, stats, netWorth, cash, properties };
    })
    .sort((a, b) => {
      if (a.player.id === gameState.winnerId) return -1;
      if (b.player.id === gameState.winnerId) return 1;
      if (a.player.isBankrupt !== b.player.isBankrupt) return a.player.isBankrupt ? 1 : -1;
      const aFinish = a.stats.finishPosition ?? Number.MAX_SAFE_INTEGER;
      const bFinish = b.stats.finishPosition ?? Number.MAX_SAFE_INTEGER;
      return aFinish - bFinish || b.netWorth - a.netWorth || a.index - b.index;
    });

  return ranked.map((row, index) =>
    `${index + 1}. ${row.player.name} · ${row.player.id === gameState.winnerId ? "WINNER · " : ""}${formatMoney(row.netWorth)} net worth · ${formatMoney(row.cash)} cash · ${row.properties} properties${row.player.isBankrupt ? ` · eliminated${row.stats.eliminatedTurn ? ` turn ${row.stats.eliminatedTurn}` : ""}` : ""}`,
  );
}

function noticeLines(gameState: GameState): string[] {
  const notices = gameState.globalNotices ?? [];
  if (notices.length === 0) return ["None retained."];
  return notices.map((notice) =>
    `[${formatDateTime(notice.createdAt)}] ${notice.kind.toUpperCase()} · ${notice.title} · ${notice.message}`,
  );
}

function diagnosticLines(gameState: GameState): string[] {
  const recoveryActivities = (gameState.activityLog ?? []).filter((entry) => /recover(ed|y)|watchdog|stalled|internal error/i.test(entry.message));
  const recoveryNotices = (gameState.globalNotices ?? []).filter((notice) => /recover(ed|y)|watchdog|stalled|internal error/i.test(`${notice.title} ${notice.message}`));
  const disconnected = gameState.players.filter((player) => !player.isAi && !player.isConnected);
  const lastActivityAt = (gameState.activityLog ?? []).at(-1)?.at ?? gameState.gameStartedAt;
  const overdueOptional = Boolean(
    gameState.turnPhase === "optional-actions" &&
    gameState.optionalActionDeadline &&
    gameState.optionalActionDeadline < Date.now(),
  );

  return [
    `Recovery/error activities recorded: ${recoveryActivities.length}`,
    `Recovery notices still retained: ${recoveryNotices.length}`,
    `Disconnected human seats at export: ${disconnected.length}${disconnected.length ? ` · ${disconnected.map((player) => player.name).join(", ")}` : ""}`,
    `Optional-actions deadline overdue: ${overdueOptional ? "YES" : "NO"}`,
    `Activity log entries: ${(gameState.activityLog ?? []).length}`,
    `Retained global notices: ${(gameState.globalNotices ?? []).length}`,
    `Roll presentation sequence: ${gameState.rollSequence}`,
    `Time since last recorded activity at export: ${formatDuration(Math.max(0, Date.now() - lastActivityAt))}`,
    "Sensitive recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded.",
    "",
    "Observed recovery/error entries:",
    ...(recoveryActivities.length
      ? recoveryActivities.map((entry) => `  - Turn ${entry.turnNumber}: ${entry.message}`)
      : ["  - None in the retained activity log."]),
    ...(recoveryNotices.length
      ? ["", "Observed retained recovery notices:", ...recoveryNotices.map((notice) => `  - ${notice.title}: ${notice.message}`)]
      : []),
  ];
}

function filteredActivity(gameState: GameState, matcher: (entry: GameActivityEntry) => boolean): GameActivityEntry[] {
  return (gameState.activityLog ?? []).filter(matcher);
}

export function buildGameReport(gameState: GameState): string {
  const generatedAt = Date.now();
  const ended = gameState.phase === "finished";
  const winner = gameState.players.find((player) => player.id === gameState.winnerId);
  const activity = gameState.activityLog ?? [];
  const latestActivityAt = activity.at(-1)?.at ?? generatedAt;
  const effectiveEnd = ended ? latestActivityAt : generatedAt;
  const reportStatus = ended ? "FINISHED" : "IN PROGRESS";

  const tradeActivity = filteredActivity(gameState, (entry) => entry.kind === "trade");
  const cardActivity = filteredActivity(gameState, (entry) => entry.kind === "card");
  const bankruptcyActivity = filteredActivity(gameState, (entry) => /bankrupt|forfeit|eliminat/i.test(entry.message));
  const speedDieActivity = filteredActivity(gameState, (entry) => /speed die/i.test(entry.message));
  const busTicketActivity = filteredActivity(gameState, (entry) => /bus ticket/i.test(entry.message));

  const lines: string[] = [
    "HALIEUS GAME ROOM — MEGA BOARD MATCH REPORT",
    RULE,
    `App version: ${APP_VERSION}`,
    `Exported: ${formatDateTime(generatedAt)}`,
    `Room: ${gameState.roomCode}`,
    `Match: ${gameState.blitz ? "Blitz" : gameState.ranked ? "Ranked" : "Casual"}`,
    `Phase: ${gameState.phase}`,
    `Status: ${reportStatus}`,
    ...(gameState.ranked ? [`Ranked match ID: ${gameState.rankedMatchId ?? "Pending until match completion"}`] : []),
    `Game started: ${formatDateTime(gameState.gameStartedAt)}`,
    `Duration: ${formatDuration(Math.max(0, effectiveEnd - gameState.gameStartedAt))}`,
    `Turns: ${gameState.turnNumber}`,
    `Winner: ${winner?.name ?? (ended ? "Not recorded" : "Game still in progress")}`,
    "",
    "This report is designed for gameplay analysis and debugging.",
    "It contains match state and player finances, but excludes recovery keys, IP addresses and authentication data.",
  ];

  lines.push(...section("RULES & BANK", [
    `Starting cash: ${formatMoney(STARTING_CASH)}`,
    ...(gameState.blitz ? ["Blitz allocation: all 37 ownable assets shuffled indiscriminately, then dealt round-robin so starting counts differ by no more than one · no value/group balancing · no purchase cost"] : []),
    `Free Parking Jackpot: ${gameState.freeParkingJackpotEnabled ? "ON" : "OFF"}`,
    `Free Parking pot: ${formatMoney(gameState.freeParkingPot)}`,
    `Speed Die currently: ${gameState.speedDieRetired ? "RETIRED" : "ACTIVE"}`,
    `Bus Tickets remaining in supply: ${gameState.busTicketsRemaining}`,
    `Bank inventory: ${gameState.bankInventory.houses} houses · ${gameState.bankInventory.hotels} hotels · ${gameState.bankInventory.skyscrapers} skyscrapers · ${gameState.bankInventory.depots} depots`,
  ]));

  lines.push(...section("CURRENT / FINAL STATE", buildPendingStateLines(gameState)));
  lines.push(...section(ended ? "FINAL RESULTS" : "CURRENT STANDINGS SNAPSHOT", buildResultLines(gameState)));
  lines.push(...section("PLAYERS & PORTFOLIOS", buildPlayerLines(gameState)));
  lines.push(...section("PLAYER STATISTICS", buildStatsLines(gameState)));
  lines.push(...section("AWARDS", buildAwardLines(gameState)));
  if (gameState.ranked) {
    lines.push(...section("RANKED RATING RESULTS", gameState.rankedResults?.length
      ? gameState.rankedResults.map((result) =>
          `#${result.finishPosition} ${result.playerName} · ${result.ratingBefore} → ${result.ratingAfter} (${result.ratingDelta >= 0 ? "+" : ""}${result.ratingDelta}) · placement ${result.placementDelta >= 0 ? "+" : ""}${result.placementDelta} · performance +${result.performanceBonus} · awards +${result.awardBonus}${result.awards.length ? ` · ${result.awards.join(", ")}` : ""}`,
        )
      : ["Ranked rating has not been finalized yet."]));
  }
  lines.push(...section("TRADES", activityLines(tradeActivity)));
  lines.push(...section("CARD DRAWS / RESOLUTIONS", activityLines(cardActivity)));
  lines.push(...section("BUS TICKET EVENTS", activityLines(busTicketActivity)));
  lines.push(...section("SPEED DIE EVENTS", activityLines(speedDieActivity)));
  lines.push(...section("BANKRUPTCIES / FORFEITS", activityLines(bankruptcyActivity)));
  lines.push(...section("DIAGNOSTICS", diagnosticLines(gameState)));
  lines.push(...section("RECENT GLOBAL NOTICES", noticeLines(gameState)));
  lines.push(...section("FULL MATCH ACTIVITY", activityLines(activity)));

  lines.push("", RULE, "END OF MEGA BOARD MATCH REPORT", "");
  return lines.join("\r\n");
}

export function downloadGameReport(gameState: GameState): void {
  const report = buildGameReport(gameState);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const status = gameState.phase === "finished" ? "game-report" : "match-report-in-progress";
  const filename = `mega-board-${gameState.roomCode}-${status}-${stamp}.txt`;
  const blob = new Blob(["\uFEFF", report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
