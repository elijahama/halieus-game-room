# HGR Delivery Timeline and Tournament Roadmap

**Source snapshot:** 31 October 2026. This is a planned delivery order, not a running job queue. The Development screen inside owner Control shows these mini-batches, and reads GitHub PR status separately. A code merge is never proof of an Oracle production deployment. Labels and links use feature names, not conversation numbering.

## Versioned delivery allocation — 24 November 2026

The owner requested that delivery batches be allocated specific patch versions. These are planned targets, not deployed releases or acceptance claims. The source VERSION remains 4.8.1. The most recent recorded production identity is 4.8.1; current public identity has not been rechecked here. Functional milestone contracts and release gates in the Version Roadmap remain authoritative.

| Target | Batch | Source / acceptance gate |
| --- | --- | --- |
| 4.8.2 | Control updater reliability | Draft #250; dirty live data preserved, exact-fingerprint no-op, existing CI, room and rollback gates |
| 4.8.3 | Mega Board geometry and property readability | Centre board; compact grouped property presentation without redundant banners or wasted space; retain all gameplay and spectator fixes; responsive regression |
| 4.8.4 | Intro viewport/glow and independent Tournament destination | Drafts #248 and #249; independently audit each slice; canonical H, desktop/tablet fit, Solo/Guild access and mobile navigation |
| **4.8.5** | Tournament hardening checkpoint | Real authenticated Solo/Guild flows, tie/forfeit/reconnect/restart recovery, mobile/PWA acceptance and restorable protected checkpoint |
| 4.8.6 | Spar (Cha-Cha) Casual Beta; Control PWA release alerts and task-based progress | Draft #251 and issue #279; Spar rules/privacy/multiplayer/AI/responsive acceptance; verified event-driven release-ready push, measured individual check progress, physical-device receipt and failure/recovery acceptance; separate from tournament milestone |
| 4.8.7 | Control visual overhaul and Spar beta follow-up | Issue #280; audit reference assets and current screens before redesign, retain operation contracts; Spar corrections only for actual findings |
| 4.8.8–4.8.9 | Unallocated contingency | Only if meaningful corrections are needed |
| **4.9.0** | Tournament experience milestone | Distinct ratings, leaderboards, Guild standings, reports, working Mega Board tournament replay/download/viewer, profiles, permissions and responsive presentation. Individually audited implementation slices precede the milestone; do not defer required functionality to later patches. |
| 4.9.1 | Competitive profile/statistics refinement | Preserve correct independent standings and scoring |
| 4.9.2 | Replay/report refinement | Viewer navigation, export and report usability; preserve complete and privacy-safe records |
| 4.9.3 | Tournament interface refinement | Desktop/tablet/phone geometry and accessibility |
| 4.9.4 | Security and recovery hardening | Permissions, abuse prevention, reconnect and failure recovery |
| **4.9.5** | Production-readiness checkpoint | Integrated end-to-end regression, cross-device UX, deployment/rollback rehearsal and restorable protected checkpoint |
| 4.9.6–4.9.8 | Unallocated contingency | Genuine launch-blocking corrections only |
| **4.9.9** | Mandatory site-wide pre-5.0 audit | Whole-platform code, visual, responsive, gameplay, accessibility and operational audit; findings resolved, full regression, restorable checkpoint and owner sign-off |
| **5.0.0** | Fully realised Tournament Mode | All existing milestone contracts, real production Solo/Guild acceptance and explicit owner approval |
| 5.0.1 | Conditional gameplay fixes | Real production findings |
| 5.0.2 | Conditional scoring/integrity fixes | Real production findings |
| 5.0.3 | Conditional performance/interface fixes | Real production findings |
| 5.0.4 | Conditional remaining launch fixes | Real production findings |
| **5.0.5** | Accepted post-launch stability | Preserve 5.0.0 baseline and independently restorable accepted checkpoint |

