# Halieus Game Room architecture

Version baseline: `0.22.9-rc.3.3.26`

## Core rule

**Halieus Game Room is the application. Games are modules.** No individual game should become the parent application again.

A feature belongs to the platform layer when it is reusable across games: room lifecycle, shared waiting-room patterns, spectators, recovery/rejoin, identity, duration/time metadata, notifications, browser metadata, responsive shell behavior, networking infrastructure, and shared visual primitives.

A feature belongs to a game module when it implements that game's rules or presentation. Examples: Mega Board dice/properties/Bus Tickets/trading, Poker cards/blinds/pots/raises, Blackjack hands/dealer logic, and WHOT card/rule handling.

## Client boundaries

- `client/src/platform/` — Halieus shell, common controls and networking.
- `client/src/games/mega-board/` — existing Mega Board UI, client types, hooks, styles and reports.
- `client/src/games/poker/` — Poker UI and client contracts.
- `client/src/games/blackjack/` — reserved for Blackjack implementation.
- `client/src/games/whot/` — reserved for WHOT implementation.

`client/src/App.tsx` remains the top-level composition bridge for this migration release. As shared lobby/recovery/spectator systems are extracted, they should move into `client/src/platform/` rather than into any game folder.

## Server boundaries

- `server/src/index.ts` — Halieus process/bootstrap only.
- `server/src/games/mega-board/` — Mega Board AI, handlers, state, types and rule utilities.
- `server/src/games/poker/` — Poker engine, handlers and types.
- Blackjack and WHOT receive equivalent authoritative game modules when implemented.

Cross-game infrastructure introduced later must live under a platform-level server module rather than a specific game.

## Shared contracts

Mega Board's mature shared rules/state now live at `shared/games/mega-board/`. Cross-game contracts should be added under `shared/platform/`. New games should use their own `shared/games/<game>/` area only when a contract genuinely needs to be shared between client and server.

## Packaging

The extracted Windows package contains a single application folder named `Halieus Game Room`. Launch/close shortcuts operate on the application, not Mega Board. Individual game icons remain assets used by the Game Room UI and browser context.
