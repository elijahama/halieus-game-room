# HGR Brand Asset Policy

Status: HGR 4.5.3 canonical icon system

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

Installed PWA/browser identity uses canonical SVGs directly:

- `client/public/halieus-app-icon.svg`
- `server/control-ui/control-icon.svg`

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

Tracked SVG files under:

`assets/branding/launchers/`

are reviewable source artwork.

Windows PNG/ICO files used by owner shortcuts are generated at refresh time into ignored runtime state:

`server/data/runtime/launcher-icons/`

by:

`scripts/windows/generate-launcher-icons.ps1`

Then:

`scripts/windows/launcher-shortcuts.ps1`

rebuilds the HGR shortcut family against those generated runtime ICOs.

This avoids binary Git churn while keeping every shortcut visually synchronized with the approved SVG/role contract.

## Compatibility binaries

Older tracked ICO/PNG assets may remain for compatibility with legacy packaging paths. They are not the current geometry authority and must not override a canonical SVG/runtime-generated icon where the new pipeline is available.

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
reviewable SVG source
      ↓
PWA/browser SVG identity
      or
runtime Windows PNG/ICO export
```

One geometry, one role language, multiple delivery formats.
