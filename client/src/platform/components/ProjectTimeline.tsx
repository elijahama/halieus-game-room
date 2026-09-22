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
        {PROJECT_TIMELINE.map((milestone) => (
          <article
            key={milestone.version}
            className={`hgr-project-milestone${milestone.current ? " is-current" : ""}`}
          >
            <small>{milestone.phase}</small>
            <strong>{milestone.version}</strong>
            <span>{milestone.title}</span>
            <p>{milestone.summary}</p>
          </article>
        ))}
      </div>

      <p className="hgr-project-history-note">
        GitHub source history begins with the 4.0.0 repository import; earlier milestones are preserved from HGR's release and implementation documentation.
      </p>
    </section>
  );
}
