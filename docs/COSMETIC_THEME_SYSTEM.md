# HGR Cosmetic Theme System

Status: HGR 4.5 foundation

HGR separates **platform themes** from **game-surface cosmetics**.

A theme or skin may change presentation, but never game rules, hitboxes, information visibility, odds, ranking calculations or multiplayer authority.

## Layers

```text
HGR platform theme
        ↓
shared shell / menus / controls
        ↓
game surface slot
        ↓
board / table / deck cosmetic
```

The platform theme and the game cosmetic are independent. A player can use a light HGR shell with a dark Poker table, or a retro HGR shell with the standard Mega Board.

## Current cosmetic slots

- `interface` — shared shell framing.
- `cards` — card backs/deck treatment.
- `mega-board` — Mega Board field, space materials and atmosphere.
- `poker-table` — Poker felt, rail and table-room treatment.

Future board/table games should add a dedicated surface slot only when their visual surface genuinely needs one. They should not overload an unrelated slot.

## Layout rule

Cosmetics may change:

- colour;
- texture;
- material feel;
- border/rail treatment;
- atmosphere;
- card backs;
- decorative accents.

Cosmetics must not change:

- board geometry;
- control placement;
- hitboxes;
- gameplay state;
- information available to a player;
- game rules;
- ranking or reward calculations.

## Retro families

HGR 4.5 introduces four original retro-console-inspired families without copying console logos or proprietary artwork:

- **8-bit Ivory** — warm ivory, restrained red and charcoal.
- **16-bit Lavender** — soft grey, lavender and violet.
- **Black Drive** — graphite black, metallic grey and restrained red.
- **Grey Disc** — cool hardware grey, muted blue and small primary-colour details.

The four families exist as platform theme profiles and as matching Mega Board/Poker surface cosmetics.

## Competitive / muted family

**Muted Tournament** is a free alternative Mega Board surface and **Muted Poker Room** is a free alternative Poker table.

They preserve the approved layouts while lowering saturation and making the playing surface feel more restrained and competition-oriented.

## Unlock contract

The cosmetic model supports:

- starter/free;
- games played;
- wins;
- live game rating;
- achievement;
- guild milestone;
- seasonal/event flag.

A rating gate may only use a real rating source for that game.

Mega Board currently has an active ranked rating source, so rating-gated cosmetics may consume it.

Poker's ranking formula is still in calibration. Poker cosmetics therefore use play/win requirements until that game has a real rating table. HGR must never fabricate Elo purely for cosmetic progression.

## Current progression examples

Mega Board:

- Muted Tournament — starter alternative.
- 8-bit Ivory — play 5 Mega Board games.
- 16-bit Lavender — win 3 Mega Board games.
- Black Drive — play 12 Mega Board games.
- Grey Disc — reach 1200 Mega Board rating.

Poker Table:

- Muted Poker Room — starter alternative.
- 8-bit Ivory — play 5 Poker games.
- 16-bit Lavender — win 3 Poker games.
- Black Drive — play 12 Poker games.
- Grey Disc — win 8 Poker games.

These are cosmetic requirements only and do not affect matchmaking or game results.

## Beta/Test Lab

Normal Owner/Admin play follows normal player progression.

Beta/Test Lab may preview every cosmetic for the active beta session. Preview access does not grant permanent ownership and is cleared when leaving Test Lab.

## Persistence and safe fallback

Normal equipped cosmetics persist in local preferences.

Beta preview choices persist only in session storage.

If a saved cosmetic no longer exists, HGR falls back to the default cosmetic for that slot.

If an unlock rule changes, HGR only falls back after the required unlock data is actually known. Asynchronous rating data loading must not unequip a valid saved cosmetic during startup.

## Future games

When adding a new game:

1. keep its approved gameplay layout intact;
2. identify the visual surface that can safely vary;
3. add a dedicated cosmetic slot only if needed;
4. define the default cosmetic first;
5. add alternate cosmetics through shared unlock metadata;
6. use real game progression/rating sources only;
7. regression-test that the cosmetic cannot change rules or geometry.
