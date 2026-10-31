export interface ProjectMilestone {
  version: string;
  phase: string;
  title: string;
  summary: string;
  current?: boolean;
  planned?: boolean;
}

export const PROJECT_TIMELINE: ProjectMilestone[] = [
  {
    version: "0.22.x",
    phase: "Foundation",
    title: "Rules engine and presentation base",
    summary:
      "Turn order, ownership, rent, building, mortgages, bankruptcy, cards, auctions, Mega spaces, Jail, Speed Die, trading, persistence and AI were built out incrementally.",
  },
  {
    version: "3.3.x–3.4.x",
    phase: "Release-candidate era",
    title: "Public-access and platform hardening",
    summary:
      "Server-authoritative presentation, phone and tablet behaviour, full event coverage, results polish and the first stable public-access workflow were hardened before the compact production version scheme.",
  },
  {
    version: "3.5.0",
    phase: "Production foundation",
    title: "Desktop + Oracle architecture",
    summary:
      "HGR adopted the compact version scheme, secure Electron shell, canonical production data paths and the permanent Oracle deployment architecture.",
  },
  {
    version: "3.5.x",
    phase: "Deployment hardening",
    title: "Safe production updates",
    summary:
      "The 3.5 line hardened packaging, release integrity and SSH handling so routine updates could remain safe without leaking owner credentials or coupling Start/Restart to deployment.",
  },
  {
    version: "3.6.0",
    phase: "Platform baseline",
    title: "Protected Game Room shell",
    summary:
      "The fixed desktop shell, profile-first navigation, active rooms, invitations, richer player records and protected per-game layouts established the modern HGR platform shape.",
  },
  {
    version: "3.6.x",
    phase: "Stability line",
    title: "Responsive layout and live-room refinement",
    summary:
      "Game viewport fitting, room recovery, AI replacement, Word games, security gates and Mega Board interaction polish were iterated without abandoning the protected shell.",
  },
  {
    version: "3.7.0–3.7.0l",
    phase: "Platform expansion",
    title: "New modules and lifecycle hardening",
    summary:
      "PWA installation, persistent game requests, Ayo, Word Board, profile pictures, tablet layouts, privacy redaction, lifecycle repair and multiple Mega Board rule/turn-control refinements expanded HGR beyond its original game set.",
  },
  {
    version: "4.0.0",
    phase: "Major-version baseline",
    title: "Branded session arrival",
    summary:
      "The 4.x line consolidated HGR's branded arrival experience, portfolio documentation and regression-protected platform baseline.",
  },
  {
    version: "4.0.1",
    phase: "Presentation",
    title: "Ranked results and mobile UX",
    summary:
      "Mega Board results gained a clearer rating hierarchy, mobile standings became labelled cards, and shared result actions were rebuilt for phone-sized screens.",
  },
  {
    version: "4.0.2",
    phase: "Mobile recovery",
    title: "True device-width layouts",
    summary:
      "The legacy forced desktop viewport was removed. Mega Board and shared game chrome moved back to real phone scale with bounded mobile decision sheets and stronger responsive rules.",
  },
  {
    version: "4.1.0",
    phase: "Social platform",
    title: "Guilds and persistent groups",
    summary:
      "Private guilds added persistent membership, role permissions, chat, guild-organised rooms, Join/Spectate links, room history and an internal guild leaderboard.",
  },
  {
    version: "4.5.x",
    phase: "Platform integration",
    title: "Shared mobile, account and PWA foundations",
    summary: "Account and guild tools, cross-game mobile presentation, release integrity, owner Control and platform navigation advanced in separately audited releases.",
  },
  {
    version: "4.6.x",
    phase: "Competition and replay foundations",
    title: "Independent ratings, archives and game-history infrastructure",
    summary: "Tournament and replay primitives were introduced without claiming complete cross-game replay viewers or working end-to-end tournaments.",
  },
  {
    version: "4.7.x",
    phase: "Active release family",
    title: "Public operations and playable Guild fixture development",
    summary: "Control maintenance scheduling, game continuity and safer updates accompany the staged two-board Mega Board Guild fixture pathway; the Tournament feature gate still requires owner acceptance.",
  },
  {
    version: "4.8.x",
    phase: "Planned tournament milestone",
    title: "Solo and Guild tournament brackets",
    summary: "Working entrants, elimination and loser-bracket progression, finals, room links, spectators, cancellations and reconnect recovery.",
    planned: true,
  },
  {
    version: "4.9.x",
    phase: "Planned tournament milestone",
    title: "Competition experience and launch assurance",
    summary: "Separate tournament ratings and standings, reports, tournament match replay, mobile and accessibility acceptance, security and full production rehearsals.",
    planned: true,
  },
  {
    version: "5.0.0",
    phase: "Reserved · owner acceptance required",
    title: "Complete Mega Board Tournament Mode",
    summary: "A fully playable Solo and Guild tournament from registration to verified final, scoring, recovery and downloadable match replay. No placeholder-only release; explicit owner sign-off required.",
    planned: true,
  },
];
