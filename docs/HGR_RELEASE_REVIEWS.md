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

### Wide-screen Mega Board spectator fullscreen geometry — scoped candidate
- Observed: Owner screenshot 16:9 fullscreen shows tiny square board in broad dark stage and stretched but shallow player strip below; only the narrow vertical spectator layout survives at desktop widths.
- Root cause in CSS: Desktop spectator reserves a bottom grid row of up to 230px height, taking height from the square board even when the desktop has room for a readable sidebar.
- Source correction: Wide landscape at least 1181px and 4:3 becomes square main board + right sidebar within the available viewport, scrollable live roster and footer, no new art. Mobile and portrait retain approved board-top/players-bottom; active-player game mode unchanged.
- Tests: Actual CSS loaded in a headless browser at 360/390/820/1280/1408/1536/1650 widths, board square, correct ordering, no outer overflow, roster/footer reachable, minimum enlarged fullscreen board. CI and real-device still required.
- Status: Development PR candidate only. Do not represent as live, merge as final, or restart a live room without separate release gates.
