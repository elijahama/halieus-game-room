# HGR Branding References — Visual Direction

This folder contains approved visual source material for Halieus. References are evidence of the intended visual direction and must be reviewed before changing production branding.

## Current icon-system reference

The current utility/icon-family direction is recorded in:

`HGR ICON - CONTROL UPDATE`

The written geometry and palette contract is:

`HGR_LOGO_SYSTEM_REFERENCE.md`

## Authority rule

Reference artwork establishes the intended look, but production identity is now implemented through the canonical icon system rather than by copying one historical rendered file verbatim.

The active contract is:

```text
approved visual reference: HGR ICON - CONTROL UPDATE
        ↓
canonical clean block H geometry
        ↓
semantic role colours + separate corner badges
        ↓
reviewable SVG sources
        ↓
PWA/browser SVG identity or generated Windows runtime exports
```

A newly approved reference added to this folder must be reviewed and, when it changes the accepted direction, the canonical source contract and regressions must be updated deliberately.

## Canonical geometry

All functional Halieus identities use the same H shown by **`HGR ICON - CONTROL UPDATE`**: straight vertical stems, flat top/bottom ends and one centred horizontal bridge.

The old play-cut/tail H and the later pseudo-serif/capped H are not current geometry. Utility roles may add their approved motif, but must not alter the H itself.

## Windows launcher outputs

Reviewable launcher SVG sources live under:

`assets/branding/launchers/`

Owner-machine PNG/ICO shortcut artwork is generated from the approved geometry/role system into ignored runtime state:

`server/data/runtime/launcher-icons/`

This keeps the desktop family synchronized without making generated binaries the design authority.

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
3. update the canonical H / role contract only when the visual decision requires it;
4. update the reviewable SVG sources and generator;
5. visually inspect the resulting desktop/PWA icons;
6. update regressions/documentation with the approved result.

**Human-approved reference direction controls the canonical system; generated output must follow that system.**
