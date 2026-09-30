# HGR Icon Sets

This folder contains runtime glyphs and historical icon material. It is **not** the launcher artwork authority.

## Current authority

`../references/` contains the human-approved rendered icon artwork and palette contract.

See:

- `../references/HGR_ICON_PALETTE.md`
- `../references/HGR_LOGO_SYSTEM_REFERENCE.md`

## What remains here

- `glyphs/` — functional/themeable H glyph assets used by website/runtime vector surfaces.
- `legacy/` — historical game/brand assets retained only as an archive.
- The old `alternate-work-generated/` and `reference-faithful/` launcher families have been removed. They were duplicate reconstructed art and are no longer valid launcher sources.

## Launcher rule

Do not source Windows launcher art from `alternate-work-generated/` or `reference-faithful/`.

Approved launcher art comes from the PNGs in `../references/` and may be converted to ICO without visual reinterpretation.

## Colour contract

Semantic role base colours are defined in `../references/HGR_ICON_PALETTE.md`.

Rendered reference PNGs intentionally contain lighter/darker pixels from sheen and shading. Do not flatten them to one solid hex value.
