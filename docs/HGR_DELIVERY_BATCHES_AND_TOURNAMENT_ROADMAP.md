# HGR Delivery Timeline and Tournament Roadmap

**Source snapshot:** 31 October 2026. This is a planned delivery order, not a running job queue. The Development screen inside owner Control shows these mini-batches, and reads GitHub PR status separately. A code merge is never proof of an Oracle production deployment. Labels and links use feature names, not conversation numbering.

## Versioned delivery allocation — 24 November 2026

The owner requested that delivery batches be allocated specific patch versions. These are planned targets, not deployed releases or acceptance claims. At the 24 November snapshot, live HTTPS /health verified 4.8.1 with exact fingerprint hgr-4.8.1-60905c43b1dbbde4. Main VERSION is 4.8.2; its PR passed and merged, but packaging run 45457879718 remains a separate gate. Owner requires incremental deployments first; 4.9 work is paused. Functional milestone contracts and release gates in the Version Roadmap remain authoritative.

| Target | Batch | Source / acceptance gate |
| --- | --- | --- |
| 4.8.2 | Control updater reliability | Merged #250, packaging pending at snapshot; dirty live data preserved, exact-fingerprint no-op, existing CI, room and rollback gates |
| 4.8.3 | Mega Board geometry and property readability | PR #253, Guild archive-teardown correction awaiting retest; centre board; compact grouped property presentation without redundant banners or wasted space; retain all gameplay and spectator fixes; responsive regression |
| 4.8.4 | Intro viewport/glow and independent Tournament destination | Combined #248 (passed independent CI), #249 review record; integrate after 4.8.3; canonical H, desktop/tablet fit, Solo/Guild access and mobile navigation |
| **4.8.5** | Tournament hardening checkpoint | PR #254 partial recovery candidate; real authenticated Solo/Guild flows, tie/forfeit/reconnect/restart recovery, mobile/PWA acceptance and restorable protected checkpoint |
| 4.8.6 | Spar (Cha-Cha) Casual Beta | Draft #251; rules, privacy, multiplayer, AI and responsive acceptance; separate from tournament milestone |
| 4.8.7 | Spar beta follow-up | Conditional on actual balancing or regression findings |
| 4.8.8–4.8.9 | Unallocated contingency | Only if meaningful corrections are needed |
| **4.9.0** | Tournament experience milestone | PR #255 rating-integrity slice only; paused. Distinct ratings, leaderboards, Guild standings, reports, working Mega Board tournament replay/download/viewer, profiles, permissions and responsive presentation. Individually audited implementation slices precede the milestone; do not defer required functionality to later patches. |
| 4.9.1 | Competitive profile/statistics refinement | Preserve correct independent standings and scoring |
| 4.9.2 | Replay/report refinement | Viewer navigation, export and report usability; preserve complete and privacy-safe records |
| 4.9.3 | Tournament interface refinement | Desktop/tablet/phone geometry and accessibility |
| 4.9.4 | Security and recovery hardening | Permissions, abuse prevention, reconnect and failure recovery |
| **4.9.5** | Production-readiness checkpoint | Integrated end-to-end regression, cross-device UX, deployment/rollback rehearsal and restorable protected checkpoint |
| 4.9.6–4.9.9 | Unallocated contingency | Genuine launch-blocking corrections only |
| **5.0.0** | Fully realised Tournament Mode | All existing milestone contracts, real production Solo/Guild acceptance and explicit owner approval |
| 5.0.1 | Conditional gameplay fixes | Real production findings |
| 5.0.2 | Conditional scoring/integrity fixes | Real production findings |
| 5.0.3 | Conditional performance/interface fixes | Real production findings |
| 5.0.4 | Conditional remaining launch fixes | Real production findings |
| **5.0.5** | Accepted post-launch stability | Preserve 5.0.0 baseline and independently restorable accepted checkpoint |

The above allocation supersedes the old delivery ordering only where a batch is explicitly covered; earlier notification, security, scheduled-release and universal replay requirements remain tracked, not silently completed or dropped. New findings can change patch allocation before release; do not manufacture patches or skip an unmet milestone. No production deployment or version bump is implied. The companion Control/public roadmap changes are reviewed separately from the in-flight 4.8.2 packaging. Owner requires verified incremental releases, genuine Control progress and explicit Owner Action Required prompts where useful.

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
