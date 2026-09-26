# Halieus Game Room — Logo System Reference
Version: 4.5.2

## Core Rule

HGR uses ONE canonical `H` geometry.

Every logo variation must use the exact same:
- H proportions
- alignment
- dimensions
- padding
- internal play-cut geometry

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
--hgr-logo-bg: #DAA017;
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

Launcher icons use the same H alignment and geometry.

- Start
- Restart
- Close
- Update Site
- PowerShell
- OpenShard TUI

Their action motifs may differ, but the H must remain fixed.

### Launcher colours

Launcher PNG/ICO files are frozen branded assets.

The web/UI equivalents should be flat SVG-based icons whose colours may respond to the active HGR theme.

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

### Installed app / PWA identity

The installed mobile/web-app icon is intentionally a different delivery case from the live in-app logo.

- The in-app Halieus mark remains canonical vector geometry and may use the player's saved logo treatment.
- The installed PWA icon may use approved rendered reference artwork so its saturation/material finish survives Android/iOS launcher rendering.
- For 4.5.2 the approved installed-app source is copied directly from:
  `assets/branding/references/ChatGPT Image 25 Sept 2026, 18_24_09.png`
- Do not redraw, recolour, desaturate or regenerate that PNG through the flat SVG exporter.
- Changing the runtime theme or logo preference must not mutate an already-installed launcher icon.

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
- Detailed rendered icons are references, not the source of runtime geometry.
