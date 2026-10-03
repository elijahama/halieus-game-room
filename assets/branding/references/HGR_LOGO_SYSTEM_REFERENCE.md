# Halieus Game Room — Logo System Reference
Version: 4.5.4

## Core Rule

HGR uses ONE canonical `H` geometry.

Every logo variation must use the exact same:
- H proportions
- alignment
- dimensions
- padding

The canonical H now follows the owner-approved launcher-family treatment: two straight stems, one centred bridge and restrained flared end caps. Dev 24 deliberately replaces the temporary block-only website H so website personalization and launcher-family geometry read as one Halieus system. Utility roles add their role motif separately without changing that H.

Do not redraw or resize the H independently between variants.

---

## Canonical Glyph

The master H exists as a themeable vector.

Recommended web asset:

`hgr-h.svg`

The SVG should use `currentColor` / CSS variables rather than fixed colour values.

### Glyph variants

- Mono Light → pure white `#FFFFFF`
- Mono Dark → pure black `#000000`

Both are the SAME geometry.

---

## Themeable Logo Structure

The website logo is built from reusable layers:

1. Background
2. H glyph
3. Accent / action motif

Example tokens:

```css
--hgr-logo-bg: #F4C430;
--hgr-logo-fg: #000000;
--hgr-logo-accent: #FFFFFF;
```

Themes may change these values without replacing the logo artwork.

---

## Main Presets

### Brand Default

Background:
HGR gold

Glyph:
Black or contrast-safe foreground

Usage:
Default HGR branding and neutral fallback.

---

### Mono Light

Background:
Transparent

Glyph:
White

Usage:
Dark backgrounds.

---

### Mono Dark

Background:
Transparent

Glyph:
BLACK — not navy.

Usage:
Light backgrounds.

---

### Light Mode

Background:
Theme-derived light colour

Glyph:
Black or other automatically selected high-contrast foreground.

Usage:
Light platform themes.

---

## Launcher Family

Launcher icons are sourced from the approved rendered PNG family in `assets/branding/references/`.

- Start
- Restart
- Close
- Update Site
- PowerShell
- OpenShard TUI
- HGR Control

For launchers, the selected PNG is final artwork. Export tooling may convert PNG → ICO but must not independently redraw the H, badge, sheen, rim, shadow or colour treatment.

### Launcher / utility colours

Role colours are semantic and fixed for the owner-tool family:

- Halieus main app — bright gold `#F4C430`
- HGR Control — royal control blue `#4F7BFE`
- Start — green `#22C55E`
- Restart — orange `#F59E0B`
- Close — red `#EF4444`
- Update — light blue `#38BDF8`
- PowerShell — slate `#64748B`
- OpenShard — purple `#A855F7`

OpenShard owns purple. Update owns light blue. HGR Control must not reuse either role colour.

Utility launcher icons use approved rendered source artwork. HGR Control uses the dedicated square `server/control-ui/control-icon.png`; the historical `assets/branding/references/HGR Control.png` full sheet is not a launcher source.

---

## Web Behaviour

Do NOT swap between independently drawn PNG logos when themes change.

Instead:

`Canonical SVG geometry + theme colour values = displayed logo`

Example:

```css
.hgr-logo {
  --logo-bg: var(--theme-logo-background);
  --logo-fg: var(--theme-logo-foreground);
  --logo-accent: var(--theme-accent);
}
```

This guarantees that all themes keep identical logo geometry.

### Installed app / PWA identity — 4.5.4

Browser and installed-app identity must now match the current website H rather than the retired HGR Main thumbnail.

- `client/public/halieus-app-icon.svg` is the main website/PWA source geometry.
- `scripts/generate-platform-icons.mjs` exports the tracked 180, 192, 512 and 1024 PNGs plus favicon PNG/ICO from that exact SVG; it must not read launcher artwork.
- `client/public/site.webmanifest` installs from the current 192/512 PNG exports and uses versioned URLs so Android/Chrome/Brave cannot silently retain the retired icon URL.
- `client/public/halieus-app-icon.png` remains the large social/fallback raster, but it is now a generated current-H export rather than a copy of `assets/branding/references/HGR Main.png`.
- `scripts/copy-approved-pwa-icon.mjs` verifies the current exports during prebuild and must never restore `HGR Main.png` as the website install identity.
- HGR Control remains a separate product identity: private Control and cloud `/control/` use the approved blue integrated-cog `HGR Control Launcher.png` artwork, not the gold main H.
- Cloud Control owns a `/control/`-scoped manifest/service worker so installing Control does not inherit or masquerade as the main HGR PWA.
- Runtime themes may change the in-app Halieus mark treatment, but favicon/PWA install identity uses fixed product colours.
- Windows launchers remain governed by approved rendered PNG authority and are not redrawn by the web/PWA exporter.

---

## Asset Families

### `/rendered/`

Detailed branding/reference artwork.

May contain:
- texture
- bevel
- lighting
- material treatment

Used for:
- documentation
- launcher artwork
- branding references
- promotional material

### `/flat/`

Functional website/application assets.

Must contain:
- no texture
- no bevel
- no baked lighting
- clean vector geometry
- themeable colour layers

Preferred format:
SVG

### `/exports/`

Frozen deployment assets.

Examples:
- PNG
- ICO
- favicon exports
- Windows shortcut icons

---

## Non-Negotiable Rules

- Mono Dark is TRUE BLACK.
- Mono Light is TRUE WHITE.
- Do not use navy as a substitute for black in the functional vector set.
- All H glyphs use one canonical geometry.
- Theme changes alter colour, not proportions.
- Accessibility contrast may override a theme colour when required.
- `HGR ICON - CONTROL UPDATE` is the current human-approved geometry reference.
- Detailed older rendered icons remain historical references and do not override it.
- The retired HGR Main rendered thumbnail must not be copied back over the current website favicon/PWA install exports.


## Permutation set

The functional vector family includes these approved treatments:

- Full colour — branded tile + black H
- Monochrome gold — gold H only, transparent background
- White only — white H only, transparent background
- Black only — black H only, transparent background
- Dark-on-light — white tile + black H
- Inverted — dark tile + gold H
- Outline — gold tile/H outline treatment
- H-only glyphs — black, white and gold

These permutations are delivery variants of the **same H geometry**, not separate logos.

## HGR Control identity

HGR Control is a separate application identity inside the Halieus family.

- The installed HGR Control PWA uses the dedicated blue Control icon.
- The Control splash/header uses that same icon.
- The main Halieus gold icon must not be reused as the Control app icon.
- Windows HGR Control launchers use the Control icon as well.
