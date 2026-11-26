# Control: visible update-available notice

## 26 November 2026 — next release requirement (4.8.6)

Owner requests real system-level PWA push immediately upon verified release availability, including when Control is closed or backgrounded, and an actual task-based update progress bar comparable to GitHub Actions individual timed checks. Issue #279 tracks event-triggered verification, fallback polling, per-device deduplication, scoped delivery, measured task weights, completed/total subtask telemetry, elapsed time, honest indeterminate states and physical-device acceptance. Preserve the existing Control notification route, approved artwork and release safety gates. This supersedes the polling-only timing requirement for the next release; 4.8.5 remains unchanged. No implementation or production acceptance is claimed here.

## 25 November 2026 — background release notification correction

Previously the verified availability notice polled only while Control was open; the existing operations push transport was not connected to release discovery. Public HGR server now starts a five-minute worker after account and push stores load, sharing the verified canonical release check. Only existing opted-in owner/admin operations subscriptions receive a verified newer release alert; persistent per-device fingerprint receipt prevents repeat sends across polls/restarts, expired subscriptions are removed, transient failures retried. Gateway acceptance is not device receipt. Existing approved Control notification badge and click path retained. No automatic updater action. Physical PWA delivery and deployed release identity remain independent acceptance gates.

## 24 November 2026 follow-up — greenlight drop-down candidate

Owner requests automatic in-app top drop-down with established Control artwork, green verified readiness, review and dismissal. The new candidate additionally verifies pinned main release and successful exact-source packaging before returning available; the historical specification below describes the prior persistent banner, not the new acceptance contract. Acknowledgement is per fingerprint per page session; Update tab stays marked. No automatic execution, background push or deployment. Validate on 320/390/820/1440px, auth, current/unverified/failed packaging, repeat polling, new fingerprint, review, dismissal and active receipt suppression.

**Source candidate only, 3 November 2026.** Does not alter the current public HGR 4.7.13 release, current updater, owner-PC agent or any canonical HGR/Control icon artwork.

## Contract

- Control has a persistent, accessible in-app **Update available** notice beneath the page header on both desktop and portrait phone. It is not a transient toast, a mock percentage, an Android push, or a disguised progress state.
- At administrator sign-in and every five minutes while Control remains visible, Control obtains the actual running release from the server compiled VERSION / RELEASE_FINGERPRINT and compares it with the **merged main-branch RELEASE.json** from the fixed public GitHub repository.
- Only a **strictly newer** semantic release version with internally consistent product, SHA-256 source hash, release fingerprint and source-file count causes the notice to appear. An unmerged PR, a source checkout, a same-version different fingerprint, an older main branch or an unavailable GitHub connection does **not** establish an update.
- The notice identifies **current public version** and **newer merged release version**. It deliberately does not claim that the laptop has downloaded, installed or deployed anything.
- **Review update** opens established Control **Operations -> Update**. It never invokes or approves an update. Existing owner permissions, game-drain checks, operations, progress bars and audit history remain authoritative. The notice disappears when a later refresh verifies that the installed website version is current.
- An owner/admin-only, read-only GET at /control/release-availability has no-store responses. Server-side GitHub fetch is a hardcoded public URL with timeout and five-minute shared cache; no GitHub token, owner-PC secret, dynamic URL or HTML is accepted.
- The notice uses current Control body typography and neutral/blue panel styling. The original Control H/cog tile, service worker, manifest, favicon, approved mobile bottom navigation and owner update logic are unchanged.

## Tests and acceptance

- New runtime test tests/runtime-control-release-availability.mjs: semantic versions including 4.8.5/5.0.0, current/older/unverified cases, forged manifest, same-version fingerprint conflict, hardcoded merged-main source, upstream cache and admin-only route.
- New Playwright test tests/browser-control-release-available.mjs: silent until confirmed admin, current/unknown/unavailable hide the notice, newer release shows correct versions, Update tab marked, Review update opens existing tab without executing anything, and the panel fits 390px and 1440px.
- Both tests are wired to npm run test:control:release-notice and the standard full regression suite. Client/server TypeScript, production build, release-integrity, Windows/Ubuntu CI and owner installed Brave/Android PWA acceptance remain independent gates.
- No automatic deployment or update from a visible banner. Current users remain on 4.7.13 until a separately accepted versioned release is approved and deployed.

A later improvement may show release notes or a downloaded-to-owner-PC state, but those require distinct verified agent receipts. GitHub main is not evidence of a laptop download.
