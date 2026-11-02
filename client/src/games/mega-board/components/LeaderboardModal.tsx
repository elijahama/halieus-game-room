import { useState } from "react";
import { ModalPortal } from "../../../platform/components/ModalPortal";
import type { RankedLeaderboardEntry, RankedMatchSummary } from "../../../../../shared/games/mega-board/ranked";
import type { SeasonSnapshot, SeasonLeaderboardEntry } from "../../../../../shared/games/mega-board/season";

interface Props {
  entries: RankedLeaderboardEntry[];
  season: SeasonSnapshot | null;
  recentMatches: RankedMatchSummary[];
  loading: boolean;
  error: string;
  theme: { cardBackground: string; secondaryBackground: string; text: string; mutedText: string; border: string };
  onClose: () => void;
  onRefresh: () => void;
}
type Row = RankedLeaderboardEntry | SeasonLeaderboardEntry;
const medals = ["1st", "2nd", "3rd"];
function avatar(entry: Row) {
  return <span className="leaderboard-podium-avatar"
    style={entry.profilePicture ? undefined : {background: entry.playerColor ?? "#64748b"}}>
    {entry.profilePicture ? <img src={entry.profilePicture} alt="" /> :
      entry.avatar ?? entry.playerName.slice(0, 2).toUpperCase()}
  </span>;
}
function formBadge(positions?: number[]) {
  if (!positions?.length) return <small>No recent results</small>;
  return <span className="mega-leader-form" aria-label={`Recent placements: ${positions.join(", ")}`}>
    {positions.map((position,i)=><span key={i} className={position<=3?"is-podium":undefined}>#{position}</span>)}
  </span>;
}
export function LeaderboardModal({entries,season,recentMatches,loading,error,theme,onClose,onRefresh}:Props) {
  const [view,setView] = useState<"season"|"lifetime"|"history">("season");
  const seasonal = view==="season";
  const visible: Row[] = seasonal ? season?.entries ?? [] : view==="lifetime" ? entries : [];
  return <ModalPortal onClose={onClose}>
    <div className="leaderboard-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <section className="leaderboard-modal glass-card" role="dialog" aria-modal="true" aria-label="Mega Board standings"
        style={{background:theme.cardBackground,borderColor:theme.border,color:theme.text}}>
        <header className="leaderboard-header">
          <div><p className="modal-eyebrow">Mega Board</p><h2>Leaderboard</h2>
            <small style={{color:theme.mutedText}}>Lifetime honours stay permanent. Season points use the latest 12 verified Ranked games.</small></div>
          <div className="leaderboard-header-actions">
            <button type="button" className="button-ghost" onClick={onRefresh}>Refresh</button>
            <button type="button" className="button-ghost leaderboard-close" aria-label="Close leaderboard" onClick={onClose}>×</button>
          </div>
        </header>
        <nav className="mega-ranking-tabs" aria-label="Leaderboard view">
          <button type="button" aria-current={view==="season"?"page":undefined} onClick={()=>setView("season")}>Season championship</button>
          <button type="button" aria-current={view==="lifetime"?"page":undefined} onClick={()=>setView("lifetime")}>Lifetime Ranked</button>
          <button type="button" aria-current={view==="history"?"page":undefined} onClick={()=>setView("history")}>Pre-season honours</button>
        </nav>
        {loading ? <p>Loading verified standings…</p> : error ? <p className="leaderboard-error">{error}</p> : view==="history" ? (
          <section className="mega-ranking-history">
            <h3>Founding standings</h3>
            <p>These are the original Ranked top three, preserved at first season activation. They do not grant account achievements by player-name matching.</p>
            {(season?.preseasonStandings.length ?? 0) === 0 ? <p>No verified founding standings were available.</p> :
              <div className="mega-ranking-history-list">{season!.preseasonStandings.map((p,i)=>
                <div key={p.playerKey}><strong>{medals[i] ?? `#${i+1}`}</strong>
                  <span>{p.playerName}</span><b>{p.rating} historical rating</b>
                  <small>{p.wins} wins · {p.podiums} podium finishes</small>
                </div>)}</div>}
            <p className="mega-ranking-history-note">Retroactive Gamer Score awards are calculated separately from verified completed-match account records. Older records without evidence are not counted.</p>
          </section>
        ) : visible.length===0 ? (
          <div className="leaderboard-empty-state" style={{borderColor:theme.border}}>
            <strong>{seasonal?"The season begins with new Ranked results":"No completed Ranked matches yet"}</strong>
            <span>Finish an eligible Ranked Mega Board match to appear here. Spectating alone never earns points.</span>
          </div>
        ) : <>
          {seasonal && <div className="mega-season-rules">
            <strong>Latest {season?.scoringWindow ?? 12} matches</strong>
            <span>1st 20 · 2nd 12 · 3rd 8 · 4th 5 · Others 2 · performance bonus capped at 4 · awards capped at 3</span>
          </div>}
          <div className="leaderboard-podium" aria-label="Top three competitors">
            {[visible[1],visible[0],visible[2]].filter((p):p is Row=>Boolean(p)).map(p=>{
              const rank=visible.findIndex(r=>r.playerKey===p.playerKey)+1;
              const value=seasonal?(p as SeasonLeaderboardEntry).points:p.rating;
              const matches="seasonMatches" in p?p.seasonMatches:p.gamesPlayed;
              return <article key={p.playerKey} className={`is-rank-${rank}`}>
                <span className="leaderboard-podium-medal">{medals[rank-1]}</span>{avatar(p)}
                <strong>{p.playerName}</strong><b>{value} {seasonal?"pts":""}</b>
                <small>{p.wins} win{p.wins===1?"":"s"} · {matches} games</small><em>{medals[rank-1]}</em>
              </article>;
            })}
          </div>
          <div className="leaderboard-table-wrap">
            <div className="leaderboard-grid mega-ranking-grid mega-ranking-head">
              <span>#</span><span>Player</span><span>{seasonal?"Points":"Rating"}</span><span>Games</span><span>Wins</span><span>Podiums</span><span>{seasonal?"To next":"Avg finish"}</span><span>Recent form</span>
            </div>
            {visible.map((entry,i)=>{
              const isSeasonEntry = "seasonMatches" in entry;
              const score=isSeasonEntry?entry.points:entry.rating;
              const matches=isSeasonEntry?entry.seasonMatches:entry.gamesPlayed;
              const next=isSeasonEntry ? (i===0?"Leading":`+${entry.pointsToNext} pts`) : entry.averageFinish.toFixed(2);
              return <div key={entry.playerKey} className="leaderboard-grid mega-ranking-grid"
                style={{background:theme.secondaryBackground,borderColor:theme.border}}>
                <strong>{i+1}</strong><strong>{entry.playerName}</strong><b>{score}</b>
                <span>{matches}</span><span>{entry.wins}</span><span>{entry.podiums}</span>
                <span>{next}</span>{formBadge(entry.recentForm)}
              </div>;
            })}
          </div>
        </>}
        {view==="lifetime" && recentMatches.length>0 && <section className="leaderboard-recent">
          <h3>Recent Ranked matches</h3>
          {recentMatches.slice(0,6).map(match=><div key={match.matchId} style={{borderColor:theme.border}}>
            <strong>{match.roomCode}</strong><span>{new Date(match.completedAt).toLocaleString()}</span>
            <small style={{color:theme.mutedText}}>{match.players.map(p=>`#${p.finishPosition} ${p.playerName} (${p.ratingDelta>=0?"+":""}${p.ratingDelta})`).join(" · ")}</small>
          </div>)}
        </section>}
      </section>
    </div>
  </ModalPortal>;
}
