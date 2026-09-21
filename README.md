# Halieus Game Room

**A private, real-time multiplayer game platform for board, card, word and social games.**

**Current milestone:** 4.0.1  
**Frontend:** React · TypeScript · Vite  
**Backend:** Node.js · Express · Socket.IO  
**Development model:** Human-directed, AI-assisted engineering

Halieus Game Room (HGR) began as one large property-trading board game and grew into a shared multiplayer platform. The project now focuses on the systems that make many different games feel like part of the same product: accounts, rooms, invitations, reconnect/recovery, spectators, timers, results, responsive layouts, AI players and production deployment.

> **Core design rule:** the platform owns the shared multiplayer experience; each game owns its own rules.

---

## Contents

- [What HGR is](#what-hgr-is)
- [From one game to a platform](#from-one-game-to-a-platform)
- [Player journey](#player-journey)
- [Game catalogue](#game-catalogue)
- [Architecture](#architecture)
- [Shared platform systems](#shared-platform-systems)
- [Mega Board as a case study](#mega-board-as-a-case-study)
- [Engineering problems solved](#engineering-problems-solved)
- [Production and release engineering](#production-and-release-engineering)
- [Testing and validation](#testing-and-validation)
- [Development process](#development-process)
- [My role](#my-role)
- [AI-assisted development](#ai-assisted-development)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Running locally](#running-locally)
- [Documentation](#documentation)
- [Security and publication boundaries](#security-and-publication-boundaries)

---

## What HGR is

HGR is designed primarily for **private multiplayer sessions between friends**. It is not built around real-money play, public wagering, a store, or a paid virtual-currency economy.

The platform provides one place to:

- sign in with a persistent account;
- browse a shared game catalogue;
- create private rooms;
- join with room codes or invitations;
- play with human players or supported AI opponents;
- recover the same seat after refreshes or temporary disconnects;
- watch supported games as a spectator;
- move between desktop, tablet and phone layouts;
- return to the Game Room without treating every game as a separate application.

The project is still evolving, but the long-term direction is consistent: **adding another game should extend HGR rather than create another standalone product.**

---

## From one game to a platform

HGR originally centred on the property-trading game that became **Mega Board**.

As Mega Board became more complex, many difficult problems stopped being board-specific. Room creation, reconnect logic, player identity, spectators, timers, results, invitations, responsive navigation and deployment were all useful beyond one game.

That led to a structural shift:

> **Halieus Game Room became the application. Individual games became modules inside it.**

This matters because shared multiplayer behaviour can now improve once at platform level while each game remains responsible for its own rules and state.

---

## Player journey

A typical HGR session follows one continuous flow.

### 1. Arrival and sign-in

A fresh visit can present a short branded **Welcome to Halieus Game Room** arrival experience. Theme state should remain consistent from the first frame.

Direct room links, spectators and active-game recovery bypass decorative arrival flows when necessary.

### 2. Game Room

The Game Room is the central hub. From there a player can:

- continue an active room;
- browse games;
- create a new room;
- join with a code;
- see relevant player/room activity;
- access account and shared platform controls.

### 3. Room setup

Games reuse the shared room model while exposing game-specific configuration such as:

- player count;
- human/AI seats;
- AI difficulty;
- timers;
- variants;
- spectator availability;
- rule options.

### 4. Live game

The client requests actions; the server validates them against authoritative room and game state before accepted results are broadcast.

### 5. Recovery

Refreshing the page creates a new network connection, but it should not create a new player, new match or fresh timer.

### 6. Results and return

Completed games use shared result and navigation patterns so players can return to the Game Room without each module inventing an unrelated end flow.

---

## Game catalogue

HGR currently contains fourteen active game entries.

| Category | Games |
| --- | --- |
| **Board & strategy** | Mega Board, Ludo, Connect Four, Ayo |
| **Card & table** | Poker, WHOT, Blackjack, Cheat, Dominoes |
| **Word & party** | Word Board, Word Game, Password, Anagrams Race, Hidden Dictator |

Game identities are defined through shared catalogue data so names, icons and branding can be reused across the homepage, setup screens and live-room UI.

See [docs/GAME_CATALOGUE.md](docs/GAME_CATALOGUE.md) for the catalogue summary.

---

## Architecture

HGR uses a **server-authoritative real-time multiplayer architecture**.

```text
┌──────────────────────────────┐
│ React + TypeScript client    │
│ desktop · tablet · mobile    │
└──────────────┬───────────────┘
               │
        HTTP + Socket.IO
               │
               ▼
┌──────────────────────────────┐
│ Node.js + Express server     │
│                              │
│ Shared platform services     │
│ • accounts / identity        │
│ • rooms / invitations        │
│ • recovery / presence        │
│ • chat / spectators          │
│                              │
│ Authoritative game modules   │
│ • state                      │
│ • rules                      │
│ • validation                 │
│ • AI where supported         │
└──────────────┬───────────────┘
               │
      validated state update
               │
               ▼
┌──────────────────────────────┐
│ Players and spectators       │
│ render server state          │
└──────────────────────────────┘
```

The browser handles presentation and player input. The server handles **game truth**.

### Connect Four request flow

Connect Four provides a simple example:

```text
Player selects a column
        ↓
React client
        ↓
Socket.IO request
        ↓
Room + player lookup
        ↓
Server-side rule validation
        ↓
Authoritative board update
        ↓
Broadcast
        ↓
Players/spectators render state
```

The same pattern is reused for more complex games.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current runtime architecture.

---

## Shared platform systems

The catalogue contains very different games, but their surrounding systems are intentionally shared.

### Accounts and identity

Player identity persists across games rather than treating every room as a completely isolated session.

### Rooms and invitations

The platform handles room creation, room codes, joins/rejoins, invitations, host controls and presence.

### Reconnect and seat recovery

A Socket.IO connection is temporary. A player seat is not.

Reconnect logic maps a returning connection back to the live player/room state instead of silently creating a new match state.

### Server-owned timers

Timers use authoritative deadlines. A browser refresh must not award a fresh turn.

### Spectators

Supported games can expose a read-only state projection to spectators without granting gameplay actions or private information.

### Shared shell and responsive UI

Navigation, account controls, themes, Game Room layout and common result patterns are platform concerns. Individual games remain responsible for adapting their own boards/tables.

---

## Mega Board as a case study

Mega Board is the deepest game system in HGR and has driven many of the platform's harder state-management problems.

Its systems include:

- property ownership and rent;
- auctions;
- trading;
- mortgages;
- houses, hotels and bank building inventory;
- debt resolution;
- bankruptcy;
- configurable rule variants;
- human/AI seats;
- turn/action timers;
- reconnectable multiplayer state.

### Debt resolution

A player who owes more cash than they currently hold is not immediately bankrupt.

The game can enter a debt-resolution state where legal actions such as selling buildings and mortgaging eligible property can raise enough cash to settle the debt.

### Shared rent outcomes

Some rule combinations can produce more than one eligible maximum-rent recipient. The server can divide the single rent obligation deterministically rather than assuming every payment has one creditor.

### Reconnect-safe turns

A refresh changes the socket connection, not the authoritative deadline.

```text
Turn begins at 2:30
      ↓
1:00 passes
      ↓
1:30 remains
      ↓
browser refresh
      ↓
new socket
      ↓
existing seat recovered
      ↓
original deadline retained
```

Mega Board therefore acts as a useful stress test for the wider HGR platform.

---

## Engineering problems solved

HGR development has involved more than adding game screens. Examples of recurring engineering work include:

### Reconnection without timer resets

Socket IDs change after a refresh. Recovery logic must reconnect the new socket to the same player seat while preserving the server's absolute deadline.

### Complex payment/debt state

Mega Board must allow legal liquidation actions before bankruptcy and support debt involving more than one recipient.

### Shared systems without flattening game rules

Room, spectator and recovery infrastructure is shared, while game-specific legality remains inside each module.

### Responsive multiplayer interfaces

The same product needs to remain usable across desktop, tablet and phone layouts without duplicating the application.

### Release-integrity boundaries

Repository files, source-release inputs and production deployment files are not identical sets. Release validation must distinguish them rather than accidentally making portfolio metadata a production dependency.

---

## Production and release engineering

HGR is deployed to a Linux production environment with Node.js, Nginx and HTTPS.

The deployment model is **candidate-first**:

```text
development
   ↓
local validation
   ↓
release preparation
   ↓
release fingerprint / integrity manifest
   ↓
secure transfer
   ↓
candidate dependency install + build
   ↓
candidate validation
   ↓
activation
   ↓
health + fingerprint verification
   ↓
keep release or rollback
```

A failed candidate build should leave the current production application untouched.

Persistent runtime data is kept outside replaceable application releases.

GitHub and Oracle also have intentionally different inclusion rules:

- **GitHub** tracks safe source, documentation, tests and project history.
- **Oracle deployment** receives only what is required to build and run production.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/DEPLOYMENT_FIX_4.0.0.md](docs/DEPLOYMENT_FIX_4.0.0.md).

---

## Testing and validation

HGR uses both automated checks and real multiplayer testing.

Typical release validation includes:

```bash
npm run typecheck
npm run build
npm run test:regression
npm run validate:release
```

Manual testing covers areas that are easy to miss in a single-browser prototype:

- multiple browsers and devices;
- real multiplayer sessions;
- refresh/reconnect;
- turn timers;
- mobile/tablet layouts;
- spectators;
- trading;
- debt and bankruptcy;
- game-specific edge cases;
- candidate deployment behaviour.

A feature is not considered correct simply because it compiles.

See [docs/TESTING.md](docs/TESTING.md) and [docs/VALIDATION_4.0.0.md](docs/VALIDATION_4.0.0.md).

---

## Development process

A typical HGR iteration looks like this:

```text
idea / playtest finding
        ↓
define intended behaviour
        ↓
clarify edge cases
        ↓
AI-assisted implementation
        ↓
static / type / build checks
        ↓
regression testing
        ↓
candidate package
        ↓
production candidate build
        ↓
browser/device/playtest validation
        ↓
accept, reject or revise
```

Many changes begin with an observed multiplayer problem, screenshot or rule inconsistency. The issue is converted into a concrete requirement, implemented, tested and then either accepted or revised.

---

## My role

My role in HGR covers **product direction, technical project development, systems specification, gameplay design and QA**.

I am responsible for:

- defining the overall product direction;
- deciding how the original board-game project evolved into a platform;
- specifying gameplay rules and edge cases;
- defining platform-vs-game responsibilities;
- directing UX and responsive behaviour;
- testing on real devices and in multiplayer sessions;
- identifying regressions;
- accepting, rejecting or revising implementations;
- operating the deployment workflow;
- setting AI behaviour/information boundaries;
- maintaining project documentation and technical understanding.

I do **not** present HGR as software where every line was manually typed by me.

The portfolio value is in the combination of requirements, systems thinking, iteration, testing, deployment and ownership of the final product direction.

---

## AI-assisted development

AI assistance is a substantial and intentionally disclosed part of the project.

AI tools are used for areas such as:

- React / TypeScript / Node implementation;
- debugging;
- refactoring;
- regression-test creation;
- technical analysis;
- documentation;
- release preparation.

The project is best described as:

> **Human-directed, AI-assisted engineering.**

The product owner defines the product, rules, requirements, testing and acceptance decisions. AI tools assist heavily with implementation and iteration.

See [docs/AI_ASSISTED_DEVELOPMENT.md](docs/AI_ASSISTED_DEVELOPMENT.md).

---

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Realtime | Socket.IO |
| Backend | Node.js, Express, TypeScript |
| Desktop/local integration | Windows launcher / Electron-oriented tooling |
| Production | Linux, Nginx, HTTPS, Node.js services |
| Quality | Type checking, regression tests, release-integrity validation |
| Source control | Git + GitHub |

---

## Repository structure

```text
Halieus Game Room/
├── client/                 # React application
│   └── src/
│       ├── platform/       # Shared client/platform systems
│       └── games/          # Game-specific UI
├── server/                 # Node/Express/Socket.IO backend
│   └── src/
│       ├── platform/       # Shared server systems
│       └── games/          # Authoritative game logic
├── shared/                 # Shared contracts/models
├── desktop/                # Desktop integration
├── assets/                 # Shared/static assets
├── docs/                   # Technical and project documentation
├── scripts/                # Build/release tooling
├── tests/                  # Regression/runtime checks
├── RELEASE.json            # Release integrity identity
└── VERSION                 # Current product version
```

The same HGR folder is used for development, Git history and release preparation. Private runtime/deployment material is excluded through repository safety rules.

---

## Running locally

### Requirements

- Node.js 20.19+
- npm

### Install

```bash
npm install
```

### Start the backend

```bash
npm --workspace server run dev
```

### Start the frontend

```bash
npm --workspace client run dev
```

### Type-check

```bash
npm run typecheck
```

### Production build

```bash
npm run build
```

Environment-specific values should come from safe example configuration. Real secrets must never be committed.

---

## Documentation

The repository contains both current technical documentation and historical development records.

Start here:

- [Current architecture](ARCHITECTURE.md)
- [Documentation index](docs/README.md)
- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Game catalogue](docs/GAME_CATALOGUE.md)
- [Data model](docs/DATA_MODEL.md)
- [Socket events](docs/SOCKET_EVENTS.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Development process](docs/DEVELOPMENT_PROCESS.md)
- [AI-assisted development](docs/AI_ASSISTED_DEVELOPMENT.md)
- [4.0.0 audit](docs/AUDIT_4.0.0.md)
- [4.0.0 validation](docs/VALIDATION_4.0.0.md)

Older RC and patch notes remain part of the project's history but are not the current source of truth.

---

## Security and publication boundaries

The repository is being prepared as a portfolio-safe engineering record.

It must not contain:

- SSH/private keys;
- cloud credentials;
- real `.env` secrets;
- production account/player/session data;
- invite/recovery secrets;
- runtime databases;
- private backups;
- workstation-specific operator files;
- generated dependency/build directories.

See [SECURITY.md](SECURITY.md) and [docs/PUBLICATION_CHECKLIST.md](docs/PUBLICATION_CHECKLIST.md).

---

## Current direction

Current work is focused on:

- 4.0.1 mobile-first layout recovery and clearer post-match/ranked results;
- visual consistency across game modules;
- reconnect/recovery reliability;
- responsive/mobile refinement;
- stronger automated regression coverage;
- clearer current-vs-historical documentation;
- public portfolio presentation;
- continuing gameplay polish across the catalogue.

---

Halieus Game Room is intended to show not only **what was built**, but **how a single game evolved into a multiplayer platform through requirements, architecture, testing, deployment and repeated iteration**.
