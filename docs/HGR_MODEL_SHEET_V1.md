# Halieus Game Room — Visual Model Sheet v1

Status: HGR 4.5 foundation  
Principle: **Platform first; games inherit.**

This model sheet defines the shared visual language for Halieus Game Room. Individual games may have their own board, table, card and atmosphere artwork, but shared navigation, identity, menus, player cards, settings, modals, actions and state communication must remain recognisably HGR.

## 1. Halieus H

The platform has **separate website and launcher identities**. The website uses the simple block H shown in the approved website concept (ChatGPT Image Sep 22, 2026, 08_26_37 AM.png). The historical website path at 477d352 matches that reference: `M17 15h10v12h10V15h10v34H37V36H27v13H17z` in a 64 × 64 viewBox.

Preserve yellow/gold as the default Halieus brand colour and theme-aware contrast. The shared React mark, boot mark, platform tab glyph, web favicons and installable-site icons use this website silhouette. Retain their existing compact sizing and theme tokens.

The serif/slab H belongs to the protected Windows launcher artwork. It must not be propagated into website icons. Website asset generation must never write to assets/branding/launchers or assets/branding/references. Portal uses H; Mega Board uses M; Poker uses P; other games retain contextual identities.

### Approved contrast variants

- **standard** — normal product chrome and app identity;
- **high** — large intro, launch and promotional use;
- **low** — subdued/supporting identity where the H must not compete with game content;
- **glyph only** — transparent-background H for compact/tab use where the surrounding surface already exists.

The H must not be stretched, skewed, replaced with unrelated geometry, or made to inherit OpenShard-specific visual language.

## 2. Launcher utility family

The Windows/developer launcher family uses the approved launcher utility treatment: restrained rounded-square tiles, the separate launcher H as the family anchor, and one clear task-specific symbol.

Canonical action colours:

- **Halieus / default:** gold `#D6A11F`
- **Start:** green `#4E7F5D`
- **Restart:** orange `#E67E22` — deliberately distinct from the Halieus gold
- **Close:** red `#B44B4B`
- **Update:** blue `#4B78B8`
- **PowerShell:** slate `#64748B`
- **OpenShard TUI:** violet `#8B5BD6`

The family rules are:

- restrained rather than glass/crystal;
- one HGR construction and consistent corner treatment;
- one action symbol per launcher;
- no duplicated action colours where a clearer distinction is available;
- OpenShard may use a receipt/shard motif, but that motif must not spread into the main Halieus identity;
- the PWA/application identity uses the standard Halieus gold rather than adopting a utility-action colour;
- in-product theme variants may recolour the H where appropriate, but installed launcher/PWA assets remain stable identifiers.

## 3. Geometry

Canonical shared values:

- XS radius: 8 px
- Small radius: 10 px
- Medium radius: 14 px
- Large radius: 18 px
- Shared control height: 40 px
- Spacing steps: 4 / 8 / 12 / 16 / 24 px

Game artwork may use different geometry where the game itself requires it. Shared UI wrapped around that artwork uses the HGR geometry.

## 4. Theme architecture

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

## 5. Text and density

HGR keeps one canonical typography identity. Players do not select arbitrary font families.

Player-adjustable presentation is limited to:

- Text size: Small / Standard / Large
- Interface density: Compact / Standard / Comfortable

These settings improve readability and personal comfort without allowing individual screens to become visually unrelated products.

## 6. Player overflow menus

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

## 7. Cosmetic skins

Skins are cosmetic only. They must not change game rules, odds, hit targets, hidden information, ranked calculations, rewards or competitive visibility.

Initial skin slots:

- Interface
- Cards
- Mega Board

Normal player unlocks are derived from canonical game history. Owner/Admin role grants no cosmetic progression bypass during ordinary play.

**Beta/Test Lab is different:** Owner/Admin accounts may preview every cosmetic while Test Lab is active. Beta selections are stored in session-only preview state and are discarded when Test Lab closes, restoring the player's genuine equipped unlocks.

## 8. Inheritance order

New design work should follow this order:

1. Model sheet / shared tokens
2. Home and platform shell
3. Shared player cards, menus, settings, notifications and modals
4. Lobby / game-menu chrome
5. Gameplay chrome
6. Game-specific exceptions

A new game should inherit the shared pattern rather than inventing a new platform language.

## 9. Accessibility and state clarity

Aesthetic variation may be bold, but the following remain stable:

- primary action readability;
- success/warning/error distinction;
- text/background contrast;
- focus visibility;
- readable card faces and board ownership information;
- keyboard access to contextual menus;
- clear locked/unlocked/equipped cosmetic states.

## 10. Visual iteration discipline

HGR visual work must preserve approved progress.

- Start from the last approved implementation or production screenshot.
- Change only the element currently under review.
- Do not redesign neighbouring assets that have already been approved.
- Treat generated mockups as exploration until explicitly accepted.
- If a new iteration is worse, return to the previous approved baseline instead of compounding the regression.
- Prefer refinement over reinvention when the existing design already communicates well.
- Validate artwork in the actual website context before adopting it as production direction.

The failed game-icon exploration remains useful as design research, but its generated assets are not approved production references.

## 11. Shared website surface grammar

The main HGR website establishes the reusable pattern that submenus and game chrome inherit.

The shared shell standardises:

- page-heading hierarchy;
- section-heading hierarchy;
- card padding and radii;
- status-chip placement;
- action-link placement;
- artwork safe areas;
- spacing between sections;
- responsive collapse rules.

Game-specific artwork is not normalised by redrawing it. The shell normalises the **space around it**.

The Games library is the reference implementation: category headings, count chips, game cards, status chips and Create Room links use one repeatable composition while each game's current artwork remains intact.

## 12. Game visual identity inheritance

Game artwork follows the connected visual process documented in [GAME_VISUAL_IDENTITY_SYSTEM.md](GAME_VISUAL_IDENTITY_SYSTEM.md).

The **current website artwork remains the source of truth**. A future refinement pass may derive compact transparent-background glyphs or normalise safe areas and presentation, but it must not replace working game identities simply to make a new set.

For visual/navigation purposes, use the website's current families:

- **Board & Strategy:** Mega Board, Ludo, Connect Four, Ayo, Word Board, Dominoes
- **Cards & Casino:** Poker, WHOT, Blackjack, Cheat
- **Social & Party:** Hidden Dictator, Word Game, Password, Anagrams Race

These visual families are presentation guidance rather than a requirement to redraw every game into one style. Mechanical taxonomy may differ.

A new game should start from the nearest established HGR family and current website presentation rules, then earn any exception deliberately.

## 13. Asset authority

Windows launcher artwork is reference-led, not generator-led.

The approved launcher reference images under `assets/branding/references/` are the source of truth for Windows launcher visuals. Existing approved ICOs under `assets/branding/launchers/` must remain untouched unless a targeted replacement is visually approved against those references.

The shared H geometry may guide in-product browser/PWA identity where documented, but it must not be used to automatically redraw or replace the approved Windows launcher family.

When documentation and an exploratory generator disagree, the approved reference artwork and protected production assets win.

## 14. Version boundary

This document begins the HGR 4.5 visual milestone. The repository version and half-version source baseline must not advance to 4.5.0 until the 4.5 implementation has passed code regression, build validation and human visual acceptance.
