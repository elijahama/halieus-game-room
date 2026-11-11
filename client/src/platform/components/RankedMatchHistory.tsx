import { useEffect, useRef, useState } from "react";
import type { HgrRankedMatchHistoryEntry, HgrRankedMatchHistoryPage } from "../../../../shared/platform/rankedMatchHistory";
import { accountApi } from "../accounts/api";
import "./ranked-match-history.css";

interface Props {
  accountId: string | null;
  games: ReadonlyArray<{ id: string; name: string }>;
}
function placeLabel(position: number): string {
  const suffix = position % 100 >= 11 && position % 100 <= 13 ? "th"
    : position % 10 === 1 ? "st" : position % 10 === 2 ? "nd"
    : position % 10 === 3 ? "rd" : "th";
  return `${position}${suffix}`;
}
export function RankedMatchHistory({ accountId, games }: Props) {
  const [game, setGame] = useState("all");
  const [matches, setMatches] = useState<HgrRankedMatchHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const account = accountId ?? null;

  async function load(offset: number, filter: string) {
    const ticket = ++request.current;
    setBusy(true);
    setError("");
    if (offset === 0) { setMatches([]); setTotal(0); setNextOffset(null); }
    try {
      const result = await accountApi<HgrRankedMatchHistoryPage>(
        `/ranked/matches?game=${encodeURIComponent(filter)}&offset=${offset}`
      );
      if (request.current !== ticket) return;
      setMatches(previous => offset === 0 ? result.matches
        : [...previous, ...result.matches.filter(match => !previous.some(row => row.game === match.game && row.id === match.id))]);
      setTotal(result.total);
      setNextOffset(result.nextOffset);
    } catch (reason) {
      if (request.current === ticket) setError(reason instanceof Error ? reason.message : "Match history unavailable.");
    } finally {
      if (request.current === ticket) setBusy(false);
    }
  }
  useEffect(() => {
    if (!account) { setMatches([]); setTotal(0); setNextOffset(null); setBusy(false); return; }
    void load(0, game);
    return () => { request.current += 1; };
  }, [account, game]);

  return <section className="hgr-ranked-history" aria-label="All Ranked match history">
    <header className="hgr-ranked-history-heading">
      <div><small>COMPETITIVE ARCHIVE</small><h2>All Ranked matches</h2>
        <p>Every retained, completed Ranked result, newest first. Browse earlier results without a recent-match cut-off.</p>
      </div>
      <span aria-label="Total recorded Ranked matches">{total.toLocaleString()} recorded</span>
    </header>
    <div className="hgr-ranked-history-tools">
      <label htmlFor="hgr-ranked-history-game">Game
        <select id="hgr-ranked-history-game" value={game} onChange={event => setGame(event.target.value)}>
          <option value="all">All games</option>
          {games.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => void load(0, game)} disabled={!account || busy}>Refresh matches</button>
    </div>
    {!account && <p className="hgr-ranked-history-message">Sign in to view the Ranked match archive.</p>}
    {error && <p className="hgr-ranked-history-message" role="alert">{error}</p>}
    {busy && matches.length === 0 && <p className="hgr-ranked-history-message" role="status">Loading verified Ranked matches…</p>}
    {!busy && !error && account && total === 0 && <p className="hgr-ranked-history-message">No recorded Ranked matches for this selection. Only genuine, retained final results appear here.</p>}
    {matches.length > 0 && <ol className="hgr-ranked-history-list">
      {matches.map(match => <li key={match.game + ":" + match.id}>
        <article className="hgr-ranked-history-match">
          <div className="hgr-ranked-history-match-head">
            <strong>{games.find(entry => entry.id === match.game)?.name ?? match.game}</strong>
            <span>{new Date(match.completedAt).toLocaleString()}</span>
          </div>
          <div className="hgr-ranked-history-match-meta">Room {match.roomCode} · {match.players.length} players</div>
          <div className="hgr-ranked-history-results">
            {match.players.map((player, index) => <div key={index} className={player.winner ? "is-winner" : ""}>
              <span>{player.placement ? placeLabel(player.placement) : player.winner ? "Winner" : "Player"}</span>
              <strong>{player.name}</strong>
              {player.ratingDelta !== null && <em className={player.ratingDelta >= 0 ? "is-positive" : "is-negative"}>
                {player.ratingDelta >= 0 ? "+" : ""}{player.ratingDelta} rating
              </em>}
            </div>)}
          </div>
        </article>
      </li>)}
    </ol>}
    {matches.length > 0 && <footer className="hgr-ranked-history-footer">
      <span>Showing {matches.length.toLocaleString()} of {total.toLocaleString()} recorded matches</span>
      {nextOffset !== null && <button type="button" disabled={busy} onClick={() => void load(nextOffset, game)}>
        {busy ? "Loading…" : "Load older Ranked matches"}
      </button>}
    </footer>}
    <p className="hgr-ranked-history-note">Historical coverage depends on retained server records. Incomplete, practice and unverified records are not converted into Ranked results.</p>
  </section>;
}