The above allocation supersedes the old delivery ordering only where a batch is explicitly covered; earlier notification, security, scheduled-release and universal replay requirements remain tracked, not silently completed or dropped. New findings can change patch allocation before release; do not manufacture patches or skip an unmet milestone. No production deployment, code merge, version bump, or change to Control UI is authorized by this documentation alone.

## 4.9.9 — mandatory site-wide pre-5.0 audit (owner direction, 25 November 2026)

4.9.9 is a dedicated final quality and release-readiness milestone, not optional contingency. It follows the 4.9.5 integration checkpoint and must be accepted before 5.0.0. Audit the whole shipped HGR platform, not just Tournament Mode, against a frozen release candidate and approved reference assets. Preserve existing fixes and canonical branding.

| Audit workstream | Required coverage and evidence |
| --- | --- |
| Code and architecture | Entire client/server/shared code, build and release paths; dead/duplicate code, type safety, dependencies, errors, security, privacy, race conditions and maintainability. No speculative wholesale rewrites. |
| Visual consistency | Approved typography, canonical H family, game icons, themes, colour/contrast, component hierarchy, spacing, feedback and alignment across all screens. |
| UI, framing and scaling | Every game, lobby, gallery, spectator, profile, ranking, tournament, replay, settings, notification and Control surface; portrait/landscape phones and tablets, short/wide desktop, fullscreen and installed PWA, safe areas, zoom and enlarged text. Record real screenshots and geometry regressions. |
| Gameplay and data | Every supported game/mode, AI, rules, clocks, room lifecycle/recovery, ranked awards and histories, tournament scoring, replay privacy and persistence; no regressions or fabricated outcomes. |
| Operations and performance | Oracle deployment/rollback, exact release identity, update progress, notifications, room closures/maintenance, storage, network, load and error recovery; no visible terminal interruptions on owner PC. |
| Accessibility and acceptance | Keyboard/focus, touch targets, screen-reader labels, contrast and real-device journeys; Windows/Ubuntu CI, full regression/build/browser suite, production rehearsal and owner acceptance. |

Maintain a findings register with screen/module, severity, reproduction, before/after evidence, fix PR, exact tested revision and status. Fix in small independently reviewed batches. Re-run impacted coverage and final full release gates after fixes; retain a restorable 4.9.9 checkpoint. No unresolved launch-blocking or serious defects, no silent waivers, and no known unaccepted visual inconsistencies may pass into 5.0. Lower-severity residuals require explicit owner review. Source, CI, deployment, and real-device acceptance remain separate. Do not change VERSION or declare the audit complete merely because this plan is recorded.

## Delivery mini-batches

