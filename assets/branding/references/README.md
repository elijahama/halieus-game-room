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

All functional Halieus identities now use the owner-approved launcher-family H: straight stems, one centred bridge and restrained flared end caps. Dev 24 intentionally aligns the website H with the launcher family.

The old play-cut/tail H and the temporary block-only website H are retired. Utility roles may add their approved motif, but must not alter the shared H itself.

## Windows launcher outputs

Owner-machine PNG/ICO shortcut artwork is exported from approved source artwork into ignored runtime state:

`server/data/runtime/launcher-icons/`

The approved reference PNG is the design authority. Runtime PNG/ICO files are only delivery formats.

Legacy tracked ICOs may remain for compatibility with older packaging paths. They do not override the canonical SVG/runtime pipeline.

## Product separation

- Main Halieus: gold
- HGR Control: royal blue
- OpenShard: purple
- Update: light blue

HGR Control uses the dedicated square `server/control-ui/control-icon.png` for its installed app and Windows Control launcher. The historical `HGR Control.png` full reference sheet is retained only as reference material and must never be mapped directly to a shortcut. HGR Control must not reuse the main gold Halieus icon.

## Change rule

If the icon family needs changing:

1. inspect the complete current reference set;
2. identify the applicable approved reference;
3. select or add the exact approved PNG for each changed launcher role;
4. update the role mapping/export pipeline without redrawing the artwork;
5. visually inspect the resulting desktop/PWA icons against the source PNG;
6. update regressions/documentation with the approved result.

**Human-approved reference PNG artwork controls launcher output; generated/exported files must reproduce it, not reinterpret it.**
