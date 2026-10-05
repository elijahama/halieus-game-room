# HGR 4.5.5 release gate

Canonical VERSION remains 4.5.3. The 4.5.4.13–20 labels identify stabilisation batches, not shipped version changes. Do not mark device checks passed from CI alone.

## Source batches

- .13: canonical board labels — PR #70.
- .14: Control enabled/disabled states — PR #71.
- .15: truthful live progress — PR #72.
- .16: fullscreen navigation recovery — PR #73; asynchronous browser-test correction #75.
- .17: canonical account photos — PR #74.
- .18: portrait return and containment — PR #76.
- .19: scoped Cloud Control installation/offline identity — PR #77.
- .20: in-flow admin utility placement — current batch.

Each implementation batch requires typecheck, full regression chain, release integrity and production build before merge. Control browser coverage checks desktop 1440×900, short desktop 1280×600, tablet 820×1180 and phone 390×844. Browser simulations verify behavior, not OS-installed icon acceptance.

## Required owner-device evidence — pending

Record device/browser, exact deployed fingerprint, date, observed result and any failure details for each check:

- Fresh Mega Board creation enters lobby. Lost/slow acknowledgement retry does not duplicate the host. Cross-connection recovery still requires saved credentials.
- iPad Safari fresh load leaves boot curtain; background/resume, BFCache/history and network return recover. Repeat in installed HGR where available.
- Main HGR favicon and installed phone identity use the canonical H.
- Cloud/private Control favicon and installed phone icon show approved blue H/cog artwork.
- One fresh phone → cloud → owner-PC update reaches explicit terminal 100% / Update complete; failure details remain usable if it fails; Control returns online after restart.
- Fullscreen HGR → Control → Game Room offers explicit resume on supported browsers; Apple touch safety restriction remains. Check applicable installed-app paths separately.
- Uploaded profile picture renders in Control header/player list.
- Portrait Game Room return works and utility access does not obstruct page content.

Tailscale remains the fallback. No owner-phone/iPad or fresh production update acceptance has been established by this source batch.

## Release only after that gate passes

Change only canonical VERSION to 4.5.5 and run canonical preparation. Re-run typecheck, full regressions (including Mega Board, Cloud Control and iPad recovery), high/critical security gate, production client/server build, integrity verification and browser identity/PWA checks. Record final fingerprint and release notes, deploy to Oracle, then perform final owner-device acceptance. Do not edit generated version consumers manually.

## Deferred to 4.5.5.x

Cloud Start/Restart/Close (fixed allow-listed actions and appropriate confirmation); owner-PC telemetry; advanced heartbeat/stall/retry/cancellation recovery; expanded player administration; broader Control visual unification; measured bundle/code-splitting work; Tailscale retirement only after proven cloud parity/reliability. Do not suppress chunk-size warnings merely by raising their threshold.
