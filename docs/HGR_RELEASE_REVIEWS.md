# HGR Release Review ? owner validation guide

## Operating rule (effective 4.7.8 onward)
Every pushed source version and every **actually deployed** Oracle release receives a concise owner-facing review covering: source/production version and immutable fingerprint; changed features and where to find them; what correct behaviour looks like; what to troubleshoot; game/account safety tests; known limitations; rollback/issue link; and separate *source merged*, *production verified*, and *owner-device accepted* statuses. Never describe a GitHub merge alone as a website deploy.

### 4.7.8 ? In-app Control update notification
- **Source:** PR #194 merged after Windows + Ubuntu CI; live status remains separately verified.
- **Where:** HGR Control, trigger an approved Update only in a safe maintenance opportunity. Use existing operation receipt history for failure auditing.
- **Expect:** 12px genuine progress bar in floating notification; 9px in minimised notification, percentage exactly from server; old failed attempts remain truthful; Start/Restart/Close show no Update bar.
- **Troubleshoot:** stale Control JS/CSS cache, mobile minimisation visibility, stuck percent vs actual operation receipt, accidental fake 100%, font/overflow, mislabeled lifecycle action. Capture screen + exact release fingerprint and operation receipt (no secrets).
- **Limits:** Android native OS push does not permit arbitrary HTML progress bars.

### 4.7.9 ? Android notification source icons (candidate, not yet live)
- **Where:** Android status bar next to the clock, and the expanded push notification, on Android Chrome/Brave and an installed HGR/Control PWA.
- **Expect:** general HGR notices use canonical H status silhouette; Control update uses approved H/cog; Mega Board invite uses approved M; other games' expanded notification uses approved game art with H fallback badge. No newly created logo.
- **Troubleshoot:** solid-colour opaque status square, wrong badge after switching app, cache/service-worker scope mis-match, missing game ID, launcher accidentally changed, notification tap failing to return to the correct area, multiple popups/repeated invites, OS permission denied, PWA vs browser differences.
- **Security:** never interpolate arbitrary image URL/game ID supplied by push; preserve Control-only scope and private link restrictions.
- **Acceptance:** CI verifies code and PNG transparency, **not** actual Android presentation. Test with opt-in sample push and real invitation after safe Oracle release and capture phone screenshots.

Both versions require independently checked /health fingerprint and zero-active-room protection before deployment; a phone acceptance cannot be asserted from source tests. Owner-reported issues should link to the version/fingerprint and exact UI location rather than a generic bug description.

### 4.7.10 ? Precise scheduled maintenance and public countdown (source candidate)

- **Owner report:** A previously chosen maintenance start/end did not execute as expected; the owner manually reopened the public site from the backend. The incident's exact persisted window, room count and service timeline have not yet been recovered, so **do not assert a proven root cause**.
- **Source repair:** Preserve exact start/end IANA zone conversion, persisted UTC deadline and zero-live-room protection. Add a periodic server watchdog alongside the existing exact timer; additionally reconcile overdue gates on owner status and public HTML reads. No extra duration preset, forced game eviction or scheduled software deploy.
- **Where to test:** Control > Operations > Maintenance. Schedule a safe short future window while all games are empty. Confirm the owner schedule state, endpoint time zones, automatic HTTP 503 at start, the public countdown, return to HTTP 200 at the exact end, and no manual reopening required. Check that Control stays available throughout.
- **What to troubleshoot:** Incorrect IANA zone or DST interpretation; active or residual rooms causing Waiting for rooms; missing persisted schedule; scheduler not ready or persistence failure; old PWA cache; proxy serving HTTP 200 instead of server 503; client clock skew; timer reaching 00:00 without an uncached public-status API confirmation; manual closure without an end. Capture the chosen start/end zones, Control schedule status, room count, server release fingerprint and screenshots without exposing credentials.
- **Important:** An explicit manual close without an end time cannot truthfully show a reopening countdown. The visitor page must say no automatic end is set. For scheduled closures the countdown uses server time and verifies a successful public response before redirecting.
- **Acceptance gates:** Real-timer/watchdog test, server restart recovery, 320px/390px/820px closed-page browser tests, full regression, build, Windows/Ubuntu CI, owner-controlled safe deployment and final public fingerprint. A source PR alone does **not** prove the failed production schedule has been repaired.

