# HGR 4.5.4 — Identity / PWA Batch 1 implementation report

Scope: main Halieus Game Room identity only. HGR Control identity remains Batch 2.

Implemented:

- PWA manifest install authority moved from the historical rendered `halieus-app-icon.png` to the canonical generated `app-icon-192.png` and `app-icon-512.png` assets.
- Browser favicon, Apple-touch icon and manifest links are normalised at runtime to identity revision `install-h3` so the old H cannot keep winning through stale link/cache state.
- Service worker treats identity assets as network-refresh resources and advances its shell identity references to `install-h3`.
- Portrait mobile header keeps `Halieus Game Room` visible beside the H at widths below 520 px.
- Added regression coverage for install sources, identity revision/cache handling and portrait wordmark visibility.

Not in this batch:

- HGR Control favicon/install revision (Batch 2).
- Cloud Control relay, telemetry or remote actions.
- Control layout/profile/statistics work.
- Any launcher artwork redesign.

Acceptance remains split between source validation and real-device browser/PWA confirmation.
