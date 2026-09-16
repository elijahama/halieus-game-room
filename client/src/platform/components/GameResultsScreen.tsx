import { useEffect, useMemo, useState } from "react";

export interface GameResultMetric {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}

export interface GameResultAction {
  at?: number;
  label: string;
  detail: string;
}

export interface GameResultPlayer {
  id: string;
  rank: number;
  name: string;
  detail: string;
  winner?: boolean;
  accent?: string;
  status?: string;
  metrics?: GameResultMetric[];
  actions?: GameResultAction[];
}

export interface GameResultStat {
  label: string;
  value: string;
}

export interface GameResultAward {
  title: string;
  winner: string;
  detail: string;
  icon?: string;
}

export interface GameResultGraphSeries {
  id: string;
  name: string;
  values: number[];
  accent?: string;
}

export interface GameResultGraph {
  title: string;
  subtitle?: string;
  xLabels?: string[];
  series: GameResultGraphSeries[];
  valueSuffix?: string;
}

interface GameResultsScreenProps {
  accent: string;
  gameTitle: string;
  roomCode: string;
  headline: string;
  subtitle?: string;
  rows: GameResultPlayer[];
  stats?: GameResultStat[];
  awards?: GameResultAward[];
  graph?: GameResultGraph;
  finalEventTitle?: string;
  finalEventSteps?: string[];
  onDownloadReport: () => void;
  onBackToGameRoom: () => void;
  onPlayAgain?: () => void;
  playAgainLabel?: string;
}

type ResultsTab = "results" | "stats" | "awards";
const CONFETTI = Array.from({ length: 42 }, (_, index) => index);

function ordinal(rank: number): string {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  if (rank % 10 === 1) return `${rank}st`;
  if (rank % 10 === 2) return `${rank}nd`;
  if (rank % 10 === 3) return `${rank}rd`;
  return `${rank}th`;
}

