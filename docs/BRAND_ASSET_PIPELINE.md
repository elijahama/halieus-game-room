# HGR Brand Asset Policy

Status: HGR 4.5.5 canonical identity delivery

## Visual source of truth

The visual reference folder remains:

`assets/branding/references/`

References communicate approved direction, but runtime identity is no longer copied blindly from one historical PNG. The canonical functional identity is defined by:

1. the shared simple Halieus H geometry;
2. the semantic role palette;
3. separate utility corner badges;
4. product-specific SVG sources for Halieus and HGR Control.

The current icon-system reference is:

`assets/branding/references/HGR ICON - CONTROL UPDATE`

and the written contract is:

`assets/branding/references/HGR_LOGO_SYSTEM_REFERENCE.md`

## Canonical H

There is one H geometry. It contains no internal play button/tail.

The canonical vector source is:

`assets/branding/icon-sets/glyphs/hgr-h.svg`

White, black, gold, inverted and outline treatments are permutations of that geometry, not independent logos.

## Product identities

- **Halieus** — bright gold main-app identity.
- **HGR Control** — royal-blue Control identity. It must never reuse the main gold app icon.
- **OpenShard** — purple.
- **Update** — light blue.

Main browser/PWA/social/desktop identity is derived from the canonical current H vector:

- `assets/branding/icon-sets/glyphs/hgr-h.svg` — geometry authority
- `client/public/halieus-app-icon.svg` — fixed gold main-app composition
- `scripts/generate-platform-icons.mjs` — deterministic raster/export generator
- `client/public/identity-artwork.json` — source/output hash record

HGR Control remains a separate blue product identity and is not generated from the main gold app asset.

## Owner utility palette

- Start — `#22C55E`
- Restart — `#F59E0B`
- Close — `#EF4444`
- Update — `#38BDF8`
- PowerShell — `#64748B`
- OpenShard — `#A855F7`
- HGR Control — `#4F7BFE`

Each utility uses the common H plus a small white role badge.

## Windows launcher generation

There are two deliberately different authorities:

1. **Main Halieus app** — `assets/branding/references/HGR Main.png` is a generated raster export of the canonical current-H main app vector. Release CI refreshes it together with website/PWA/social/desktop main identity.
2. **Role-specific owner utilities** — Start, Restart, Close, Update, PowerShell, OpenShard and HGR Control remain human-approved rendered PNG artwork in `assets/branding/references/`. Their badge/sheen/rim treatment must not be reconstructed by the main identity generator.

Windows PNG/ICO files used by owner shortcuts are exported at refresh time into:

`server/data/runtime/launcher-icons/`

by `scripts/windows/generate-launcher-icons.ps1`, then `scripts/windows/launcher-shortcuts.ps1` rebuilds the shortcut family.

The main role therefore receives the current canonical H without allowing the utility-role generator to invent or alter any approved role-specific artwork.

## Compatibility binaries

Tracked main-app ICO/PNG compatibility copies are now actively synchronised from the canonical current-H main vector because Electron/package/legacy launcher paths still consume them. Historical copies under explicit `legacy/` or test-fixture locations remain archives only.

## Protection model

Brand regression no longer freezes the complete reference directory to historical byte hashes. That prevented intentional brand evolution.

Instead, regression protects:

- the canonical simple H geometry;
- required product/launcher SVG sources;
- semantic role colours;
- Control-vs-main app separation;
- absence of the retired play-tail geometry;
- the runtime launcher generation path;
- presence of the current reference material.

Historical fixture hashes under `tests/fixtures/pre2b-protected-assets.json` remain as a record of the earlier Pre-2B asset set; they are not the active branding contract.

## Rule

```text
visual reference
      ↓
canonical H + semantic role contract
      ↓
reviewable canonical main SVG
      ↓
release-time main raster generation
      ↓
favicon / PWA / social / desktop main identity

approved role-specific reference PNG
      ↓
runtime Windows utility PNG/ICO export
```

One geometry, one role language, multiple delivery formats.
