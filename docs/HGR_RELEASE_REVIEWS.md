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

### 4.7.12 — Season championship and historical honours (review candidate)

- **Locate:** Mega Board > Leaderboard > Season championship / Lifetime Ranked / Pre-season honours; live spectate > Follow player bar.
- **Correct:** Lifetime ratings and verified awards untouched; new achievements credited once from completed session archives, only with sufficient evidence. The original pre-season top three are bound once to current unique active account names (owner confirmed names unchanged) and thereafter use stable account IDs for 100/60/40-point Founding Podium awards; ambiguities fail closed. Season uses latest twelve newly eligible Ranked results, not all-time rating; old tournament and regular Ranked ledgers remain independent.
- **Validate:** historical rank backup, immutable first-season boundary, no Beta/Casual spectator farming, no duplicate replay points, score changes only after verified ranked finishes, real 320/390/820px spectator follow and no obstructed board, 0 active rooms on deployment, release identity CI and exact live /health version/fingerprint before marking production accepted.
- **Known limitation:** older archived matches lacking complete stats or authenticated account IDs cannot be backfilled. Ranked identity remains name-keyed until a dedicated authorised migration; do not infer ownership from names or silently retro-credit an historical global champion bonus. Seasonal score parameters require owner acceptance after live review.
