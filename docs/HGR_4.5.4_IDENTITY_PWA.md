# HGR 4.5.4 — Website & Control identity/PWA batch

## Owner decision

The main Halieus website favicon and phone-installed HGR app must use the same current launcher-family H visible in the live website. The retired rendered `HGR Main.png` treatment is no longer the website/PWA install authority.

HGR Control remains a separate product identity and must use the owner-approved blue integrated-cog Control artwork everywhere it is installed or shown as a browser icon. The rejected generic/slab-serif H remains prohibited.

## Main Halieus authority

- Canonical web geometry: `client/public/halieus-app-icon.svg` / `client/public/halieus-mark.svg`.
- Raster exporter: `scripts/generate-platform-icons.mjs`.
- Tracked install/browser exports: `app-icon-180.png`, `app-icon-192.png`, `app-icon-512.png`, `favicon-32.png`, `favicon.ico`.
- `site.webmanifest` installs from the versioned 192/512 current-H exports only.
- `client/public/halieus-app-icon.png` stays pinned as the existing 1024px social/backwards-compatibility raster; it is explicitly not a favicon or install source in 4.5.4.
- Prebuild verifies current favicon/install exports and must not copy `assets/branding/references/HGR Main.png` over an install path.

## Control authority

- Artwork authority: `assets/branding/references/HGR Control Launcher.png` and `control-artwork.json`.
- Private Control PWA: `server/control-ui/control-icon.png`.
- Cloud Control PWA: `client/public/control/control-icon.png`.
- Both copies remain byte-identical to the approved Control authority.
- Cloud Control now owns a `/control/`-scoped manifest and service worker, preventing main-HGR install identity from being reused for Control.

## Cache / installed-app behaviour

4.5.4 changes the manifest/icon URLs so Chrome/Brave/Android are given a new install identity URL rather than being asked to reinterpret a cached old icon. Main HGR and Control also invalidate their relevant shell caches.

Source/CI completion does not prove that an already-installed Android launcher has refreshed its OS-level icon cache. Real-device acceptance must check the browser tab favicon and a fresh/reinstalled home-screen app for both HGR and Control. If an existing launcher keeps an old OS-cached icon after the new manifest is live, remove that installed shortcut/app and install it again before treating the source as wrong.

## Acceptance

- Main HGR browser favicon visibly matches the current website H.
- Main HGR installed app visibly matches the current website H.
- Private and cloud Control browser icons use the approved blue integrated-cog Control artwork.
- Installed Control uses that same approved blue artwork, not the main gold H and not an older Control H.
- No generator reconstructs or substitutes a generic H.
- Windows launcher artwork remains governed by its existing approved PNG authority; this batch does not redraw launchers.
