# Halieus Game Room 3.5.25

## Purpose
3.5.25 is a stabilization-first Game Room UI release. It deliberately avoids a simultaneous rewrite of game engines after the 3.5.20–3.5.24 deployment/layout regressions.

## Implemented
- Added persistent `System / Light / Dark` theme modes.
- `System` follows the operating-system colour scheme and reacts if the OS theme changes while Halieus is open.
- Theme mode is stored in the site/browser settings and is available from the Game Room sidebar and every existing in-game Display & Sound menu.
- Expanded the Players view into a searchable/filterable hub (`All / Online / In Game / Offline`).
- Players currently visible in a live Halieus room show the game and room code.
- Player profiles expose Games Played, Wins, Win Rate, per-game records and recent results.
- When a selected player is in a joinable/spectatable live room, the profile exposes native Join/Spectate actions.
- Rebalanced the Games library on desktop with larger cards and denser use of the available content area.
- Preserved the existing Home active-room flow (`Join / Spectate / Continue`).

## Protected / intentionally unchanged
- Poker table component and Poker server gameplay handlers.
- Ludo board component and Ludo server gameplay handlers.
- Oracle website updater logic.
- Server runtime/index routing.
- Existing game rules and networking protocols.
- No new site-wide CSS `zoom` or `transform: scale()` workaround was introduced.

## New-game roadmap
The requested new games remain approved for implementation as isolated modules: Villagers & Mafia, Wordle-style, Catan-style, Spot-the-Match/Dobble-style, Cheat/BS, Dominoes, Password and Anagrams Race.

They are **not falsely labelled as complete in 3.5.25**. Shipping eight new multiplayer engines in the same stabilization patch would directly conflict with the project requirement not to destabilize the working games. They should land as separate tested releases after this UI/platform baseline is confirmed.

## Validation
`tests/regression-3.5.25.mjs` checks release/version markers, tri-state theme support, Players live-room tooling, and protected-source hashes for Poker, Ludo, updater and server runtime files.
