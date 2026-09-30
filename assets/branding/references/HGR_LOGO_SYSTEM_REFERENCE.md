# Halieus Game Room — Logo System Reference
Version: 4.5.3

## Core Rule

HGR uses ONE canonical `H` geometry.

Every logo variation must use the exact same:
- H proportions
- alignment
- dimensions
- padding

The canonical H follows the saved **`HGR ICON - CONTROL UPDATE`** reference: two straight block stems with flat ends and one centred horizontal bridge. It contains no play-cut/tail and no decorative serif/cap geometry. Utility roles add their role motif separately without redrawing the H.

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
- HGR Control Mobile

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

Utility launcher icons use the approved rendered reference family. HGR Control retains its separate Control motif when the final Control reference PNG is approved.

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

Installed app identity now comes from the canonical vector family rather than a historical rendered thumbnail.

- The main Halieus PWA installs from `client/public/halieus-app-icon.svg`.
- HGR Control installs from its separate `server/control-ui/control-icon.svg`.
- The in-app Halieus mark still uses the canonical H geometry and may respond to the player's saved logo treatment.
- Launcher/install icons use fixed product/role colours; runtime themes must not recolour an already-installed app identity.
- For website/PWA themeable identity, SVG remains appropriate.
- For Windows launcher identity, PNG/ICO exports must come from approved reference PNG artwork rather than an independently redrawn SVG/role approximation.

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
