# HGR Delivery Timeline and Tournament Roadmap

**Source snapshot:** 31 October 2026. This is a planned delivery order, not a running job queue. The Development screen inside owner Control shows these mini-batches, and reads GitHub PR status separately. A code merge is never proof of an Oracle production deployment. Labels and links use feature names, not conversation numbering.

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
