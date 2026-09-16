import { useState } from "react";

interface PokerLeaderboardModalProps {
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onClose: () => void;
}

export function PokerLeaderboardModal({ theme, onClose }: PokerLeaderboardModalProps) {
  const [refreshedAt, setRefreshedAt] = useState(Date.now());
  return (
    <div className="leaderboard-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="leaderboard-modal glass-card" role="dialog" aria-modal="true" aria-label="Poker Ranked leaderboard" style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text }}>
        <header className="leaderboard-header">
          <div>
            <p className="modal-eyebrow">Ranked Poker</p>
            <h2>🏆 Poker leaderboard</h2>
            <small style={{ color: theme.mutedText }}>Poker standings are independent from Mega Board. Virtual chips only.</small>
          </div>
          <div className="leaderboard-header-actions">
            <button type="button" className="button-ghost" onClick={() => setRefreshedAt(Date.now())}>↻ Refresh</button>
            <button type="button" className="button-ghost leaderboard-close" aria-label="Close leaderboard" onClick={onClose}>✕</button>
          </div>
        </header>
        <div className="leaderboard-calibration-note" style={{ background: theme.secondaryBackground, borderColor: theme.border }}>
          <span>Rating model</span>
          <strong>Calibration stage</strong>
          <p style={{ color: theme.mutedText }}>Ranked tables are recorded now. The Poker-specific rating formula will be locked from real table reports rather than borrowing Mega Board scoring.</p>
        </div>
        <div className="leaderboard-empty-state" style={{ borderColor: theme.border }} data-refreshed-at={refreshedAt}>
          <div aria-hidden="true">♠</div>
          <strong>No completed Ranked Poker matches yet</strong>
          <span style={{ color: theme.mutedText }}>Completed Ranked results will appear here once the Poker rating model is activated.</span>
        </div>
      </section>
    </div>
  );
}
