# HGR Branding References — Visual Direction

This folder contains approved visual source material for Halieus. References are evidence of the intended visual direction and must be reviewed before changing production branding.

## Current icon-system reference

The current utility/icon-family direction is recorded in:

`HGR ICON - CONTROL UPDATE`

The written geometry and palette contract is:

`HGR_LOGO_SYSTEM_REFERENCE.md`

## Authority rule

For **launcher artwork**, approved reference PNGs are finished source artwork, not merely inspiration. Once a PNG is selected for a launcher role, production should use that artwork as-is and only convert/export it as needed.

The launcher contract is:

```text
approved PNG in assets/branding/references
        ↓
role mapping
        ↓
lossless/resized PNG export when required
        ↓
ICO conversion for Windows shortcut use
```

Do **not** redraw launcher H geometry, badges, gradients, sheen, rims or shadows in code.

Themeable website glyphs may still use vectors where needed, but they do not override approved launcher PNG artwork.

A newly approved reference added to this folder must be reviewed and, when it changes the accepted direction, the canonical source contract and regressions must be updated deliberately.

## Canonical geometry

All functional Halieus identities use the same H shown by **`HGR ICON - CONTROL UPDATE`**: straight vertical stems, flat top/bottom ends and one centred horizontal bridge.

The old play-cut/tail H and the later pseudo-serif/capped H are not current geometry. Utility roles may add their approved motif, but must not alter the H itself.

## Windows launcher outputs

Reviewable launcher SVG sources live under:

`assets/branding/launchers/`

Owner-machine PNG/ICO shortcut artwork is exported from the approved reference PNG role mapping into ignored runtime state:

`server/data/runtime/launcher-icons/`

The approved reference PNG is the design authority. Runtime PNG/ICO files are only delivery formats.

Legacy tracked ICOs may remain for compatibility with older packaging paths. They do not override the canonical SVG/runtime pipeline.

## Product separation

- Main Halieus: gold
- HGR Control: royal blue
- OpenShard: purple
- Update: light blue

HGR Control must use its own Control icon in the installed app, splash/header and Control Mobile shortcut. It must not reuse the main gold Halieus icon.

## Change rule

If the icon family needs changing:

1. inspect the complete current reference set;
2. identify the applicable approved reference;
3. select or add the exact approved PNG for each changed launcher role;
4. update the role mapping/export pipeline without redrawing the artwork;
5. visually inspect the resulting desktop/PWA icons against the source PNG;
6. update regressions/documentation with the approved result.

**Human-approved reference PNG artwork controls launcher output; generated/exported files must reproduce it, not reinterpret it.**
