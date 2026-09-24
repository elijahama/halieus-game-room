# HGR Game Visual Identity System

Status: HGR 4.5 design-system work  
Scope: the fourteen current HGR games and every future game added to the catalogue.

## Core rule

HGR does not design every game from zero.

Every game belongs to a broad visual family. That family defines the shared design language for:

1. the **website thumbnail** used in discovery/catalogue surfaces;
2. the **game glyph** used in browser tabs, compact navigation, room/game chrome and other small identity surfaces;
3. the **category design philosophy** that future games inherit before game-specific details are added.

This system exists so a new game can be designed by applying an established category grammar instead of re-inventing its visual language.

## Current categories

### Board & strategy

- Mega Board
- Ludo
- Connect Four
- Ayo

### Card & table

- Poker
- WHOT
- Blackjack
- Cheat
- Dominoes

### Word & party

- Word Board
- Word Game
- Password
- Anagrams Race
- Hidden Dictator

## Asset hierarchy

The category language comes first, then the individual game.

```text
HGR platform identity
        ↓
game category
        ↓
category thumbnail grammar + category glyph grammar
        ↓
individual game motif
        ↓
theme-aware variations
```

A game may be recognisable and distinctive, but it should still be immediately obvious which visual family it belongs to.

## 1. Website thumbnails

The thumbnail is the expressive, larger-format identity for a game.

It is allowed more detail than the glyph and may communicate:

- the physical character of the game;
- characteristic pieces, cards, tiles, board geometry or social/word activity;
- category-specific composition;
- atmosphere and colour;
- one clear game-specific focal motif.

The thumbnail must still follow the category's composition rules, material treatment, depth, framing and information density.

The category rule should be visible even before the player reads the title.

## 2. Game glyphs

The glyph is the compact identity for the same game.

It is used where the full thumbnail would be too detailed, including:

- browser/tab identity;
- compact navigation;
- in-game or room header identity;
- small game-selection controls;
- favicon-scale or similar small surfaces where appropriate.

Glyphs must:

- use a transparent background where the surface already supplies the background;
- remain legible at small sizes;
- use one dominant silhouette;
- avoid thumbnail-level detail;
- preserve the same game motif used by the thumbnail;
- inherit the current HGR/theme colour treatment where that surface is theme-aware;
- switch to the game's own established glyph when the player enters that game's room/board/table.

The glyph and thumbnail are two resolutions of the same identity, not unrelated artwork.

## 3. Category design philosophies

Each category must receive a documented visual grammar before all of its games are redesigned.

That grammar should define:

- composition;
- silhouette language;
- material treatment;
- depth/lighting;
- border/framing behaviour;
- amount of detail;
- category colour behaviour;
- typography interaction where relevant;
- thumbnail rules;
- glyph rules;
- examples of valid and invalid treatments.

### Board & strategy family

To be designed first from Mega Board, Ludo, Connect Four and Ayo.

The family should communicate physical play-space, pieces, movement, positioning and strategy without forcing every game to look like Mega Board.

### Card & table family

To be designed from Poker, WHOT, Blackjack, Cheat and Dominoes.

The family should communicate table play, hands/decks/tiles, tactile game pieces and card-table atmosphere while preserving strong individual motifs.

### Word & party family

To be designed from Word Board, Word Game, Password, Anagrams Race and Hidden Dictator.

The family should communicate communication, language, clues, social interaction, speed or deduction without collapsing every title into the same speech-bubble or letter-tile icon.

## Design process for each category

Do not begin by generating all fourteen individual icons.

For each category:

1. Select the games in that category.
2. Establish the category's thumbnail grammar.
3. Establish the category's glyph grammar.
4. Produce one representative game as the reference implementation.
5. Review and approve that reference.
6. Apply the same grammar to the remaining games in the category.
7. Check the full category side by side for family resemblance and game-level distinction.
8. Check all category families together so HGR still feels like one product.
9. Record the approved rules in this document/model sheet.
10. Future games inherit the nearest approved category system before any new exceptions are introduced.

## Theme behaviour

Game identity and HGR theme identity are related but separate.

The platform theme owns the surrounding UI. The game glyph may adapt its colour treatment to the selected theme where appropriate, but its core silhouette and game-specific motif must remain stable.

When the player enters a specific game, shared generic game identity should give way to that game's glyph in compact game-specific surfaces.

No theme should require redesigning the glyph from scratch.

## Consistency rule

If two games belong to the same category, their assets should look like they were designed by the same system.

If two games are different games, their assets should still be distinguishable without relying on text.

If a new game requires an entirely different visual grammar, that should be treated as a deliberate category-system decision rather than an ad-hoc one-off.

## Current design checkpoint

The category list is now fixed for this exercise:

**Board & strategy:** Mega Board, Ludo, Connect Four, Ayo  
**Card & table:** Poker, WHOT, Blackjack, Cheat, Dominoes  
**Word & party:** Word Board, Word Game, Password, Anagrams Race, Hidden Dictator

The next design task is to establish the first category system before producing the complete icon set.
