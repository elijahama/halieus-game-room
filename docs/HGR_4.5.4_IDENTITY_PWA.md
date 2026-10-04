# HGR 4.5.4 — Identity / PWA batches

## Batch 1 — Main HGR identity

This batch repairs the Halieus Game Room browser/install identity without redrawing the H.

- The website favicon continues to use the canonical launcher-family H web mark.
- Browser identity links are normalised to a new `install-h3` revision so stale Chrome/Brave favicon caches cannot keep the retired H visible.
- The PWA manifest now installs from the existing canonical generated `app-icon-192.png` and `app-icon-512.png` assets instead of the historical rendered `halieus-app-icon.png` thumbnail.
- Apple touch identity resolves to `app-icon-180.png`.
- The service worker refreshes identity assets network-first and moves the install shell to `install-h3`.
- Portrait mobile keeps the words `Halieus Game Room` beside the H instead of hiding the wordmark below 520 px.

The historical rendered `halieus-app-icon.png` remains compatibility/reference material only in this batch. Windows launcher artwork remains governed by the approved PNG references and is not changed.

## Batch 2 — HGR Control identity

Separate audited batch. It will bump the approved blue Control favicon/install references and their cache revisions. No Control artwork will be redrawn.

## Acceptance

CI/source checks do not prove Android has replaced an already-installed icon. Owner-device acceptance requires checking the real browser tab and installed PWA after the normal HGR update. Reinstalling should be used only if the browser/OS refuses to refresh its launcher icon after the new manifest revision is live.
