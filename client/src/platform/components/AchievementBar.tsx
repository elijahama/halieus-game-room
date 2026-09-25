import { useMemo, useState } from "react";
import type { AchievementProgress, PlayerProgression } from "../../../../shared/platform/progression";
import { ModalPortal } from "./ModalPortal";

type AchievementFilter = "all" | "progress" | "earned" | "locked";

/** Counters come exclusively from the server's verified progression record. */
export function nextAchievement(progression: PlayerProgression): AchievementProgress | undefined {
  const goals = progression.achievements ?? [];
  return goals
    .filter((goal) => !goal.earned)
    .sort((a, b) => {
      const aRatio = a.target > 0 ? a.current / a.target : 0;
      const bRatio = b.target > 0 ? b.current / b.target : 0;
      return bRatio - aRatio || b.current - a.current || a.points - b.points;
    })[0];
}

function filterAchievement(achievement: AchievementProgress, filter: AchievementFilter): boolean {
  if (filter === "earned") return achievement.earned;
  if (filter === "progress") return !achievement.earned && achievement.current > 0;
  if (filter === "locked") return !achievement.earned && achievement.current <= 0;
  return true;
}

function categoryLabel(category: AchievementProgress["category"]): string {
  if (category === "general") return "Account";
  if (category === "exploration") return "Explorer";
  if (category === "time") return "Active play";
  if (category === "game") return "Game milestone";
  return "Special";
}

export function AchievementBar({ progression, compact = false }: { progression?: PlayerProgression; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<AchievementFilter>("all");
  if (!progression) return null;

  const achievements = progression.achievements ?? [];
  const next = nextAchievement(progression);
  const awards = [...progression.awards].sort((a,b)=>b.earnedAt-a.earnedAt);
  const latest = awards[0];
  const maxScore = progression.maxGamerScore ?? achievements.reduce((sum, achievement) => sum + achievement.points, 0);
  const visible = useMemo(
    () => achievements.filter((achievement) => filterAchievement(achievement, filter)),
    [achievements, filter],
  );

  return <>
    <button type="button" className={`achievement-bar${compact ? " is-compact" : ""}`} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-label="Open Achievements">
      <span className="achievement-bar-score"><strong>{progression.gamerScore}</strong><small>Gamer Score{maxScore ? ` / ${maxScore}` : ""}</small></span>
      <span className="achievement-bar-progress"><strong>{next?.title ?? "Achievements"}</strong>
        <small>{next ? `${Math.min(next.current,next.target)} / ${next.target} · ${next.requirement} · +${next.points} GS` : `${awards.length} achievements earned`}</small>
        {next && <progress value={Math.min(next.current,next.target)} max={next.target} aria-label={next.title} />}
      </span>
      {!compact && latest && <span className="achievement-bar-recent"><small>Latest · +{latest.points} GS</small><span>{latest.title}</span></span>}
      <span aria-hidden="true">→</span>
    </button>

    {open && <ModalPortal onClose={()=>setOpen(false)}>
      <div className="achievement-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}>
        <section className="achievement-dialog achievement-dialog-v2" role="dialog" aria-modal="true" aria-label="Achievements and Gamer Score">
          <header>
            <div>
              <p className="modal-eyebrow">ACCOUNT PROGRESSION</p>
              <h2>Achievements & Gamer Score</h2>
              <p>{progression.gamerScore}{maxScore ? ` / ${maxScore}` : ""} GS · {awards.length} / {achievements.length || awards.length} achievements</p>
            </div>
            <button type="button" aria-label="Close achievements" onClick={()=>setOpen(false)}>×</button>
          </header>

          <section className="achievement-score-explainer">
            <div><strong>How Gamer Score works</strong><span>Your Gamer Score is the sum of the point values of achievements you have actually completed. It is not Elo and it does not change when you lose.</span></div>
            <div><strong>What counts</strong><span>Completed, server-verified non-Beta play. Match, win, game-specific, active-play and special achievements each show their exact requirement below.</span></div>
          </section>

          {next && <section className="achievement-next">
            <div><small>NEXT CLOSEST MILESTONE</small><b className={`achievement-tier is-${next.tier}`}>{next.tier}</b></div>
            <strong>{next.title}</strong>
            <p>{next.description}</p>
            <span>{next.requirement}</span>
            <div><em>{Math.min(next.current,next.target)} / {next.target}</em><b>+{next.points} GS</b></div>
            <progress value={Math.min(next.current,next.target)} max={next.target} aria-label={next.title}/>
          </section>}

          <nav className="achievement-filters" aria-label="Achievement filters">
            {([
              ["all", "All"],
              ["progress", "In progress"],
              ["earned", "Earned"],
              ["locked", "Not started"],
            ] as const).map(([id,label]) =>
              <button type="button" key={id} className={filter===id ? "is-active" : ""} onClick={()=>setFilter(id)}>{label}</button>
            )}
          </nav>

          <div className="achievement-catalog">
            {visible.length ? visible.map((achievement) => (
              <article key={achievement.id} className={`achievement-card ${achievement.earned ? "is-earned" : achievement.current > 0 ? "is-progress" : "is-locked"}`}>
                <div className="achievement-card-heading">
                  <span><small>{categoryLabel(achievement.category)}</small><strong>{achievement.title}</strong></span>
                  <b className={`achievement-tier is-${achievement.tier}`}>{achievement.tier}</b>
                </div>
                <p>{achievement.description}</p>
                <strong className="achievement-requirement">{achievement.requirement}</strong>
                <div className="achievement-card-progress">
                  <span>{achievement.earned ? "Completed" : `${Math.min(achievement.current,achievement.target)} / ${achievement.target}`}</span>
                  <b>+{achievement.points} GS</b>
                </div>
                <progress value={achievement.earned ? achievement.target : Math.min(achievement.current,achievement.target)} max={achievement.target} aria-label={achievement.title}/>
                {achievement.earnedAt && <small className="achievement-earned-date">Earned {new Date(achievement.earnedAt).toLocaleDateString()}</small>}
              </article>
            )) : <p className="achievement-empty">No achievements match this filter yet.</p>}
          </div>
        </section>
      </div>
    </ModalPortal>}
  </>;
}