### Mega Board trade response feedback and alignment — focused source candidate
- **Bug:** Accepted trade gets a visible notice, while recipient rejection, reject-all and proposer cancellation only update lastTradeResult/activity. Participants with their Trade panel closed may see nothing. The trade-result banner lacked centre-alignment styling.
- **Correction:** Add distinct 3.3–3.5-second declined/cancelled notifications through the existing game-state queue (no new socket protocol, no gameplay impact). Retain real status in the Trade panel; centre banner heading/detail and single-line notice text on mobile, tablet and desktop.
- **Acceptance:** 2-player and 3/4-way reject, manual cancel and reject-all with authoritative ledger unchanged. Test actor/proposer/spectator visibility and avoid duplicate delayed announcements. Confirm 320/390/820px text centre without overflow.
- **Stage:** Source candidate only, not yet production or actual-device verified. Keep tournament PR #198 isolated.

### Trade editor design coherence — source candidate

- **Owner request:** Old deal editor is visually inferior to the redesigned Player Options; the rejected-deal feedback and attached uncentred text should be corrected in the same audited UI batch.
- **Expected structure:** Player Details-inspired header, clear selection count, player identity tokens and checked cards, compact grouped offer editors, accessible asset transfer selects, status strip, fixed-clear primary Send button. 320/390px one-column, 820px two-column player choices, no clipping/extra scrollbars.
- **Behaviours to verify:** Recipient selection, cash and destination mapping, 2–4 participant cards, pending approval, Decline/Cancel/Reject all, no inadvertent trade completion, room state stays server-owned. Declined result appears in-game, centred and readable.
- **Gate:** Branch/CI and live phone acceptance distinct. Game and tournament changes are out of scope.


### Counter-offer negotiation — staged on PR #206 trade-redesign branch

- Owner requested a Counter offer action when receiving a deal. The editable draft is copied from the pending two-, three-, or four-person offer, with the rejected recipient taking proposer authority without needing to own the active turn. Back restores original unmodified offer.
- Server `game:trade-counter` accepts only an exact current pending ID and original human invited participants, rejects duplicate/stale/cross-room/wrong-role/invalid cash or assets, and replaces old offer atomically with a new pending offer and reset accepted-player set. Reuse multi-leg validation and expiry/turn protection. No transfers until every invited participant accepts.
- New response status in server game history and visible counter-offer notice; no new manual outcome or trust in browser-provided account privilege. AI auto-negotiation intentionally out of scope.
- Dedicated counter lifecycle tests and client controls gate required; source CI, merge, zero-room-safe Oracle deployment and actual on-phone multiplayer acceptance are separate statuses.

### 4.7.11 — Trade negotiation release (candidate, not yet live)

- **Scope:** Integrate the separately reviewed 4.7.10 follow-ups for Mega Board Trade interface based on Player Details, centred rejected/cancelled/auto-declined notices, editable 2–4-player Counter offers, and visible live deal intent as soon as a valid recipient is selected.
- **Visible text:** “[Player] wants to make a deal with [recipient(s)]” when only preparing, and “[Player] has proposed a deal to [recipient(s)]” after actual submission. The minimised status remains readable. Only a real submitted offer enters the approval queue; a draft never moves money/assets or becomes match history.
- **Acceptance gate:** Windows/Ubuntu CI, typecheck/build, 2/3/4-player live preview & counter-offer runtime tests; real multiplayer/mobile receive/reject/counter/accept/cancel and spectator/fullscreen review; real room continuity and PWA refresh. Confirm the fully generated release manifest and same version/fingerprint on browser, server, Control and /health.
- **Safety:** Keep the exact canonical HGR artwork and approved fonts. Do not interrupt active rooms. 4.7.11 source-merging, GitHub release-identity bot success, Oracle deployment and owner-device confirmation are distinct statuses. If a gate fails, do not call it deployed; use existing 4.7.10 production as rollback reference.


### 4.7.12 — Adaptive Mega Board asset portfolio (release candidate)

