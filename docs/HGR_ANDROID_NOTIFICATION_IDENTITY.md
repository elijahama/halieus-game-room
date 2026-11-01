# Android notification identity — existing HGR assets

## Owner decision

The notification icon by the Android clock is the **small status-bar symbol**. Use the identity of the area that produced the notification; do not invent a new bell, logo, H geometry, launcher, or decorative status icon. This is separate from the Control update-progress bar in the floating on-screen notification.

The Web Notifications API has two relevant image fields:
- `icon` — the larger, full-colour notification artwork.
- `badge` — the small status-bar image Android masks to a single-colour silhouette. It needs transparency so the background does not become a solid square.

## Approved mapping (first audited batch)

| Event source | Expanded `icon` | Android small `badge` |
| --- | --- | --- |
| HGR general, friends, guilds, Inbox | `/app-icon-192.png` (generated from canonical `halieus-app-icon.svg`) | `/notification-badges/hgr.png` (canonical H only) |
| HGR Control owner update | `/control/control-icon.png` (approved blue Control H/cog) | `/notification-badges/control.png` (its actual H/cog silhouette only) |
| Mega Board invitation / game request | `/game-icons/mega-board.svg` (existing game catalog SVG) | `/notification-badges/mega-board.png` (the exact source `M` glyph only) |
| Other currently catalogued game invitations | `/game-icons/{approved-game-id}.svg` | Canonical H fallback until game-specific source silhouettes have been visually validated |

The three badge files are 96 × 96 transparent PNG derivatives, extracted from the **existing** approved artwork: `client/public/brand/glyphs/H-white.svg`, `client/public/control/control-icon.png`, and the unchanged M text element in `client/public/game-icons/mega-board.svg`. No independent H was drawn, and no launcher or full-colour game icon was altered. The control icon still uses its approved blue artwork in the expanded notification.

## Event routing and safety

- Account room invitations and game requests forward only their existing validated `game` IDs. No custom image URL is accepted.
- The main service worker matches game IDs against the fixed HGR game catalog; unknown and malicious IDs fall back to the main HGR identity.
- General messages, friend and guild notices remain main-HGR branded.
- The separate `/control/` service worker always uses Control artwork and an owner-safe `/control/` click target, regardless of unsolicited payload fields.
- In-page hidden-tab invitation fallback uses the same catalogued game icon and safe status badge.
- Control has its own manifest and service-worker scope. This change does not merge the Control and game PWA identities.
- Neither a server push receipt nor CI establishes that Android rendered the chosen icon. Verify on a real Android phone/installed PWA with an opt-in **test notification**, a Mega Board invite and a Control update alert before declaring device acceptance. Android/Brave/browser/OS behaviour may vary.

## Validation and release boundary

The `tests/runtime-android-notification-icons.mjs` regression verifies source routing, fixed paths, safe fallback and transparent 96px PNG headers. Keep all source assets protected. Deploy only via approved release gates with an idle-room check, then verify final fingerprint and actual Android status-bar rendering. This branch does not authorize interruption of live matches or changes to existing launcher artwork.