function formatActionTime(at?: number): string {
  if (!at) return "Match";
  return new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ResultsGraph({ graph }: { graph: GameResultGraph }) {
  const width = 860;
  const height = 280;
  const padding = { left: 52, right: 22, top: 24, bottom: 34 };
  const allValues = graph.series.flatMap((series) => series.values).filter(Number.isFinite);
  const minValue = Math.min(0, ...(allValues.length ? allValues : [0]));
  const maxValue = Math.max(1, ...(allValues.length ? allValues : [1]));
  const span = Math.max(1, maxValue - minValue);
  const longest = Math.max(2, ...graph.series.map((series) => series.values.length));
  const x = (index: number) => padding.left + (index / Math.max(1, longest - 1)) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + (1 - (value - minValue) / span) * (height - padding.top - padding.bottom);
  const ticks = Array.from({ length: 5 }, (_, index) => maxValue - (span * index) / 4);

  return (
    <section className="results-graph-card halieus-results-graph-card">
      <header>
        <div><p className="modal-eyebrow">Match graph</p><h3>{graph.title}</h3>{graph.subtitle && <small>{graph.subtitle}</small>}</div>
        <div className="halieus-results-graph-legend">
          {graph.series.map((series) => <span key={series.id}><i style={{ background: series.accent ?? "var(--results-accent)" }} />{series.name}</span>)}
        </div>
      </header>
      <div className="halieus-results-graph-scroll">
        <svg className="halieus-results-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={graph.title}>
          {ticks.map((tick, index) => {
            const tickY = padding.top + (index / 4) * (height - padding.top - padding.bottom);
            return <g key={index}><line x1={padding.left} x2={width - padding.right} y1={tickY} y2={tickY} className="result-graph-grid-line" /><text x={padding.left - 10} y={tickY + 4} textAnchor="end" className="result-graph-axis-label">{Math.round(tick)}{graph.valueSuffix ?? ""}</text></g>;
          })}
          {graph.series.map((series) => {
            const points = series.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
            const lastIndex = Math.max(0, series.values.length - 1);
            return <g key={series.id}>
              <polyline points={points} fill="none" stroke={series.accent ?? "var(--results-accent)"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {series.values.length > 0 && <circle cx={x(lastIndex)} cy={y(series.values[lastIndex])} r="5" fill={series.accent ?? "var(--results-accent)"} />}
            </g>;
          })}
          {(graph.xLabels ?? []).map((label, index, labels) => {
            if (!label || (labels.length > 7 && index % Math.ceil(labels.length / 6) !== 0 && index !== labels.length - 1)) return null;
            return <text key={`${label}-${index}`} x={x(index)} y={height - 8} textAnchor="middle" className="result-graph-axis-label">{label}</text>;
          })}
        </svg>
      </div>
    </section>
  );
}

/**
 * Full Halieus post-match ceremony shared by non-Mega titles.
 *
 * This intentionally follows Mega Board's WinnerScreen architecture instead of
 * being a small generic result card: staged final event, celebration hero,
 * podium + full standings, overview metrics, graph, per-player breakdown/action
 * history, awards and report/navigation actions.
 */
export function GameResultsScreen({
  accent,
  gameTitle,
  roomCode,
  headline,
  subtitle,
  rows,
  stats = [],
  awards = [],
  graph,
  finalEventTitle = "Match complete",
  finalEventSteps,
  onDownloadReport,
  onBackToGameRoom,
  onPlayAgain,
  playAgainLabel = "Play again",
}: GameResultsScreenProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>("results");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const sortedRows = useMemo(() => rows.slice().sort((a, b) => a.rank - b.rank), [rows]);
  const podium = sortedRows.slice(0, 3);
  const winner = sortedRows[0];
  const ceremonySteps = useMemo(() => finalEventSteps?.length ? finalEventSteps : [headline, subtitle ?? `${gameTitle} has finished.`, "Final standings locked."], [finalEventSteps, gameTitle, headline, subtitle]);
  const [finishStepIndex, setFinishStepIndex] = useState(0);
  const [finishSequenceDismissed, setFinishSequenceDismissed] = useState(false);

  useEffect(() => {
    if (finishSequenceDismissed) return;
    const atLastStep = finishStepIndex >= ceremonySteps.length - 1;
    const timer = window.setTimeout(() => {
      if (atLastStep) setFinishSequenceDismissed(true);
      else setFinishStepIndex((index) => index + 1);
    }, atLastStep ? 1050 : 1200);
    return () => window.clearTimeout(timer);
  }, [ceremonySteps.length, finishSequenceDismissed, finishStepIndex]);

  return (
    <section className="winner-shell mario-results-shell page-enter halieus-victory-stage" style={{ ["--results-accent" as string]: accent }}>
      <div className="confetti-layer halieus-results-confetti" aria-hidden="true">
        {CONFETTI.map((piece) => <span key={piece} style={{ left: `${(piece * 37) % 100}%`, animationDelay: `${(piece % 10) * 0.12}s`, animationDuration: `${2.8 + (piece % 5) * 0.35}s` }} />)}
      </div>
      <button type="button" className="results-escape-button" onClick={onBackToGameRoom}>← Game Room</button>

      {!finishSequenceDismissed && (
        <div className="winner-sequence-layer is-winner" role="status" aria-live="assertive">
          <article className="winner-sequence-card">
            <p>Final game event</p>
            <strong>{finalEventTitle}</strong>
            <span>{ceremonySteps[finishStepIndex]}</span>
            <div className="winner-sequence-progress" aria-hidden="true">
              {ceremonySteps.map((_, index) => <i key={index} className={index <= finishStepIndex ? "is-active" : ""} />)}
            </div>
            <button type="button" onClick={() => setFinishSequenceDismissed(true)}>Skip</button>
          </article>
        </div>
      )}

      <section className="winner-modal glass-card winner-celebration mario-results-card halieus-results-card">
        <header className="results-hero halieus-results-hero">
          <div className="winner-trophy winner-trophy-animation" aria-hidden="true">🏆</div>
          <div>
            <p className="modal-eyebrow">{gameTitle} · Room {roomCode} · Final results</p>
            <h1>{headline}</h1>
            {subtitle && <p className="winner-subtitle">{subtitle}</p>}
          </div>
        </header>

        <nav className="results-tabs halieus-results-tabs" aria-label={`${gameTitle} final results`}>
          <button type="button" className={activeTab === "results" ? "is-active" : ""} onClick={() => setActiveTab("results")}>🏆 Results</button>
          <button type="button" className={activeTab === "stats" ? "is-active" : ""} onClick={() => setActiveTab("stats")}>📊 Stats</button>
          <button type="button" className={activeTab === "awards" ? "is-active" : ""} onClick={() => setActiveTab("awards")}>⭐ Awards</button>
        </nav>

        <div className="results-tab-body halieus-results-tab-body">
          {activeTab === "results" && (
            <div className="halieus-results-results-tab">
              <section className={`halieus-results-podium has-${podium.length}`} aria-label="Podium">
                {podium.map((row) => (
                  <article key={`podium-${row.id}`} className={`is-rank-${row.rank} ${row.winner ? "is-winner" : ""}`} style={{ ["--player-accent" as string]: row.accent ?? accent }}>
                    <span aria-hidden="true">{row.rank === 1 ? "👑" : row.rank === 2 ? "🥈" : "🥉"}</span>
                    <small>{row.rank === 1 ? "Winner" : ordinal(row.rank)}</small>
                    <strong>{row.name}</strong>
                    <p>{row.detail}</p>
                  </article>
                ))}
              </section>

              <div className="final-results-table-wrap halieus-final-results-table-wrap">
                <div className="final-results-heading halieus-final-results-grid"><span>Place</span><span>Player</span><span>Status</span><span>Final result</span></div>
                {sortedRows.map((row) => (
                  <article key={row.id} className={`final-player-row halieus-final-results-grid ${row.winner ? "is-winner" : ""}`}>
                    <span className="final-placement">{row.rank === 1 ? "👑 1st" : row.rank === 2 ? "🥈 2nd" : row.rank === 3 ? "🥉 3rd" : ordinal(row.rank)}</span>
                    <div className="final-player-name-cell"><span className="final-token" style={{ background: row.accent ?? accent }}>{row.name.charAt(0).toUpperCase()}</span><div><strong>{row.name}</strong><small>{row.winner ? "Winner" : row.status ?? "Finished"}</small></div></div>
                    <strong>{row.status ?? (row.winner ? "Winner" : "Finished")}</strong>
                    <span>{row.detail}</span>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="results-stats-expanded halieus-results-stats-expanded">
              {stats.length > 0 && <section className="halieus-results-overview-stats" aria-label={`${gameTitle} match statistics`}>{stats.map((stat) => <article key={`${stat.label}-${stat.value}`}><small>{stat.label}</small><strong>{stat.value}</strong></article>)}</section>}
              {graph && graph.series.some((series) => series.values.length > 0) && <ResultsGraph graph={graph} />}
              <div className="results-stats-grid halieus-player-stats-grid">
                {sortedRows.map((row) => {
                  const isExpanded = expandedPlayerId === row.id;
                  return <article key={`stats-${row.id}`} className="results-player-stats halieus-results-player-stats">
                    <header><span className="final-token" style={{ background: row.accent ?? accent }}>{row.name.charAt(0).toUpperCase()}</span><div><strong>{row.name}</strong><small>{row.actions?.length ?? 0} recorded game actions · {ordinal(row.rank)}</small></div></header>
                    <div className="results-stat-summary halieus-results-stat-summary">
                      {(row.metrics?.length ? row.metrics : [{ label: "Final result", value: row.detail }]).map((metric) => <span key={`${row.id}-${metric.label}`}><small>{metric.label}</small><strong className={metric.tone === "positive" ? "result-profit-positive" : metric.tone === "negative" ? "result-profit-negative" : ""}>{metric.value}</strong></span>)}
                    </div>
                    <button type="button" className="results-action-toggle" onClick={() => setExpandedPlayerId(isExpanded ? null : row.id)}>{isExpanded ? "Hide action history" : `View action history (${row.actions?.length ?? 0})`}</button>
                    {isExpanded && <div className="results-action-list halieus-results-action-list">{row.actions?.length ? row.actions.map((action, index) => <div key={`${row.id}-${index}-${action.label}`}><time>{formatActionTime(action.at)}</time><strong>{action.label}</strong><span>{action.detail}</span></div>) : <p>No per-player action history was recorded for this match.</p>}</div>}
                  </article>;
                })}
              </div>
            </div>
          )}

          {activeTab === "awards" && (
            <section className="halieus-results-section halieus-awards-section" aria-label={`${gameTitle} awards`}>
              <header><p>Match awards</p><span>{awards.length}</span></header>
              {awards.length > 0 ? <div className="results-awards-grid halieus-awards-grid">{awards.map((award) => <article key={`${award.title}-${award.winner}`}><span aria-hidden="true">{award.icon ?? "⭐"}</span><div><p>{award.title}</p><strong>{award.winner}</strong><small>{award.detail}</small></div></article>)}</div> : <div className="halieus-results-empty"><strong>No qualifying awards</strong><span>The match finished without enough recorded activity for a game-specific award.</span></div>}
            </section>
          )}
        </div>

        <footer className="results-footer halieus-results-footer">
          <span>{gameTitle} · Room {roomCode}{winner ? ` · Winner ${winner.name}` : ""}</span>
          <div className="results-footer-actions">
            <button type="button" className="button-muted" aria-label="Game report" onClick={onDownloadReport}>📄 Download Game Report</button>
            {onPlayAgain && <button type="button" className="button-outline" onClick={onPlayAgain}>↻ {playAgainLabel}</button>}
            <button type="button" className="button-primary" onClick={onBackToGameRoom}>← Back to Game Room</button>
          </div>
        </footer>
      </section>
    </section>
  );
}
