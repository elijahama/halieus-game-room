# HGR version roadmap — 4.6.x to fully actualized 5.0.0

**Approved owner direction, 26 October 2026. This file is the release-number planning authority for the current development cycle.**

## Release numbering rule

- `MAJOR.MINOR.PATCH` tracks actual product maturity. Never label a pre-5.0 tournament foundation as fully implemented Tournament Mode.
- `4.6.x` is the active development line. Work advances through **4.7.x**, **4.8.x**, and **4.9.x** when an independently verified, meaningful package of functionality is ready; do not inflate version simply because time passes or a PR merges.
- A **PATCH** release contains a small audited, validated mini-batch within the current minor milestone: fixes, adapters, small UI wiring and compatibility changes. A **MINOR** release requires a coherent working milestone that users or maintainers can exercise end to end. The next MINOR version is not automatically allowed by a checklist of code files alone.
- `5.0.0` is **reserved for fully actualized Mega Board Tournament Mode**, including complete working competitive flows and owner acceptance. There must be no placeholder tournaments or mock-only bracket screens at 5.0.0.
- Every deployable release must update the single authoritative `VERSION`, generated versions, service-worker cache, release integrity manifest, Windows/Linux CI checks, documented test evidence and the **actual public fingerprint**. Passing source tests is not proof of Oracle deployment. Do not deploy over active games.
- Document the release scope and acceptance explicitly in the Masterbook; no invisible or incompatible release-identity changes. Preserve owner device checkout, canonical H family, artwork references, non-tournament ranked continuity and cloud data.

## Version milestone acceptance map

| Family | Milestone identity | Minimum acceptance to advance |
| --- | --- | --- |
| **4.6.x** | **Foundation & isolated records** | Production-safe independent tournament rating ledger based on existing individual Ranked maths, account-ID keys, duplicate-result protection; server-owned fixture/board identities; HGR-wide canonical replay schema for all 14 current games, privacy rules, tests and safe permanent archive storage primitives. No claim of live tournament entry or universal playback. |
| **4.7.x** | **Playable Mega Board Guild fixture** | Create/authenticate an actual Guild-v-Guild fixture, lock eligible lineups, schedule/launch two normal independent boards, preserve teammate rent/auctions/property/independent cash, record verified results once, aggregate an owner-approved team outcome, handle ties, cancellation and reconnect. Publish fixture/status views and usable test fixtures. |
| **4.8.x** | **Tournament formats and progress** | Solo Mega Board entrants and Guild entries; functional single/double elimination where appropriate, winners/losers brackets, advancement, finals/bracket reset policy, participant management, matchmaking/room joining and spectator links. No cross-game Grand Prix; that concept remains parked. |
| **4.9.x** | **Competitive experience & launch readiness** | Tournament-specific profiles, personal ratings and stats, separate Guild standings, seasons/league formats if approved, result/report history, working tournament replay/archive/download entry points, mobile/tablet UX, accessibility, permissions and anti-abuse, deterministic recovery and cross-platform release/production rehearsals. Universal replay export/player experience across all HGR games progresses in independent game-specific adapters, without pretending one Mega Board adapter completes all. |
| **5.0.0** | **Complete Tournament Mode release** | Owner can run a full Guild and Solo Mega Board tournament end-to-end on production: registration/lineups, rooms, normal game rules, server-authoritative scoring, standings, advancement, bracket finals, error/forfeit/reconnect recovery, tournament-only continuity, reports and usable downloadable/step-through replays for tournament Mega Board matches. All planned launch acceptance, game regressions, privacy/security, cross-platform CI, release identity and public health checks pass; owner accepts results. |

## Patch-level rollout examples (not unconditionally reserved or promised)

- **4.6.0 candidate — Tournament/replay foundation:** The tested backend tournament ratings ledger and shared HGR replay/archive format and store. Tests, Masterbook and identity only. Not yet a playable tournament or downloadable in-app game history.
- **4.6.1+ candidates:** Attach server-authoritative identity/authentication, durable completion ingestion, proper archive retention, game-specific replay adapters and safe read APIs in audited mini-batches. Exact patch number assigned only when scope and gates are verified.
- **4.7.x+ patches:** One testable slice at a time (fixture creator, lineup, board linkage, score confirmation, spectator/history UI). Nothing silently changes normal Ranked or grants extra teammate economic rights.
- **4.8.x/4.9.x patches:** One bracket/replay/UX/recovery module per audited mini-batch, with feature flags and rollback until acceptance.

