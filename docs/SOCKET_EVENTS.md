# Socket Event Reference

The browser communicates with the authoritative game server through Socket.IO. Client actions should use these events rather than mutating game state locally.

| Client event | Server handler |
| --- | --- |
| `disconnect` | `disconnectHandler.ts` |
| `game:add-ai` | `aiLobbyHandlers.ts` |
| `game:auction-bid` | `auctionHandlers.ts` |
| `game:auction-space-select` | `megaSpaceHandlers.ts` |
| `game:auction-withdraw` | `auctionHandlers.ts` |
| `game:birthday-gift-cash` | `megaSpaceHandlers.ts` |
| `game:birthday-gift-ticket` | `megaSpaceHandlers.ts` |
| `game:build` | `buildingHandlers.ts` |
| `game:build-depot` | `depotHandlers.ts` |
| `game:bus-ticket-cancel` | `megaSpaceHandlers.ts` |
| `game:bus-ticket-move` | `megaSpaceHandlers.ts` |
| `game:bus-ticket-start` | `megaSpaceHandlers.ts` |
| `game:card-continue` | `cardHandlers.ts` |
| `game:create` | `lobbyHandlers.ts` |
| `game:declare-bankruptcy` | `bankruptcyHandlers.ts` |
| `game:decline-purchase` | `purchaseHandlers.ts` |
| `game:end-room` | `sessionHandlers.ts` |
| `game:end-turn` | `turnHandlers.ts` |
| `game:jail-pay` | `jailHandlers.ts` |
| `game:jail-roll` | `jailHandlers.ts` |
| `game:jail-use-card` | `jailHandlers.ts` |
| `game:join` | `lobbyHandlers.ts` |
| `game:leave` | `sessionHandlers.ts` |
| `game:leave-spectator` | `lobbyHandlers.ts` |
| `game:mortgage` | `assetHandlers.ts` |
| `game:order-roll` | `orderHandlers.ts` |
| `game:pay-debt` | `bankruptcyHandlers.ts` |
| `game:preview` | `lobbyHandlers.ts` |
| `game:purchase` | `purchaseHandlers.ts` |
| `game:reconnect` | `lobbyHandlers.ts` |
| `game:remove-ai` | `aiLobbyHandlers.ts` |
| `game:roll` | `gameplayHandlers.ts` |
| `game:sell-building` | `assetHandlers.ts` |
| `game:sell-depot` | `depotHandlers.ts` |
| `game:set-autopilot` | `autopilotHandlers.ts` |
| `game:spectate` | `lobbyHandlers.ts` |
| `game:speed-die-mr-monopoly` | `speedDieHandlers.ts` |
| `game:speed-die-take-ticket` | `speedDieHandlers.ts` |
| `game:speed-die-triple-move` | `speedDieHandlers.ts` |
| `game:start` | `lobbyHandlers.ts` |
| `game:trade-accept` | `tradeHandlers.ts` |
| `game:trade-decline` | `tradeHandlers.ts` |
| `game:trade-propose` | `tradeHandlers.ts` |
| `game:unmortgage` | `assetHandlers.ts` |

## Core server broadcasts

The primary browser-facing broadcasts are:

- `lobby:updated` — waiting-room membership or connection-state change
- `game:started` — host started the room
- `game:state` — authoritative game-state update
- `game:ended` — room was closed
- `game:session-replaced` — the same recovery seat was resumed elsewhere

## Notes

- `game:spectate` joins an already-started game in read-only mode.
- `game:leave-spectator` leaves the Socket.IO room without affecting the game.
- Speed Die BUS tickets are awarded automatically before the movement choice. Current clients use `game:speed-die-bus-move`; the legacy `game:speed-die-take-ticket` action is rejected with an upgrade message.
- All action handlers validate the game room and relevant turn phase before mutation.
