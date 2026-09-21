# HGR 4.1.0 Implementation Log

## Scope

HGR 4.1.0 introduces **Guilds & Persistent Groups** as a platform-level social system.

The feature sits above individual game rooms. It does not replace HGR accounts, room creation, Socket.IO game state, session recovery, rankings or game-specific server validation.

The design rule is:

> A guild organises players and rooms. Existing HGR game modules still own gameplay truth.

## Player-facing features

### Persistent guilds

Authenticated players can:

- create a private guild;
- join a guild with a private invite code;
- belong to multiple guilds;
- browse their guilds inside the existing Players/social area.

Public guild search/discovery is intentionally not part of 4.1.0.

### Guild roles

Each guild has server-validated roles:

- Owner
- Admin
- Moderator
- Member

Room-creation policy can be configured as:

- any member;
- moderators and above;
- admins and owner only.

Role and permission checks happen on the server. Client controls are presentation only.

### Persistent chat

Each guild starts with one persistent chat.

Guild chat is separate from live Room Chat:

- Room Chat belongs to one active game room.
- Guild Chat persists between games.

4.1.0 intentionally starts with one guild chat rather than a channel system.

### Guild-organised rooms

A guild member with permission can choose any active HGR game and reserve a normal six-character HGR room code.

The client then opens the existing game setup using that reserved code.

This is important architecturally: Guilds does not create a second room/game engine. Once the player confirms setup, the normal game module creates and validates the room exactly as it would for a non-guild game.

### Guild room history and live actions

Guild room records can show:

- game;
- room code;
- creator;
- setup/live/completed state;
- winner where applicable;
- participant history.

When a reserved guild room appears in the existing platform live-room list, guild members receive the normal Join/Spectate actions.

### Internal guild leaderboard

Completed guild-organised sessions contribute to an internal guild table.

The initial leaderboard records:

- games played;
- wins;
- win rate;
- rooms hosted.

This is intentionally separate from game-specific Ranked ratings. Guild statistics do not alter Mega Board, Poker or other Ranked rating calculations.

## Architecture

### Shared contracts

File:

`shared/platform/guilds.ts`

Contracts cover:

- roles;
- room-creation policy;
- members;
- messages;
- rooms;
- leaderboard rows;
- guild summaries/details.

Completed room history stores stable participant and winner account IDs when they can be resolved, with names retained for display/legacy fallback.

### Durable server data

Files:

- `server/src/platform/dataPaths.ts`
- `server/src/platform/guilds.ts`

Guild persistence follows the existing runtime-data rule.

When production sets `HALIEUS_DATA_DIR`, guild data lives under:

```text
<HALIEUS_DATA_DIR>/guilds/guilds.json
```

Local development falls back to:

```text
server/data/guilds/guilds.json
```

The store is written through a temporary file and rename so the release tree remains replaceable and runtime guild data survives deployments.

### Authentication boundary

File:

`server/src/platform/accounts.ts`

Guild routes use the canonical account/session store through:

```ts
getAuthenticatedAccount(request)
```

The Guild service does not re-parse or duplicate the private Halieus session-cookie implementation.

### Guild REST API

File:

`server/src/platform/guilds.ts`

Initial routes:

```text
GET    /guilds
POST   /guilds
POST   /guilds/join
GET    /guilds/:guildId
POST   /guilds/:guildId/messages
POST   /guilds/:guildId/rooms
PATCH  /guilds/:guildId
POST   /guilds/:guildId/invite/regenerate
POST   /guilds/:guildId/members/:accountId/role
DELETE /guilds/:guildId/members/:accountId
```

Guild responses are included in the platform `Cache-Control: no-store` boundary.

### Why REST, not a game socket

A guild exists when no game is active, so its canonical state is not tied to a specific room Socket.IO connection.

4.1.0 uses authenticated REST for guild membership, settings, chat and room reservations. The client refreshes an open guild periodically.

This keeps persistent social state separate from short-lived gameplay sockets.

A future version can add real-time guild push events without changing the persistence model.

## Game-result projection

File:

`server/src/platform/sessionArchive.ts`

The canonical session archive remains the point at which a completed HGR game is considered durable.

After the final archive file is safely written, `recordGuildSessionResult(...)` checks whether the game + room-code pair belongs to a guild reservation.

If it does, the guild history is updated with:

- completed/ended state;
- participants;
- stable participant account IDs where resolvable;
- winner and winner account ID where resolvable;
- completion time;
- a system message in guild chat.

If guild projection fails, the already-written canonical session archive remains valid. Guild social metadata therefore cannot invalidate the game result.

## Client integration

Files:

- `client/src/platform/components/HomeScreen.tsx`
- `client/src/platform/components/GuildsPanel.tsx`
- `client/src/index.css`

Guilds lives inside the existing Players/social area.

The permanent mobile bottom navigation remains:

```text
Home · Games · Join · Players
```

While Guilds is open, Players remains the active social nav item.

The Guilds UI contains four sections:

- Rooms
- Chat
- Leaderboard
- Members

The layout has explicit desktop, tablet and phone arrangements and uses the shared Halieus visual system.

## Important code comments

4.1.0 adds source comments around non-obvious boundaries including:

- why Guilds authenticates through the existing account store;
- why Guilds is REST-backed rather than game-socket-owned;
- why guild rooms reserve normal HGR room codes;
- why session results are projected only after the canonical archive write;
- why quiet background polling must not overwrite active guild-settings edits;
- why the social UI remains inside the existing Halieus shell.

## 4.1.0 limitations / deliberate first-version boundaries

The first Guilds release intentionally does not include:

- public guild discovery/search;
- public guild pages;
- multiple chat channels;
- guild-owner transfer;
- custom guild images/banners;
- an independent guild rating algorithm;
- a second guild-specific gameplay server;
- automatic conversion of every team-result string into an individual win when no member can be resolved.

Guild room records begin as a social **setup reservation**. The normal game server becomes authoritative only when the creator completes the ordinary HGR room setup.

## Regression coverage

`tests/regression-4.1.0.mjs` protects:

- canonical 4.1.0 version alignment;
- regression-chain ordering;
- guild role/room-policy contracts;
- private invite joining;
- persistent messages;
- room reservation;
- server-side permissions;
- canonical account authentication boundary;
- server registration/startup loading;
- session-archive result projection;
- Game Room social integration;
- Rooms/Chat/Leaderboard/Members client surface;
- phone Guild layout;
- current browser/PWA asset identity;
- README milestone.

Historical 4.0.x regression tests now accept later HGR 4.x versions while continuing to assert their original behavioural contracts.

## Validation boundary

Repository-level guards are committed, but dependency-backed validation must run in the canonical laptop project before release finalisation:

```bash
npm run typecheck
npm run build
npm run test:regression
```

After those pass:

```bash
npm run prepare:release
```

`RELEASE.json` and `shared/release.ts` remain generated files and must not be hand-edited.
