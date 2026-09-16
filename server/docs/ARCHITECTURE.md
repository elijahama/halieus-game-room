# Architecture

## Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Client | React 18 + TypeScript + Vite | UI, board rendering, controls and animation |
| Server | Node.js + Express + Socket.IO | Authoritative rooms, turns and rule resolution |
| Shared | TypeScript modules | Board model, cards, game state and shared constants |
| Persistence | JSON/NDJSON files | Room recovery and beta feedback |
| Remote public testing | Tailscale Funnel | Public HTTPS access to local port 3000 |

## State flow

```text
Player action
    ↓
Socket.IO client event
    ↓
Server handler validates room / player / phase
    ↓
Rule utility mutates authoritative GameState
    ↓
Server emits game:state
    ↓
All browsers rerender from the same state
```

## Important design rules

1. The server decides outcomes and validates actions.
2. The client should never calculate an authoritative purchase, rent, debt or dice result.
3. Animation can delay presentation but must never alter the server result.
4. Recovery keys are private seat credentials.
5. Active players see opponent assets but opponent cash is intentionally masked in the game UI.
6. Spectators are read-only and may inspect all player cash.

## Persistence

Active rooms are stored under `server/data/rooms.json`. Beta feedback is appended to `server/data/feedback.ndjson`.

A production deployment should mount `server/data` on persistent storage.
