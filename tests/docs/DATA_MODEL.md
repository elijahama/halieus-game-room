# Data Model

## GameRoom

Server room metadata is defined in `server/src/games/mega-board/types/game.ts`.

Important fields:

- `code` — room code
- `ranked` — Ranked/Casual mode
- `hostId` — current host socket id
- `players` — lobby/recovery player records
- `started` — whether the match has begun
- `gameState` — authoritative match state after start
- `hostDisconnectDeadline` — grace-period deadline
- `freeParkingJackpotEnabled` — casual jackpot rule selected by host

## GameState

Shared authoritative state is defined in `shared/games/mega-board/game-state.ts`.

Major groups:

### Players

Each `GamePlayer` stores position, cash, owned property ids, Bus Tickets, Jail cards, Jail status, AI/Autopilot configuration and connectivity state.

### Ownership and development

- `propertyOwners`
- `propertyDevelopments`
- `railroadDepots`
- `mortgagedProperties`
- `bankInventory`

### Blocking actions

Only one major blocking action should control a turn at a time:

- `pendingPurchase`
- `pendingAuction`
- `pendingTrade`
- `pendingDebt`
- `pendingCard`
- `pendingJailMove`
- `pendingMegaAction`
- `pendingSpeedDieAction`

### Decks

- `chanceDeck`
- `communityChestDeck`
- `busTicketDeck`
- `busTicketsDiscarded`

### Turn engine

- `currentPlayerIndex`
- `phase`
- `turnPhase`
- `movedThisTurn`
- `awaitingReroll`
- `lastDiceRoll`
- `speedDieRetired`, which mirrors whether every ownable asset currently has an owner
- `consecutiveDoubles`
- `turnNumber`
- `winnerId`

### Match history

`activityLog` keeps player-attributed and game-wide actions for the in-game History panel and post-game per-player action history. RC.3.3.6 retains up to 5,000 entries per match.

`playerStats` stores cumulative action counters, rent totals, Bus Ticket usage, revenue, expenses, elimination snapshots and graph history. It also stores the live `kassManeuvers` count plus `lastTrackedPosition` so Birthday Gift and GO transitions are counted during gameplay rather than reconstructed after the match. Revenue/expense fields are event-ledger values and starting cash is not counted as revenue.

`globalNotices` is a bounded queue of transient gameplay notifications so rapid actions do not overwrite each other. Free Parking uses a dedicated `free-parking` notice kind. `lastGlobalNotice` remains as a compatibility pointer to the newest notice.

## Privacy presentation

The authoritative server state still contains complete player cash for rule resolution. The active-player UI deliberately masks opponent cash. Spectator mode is read-only and displays all cash.