- Scope: Mega Board player cards dynamically apportion available desktop rail space by owned asset count. Owned spaces display in fixed canonical colour-group order (brown, light blue, pink, orange, red, yellow, green, dark blue), then stations and utilities; full sets collapse into accessible Full set disclosures and strict majorities into Majority set. Opening a disclosure shows every underlying owned space, mortgage, development and depot. No property, game rule, rent, score or turn model has been altered.
- Source: independently validated draft PR #217. Reconciled 4.7.11 source identity from PR #220 matches live /health fingerprint hgr-4.7.11-d4d73fde73ab4539. This 4.7.12 release requires its own exact manifest, Windows/Ubuntu CI, regression, build, Oracle package preflight and zero-active-room gate.
- Owner visual review: In a Mega Board practice room, give one player one property and another multiple. Verify appropriate shared space, grouping, majority/full disclosure expansion, the spectator roster, portrait Players drawer, no clipping and original privacy.
- Exclusions: separate spectator fullscreen PR #207; game theme geometry issue #218; Gamer Score #201 and #203; per-game notification badges #219; Noughts and Crosses multiplayer and tournament bracket work are separate incomplete batches. Preserve canonical artwork.
- Rollback: do not deploy with active rooms or unverifiable occupancy. Preserve live 4.7.11 as rollback. Any failed build, health mismatch or game-safe gate aborts activation or reverts; source merged, production and physical owner acceptance are separate statuses.

### 4.7.13 — canonical public address repair (release candidate, not deployed)

- Owner confirmed only https://halieus.remotewire.net exists as the HGR public URL. The earlier health API's play.halieus.net value came from a stale configured PUBLIC_APP_URL, not a second website. 4.7.13 adapts the effective public origin and CORS values away from the retired host, fixes Windows/server production defaults, removes the unused obsolete Nginx sample while preserving the existing canonical Oracle Nginx and TLS/Certbot setup, and keeps valid localhost dev origins.
- Source fix PR #222, locally validated via TypeScript, release identity, full regression and production build. This release increments VERSION and all generated consumers as one auditable unit. It does not include unrelated spectator PR #223, Gamer Score PR #224, or unfinished 4.8 Guild knockout draft PR #225.
- Gate: exact Windows/Ubuntu CI for this release, complete verified Oracle packaging, zero-active-room pre-activation, post-activation live /health version/fingerprint and publicAppUrl=https://halieus.remotewire.net. If the persisted private Oracle /etc/halieus-game-room/halieus.env still references the former host, an authorized owner maintenance action must correct PUBLIC_APP_URL and CLIENT_ORIGINS without exposing or replacing secrets. No production claim until public /health is verified. Previous 4.7.12 fingerprint hgr-4.7.12-2aed8094bbb4159b remains rollback baseline.

### 4.7.14 — Visible available-release notice within Control (release candidate)

- **Owner request:** Before clicking Update, Control must visibly announce when a newer HGR software release is available. This is separate from the existing update-progress toast and Android push notifications.
- **Source:** The isolated Control-notice candidate PR #234, with a verified read-only server release check and a persistent accessible banner below the Control header. A newer merged GitHub main RELEASE.json is compared with actual running APP_VERSION and RELEASE_FINGERPRINT. An unmerged tournament PR, mismatched same-version fingerprint, unavailable GitHub or an older branch never counts as a release.
- **Visible result:** The banner shows current public website version and verified newer release, and Review update takes the owner to Operations > Update. No automatic download, restart, installation, server closure or implied 100% completion. The existing updater and its zero-room/owner authorization gate remain unchanged.
- **Current baseline:** Oracle /health was independently verified on 4.7.13 with fingerprint hgr-4.7.13-22ede3abb5021b36 and canonical URL https://halieus.remotewire.net. Until 4.7.14 is actually deployed, this is not a live feature. When installed and main is the same version, no new-update notice should appear.
- **Tests:** Unit/HTTP-contract version classification, admin-only access, stale/unverified states, caching, Playwright 390px/1440px and target navigation, TypeScript, Control overview asset versioning, full standard regression, release manifest/hash, production build/Oracle ZIP, and both GitHub CI operating systems. Source tests are separate from phone/Brave PWA acceptance.
- **Exclusions:** 4.8 Solo/Guild tournament drafts, broader notifications, controls, game scoring, original launcher-family H, and any change to milestone 4.8/4.85/4.9/4.95/5.0/5.05 goals. Preserve the previous 4.7.13 source/archive as rollback; never deploy over active games.
