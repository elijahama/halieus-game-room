# HGR gallery-first adaptive mobile design — 4.6.6

**Decision: owner-approved 26 October 2026. Candidate version 4.6.6. Applies to every current and future HGR game.**

## The visual rule

"Gallery view" is the canonical owner term, **not simply "tiled"**. On mobile and tablets, **collections** of players, properties/assets, participant states, room seats, team panels and supporting information should display as adjacent, compact, responsive gallery cards wherever useful. Optimize visible information density and reduce needless vertical scrolling. Preserve legible names, status, badges, icons, keyboard focus, touch actions and expanded details.

- **Phone, typically 320–699px:** two cards per gallery row when the actual containing panel can fit them; no page-level horizontal overflow.
- **Tablet portrait, typically 700–980px:** three compact cards per row for suitably wide collections, two for natural team pairs or Mega Board player rail.
- **Larger/landscape layouts:** honor existing game-specific responsive compositions; don't force a mobile grid onto a physical table/board.
- Use `minmax(0,1fr)`, wrapping labels, shrinking grid children, accessible buttons and deliberate alignment. Never shrink text or make controls non-interactive to achieve density.
- **Never gallery-convert core gameplay geometry:** Mega Board board/squares, Connect Four 7×6 grid, Ayo pit rows, Ludo race board, Word Board cells, Poker seat positions, WHOT playable hand, Blackjack dealer cards, hidden role/policy state, secret hands or the turn-action interface. Gallery collection presentation must not change legal gameplay or spectator visibility.
- Word Game's daily summary was already a 2-card gallery; retain it. Ranking lists remain ordered when position/comparisons would be obscured by masonry layouts.
- Team settings, complete per-card rosters and major dialogs remain accessible, with content stacked inside each card instead of accidentally pushed beyond the screen.

## Current catalog mapping — all 14

| Game | Gallery-treated mobile collections |
|---|---|
| Mega Board | Live player/spectator card rails; individual property/asset chips |
| Poker | Waiting-room seat cards; physical dealer/seat board remains untouched |
| Blackjack | Lobby seat cards and live participant seat groups |
| WHOT | Lobby seats and opponents, without showing hidden hands |
| Ludo | Waiting-room roster and ongoing player progress |
| Hidden Dictator | Lobby seats and live public player cards; private roles untouched |
| Connect Four | Waiting-room players, normal 7×6 game board protected |
| Word Game | Existing daily statistics collection retained; guess grid untouched |
| Password | Team gallery and team membership; clue/secret stays protected |
| Anagrams Race | Lobby roster and live public scoreboard |
| Cheat | Lobby and active public player cards; hidden cards untouched |
| Dominoes | Lobby and active public player cards; chain geometry untouched |
| Ayo | Lobby player cards, sowing pit layout untouched |
| Word Board | Waiting-room roster; word-tile board and rack untouched |

## Implementation / QA

The first shared gallery layer is intentionally **CSS-only presentation** attached to existing game components, with no replacements of in-game assets, logos, proprietary images or the canonical HGR H. Old game-specific styles remain, and the appended responsive rules enforce common two-up and tablet three-up collections. A single Playwright regression checks each authoritative catalog game ID at 320, 390, 600, 768 and 900px; no horizontal overflow, preserved real buttons and property gallery columns.

This is **Batch 1** (global collection foundation). Game-by-game full interactive mobile acceptance—including exact real match states, player actions, asset quantities, selection and post-match UI—is a separate audited continuation. Do not describe CSS smoke tests alone as proof all 14 game flows have been completely playtested. Merge/release requires Linux+Windows CI and actual device QA. No production deployment or admin feedback status changes are implied by this entry.

### Going forward

When adding any new HGR game or collection, prefer this **gallery-first adaptive mobile composition** for mobile people/assets/info, while keeping actual game board and time-critical controls stable. Add the new game to the corresponding automated gallery map/test and verify phone and tablet after every new large screen.
