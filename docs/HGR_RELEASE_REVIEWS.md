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