## Special scope: HGR-wide replays

**Every HGR game** ultimately gets Chess.com-inspired **finished-match history, step-by-step review, downloads and share controls**, but adapted to its rules and information disclosure. This is a **separate platform-wide capability** crossing all the 4.x milestones. The generic schema alone is not finished feature support. Complete end-to-end integration must use authenticated, privacy-whitelisted server adapters; a game with secret hands/roles must not reveal hidden states by default. The existing Mega Board viewer currently retains only 240 recent presentation checkpoints; a long match may need complete durable event capture before promising full visual replay. HGR game replays remain independent of tournament classification; tournaments merely attach fixture references to an existing game archive.

## 5.0.0 release gate

Before changing `VERSION` to `5.0.0`, require a dedicated **HGR 5.0 Tournament Acceptance** record in the Masterbook (or linked sign-off document) with test evidence for all the 5.0 milestone capabilities above and explicit owner approval. Both the release-identity regression and built-browser identity guard intentionally allow only the **4.6–4.9** pre-5.0 development lines in this cycle; changes to permit 5.0 must be deliberate, documented and reviewed, never automatically generated by the VERSION update alone.

## Current status

### Next candidate: 4.6.5 active-game return

Separate from 4.6.4/PR159, Mega Board authenticated foreground notice and token-backed same-device return form the **4.6.5 review candidate**. [Exact scope and validation](HGR_ACTIVE_GAME_RETURN.md): typecheck passed; parent standard account/HTTP/socket tests and 390/820px component tests passed outside the sandbox, corroborated by inspected logs. Observational receipt `rcpt_bf69d18797384553936bc243a4c631dd` is not independent attestation. Tests and a source-only App wiring guard are wired into package scripts and Windows/Ubuntu PR CI; 4.6.5 identity is prepared with established tooling. Parent full regression/build/final browser checks, full-App and physical-PWA acceptance remain outstanding. No universal adapter, account-only cross-device reclaim, background decision push, merge or deployment claim. This does not advance tournament milestones.

Last verified GitHub `main` at the start of the tournament/replay foundation was the **4.5.12 source line**. Owner designates **4.6.x** as active development. The isolated foundation branch proposes **4.6.0**; until PR review, CI and separately evidenced deployment, do not describe 4.6.0 as publicly released. The earlier documentation-only PR #157 is incorporated in this branch; its isolated design decision remains authoritative, without changing the live game.

### 4.6.1 — Game-history integration

Mega Board completion → independent replay archive → authenticated personal history/viewer/downloads is implemented in the review branch. Paste/upload TXT report review is read-only and unverified. This patch stays in 4.6.x; it does not activate tournament fixtures, brackets, sharing or other game adapters. Candidate validation and known storage/coverage limits are documented in the Masterbook. No public-release claim. Next separately audited work: unanswered-feedback admin notification; durable full recording and audited universal adapters; then approved 4.7.x Guild fixtures.

### 4.6.2 — Admin feedback notifications

Separate small patch for owner/admin unanswered-feedback notifications in the HGR hub, actionable inbox focus and response-driven count refresh. This does not change the tournament roadmap or activate additional replay adapters. 4.6.1 remains the independently validated replay/history batch beneath it.

### 4.6.3 portrait hotfix
Single-row, horizontally scrollable discovery filters on portrait phones/tablets. No change to tournament milestones or replay coverage.

### 4.6.4 compact mobile layout candidate

Scoped Mega Board patch: shared two-column phone rosters with long-name/property wrapping; board-first participant portrait tablets; intrinsic auction sheet height, spectator/withdrawn footer distinction, short-landscape scrolling and fullscreen portal tracking; text-sized routine notices. New real-component geometry coverage joins review/release browser CI. Local typechecks, focused browser/gameplay and alternative Vite runner production builds passed, with explicit sandbox harness qualifications in the Masterbook. The original sandbox failures were subsequently resolved by standard parent-run typecheck, full regression, all 52 compact browser cases, default production build, release integrity and built-browser identity checks (reported exit 0), with bounded log tails corroborated in this documentation follow-up. These commands ran through Desktop Commander outside native capture. CI and physical-device acceptance remain distinct requirements. Parent will rebuild the final identity generated after these documentation edits. No deployment or milestone advancement is implied.

