# HGR Game Visual Identity System

Status: HGR 4.5 design-system research  
Source of truth: **the current website game artwork**

## Core rule

The current HGR game artwork is already good. It is not being replaced by the recent generated mockups.

The recent icon/thumbnail experiments are treated as **exploratory design research only**. They are not approved production assets, are not a migration target, and must not override the current website artwork.

The durable lesson is:

> **Preserve what works. Refine before reinventing. Standardise presentation before changing identity.**

## Current website categories

For visual-system work, the current website arrangement is the practical source of truth:

### Board & Strategy

- Mega Board
- Ludo
- Connect Four
- Ayo
- Word Board
- Dominoes

### Cards & Casino

- Poker
- WHOT
- Blackjack
- Cheat

### Social & Party

- Hidden Dictator
- Word Game
- Password
- Anagrams Race

This visual grouping may differ from gameplay/engineering taxonomy. That is acceptable: navigation and visual grouping are product-design decisions, while the catalogue documentation may describe mechanics differently.

## Asset model

Each game has two identity resolutions:

1. **Website artwork / thumbnail** — the larger game identity used in the library, discovery and room surfaces.
2. **Compact game glyph** — a simplified derivative used in tabs, room/game chrome and other small identity surfaces.

The compact glyph must come from the established game motif rather than introducing a second unrelated identity.

## What may be refined

A future refinement pass may normalise:

- safe area and motif scale;
- spacing around the artwork;
- corner-radius treatment;
- border/shadow strength;
- depth and lighting;
- small-size readability;
- transparent-background glyph extraction;
- category-level presentation consistency.

These are **presentation-system changes**, not permission to redesign a recognisable game identity unnecessarily.

## What must be preserved

Unless explicitly reopened by the product owner:

- the existing concept/motif for each game;
- the current website artwork as the baseline;
- recognisability at a glance;
- approved individual assets from earlier iterations;
- the game's established colour personality where it is already working.

## Design iteration discipline

HGR visual work follows these rules:

1. **Start from the last approved state.**
2. **Change only the element under review.**
3. **Do not alter approved neighbours while fixing one asset.**
4. **Mockups are exploratory; approval is explicit.**
5. **If an iteration regresses previously approved elements, roll back to the last approved baseline.**
6. **Do not compound mistakes by trying to “save” a failed direction with more redesign.**
7. **Prefer subtle correction over wholesale replacement.**
8. **Review in the real website context before declaring an asset production-ready.**
9. **Documentation records approved rules, not every generated experiment.**
10. **Future redesigns should reuse lessons from both successful and failed explorations.**

## Category logic

Category language remains useful, but it should be subtle.

### Board & Strategy

Physical, spatial and constructed: boards, grids, pieces, tracks and tactile play surfaces. The category should feel solid and geometric without forcing every title to resemble Mega Board.

### Cards & Casino

Tabletop/card presentation: hands, decks, faces, suits, values and tactile table-game depth. Individual card games should remain easy to distinguish.

### Social & Party

Cleaner symbolic identity: clues, roles, words, deduction and communication. These games can be simpler graphically because the gameplay concept is less tied to one physical object.

## Compact glyph behaviour

Compact glyphs should:

- use transparent backgrounds where the surrounding UI already provides the surface;
- preserve the game's established motif;
- remove unnecessary thumbnail-level framing/detail;
- remain legible at small sizes;
- switch in when the player enters the relevant game;
- coexist with the selected HGR theme without requiring a new drawing for every theme.

## Rejected design checkpoint

The multi-game generated mockup iterations produced during the 4.5 exploration are **not approved** and should not be implemented as a batch.

The approved takeaway is the process above, not those assets.

The next time game art is revisited, the work must begin from screenshots/current production assets and proceed one controlled change at a time.
