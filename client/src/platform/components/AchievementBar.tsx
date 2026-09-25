import { useState } from "react";
import type { PlayerProgression } from "../../../../shared/platform/progression";
import { ModalPortal } from "./ModalPortal";

/** Counters come exclusively from the server's verified progression record. */
export function nextAchievement(progression: PlayerProgression) {
  const earned = new Set(progression.awards.map(a => a.id));
  const goals = [
    { id:"first-match", title:"First completed match", current:progression.played, target:1, points:10 },
    { id:"five-games", title:"Five different games", current:Object.keys(progression.byGame).length, target:5, points:50 },
    { id:"active-hour", title:"One hour of active play", current:Math.floor(progression.activePlayMs/60000), target:60, points:50 },
    ...Object.entries(progression.byGame).flatMap(([game,line])=>[
      {id:`${game}:ten-matches`,title:`${game.replaceAll('-',' ')}: ten completed matches`,current:line.played,target:10,points:30},
      {id:`${game}:five-wins`,title:`${game.replaceAll('-',' ')}: five wins`,current:line.wins,target:5,points:50},
    ]),
  ];
  return goals.filter(g=>!earned.has(g.id)).sort((a,b)=>b.current/b.target-a.current/a.target)[0];
}

export function AchievementBar({ progression, compact = false }: { progression?: PlayerProgression; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!progression) return null;
  const next = nextAchievement(progression);
  const awards = [...progression.awards].sort((a,b)=>b.earnedAt-a.earnedAt);
  const latest = awards[0];
  return <>
    <button type="button" className={`achievement-bar${compact ? ' is-compact' : ''}`} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-label="Open Achievements">
      <span className="achievement-bar-score"><strong>{progression.gamerScore}</strong><small>Gamer Score</small></span>
      <span className="achievement-bar-progress"><strong>{next?.title ?? 'Achievements'}</strong>
        <small>{next ? `${Math.min(next.current,next.target)} / ${next.target} · next award +${next.points}` : `${awards.length} achievements earned`}</small>
        {next && <progress value={Math.min(next.current,next.target)} max={next.target} aria-label={next.title} />}
      </span>
      {!compact && latest && <span className="achievement-bar-recent"><small>Latest · +{latest.points}</small><span>{latest.title}</span></span>}
      <span aria-hidden="true">→</span>
    </button>
    {open && <ModalPortal onClose={()=>setOpen(false)}><div className="achievement-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}>
      <section className="achievement-dialog" role="dialog" aria-modal="true" aria-label="Achievements">
        <header><div><h2>Achievements</h2><p>{progression.gamerScore} Gamer Score · {awards.length} earned</p></div><button type="button" aria-label="Close achievements" onClick={()=>setOpen(false)}>×</button></header>
        <p>Earned from verified play. Competitive Elo stays in Rankings.</p>
        {next && <section className="achievement-next"><h3>Next milestone</h3><strong>{next.title}</strong><p>{Math.min(next.current,next.target)} / {next.target} · +{next.points} Gamer Score</p><progress value={Math.min(next.current,next.target)} max={next.target} aria-label={next.title}/></section>}
        <div className="achievement-list">{awards.length ? awards.map(a=><article key={a.id}><strong>{a.title}</strong><span>+{a.points}</span><small>{new Date(a.earnedAt).toLocaleDateString()}</small></article>) : <p>Complete a verified match to earn your first achievement.</p>}</div>
      </section>
    </div></ModalPortal>}
  </>;
}