Active-match notifications and reconnect reconciliation are a **separate already owner-authorized batch, not implemented in 4.6.4**; the subsequent [4.6.5 candidate](HGR_ACTIVE_GAME_RETURN.md) has parent runtime/component verification with full-App/physical-PWA gates still outstanding. Native receipt `rcpt_fc27b6506bfc45d3826cdbaa860b5d4a` records observational Codex capture of the 4.6.4 work, not independent test attestation; Git setup and standard parent verification occurred outside that capture. See the 4.6.4 Masterbook entry for exact dimensions, evidence and limitations.

### 29 October 2026 — Multiplayer Beta tournament practice

Source-only 4.7 development adds an explicitly server-authorised
non-scoring Mega Board Beta room. Owner/admin testers can invite ordinary
player accounts or AI into test games. Joining does not grant admin rights,
and practice match completion must not change permanent game history, Gamer
Score, normal or tournament ratings, statistics, Guild results or rewards.
This mode is separate from official Guild fixtures (which require eligible
Guild-only human rosters); it is not an implemented test bracket or 5.0.0
tournament. The version stays **4.6.10** while the playable 4.7 milestone
and owner-device acceptance remain incomplete. See
[Beta Tournament Practice](HGR_BETA_TOURNAMENT_PRACTICE.md).

### 29 October 2026 — 4.7.0 two-board real results added

The development branch now records verifiable, once-only finished-game
receipts for both independent Mega Board boards and derives the number
of board wins for each Guild. A 1–1 split remains unresolved; no unsupported
F1 points, tie-break ranking or tournament rating is invented. This
milestone is still unmerged, un-deployed and not yet fully owner-playable
because Guild-facing fixture controls, mobile tests and release acceptance
remain. 4.6.11 Control fixes are isolated in draft PR #170 and must be
integrated safely before any unified later-version release.

### 29 October 2026 — 4.7.0 real-match fixture linking candidate

The staged source candidate now links manager-approved Guild lineups
to two existing **real Mega Board** unstarted lobbies by authenticated
account roster and distinct board identity. The ordinary Mega Board start
handlers can run both games, while post-binding join/AI changes are
rejected. This is more than a design-only foundation, but it is not
complete 4.7.0 until result settlement, team scoring, UI, reconnect
and owner end-to-end acceptance are complete. No Oracle deployment
is implied; VERSION remains 4.6.10.

### 28 October 2026 — 4.6.10 merged; 4.7.0 Guild fixture candidate opened

The source mainline has now merged 4.6.7 Control/unlock refresh, 4.6.8
test-device push, 4.6.9 verified in-app social presence, and 4.6.10
owner-confirmed public maintenance. This is **source integration**, not
proof of corresponding public Oracle deployment. Both CI operating
systems passed PR #168. Begin 4.7.0 implementation in a separate,
clean feature worktree based on merged main.

The first staged Guild fixture slice records authenticated two-board
proposals, opposing-manager approval and locked eligible player rosters.
There is **no real room launch or team result yet**, so VERSION remains
4.6.10 until the complete playable 4.7.0 acceptance criteria above pass.
See [implementation and next gates](HGR_GUILD_FIXTURES_4_7.md).
### 29 October 2026 — Independent 4.6.11 Control hotfix candidate

While 4.7.0 Guild fixtures remain a separate draft, a focused Control
regression repair targets two owner-observed issues: portrait Full Screen
action visibility, and optional server-sent background Update stage/final
notifications on Android/PWA when the owner switches apps. The 4.6.11 candidate VERSION is staged in its isolated branch; 4.6.10
remains the merged public-source baseline until checks and owner acceptance.
This candidate must not merge or deploy merely because its number is newer.
See [Control Update notification acceptance](HGR_CONTROL_BACKGROUND_UPDATES.md).

### 29 October 2026 — 4.7.0 candidate with the Control hotfix included

The complete 4.6.11 Control source is now merged (PR #170, 453c4fe).
A unified 4.7.0 candidate advances beyond backend-only fixture foundations:
real Guild-v-Guild two-board challenges, opposing-manager approvals, lobby
binding, full real game starts, immutable game-derived outcomes, and a
Tournaments tab on the Guild screen. Beta practice remains invitation-only
and non-scoring for ordinary accounts and AI. First-release Guild UI supports
one member from each Guild per board; larger team boards and F1 ranking,
brackets and tiebreakers are reserved for subsequent audited milestones.
No Oracle deployment or on-device acceptance is implied by a version bump.