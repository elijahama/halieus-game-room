# Game Catalogue

## Board and strategy

| Game | Focus |
| --- | --- |
| Mega Board | Property trading, auctions, development, mortgages, debt resolution and configurable rules |
| Ludo | Multiplayer race board game |
| Connect Four | Server-validated turn-based strategy |
| Ayo | Traditional Yoruba seed game |

## Card and table

| Game | Focus |
| --- | --- |
| Poker | Multiplayer Texas Hold'em |
| WHOT | Card-shedding game with Nigerian-oriented rules support |
| Blackjack | Multiplayer casino-style card game |
| Cheat | Bluffing card game |
| Dominoes | Multiplayer tile game |

## Word and party

| Game | Focus |
| --- | --- |
| Word Board | Board-based word game |
| Word Game | Five-letter word game |
| Password | Clue-and-guessing game |
| Anagrams Race | Real-time word race |
| Hidden Dictator | Social-deduction game |

All games should reuse shared HGR platform identity, room/reconnect systems and common navigation where appropriate, while retaining authoritative game-specific rules.

## Confirmed Coming Soon roadmap (24 October 2026)

These entries are informational library previews, not playable games. Do not register them as ACTIVE_GAME_IDS, create-room options, Ranked results, or stable game versions.

| Planned game | Status | Intended scope |
| --- | --- | --- |
| Tic-Tac-Toe / Noughts and Crosses | Shared rules foundation only; multiplayer pending | Separate 3×3, 4×4, 5×5 Casual and Ranked formats |
| Villagers & Mafia | Planned | Social deduction; independent design and security review |
| Settlers | Planned | Original HGR settlement and trading rules |
| Spot the Match | Planned | Fast visual matching game |

Poker also has **planned formats within the existing Poker module**, not separate games: Omaha, Five-Card Draw and Seven-Card Stud. Texas Hold'em remains the currently playable variant. The Coming Soon panel separates these formats from independent game titles.

Older documentation sometimes labels Blackjack, WHOT and Hidden Dictator as Coming Soon, but current code lists them as available or Beta. Preserve present runtime truth rather than moving them into Coming Soon. Tournament Mode is a future platform mode on hold, not a separate game. Any additional games without a confirmed title stay unlisted until verified rather than invented.

Source of truth: `client/src/platform/games/catalog.ts` supplies noninteractive future queues; `client/src/platform/components/HomeScreen.tsx` renders Coming Soon. Existing branding and launcher assets are untouched.
