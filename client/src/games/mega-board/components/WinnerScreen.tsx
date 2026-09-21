import { useEffect, useMemo, useState } from "react";
import {
  getBoardSpace,
  isPropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import type {
  GameActivityEntry,
  GamePlayer,
  GameState,
  PlayerMatchStats,
  PlayerStatHistoryPoint,
} from "../../../../../shared/games/mega-board/game-state";
import { STARTING_CASH } from "../../../../../shared/games/mega-board/game-rules";
import { getMatchAwards } from "../../../../../shared/games/mega-board/ranked";
import { downloadGameReport } from "../utils/gameReport";

interface WinnerScreenProps {
  gameState: GameState;
  darkMode: boolean;
  isHost: boolean;
  theme: {
    pageBackground: string;
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onToggleDarkMode: () => void;
  onExit: () => void;
}

type ResultsTab = "results" | "stats" | "awards";
type GraphMetric = "netWorth" | "cash" | "properties" | "developments" | "ranking";

interface ResultRow {
  player: GamePlayer;
  stats: PlayerMatchStats;
  cash: number;
  properties: number;
  developments: number;
  netWorth: number;
  revenue: number;
  expenses: number;
  profit: number;
  actions: GameActivityEntry[];
}

const CONFETTI = Array.from({ length: 28 }, (_, index) => index);

function assetValue(gameState: GameState, player: GamePlayer): number {
  return player.properties.reduce((sum, spaceId) => {
    const space = getBoardSpace(spaceId);
    if (!space || !("price" in space)) return sum;
    let value = space.price;
    if (isPropertyBoardSpace(space)) {
      value += (gameState.propertyDevelopments[spaceId] ?? 0) * space.houseCost;
    }
    if (gameState.railroadDepots[spaceId] && "depotCost" in space) value += space.depotCost;
    return sum + value;
  }, 0);
}

function liveDevelopments(gameState: GameState, player: GamePlayer): number {
  return player.properties.reduce((sum, spaceId) => sum + (gameState.propertyDevelopments[spaceId] ?? 0), 0);
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

function singleWinnerAward<T extends { player: GamePlayer }>(
  rows: T[],
  score: (row: T) => number,
  playerOrder: Map<string, number>,
): { name: string; value: number } {
  const ranked = rows
    .map((row) => ({
      row,
      order: playerOrder.get(row.player.id) ?? Number.MAX_SAFE_INTEGER,
      value: score(row),
    }))
    .sort((a, b) => b.value - a.value || a.order - b.order || a.row.player.id.localeCompare(b.row.player.id));
  const best = ranked[0];
  if (!best || best.value <= 0) return { name: "No award", value: 0 };
  return { name: best.row.player.name, value: best.value };
}

function formatMoney(value: number): string {
  return `${value < 0 ? "−" : ""}£${Math.abs(value).toLocaleString()}`;
}

/**
 * Ranked result presentation helper.
 *
 * Rating maths remains server-authoritative; this function only converts the
 * recorded finishing position into a compact visual marker for the results UI.
 */
function rankedPlaceMark(position: number): string {
  if (position === 1) return "👑";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `#${position}`;
}

export function WinnerScreen({
  gameState,
  darkMode,
  isHost,
  theme,
  onToggleDarkMode,
  onExit,
}: WinnerScreenProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>("results");
  const [graphMetric, setGraphMetric] = useState<GraphMetric>("netWorth");
  const [expandedActionsPlayerId, setExpandedActionsPlayerId] = useState<string | null>(null);
  const winner = gameState.players.find((player) => player.id === gameState.winnerId);
  const finishSequence = useMemo(
    () => (gameState.globalNotices ?? [])
      .filter((notice) =>
        notice.presentation === "major" &&
        (notice.kind === "bankruptcy" || notice.kind === "winner") &&
        Date.now() - notice.createdAt <= 30000,
      )
      .slice(-2),
    [gameState.globalNotices],
  );
  const [finishNoticeIndex, setFinishNoticeIndex] = useState(0);
  const [finishStepIndex, setFinishStepIndex] = useState(0);
  const [finishSequenceDismissed, setFinishSequenceDismissed] = useState(finishSequence.length === 0);
  const activeFinishNotice = finishSequence[finishNoticeIndex];

  useEffect(() => {
    if (finishSequenceDismissed || !activeFinishNotice) return;
    const steps = activeFinishNotice.steps?.length ? activeFinishNotice.steps : [activeFinishNotice.message];
    const atLastStep = finishStepIndex >= steps.length - 1;
    const timer = window.setTimeout(() => {
      if (!atLastStep) {
        setFinishStepIndex((index) => index + 1);
        return;
      }
      if (finishNoticeIndex < finishSequence.length - 1) {
        setFinishNoticeIndex((index) => index + 1);
        setFinishStepIndex(0);
      } else {
        setFinishSequenceDismissed(true);
      }
    }, atLastStep ? 900 : 1100);
    return () => window.clearTimeout(timer);
  }, [
    activeFinishNotice,
    finishNoticeIndex,
    finishSequence.length,
    finishSequenceDismissed,
    finishStepIndex,
  ]);

  const rows = useMemo<ResultRow[]>(() => gameState.players
    .map((player) => {
      const sourceStats = gameState.playerStats?.[player.id] ?? emptyStats(player);
      const history = [...(sourceStats.history ?? [])].sort((a, b) => a.turnNumber - b.turnNumber);
      if (history.length === 0 || history[0].turnNumber > 1) {
        history.unshift({
          turnNumber: 1,
          at: gameState.gameStartedAt,
          cash: STARTING_CASH,
          properties: 0,
          developments: 0,
          netWorth: STARTING_CASH,
        });
      }
      const stats: PlayerMatchStats = { ...sourceStats, history };
      const bankrupt = player.isBankrupt;
      const cash = bankrupt && stats.finalCash !== null ? stats.finalCash : player.cash;
      const properties = bankrupt && stats.finalProperties !== null ? stats.finalProperties : player.properties.length;
      const developments = bankrupt && stats.finalDevelopments !== null ? stats.finalDevelopments : liveDevelopments(gameState, player);
      const netWorth = bankrupt && stats.finalNetWorth !== null
        ? stats.finalNetWorth
        : player.cash + assetValue(gameState, player);
      const revenue = stats.revenue ?? 0;
      const expenses = stats.expenses ?? 0;
      const actions = (gameState.activityLog ?? []).filter((entry) => entry.playerId === player.id);
      return {
        player,
        stats,
        cash,
        properties,
        developments,
        netWorth,
        revenue,
        expenses,
        profit: revenue - expenses,
        actions,
      };
    })
    .sort((a, b) => {
      if (a.player.id === gameState.winnerId) return -1;
      if (b.player.id === gameState.winnerId) return 1;
      if (a.player.isBankrupt !== b.player.isBankrupt) return a.player.isBankrupt ? 1 : -1;
      const aFinish = a.stats.finishPosition ?? Number.MAX_SAFE_INTEGER;
      const bFinish = b.stats.finishPosition ?? Number.MAX_SAFE_INTEGER;
      return aFinish - bFinish || b.netWorth - a.netWorth;
    }), [gameState]);

  const awards = useMemo(() => {
    const icons: Record<string, string> = {
      "Property Mogul": "🏘️",
      "Master Builder": "🏗️",
      "Rent Baron": "💷",
      "Auction Regular": "🔨",
      "Deal Maker": "🤝",
      "Road Warrior": "🎲",
      "Ticket Traveller": "🚌",
      "Kass Maneuver Award": "🎁",
      "Peak Tycoon": "📈",
      "Profit Leader": "💹",
    };
    return getMatchAwards(gameState).map((award) => ({
      icon: icons[award.title] ?? "⭐",
      title: award.title,
      detail: `${award.detail}${gameState.ranked ? ` · Ranked bonus +${award.points}` : ""}`,
      name: award.winnerIds.length
        ? award.winnerIds.map((id) => gameState.players.find((player) => player.id === id)?.name ?? "Player").join(" & ")
        : "No award",
      value: award.value,
    }));
  }, [gameState]);

  return (
    <main className="winner-shell mario-results-shell page-enter" style={{ background: theme.pageBackground, color: theme.text }}>
      <div className="confetti-layer" aria-hidden="true">
        {CONFETTI.map((piece) => <span key={piece} style={{ left: `${(piece * 37) % 100}%`, animationDelay: `${(piece % 8) * 0.16}s`, animationDuration: `${2.8 + (piece % 5) * 0.35}s` }} />)}
      </div>

      {!finishSequenceDismissed && activeFinishNotice && (
        <div className={`winner-sequence-layer is-${activeFinishNotice.kind}`} role="status" aria-live="assertive">
          <article className="winner-sequence-card">
            <p>Final game event</p>
            <strong>{activeFinishNotice.title}</strong>
            <span>{activeFinishNotice.steps?.[finishStepIndex] ?? activeFinishNotice.message}</span>
            <div className="winner-sequence-progress" aria-hidden="true">
              {(activeFinishNotice.steps?.length ? activeFinishNotice.steps : [activeFinishNotice.message]).map((_, index) => (
                <i key={index} className={index <= finishStepIndex ? "is-active" : ""} />
              ))}
            </div>
            <button type="button" onClick={() => setFinishSequenceDismissed(true)}>Skip</button>
          </article>
        </div>
      )}

      <section className="winner-modal glass-card winner-celebration mario-results-card" style={{ background: theme.cardBackground, borderColor: theme.border }}>
        <header className="results-hero">
          <div className="winner-trophy winner-trophy-animation">🏆</div>
          <div>
            <p className="modal-eyebrow">Final results</p>
            <h1>{winner?.name ?? "Winner"} wins!</h1>
            <p className="winner-subtitle">{gameState.blitz ? "Blitz result: all 37 ownable assets were shuffled and dealt evenly by count with no value/group balancing; normal Mega Board rules decided the outcome." : gameState.ranked ? "Ranked result: placement is the main rating driver, with performance and awards adding meaningful bonus rating." : "Game placement decides the winner. Stats and awards are post-match analysis only."}</p>
          </div>
        </header>

        <nav className="results-tabs" aria-label="Final game results">
          {([ ["results", "🏆 Results"], ["stats", "📊 Stats"], ["awards", "⭐ Awards"] ] as Array<[ResultsTab, string]>).map(([tab, label]) => (
            <button key={tab} type="button" className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{label}</button>
          ))}
        </nav>

        <div className="results-tab-body">
          {activeTab === "results" && (
            <div className="final-results-table-wrap">
              {gameState.ranked && gameState.rankedResults?.length > 0 && (
                <section
                  className="ranked-result-summary ranked-result-summary-v401"
                  style={{ borderColor: theme.border, background: theme.secondaryBackground }}
                  aria-label="Ranked rating changes"
                >
                  {/*
                    4.0.1 ranked-results hierarchy:
                    keep the server-recorded rating breakdown intact, but present it
                    as readable player cards instead of one dense spreadsheet row.
                  */}
                  <header className="ranked-result-header">
                    <div>
                      <p className="modal-eyebrow">Ranked match</p>
                      <h2>Rating movement</h2>
                      <span style={{ color: theme.mutedText }}>
                        Placement sets the base change. Performance and earned awards add bonus rating.
                      </span>
                    </div>
                    <small className="ranked-match-id" style={{ color: theme.mutedText }}>
                      {gameState.rankedMatchId}
                    </small>
                  </header>

                  <div className="ranked-result-list">
                    {gameState.rankedResults.map((result) => (
                      <article
                        key={result.playerId}
                        className={`ranked-result-card ${result.finishPosition === 1 ? "is-first" : ""}`}
                      >
                        <div className="ranked-result-player">
                          <span className="ranked-place-mark" aria-hidden="true">{rankedPlaceMark(result.finishPosition)}</span>
                          <div>
                            <small>{result.finishPosition === 1 ? "Winner" : `Finished #${result.finishPosition}`}</small>
                            <strong>{result.playerName}</strong>
                          </div>
                        </div>

                        <div className="ranked-rating-move" aria-label={`${result.playerName} rating change`}>
                          <span>{result.ratingBefore}</span>
                          <i aria-hidden="true">→</i>
                          <strong>{result.ratingAfter}</strong>
                          <b className={result.ratingDelta >= 0 ? "result-profit-positive" : "result-profit-negative"}>
                            {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta}
                          </b>
                        </div>

                        <div className="ranked-bonus-breakdown" aria-label="Rating breakdown">
                          <span>
                            <small>Placement</small>
                            <strong className={result.placementDelta >= 0 ? "result-profit-positive" : "result-profit-negative"}>
                              {result.placementDelta >= 0 ? "+" : ""}{result.placementDelta}
                            </strong>
                          </span>
                          <span>
                            <small>Performance</small>
                            <strong>+{result.performanceBonus}</strong>
                          </span>
                          <span>
                            <small>Awards</small>
                            <strong>+{result.awardBonus}</strong>
                          </span>
                        </div>

                        <div className="ranked-award-strip">
                          {result.awards.length > 0
                            ? result.awards.map((award) => <span key={award}>⭐ {award}</span>)
                            : <span className="is-empty">No award bonus</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <div className="final-results-heading final-results-grid">
                <span>Place</span><span>Player</span><span>Revenue</span><span>Expenses</span><span>Profit / Loss</span><span>Properties</span><span>Rent collected</span><span>Builds</span><span>Trades</span>
              </div>
              {rows.map((row, index) => (
                <article key={row.player.id} className={`final-player-row final-results-grid ${row.player.id === gameState.winnerId ? "is-winner" : ""}`} style={{ borderColor: theme.border, background: theme.secondaryBackground }}>
                  <span className="final-placement">{index === 0 ? "👑 1st" : index === 1 ? "🥈 2nd" : index === 2 ? "🥉 3rd" : `${index + 1}th`}</span>
                  <div className="final-player-name-cell"><span className="final-token" style={{ background: row.player.colour }}>{row.player.name.charAt(0).toUpperCase()}</span><div><strong>{row.player.name}</strong><small style={{ color: theme.mutedText }}>{row.player.isBankrupt ? `Bankrupt${row.stats.eliminatedTurn ? ` · Turn ${row.stats.eliminatedTurn}` : ""}` : row.player.id === gameState.winnerId ? "Winner" : "Finished"}</small></div></div>
                  {/*
                    Mobile result cards use data-label instead of duplicating
                    markup. Desktop keeps the same table columns and values.
                  */}
                  <strong className="final-result-metric" data-label="Revenue">£{row.revenue.toLocaleString()}</strong>
                  <span className="final-result-metric" data-label="Expenses">£{row.expenses.toLocaleString()}</span>
                  <strong
                    className={`final-result-metric ${row.profit >= 0 ? "result-profit-positive" : "result-profit-negative"}`}
                    data-label="Profit / loss"
                  >
                    {row.profit >= 0 ? "+" : "−"}£{Math.abs(row.profit).toLocaleString()}
                  </strong>
                  <span className="final-result-metric" data-label="Properties">{row.properties}</span>
                  <span className="final-result-metric" data-label="Rent collected">£{row.stats.rentCollected.toLocaleString()}</span>
                  <span className="final-result-metric" data-label="Builds">{row.stats.buildingEvents}</span>
                  <span className="final-result-metric" data-label="Trades">{row.stats.tradeEvents}</span>
                </article>
              ))}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="results-stats-expanded">
              <section className="results-graph-card" style={{ background: theme.secondaryBackground, borderColor: theme.border }}>
                <header>
                  <div>
                    <p className="modal-eyebrow">Match graph</p>
                    <h3>{graphMetric === "netWorth" ? "Net Worth Over Time" : graphMetric === "cash" ? "Cash Over Time" : graphMetric === "properties" ? "Properties Owned Over Time" : graphMetric === "developments" ? "Development Over Time" : "Ranking Over Time"}</h3>
                  </div>
                  <div className="results-graph-switcher">
                    {(["netWorth","cash","properties","developments","ranking"] as GraphMetric[]).map((metric) => <button key={metric} className={graphMetric === metric ? "is-active" : ""} onClick={() => setGraphMetric(metric)}>{metric === "netWorth" ? "Net worth" : metric === "ranking" ? "Ranking" : metric[0].toUpperCase()+metric.slice(1)}</button>)}
                  </div>
                </header>
                <StatsGraph rows={rows} metric={graphMetric} muted={theme.mutedText} />
              </section>

              <div className="results-stats-grid">
                {rows.map((row) => {
                  const isExpanded = expandedActionsPlayerId === row.player.id;
                  return (
                    <article key={row.player.id} className="results-player-stats" style={{ borderColor: theme.border, background: theme.secondaryBackground }}>
                      <header>
                        <span className="final-token" style={{ background: row.player.colour }}>{row.player.name.charAt(0).toUpperCase()}</span>
                        <div><strong>{row.player.name}</strong><small style={{ color: theme.mutedText }}>{row.actions.length} recorded game actions</small></div>
                      </header>

                      <div className="results-stat-summary">
                        <span><small>Revenue</small><strong>£{row.revenue.toLocaleString()}</strong></span>
                        <span><small>Expenses</small><strong>£{row.expenses.toLocaleString()}</strong></span>
                        <span><small>Profit / loss</small><strong className={row.profit >= 0 ? "result-profit-positive" : "result-profit-negative"}>{row.profit >= 0 ? "+" : "−"}£{Math.abs(row.profit).toLocaleString()}</strong></span>
                        <span><small>Peak value</small><strong>£{row.stats.peakNetWorth.toLocaleString()}</strong></span>
                      </div>

                      <div className="results-mini-stats">
                        <span>🎲 {row.stats.rolls} rolls</span>
                        <span>🏠 {row.stats.purchases} purchases</span>
                        <span>🏗️ {row.stats.buildingEvents} build actions</span>
                        <span>🏦 {row.stats.mortgageEvents} mortgage events</span>
                        <span>🔨 {row.stats.auctionEvents} auction actions</span>
                        <span>🤝 {row.stats.tradeEvents} trade actions</span>
                        <span>🃏 {row.stats.cardEvents} cards</span>
                        <span>🚔 {row.stats.jailEvents} jail actions</span>
                        <span>🚌 {row.stats.busTicketsCollected} tickets gained</span>
                        <span>🎟️ {row.stats.busTicketsUsed} tickets used</span>
                        <span>💷 £{row.stats.rentCollected.toLocaleString()} rent collected</span>
                        <span>💸 £{row.stats.rentPaid.toLocaleString()} rent paid</span>
                        <span>💳 {row.stats.debtEvents} debt actions</span>
                      </div>

                      <button type="button" className="results-actions-toggle" onClick={() => setExpandedActionsPlayerId(isExpanded ? null : row.player.id)}>
                        {isExpanded ? "Hide actions" : `View all actions (${row.actions.length})`}
                      </button>

                      {isExpanded && (
                        <div className="results-player-action-log">
                          {row.actions.length === 0 ? (
                            <p style={{ color: theme.mutedText }}>No player-attributed actions were recorded.</p>
                          ) : row.actions.map((entry) => (
                            <div key={entry.id}>
                              <span>Turn {entry.turnNumber}</span>
                              <strong>{entry.message}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}


          {activeTab === "awards" && (
            <div className="results-awards-grid">
              {awards.map((award) => <article key={award.title} style={{ borderColor: theme.border, background: theme.secondaryBackground }}><span>{award.icon}</span><div><p>{award.title}</p><strong>{award.name}</strong><small style={{ color: theme.mutedText }}>{award.detail}{award.value > 0 ? ` · ${award.value.toLocaleString()}` : " · No qualifying activity"}</small></div></article>)}
            </div>
          )}
        </div>

        <footer className="results-footer">
          <span>{gameState.turnNumber} turns played</span>
          <div className="results-footer-actions">
            <button type="button" className="button-muted" onClick={() => downloadGameReport(gameState)}>📄 Download Game Report</button>
            <button type="button" className="button-primary" onClick={onExit}>{isHost ? "Close completed room & return" : "Return to Game Room"}</button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function latestPointAtOrBefore(history: PlayerStatHistoryPoint[], turn: number): PlayerStatHistoryPoint | undefined {
  let match: PlayerStatHistoryPoint | undefined;
  for (const point of history) {
    if (point.turnNumber > turn) break;
    match = point;
  }
  return match;
}

function rankAtTurn(rows: ResultRow[], playerId: string, turn: number): number {
  const values = rows.map((row, placement) => ({
    playerId: row.player.id,
    placement,
    value: latestPointAtOrBefore(row.stats.history, turn)?.netWorth ?? 0,
  }));
  values.sort((a, b) => b.value - a.value || a.placement - b.placement);
  return Math.max(1, values.findIndex((item) => item.playerId === playerId) + 1);
}

function StatsGraph({ rows, metric, muted }: { rows: ResultRow[]; metric: GraphMetric; muted: string }) {
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<{ playerName: string; turn: number; value: number; x: number; y: number } | null>(null);
  const width = 1000;
  const height = 340;
  const left = 68;
  const right = 24;
  const top = 28;
  const bottom = 54;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxTurn = Math.max(1, ...rows.flatMap((row) => row.stats.history.map((point) => point.turnNumber)));

  const visibleRows = rows.filter((row) => !hiddenPlayerIds.has(row.player.id));
  const rawValues = visibleRows.flatMap((row) => row.stats.history.map((point) => metric === "ranking" ? rankAtTurn(rows, row.player.id, point.turnNumber) : point[metric]));
  const maxValue = metric === "ranking" ? Math.max(1, rows.length) : Math.max(1, ...rawValues);
  const minValue = 0;

  const valueY = (value: number) => {
    if (metric === "ranking") {
      const denominator = Math.max(1, maxValue - 1);
      return top + ((value - 1) / denominator) * chartHeight;
    }
    return top + chartHeight - ((value - minValue) / Math.max(1, maxValue - minValue)) * chartHeight;
  };
  const turnX = (turn: number) => left + ((Math.max(1, turn) - 1) / Math.max(1, maxTurn - 1)) * chartWidth;
  const formatGraphValue = (value: number) => metric === "cash" || metric === "netWorth" ? `£${Math.round(value).toLocaleString()}` : metric === "ranking" ? `#${Math.round(value)}` : Math.round(value).toLocaleString();
  const yTicks = metric === "ranking"
    ? Array.from({ length: Math.min(rows.length, 8) }, (_, index) => index + 1)
    : [0, .25, .5, .75, 1].map((ratio) => maxValue * (1 - ratio));
  const xTicks = Array.from(new Set([1, Math.max(1, Math.round(maxTurn * .25)), Math.max(1, Math.round(maxTurn * .5)), Math.max(1, Math.round(maxTurn * .75)), maxTurn])).sort((a,b) => a-b);

  const summary = useMemo(() => {
    const candidates = visibleRows.flatMap((row) => row.stats.history.map((point, index, history) => {
      const value = metric === "ranking" ? rankAtTurn(rows, row.player.id, point.turnNumber) : point[metric];
      const previousPoint = history[index - 1];
      const previous = previousPoint ? (metric === "ranking" ? rankAtTurn(rows, row.player.id, previousPoint.turnNumber) : previousPoint[metric]) : value;
      return { row, point, value, change: value - previous };
    }));
    if (candidates.length === 0) return null;
    const best = metric === "ranking"
      ? [...candidates].sort((a,b) => a.value - b.value)[0]
      : [...candidates].sort((a,b) => b.value - a.value)[0];
    const swing = [...candidates].sort((a,b) => Math.abs(b.change) - Math.abs(a.change))[0];
    return { best, swing };
  }, [metric, rows, visibleRows]);

  return (
    <div className="results-graph-wrap">
      <div className="results-graph-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Match statistics graph">
          {yTicks.map((tick, index) => {
            const y = metric === "ranking" ? valueY(tick) : top + (chartHeight * index) / Math.max(1, yTicks.length - 1);
            return <g key={`y-${tick}-${index}`}><line x1={left} x2={width-right} y1={y} y2={y} className="results-graph-grid" /><text x={left-10} y={y+4} textAnchor="end" className="results-graph-axis-label">{formatGraphValue(tick)}</text></g>;
          })}
          {xTicks.map((turn) => {
            const x = turnX(turn);
            return <g key={`x-${turn}`}><line x1={x} x2={x} y1={top} y2={top+chartHeight} className="results-graph-grid is-vertical" /><text x={x} y={height-18} textAnchor="middle" className="results-graph-axis-label">T{turn}</text></g>;
          })}

          {visibleRows.map((row) => {
            const history = row.stats.history;
            if (history.length === 0) return null;
            const chartPoints = history.map((point) => {
              const value = metric === "ranking" ? rankAtTurn(rows, row.player.id, point.turnNumber) : point[metric];
              return { point, value, x: turnX(point.turnNumber), y: valueY(value) };
            });
            const points = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
            return (
              <g key={row.player.id}>
                <polyline points={points} fill="none" stroke={row.player.colour} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" className="results-graph-line" />
                {chartPoints.map(({ point, value, x, y }) => (
                  <circle
                    key={`${row.player.id}-${point.turnNumber}`}
                    cx={x}
                    cy={y}
                    r="5"
                    fill={row.player.colour}
                    className="results-graph-point"
                    tabIndex={0}
                    onMouseEnter={() => setHovered({ playerName: row.player.name, turn: point.turnNumber, value, x, y })}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ playerName: row.player.name, turn: point.turnNumber, value, x, y })}
                    onBlur={() => setHovered(null)}
                    onClick={() => setHovered({ playerName: row.player.name, turn: point.turnNumber, value, x, y })}
                  />
                ))}
              </g>
            );
          })}

          {hovered && (
            <g className="results-graph-tooltip" transform={`translate(${Math.min(width-210, Math.max(left, hovered.x+10))},${Math.max(top, hovered.y-64)})`}>
              <rect width="190" height="52" rx="10" />
              <text x="12" y="20">{hovered.playerName}</text>
              <text x="12" y="39">Turn {hovered.turn} · {formatGraphValue(hovered.value)}</text>
            </g>
          )}
        </svg>
      </div>

      <div className="results-graph-legend" aria-label="Toggle graph players">
        {rows.map((row) => {
          const hidden = hiddenPlayerIds.has(row.player.id);
          return (
            <button
              type="button"
              key={row.player.id}
              className={hidden ? "is-hidden" : ""}
              onClick={() => setHiddenPlayerIds((current) => {
                const next = new Set(current);
                if (next.has(row.player.id)) next.delete(row.player.id); else next.add(row.player.id);
                return next;
              })}
            >
              <i style={{ background: row.player.colour }} />{row.player.name}
            </button>
          );
        })}
      </div>

      {summary && (
        <div className="results-graph-insights">
          <span><small>{metric === "ranking" ? "Best rank" : "Highest point"}</small><strong>{summary.best.row.player.name} · {formatGraphValue(summary.best.value)}</strong></span>
          <span><small>Biggest change</small><strong>{summary.swing.row.player.name} · {summary.swing.change >= 0 ? "+" : ""}{metric === "cash" || metric === "netWorth" ? formatMoney(summary.swing.change) : summary.swing.change.toFixed(0)}</strong></span>
          <span><small>Match range</small><strong>Turn 1 → Turn {maxTurn}</strong></span>
        </div>
      )}
      <small style={{ color: muted }}>Tap or hover a point for exact values. Tap a player name to hide/show their line.</small>
    </div>
  );
}
