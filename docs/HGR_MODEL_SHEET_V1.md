# Halieus Game Room — Visual Model Sheet v1

Status: HGR 4.5 foundation  
Principle: **Platform first; games inherit.**

This model sheet defines the shared visual language for Halieus Game Room. Individual games may have their own board, table, card and atmosphere artwork, but shared navigation, identity, menus, player cards, settings, modals, actions and state communication must remain recognisably HGR.

## 1. Halieus H

The earlier faceted 4.5 experiment is no longer the approved direction.

The current approved identity returns to the calmer **matte H utility family** established by the launcher references:

- a strong serif/slab H silhouette;
- a restrained rounded tile where a tile is needed;
- yellow/gold as the default Halieus brand colour;
- theme-aware variants where appropriate;
- no crystal/shard language outside the dedicated OpenShard launcher;
- no unnecessary sci-fi/glass treatment.

The H remains one stable silhouette across the product. Theme variants change colour/contrast treatment, not its identity.

### Approved contrast variants

- **standard** — normal product chrome and app identity;
- **high** — large intro, launch and promotional use;
- **low** — subdued/supporting identity where the H must not compete with game content;
- **glyph only** — transparent-background H for compact/tab use where the surrounding surface already exists.

The H must not be stretched, skewed, replaced with unrelated geometry, or made to inherit OpenShard-specific visual language.

## 2. Geometry

Canonical shared values:

- XS radius: 8 px
- Small radius: 10 px
- Medium radius: 14 px
- Large radius: 18 px
- Shared control height: 40 px
- Spacing steps: 4 / 8 / 12 / 16 / 24 px

Game artwork may use different geometry where the game itself requires it. Shared UI wrapped around that artwork uses the HGR geometry.

## 3. Theme architecture

The top-level appearance choice remains intentionally short:

1. System
2. Light
3. Dark
4. Theme Library
5. Custom

System, Light and Dark are immediate choices. Theme Library holds coordinated named profiles so additional themes do not create a wall of top-level buttons. Custom remains immediately available and retains direct RGB/HEX editing.

Theme Library profiles may be expressive. They are not limited to safe accent swaps. A profile may coordinate page, surfaces, controls, action colour, secondary information colour and supporting atmosphere as long as contrast and state readability remain intact.

The 4.5 starting library contains:

- Blue Circuit
- Redline
- Emerald Arcade
- Ultraviolet
- Neon Grid
- Brass & Coal
- Terminal
- Solar Dusk
- Icebox
- Cream Soda
- Midnight Rose
- Deep Ocean

Legacy Blue/Red/Green saved modes remain readable for compatibility, but new selection flows through Theme Library.

## 4. Text and density

HGR keeps one canonical typography identity. Players do not select arbitrary font families.

Player-adjustable presentation is limited to:

- Text size: Small / Standard / Large
- Interface density: Compact / Standard / Comfortable

These settings improve readability and personal comfort without allowing individual screens to become visually unrelated products.

## 5. Player overflow menus

Three-dot controls must never be decorative.

Where a player identity card exposes the overflow control, every visible item must execute an existing supported action. The 4.5 shared action model may expose:

- View profile
- Join current game
- Spectate current game
- Request a game
- Invite to the player's active room
- Copy username

Report/block/admin actions are not shown until their corresponding platform capability is real.

Context decides which actions appear. HGR must not show disabled fantasy functionality purely for visual completeness.

## 6. Cosmetic skins

Skins are cosmetic only. They must not change game rules, odds, hit targets, hidden information, ranked calculations, rewards or competitive visibility.

Initial skin slots:

- Interface
- Cards
- Mega Board

Normal player unlocks are derived from canonical game history. Owner/Admin role grants no cosmetic progression bypass during ordinary play.

**Beta/Test Lab is different:** Owner/Admin accounts may preview every cosmetic while Test Lab is active. Beta selections are stored in session-only preview state and are discarded when Test Lab closes, restoring the player's genuine equipped unlocks.

## 7. Inheritance order

New design work should follow this order:

1. Model sheet / shared tokens
2. Home and platform shell
3. Shared player cards, menus, settings, notifications and modals
4. Lobby / game-menu chrome
5. Gameplay chrome
6. Game-specific exceptions

A new game should inherit the shared pattern rather than inventing a new platform language.

## 8. Accessibility and state clarity

Aesthetic variation may be bold, but the following remain stable:

- primary action readability;
- success/warning/error distinction;
- text/background contrast;
- focus visibility;
- readable card faces and board ownership information;
- keyboard access to contextual menus;
- clear locked/unlocked/equipped cosmetic states.

## 9. Visual iteration discipline

HGR visual work must preserve approved progress.

- Start from the last approved implementation or production screenshot.
- Change only the element currently under review.
- Do not redesign neighbouring assets that have already been approved.
- Treat generated mockups as exploration until explicitly accepted.
- If a new iteration is worse, return to the previous approved baseline instead of compounding the regression.
- Prefer refinement over reinvention when the existing design already communicates well.
- Validate artwork in the actual website context before adopting it as production direction.

The failed game-icon exploration remains useful as design research, but its generated assets are not approved production references.

## 10. Game visual identity inheritance

Game artwork follows a separate but connected visual system documented in [GAME_VISUAL_IDENTITY_SYSTEM.md](GAME_VISUAL_IDENTITY_SYSTEM.md).

Each game has two concrete identity assets:

- a larger website/discovery thumbnail;
- a compact game glyph for tabs, game chrome and small identity surfaces.

Those assets are governed by one of three reusable category grammars:

- Board & strategy;
- Card & table;
- Word & party.

The category grammar is established before the individual game set is expanded. Future games inherit an approved category system instead of receiving a one-off thumbnail and icon treatment.

## 11. Asset rollout

The canonical H geometry should be used as the source for future PWA, desktop and Windows launcher asset regeneration. Existing raster/ICO assets are not considered fully migrated until the launcher/icon generation pass is completed and visually reviewed.

## 12. Version boundary

This document begins the HGR 4.5 visual milestone. The repository version and half-version source baseline must not advance to 4.5.0 until the 4.5 implementation has passed code regression, build validation and human visual acceptance.
