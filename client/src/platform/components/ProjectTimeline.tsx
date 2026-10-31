import { PROJECT_TIMELINE } from "../projectTimeline";

interface ProjectTimelineProps {
  currentVersion: string;
}

export function ProjectTimeline({ currentVersion }: ProjectTimelineProps) {
  return (
    <section className="hgr-project-history" id="hgr-project-timeline" aria-label="Halieus Game Room project timeline">
      <header>
        <div>
          <p>PROJECT HISTORY</p>
          <h2>From one game engine to a platform</h2>
          <span>
            A version-led view of HGR's development, reconstructed from the preserved release documentation and carried through the current build.
          </span>
        </div>
        <b>Current · {currentVersion}</b>
      </header>

      <div className="hgr-project-history-track">
        {PROJECT_TIMELINE.map((milestone) => {
          const isCurrent = !milestone.planned && (milestone.current
            || milestone.version === currentVersion
            || (milestone.version.endsWith(".x") && currentVersion.startsWith(milestone.version.slice(0, -1))));
          return (
          <article
            key={milestone.version}
            className={`hgr-project-milestone${isCurrent ? " is-current" : ""}${milestone.planned ? " is-planned" : ""}`}
          >
            <small>{milestone.planned ? "Planned · " : ""}{milestone.phase}</small>
            <strong>{milestone.version}</strong>
            <span>{milestone.title}</span>
            <p>{milestone.summary}</p>
          </article>
          );
        })}
      </div>

      <p className="hgr-project-history-note">
        GitHub source history begins with the 4.0.0 repository import; earlier milestones are preserved from HGR's release and implementation documentation.
      </p>
    </section>
  );
}
