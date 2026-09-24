# HGR Design System

## Purpose

This document defines the visual language shared by Halieus Game Room's website, launcher family and developer/tooling surfaces.

The design-system goal is consistency, not decoration. A new game, social surface or developer control should feel native to HGR before anyone reads its label.

## Brand hierarchy

### Primary identity

Halieus gold is the primary platform identity. It is used for:

- brand marks;
- active navigation;
- section eyebrows;
- focus treatment;
- controlled emphasis.

Gold should not be sprayed over every control.

### Semantic action colours

- Start / ready / positive: green
- Restart / retry / refresh: amber
- Close / destructive / stop: red
- Update / sync / deploy: blue
- Developer / console / tooling: slate blue

These are semantic colours, not replacements for the main Halieus identity.

## Shared design tokens

The canonical web tokens live in:

`client/src/styles/hgr-theme.css`

New shared surfaces should prefer `--hgr-*` variables rather than adding one-off hard-coded colours.

Token families include:

- page and surface colours;
- text and muted text;
- borders;
- brand and semantic accents;
- radii;
- shadows;
- focus treatment;
- spacing.

The theme layer is imported after the historical stylesheet. This lets HGR progressively converge on one system without a dangerous full-site rewrite.

## Surface language

HGR surfaces should use:

- strong information hierarchy;
- restrained dark/light surfaces;
- soft but visible depth;
- consistent rounded geometry;
- limited accent colour;
- clear focus and hover states;
- enough spacing for scanability;
- controlled translucency only where it helps.

Avoid:

- neon utility styling;
- unrelated icon families;
- excessive black boxes;
- arbitrary gradients;
- inconsistent double borders;
- page-specific spacing rules when a shared token can solve the problem.

## Launcher family — approved reference artwork

The launcher family is governed by the approved reference images in:

`assets/branding/references/`

Every approved PNG in that directory participates in the visual reference set. The count may grow as new approved references are added, so implementation work must inspect the folder rather than relying on a hard-coded filename list.

These references are the visual source of truth. They are **not** a prompt for a generator to reinterpret.

Approved Windows icon assets live under:

`assets/branding/launchers/matte/`

The approved family uses the visual treatment present in the reference artwork. Do not invent replacement geometry, colours, materials or symbols from prose descriptions when the reference files already exist.

The historical `scripts/windows/generate-launcher-icons.ps1` tool is for quarantined experimental previews only and may write only to:

`assets/branding/launchers/generated-preview/`

It must never delete, overwrite, recolour or regenerate the approved `matte` icons.

Shortcut refresh, Start, Restart, Close and Update workflows consume approved artwork; they do not create artwork.

See `assets/branding/references/README.md` and `docs/BRAND_ASSET_PIPELINE.md` for the protected-asset contract.

## Website rollout

The first design-system pass covers:

- product chrome;
- Home cards and panels;
- shared buttons;
- headings and eyebrows;
- focus states;
- the project-history component.

Later passes should use the same tokens to repair game layouts that currently diverge in spacing, panel hierarchy or control treatment.

The rule is:

> Fix layout with the shared system first; do not hide layout problems under new decoration.

## Project timeline

The Home surface now contains a version-led HGR project timeline.

Source:

`client/src/platform/projectTimeline.ts`

UI:

`client/src/platform/components/ProjectTimeline.tsx`

Historical source-of-truth documentation:

`docs/DEVELOPMENT_TIMELINE.md`

GitHub commit history begins at the 4.0.0 source import, so earlier milestones are explicitly reconstructed from preserved release documentation rather than pretending the repository contains history it does not.


## Shared game-shell family

The second design-system pass applies shared framing to the game families that had drifted into separate visual systems.

The shared layer covers:

- card-game headers and metadata;
- the isolated Blackjack / WHOT rebuild shell;
- Word Arena headers, lobby panels and roster surfaces;
- shared setup inputs;
- player/roster rows;
- status toasts;
- Game Menu and invite modals;
- tablet/phone containment and one-column setup behaviour.

Poker remains the presentation benchmark and its table geometry is deliberately not overwritten by the shared layer. Mega Board board geometry is also outside this polish layer.

The design-system rule is:

> shared shell first, game identity second, game geometry untouched unless a layout-specific patch explicitly targets it.

Responsive containment is mandatory. Shared chrome may wrap or scroll internally, but must never force the board/table wider than the real device viewport.


## Design System v1 implementation authority

The active redesign implementation is now defined in:

`docs/HGR_DESIGN_SYSTEM_V1.md`

and implemented by:

`client/src/styles/hgr-design-v1.css`

This file remains useful historical context for the earlier 4.1.x branding and shared-shell passes. New redesign work should follow the v1 implementation map and token/component contracts rather than adding another independent visual layer.