| Batch | Focus | Confirmed source status at snapshot | Acceptance and link |
| --- | --- | --- | --- |
| A | Oracle Update health-gate diagnostics | GitHub PR #190 merged after Windows and Ubuntu CI; production verification pending | Clear health-offline diagnostic, preserve both independent no-active-room gates; [PR #190](https://github.com/elijahama/halieus-game-room/pull/190) |
| B | Genuine software-update progress inside the floating notification | PR #187 is review candidate, Windows/Ubuntu checks passed; not deployed | Real server-reported progress visible while expanded and minimised; no fake completion; [PR #187](https://github.com/elijahama/halieus-game-room/pull/187) |
| C | Android status-bar notification identities | PR #188 is review candidate, Windows/Ubuntu checks passed; device verification pending | Existing H, Control H/cog, Mega Board M only; no new art; [PR #188](https://github.com/elijahama/halieus-game-room/pull/188) |
| D | Live-game continuity and notifications | Owner-observed bugs, not accepted | Fix game rejoin softlocks and live push, test background/resume, match decision notices; [tracking #191](https://github.com/elijahama/halieus-game-room/issues/191) and notification acknowledgements [#115](https://github.com/elijahama/halieus-game-room/issues/115) |
| E | Mobile profile/Owner Settings and Join visual repairs | Owner-requested, not accepted | Redesign settings and remove Join gloss/emboss at all CSS breakpoints; physical-device acceptance; [tracking #192](https://github.com/elijahama/halieus-game-room/issues/192) |
| F | Owner security audit and bans | Requirement recorded; no bans deployed | Rejected/nonmember sign-in audit, safe IP/account bans, owner recovery, no fictitious MAC addresses; [tracking #186](https://github.com/elijahama/halieus-game-room/issues/186) |
| G | Scheduled software releases | Requirement recorded; not implemented | Version-specific authorized release windows, active-room drain, health verification, rollback, cancel/reschedule; [tracking #182](https://github.com/elijahama/halieus-game-room/issues/182) |
| H | Game-specific replay and mobile regression acceptance | Platform-wide phased work | Durable finished-match exports, private game information protection, Mega Board mobile decision audit; [tracking #153](https://github.com/elijahama/halieus-game-room/issues/153) |

**Order is provisional** within safety constraints. A regression that prevents game access outranks presentation polish. Keep all current fixes intact. Batch D may be divided into separate audited reconnect, push, and notification-acknowledgement changes; batches F/G/H likewise require their own testable feature slices.

## Goal-gated versions versus delivery batches

The owner-approved acceptance conditions are in the [HGR Version Roadmap](HGR_VERSION_ROADMAP.md). Mini-batches may be merged and regression-tested as supporting pieces, but the named functional goal (4.8 formats, 4.9 experience, 5.0 complete Tournament Mode) must be independently verified before declaring that milestone achieved. The 4.85 and 4.95 intermediate markers are explicitly acceptance and preserved-source checkpoints, **not** a substitute for incomplete Solo, Guild or replay functionality. Each accepted step preserves a restorable development SHA/tag/archive separately from the currently published website.

## Path to 5.0.0 — Mega Board Tournament Mode

| Version family | Owner acceptance milestone | Evidence needed |
| --- | --- | --- |
| 4.6.x | Competition/replay infrastructure | Independent tournament ledger and fixture identities; canonical replay/store schema; no claim that all game adapters are complete |
| 4.7.x | Playable two-board Guild-v-Guild Mega Board fixture | Eligible Guild teams, locked lineups, two independent normal games, results recorded once, scoring, reconnect, cancellation and tie policy |
| 4.8.x | Fully working Solo and Guild tournament brackets | Entrants, matchmaking, elimination plus losers-bracket rules, finals/reset policy, progression, spectators and recovery |
| 4.9.x | Tournament experience and production assurance | Tournament-only ratings, player and Guild leaderboards, results/reports, tournament Mega Board replay and export, responsive UX, safety, regression and production rehearsals |
| **5.0.0** | **Complete tournament, accepted by owner** | Register, play, score, advance and complete real Solo and Guild tournaments end-to-end, with verifiable outcomes, error/forfeit recovery, downloadable replay/report, all release gates and explicit owner sign-off |

The final milestone is **reserved**, not scheduled by a date and not completed by a code checklist or mock bracket UI. Formula One-inspired individual/team points and Smash-style double elimination need an approved, deterministic scoring policy before implementation is counted as accepted. Team members obey ordinary Mega Board economics, including mutual rent; Guild-v-Guild fixtures use two separate simultaneous boards. Beta practice remains non-scoring. Tournament-specific ratings are separate from normal Ranked. Universal replays for all HGR games remain a parallel and independently tracked platform programme; 5.0 requires working Mega Board tournament replay, not a false claim of every adapter.

## Source and publication rules

- The current public source and Master Book distinguish the live Oracle version from merged-but-unshipped changes.
- No chat/conversation labels in public GitHub issue, PR, branch, timeline or documentation identity.
- No replacement logo geometry; HGR launcher references remain canonical.
- Protect live rooms, user accounts, existing match records, SSH secrets and owner local development checkout.
- Development status in Control reads validated GitHub metadata for PRs and workflow runs; planned batches never get artificial percentages or running indicators.
- Separate final gates: PR checks, merged source, release packaging and **actual Oracle fingerprint/real-device acceptance**.
