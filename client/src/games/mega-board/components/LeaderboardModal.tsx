import { ModalPortal } from "../../../platform/components/ModalPortal";
import type { RankedLeaderboardEntry, RankedMatchSummary } from "../../../../../shared/games/mega-board/ranked";

interface Props {
  entries: RankedLeaderboardEntry[];
  recentMatches: RankedMatchSummary[];
  loading: boolean;
  error: string;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onClose: () => void;
  onRefresh: () => void;
}

export function LeaderboardModal({ entries, recentMatches, loading, error, theme, onClose, onRefresh }: Props) {
  return (
    <ModalPortal onClose={onClose}><div className="leaderboard-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="leaderboard-modal glass-card" role="dialog" aria-modal="true" aria-label="Ranked leaderboard" style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text }}>
        <header className="leaderboard-header">
          <div><p className="modal-eyebrow">Ranked</p><h2>🏆 Leaderboard</h2><small style={{ color: theme.mutedText }}>Placement drives rating. Performance and awards add bonus rating.</small></div>
          <div className="leaderboard-header-actions"><button type="button" className="button-ghost" onClick={onRefresh}>↻ Refresh</button><button type="button" className="button-ghost leaderboard-close" aria-label="Close leaderboard" onClick={onClose}>✕</button></div>
        </header>
        {loading ? <p>Loading leaderboard…</p> : error ? <p className="leaderboard-error">{error}</p> : entries.length === 0 ? (
          <div className="leaderboard-empty-state" style={{ borderColor: theme.border }}>
            <div aria-hidden="true">🏆</div>
            <strong>No completed Ranked matches yet</strong>
            <span style={{ color: theme.mutedText }}>Complete a Ranked Mega Board match and the standings will appear here.</span>
          </div>
        ) : (
          <>
          <div className="leaderboard-podium" aria-label="Top ranked players">
            {[entries[1], entries[0], entries[2]].filter((entry): entry is RankedLeaderboardEntry => Boolean(entry)).map((entry) => {
              const rank = entries.findIndex((candidate) => candidate.playerKey === entry.playerKey) + 1;
              return <article key={entry.playerKey} className={`is-rank-${rank}`}>
                <span className="leaderboard-podium-medal" aria-hidden="true">{rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉"}</span>
                <span className="leaderboard-podium-avatar" style={entry.profilePicture ? undefined : { background: entry.playerColor ?? "#64748b" }}>
                  {entry.profilePicture ? <img src={entry.profilePicture} alt="" /> : entry.avatar ?? entry.playerName.slice(0, 2).toUpperCase()}
                </span>
                <strong>{entry.playerName}</strong>
                <b>{entry.rating}</b>
                <small>{entry.wins} win{entry.wins === 1 ? "" : "s"} · {entry.gamesPlayed} game{entry.gamesPlayed === 1 ? "" : "s"}</small>
                <em>{rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}</em>
              </article>;
            })}
          </div>
          <div className="leaderboard-table-wrap">
            <div className="leaderboard-grid leaderboard-grid-head"><span>#</span><span>Player</span><span>Rating</span><span>Games</span><span>Wins</span><span>Podiums</span><span>Avg finish</span><span>Awards</span></div>
            {entries.map((entry, index) => (
              <div key={entry.playerKey} className="leaderboard-grid" style={{ background: theme.secondaryBackground, borderColor: theme.border }}>
                <strong>{index + 1}</strong><strong>{entry.playerName}</strong><b>{entry.rating}</b><span>{entry.gamesPlayed}</span><span>{entry.wins}</span><span>{entry.podiums}</span><span>{entry.averageFinish.toFixed(2)}</span><span>{entry.awardsWon}</span>
              </div>
            ))}
          </div>
          </>
        )}
        {recentMatches.length > 0 && (
          <section className="leaderboard-recent"><h3>Recent Ranked matches</h3>{recentMatches.slice(0, 6).map((match) => <div key={match.matchId} style={{ borderColor: theme.border }}><strong>{match.roomCode}</strong><span>{new Date(match.completedAt).toLocaleString()}</span><small style={{ color: theme.mutedText }}>{match.players.map((player) => `#${player.finishPosition} ${player.playerName} (${player.ratingDelta >= 0 ? "+" : ""}${player.ratingDelta})`).join(" · ")}</small></div>)}</section>
        )}
      </section>
    </div></ModalPortal>
  );
}
