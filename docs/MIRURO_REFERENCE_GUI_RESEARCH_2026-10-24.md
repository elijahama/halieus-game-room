# HGR — Miruro reference GUI research (24 October 2026)

**Status:** design reference and opt-in HGR gallery prototype; not a Miruro source-code fork, asset import, or branding replacement.

## Source verification and rights

- Hub: https://www.miruro.com/
- Publicly readable repository inspected: https://github.com/4kyoune/mirurotv (React/Vite front end).
- That repository's README points to https://github.com/Miruro-no-kuon/Miruro but the original repository was not publicly accessible when checked. Treat the readable code as a reference snapshot, not proof of the current live implementation.
- Inspected LICENSE is a **custom attribution–noncommercial licence**. Do not copy its components, asset files, anime images, logos or CSS into HGR; commercial or other use would require rights verification and potentially explicit permission. This implementation is original HGR code informed by common UI patterns only.
- Design should take product principles rather than exact visual identity. Preserve existing HGR launcher-family H, canonical game illustrations/icons and role colours. Never replace the H with a generic letterform.

## Observed reference patterns

| Miruro component / asset | Observed approach | HGR interpretation |
| --- | --- | --- |
| `src/components/Navigation/Navbar.tsx` | Fixed compact top bar, unobtrusive actions, responsive search | Keep HGR navigation/mobile bottom bar; optionally simplify command density later |
| `src/components/Home/HomeCarousel.tsx` | Featured immersive horizontal hero with accent gradient overlay and text | HGR already has a featured game carousel; refine after gallery pilot, don't import Miruro images |
| `src/components/Cards/CardGrid.tsx`, `CardItem.tsx` | Responsive multi-column portrait cards with hover reveal and focused metadata | New user-selectable HGR Gallery mode with original code and canonical game art |
| `src/styles/themes.css` | Light and dark surface/typography/accent tokens | HGR already has theme tokens. Use existing HGR theme and per-game accent values; don't paste Miruro CSS variables |
| `src/components/Skeletons/Skeletons.tsx` | Loading placeholders with restrained animation | Candidate for later loading-state polish; must respect reduced-motion preference |
| `src/assets/` | Multiple logo transparencies, banners, thumbnails and PWA icons | Do NOT import; only reuse the canonical HGR launcher and game asset pipeline |

## First HGR opt-in implementation

- **Choose your game** retains existing **Tiles** and **List** as-is and adds **Gallery** as a third explicit layout. The stored setting uses the existing `halieus-game-library-layout-v1` key, with old values still supported and Tiles default for new players.
- Gallery: portrait art panels with subtle per-game colour lighting; shared existing HGR GameBrandIcon and catalogue descriptions; semantic buttons use the existing `openCreate(game.id)` room creation.
- Categories, statuses, ordering, ranked policies and unavailable Coming Soon games remain unchanged.
- Responsive full-row grid on desktop and a two-column vertical grid on small phones, without horizontal scrolling; reduced-motion and visible focus preserved.
- Scoped stylesheet loaded *after* the existing HGR theme and library CSS; selector guard `[data-game-layout="gallery"]` prevents Tiles/List regressions.
- No platform version bump or production deploy in this PR. Consider for **4.6.0** after owner tests at 320, 360, 390, 430, 820 and 1440 px, light/dark/custom themes, PWA and real phones.

## Out of scope / later decision

- Miruro has genre filtering, keyboard-oriented search and browsing. HGR's genuine game search / genre filter is a follow-up once the new gallery is accepted.
- A featured panoramic game hero could be considered but only after the user's preference and existing homepage hero behaviour are validated.
- Do not overwrite HGR backgrounds or move theme symbols: those are separate known workstreams.
- No copying of source code or art, no new dependencies, no new H geometry.

## Audit and rollback

- Revert the scoped new stylesheet import, Gallery control/type and browser test changes to return to Tiles/List; game sessions and accounts are unaffected.
- Require TypeScript check, full regressions, browser coverage, build and protected-brand-asset test before merge. Physical device approval and release identity matching are separate gates.
