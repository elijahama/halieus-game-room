# Halieus Game Room

**A private, real-time multiplayer game platform for board, card, word and social games.**

**Current milestone:** 4.5.2  
**Frontend:** React · TypeScript · Vite  
**Backend:** Node.js · Express · Socket.IO  
**Development model:** Human-directed, AI-assisted engineering

Halieus Game Room (HGR) began as one large property-trading board game and grew into a shared multiplayer platform. The project now focuses on the systems that make many different games feel like part of the same product: accounts, persistent guilds, rooms, invitations, reconnect/recovery, spectators, timers, results, responsive layouts, AI players and production deployment.

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
- [Project timeline](#project-timeline)
- [Security and publication boundaries](#security-and-publication-boundaries)

---

## What HGR is

HGR is designed primarily for **private multiplayer sessions between friends**. It is not built around real-money play, public wagering, a store, or a paid virtual-currency economy.

The platform provides one place to:

- sign in with a persistent account;
- create or join private persistent guilds;
- use guild chat, member roles and an internal guild game record;
- browse a shared game catalogue;
- create private rooms;
- organise normal HGR game rooms from inside a guild;
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

### Guilds and persistent groups

HGR 4.1.0 adds a persistent social layer above individual game rooms. Players can create or join private guilds, keep a group chat between game nights, organise members with server-validated roles and permissions, and reserve normal HGR game rooms from inside the guild.

Guilds deliberately do **not** own gameplay state. A guild room reservation hands the player back to the existing game setup and server-authoritative game module. When that normal HGR session is finalized, the session archive projects the result into the matching guild history and internal leaderboard.

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

HGR also supports **Openshard development receipts** as an optional local provenance layer around supported AI coding-agent sessions. Those receipts complement Git history by recording the evidence available from an AI-assisted run without making receipt data part of the player-facing application or production runtime.

The project treats provenance and validation as separate concerns: Openshard records available agent-session evidence, Git records the source history, HGR's release gate validates project contracts, and human QA decides whether the result is accepted.

See [docs/AI_ASSISTED_DEVELOPMENT.md](docs/AI_ASSISTED_DEVELOPMENT.md) and [docs/OPENSHARD.md](docs/OPENSHARD.md).

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
- [Openshard development receipts](docs/OPENSHARD.md)
- [AI provenance architecture](docs/project/HGR_AI_PROVENANCE_ARCHITECTURE.md)
- [4.0.0 audit](docs/AUDIT_4.0.0.md)
- [4.0.0 validation](docs/VALIDATION_4.0.0.md)
- [4.1.0 deployment debugging postmortem](docs/project/HGR_4.1.0_DEPLOYMENT_DEBUGGING_POSTMORTEM.md)
- [4.1.1 release notes](docs/releases/RELEASE_4.1.1.md)
- [4.1.1 implementation log](docs/project/HGR_4.1.1_IMPLEMENTATION_LOG.md)
- [4.5.2 release notes](docs/releases/RELEASE_4.5.2.md)

Older RC and patch notes remain part of the project's history but are not the current source of truth.

---

## Project timeline

HGR has gone through several distinct engineering eras. The timeline below keeps the historical iterations visible in the repository instead of showing only the latest milestone.

> **History note:** the public Git repository begins with the 4.0.0 source import. Earlier entries are reconstructed from the release notes, implementation logs, validation documents and regression contracts preserved inside this repository. See [docs/DEVELOPMENT_TIMELINE.md](docs/DEVELOPMENT_TIMELINE.md) for the canonical narrative history.

### Foundation and release-candidate era

| Version / era | What changed |
| --- | --- |
| **0.22.x** | Built the original authoritative rules foundation: turns, ownership, rent, building, mortgages, bankruptcy, cards, auctions, Mega spaces, Jail, Speed Die, trading, persistence and AI. |
| **3.3.x–3.4.x** | Shifted from feature accumulation toward public-access hardening, synchronized presentation, responsive layouts, results quality and regression protection. |

### 3.5.x — production, desktop and deployment foundation

| Version | Main milestone |
| --- | --- |
| **3.5.0** | Introduced the compact version scheme, secure Electron/desktop direction, canonical Oracle persistence and permanent production/developer separation. |
| **3.5.1** | Production-host cleanup, HTTPS/Dynu targeting, link-preview metadata, icon cleanup and safer deployment packaging. |
| **3.5.2** | Reload/theme continuity, first-paint cleanup and HTTPS-only production launcher behaviour. |
| **3.5.3** | Defined owner-facing Start / Restart / Close controls and tightened first-paint behaviour. |
| **3.5.4** | Began the Game Room UI backlog with the Immersive Showcase, Create/Join/Watch actions and stronger game discovery. |
| **3.5.5** | UI correction pass across intro/access behaviour, WHOT, Blackjack, Hidden Dictator and mobile shell details. |
| **3.5.6** | Replaced the visible auth-check flash with a theme-aware first-paint curtain suitable for hosted latency. |
| **3.5.7** | Locked the WHOT visual direction, refined Poker iconography, mobile Game Room controls and invite-code handling. |
| **3.5.8** | Corrected invite-code history/reveal behaviour while keeping private invite data server-side. |
| **3.5.15** | Added website self-upgrade logic and an explicit Update Halieus Website publishing workflow. |
| **3.5.16** | Added Oracle credential discovery instead of assuming one SSH-key filename. |
| **3.5.17** | Stopped shipping absolute-path shortcut files and introduced FIRST RUN - Refresh Halieus Launchers. |
| **3.5.18** | Expanded owner SSH-key discovery and remembered only the proven key path, never the private key itself. |
| **3.5.19** | Fixed Windows PowerShell 5.1 compatibility in Oracle key discovery. |
| **3.5.20** | Fixed false-positive Mega Board “Deal in progress” announcements. |
| **3.5.21** | Fixed Windows PowerShell ZIP/deployment compatibility while retaining the live-deal repair. |
| **3.5.22** | Repaired Mega Board desktop viewport composition and player-rail containment. |
| **3.5.23** | Fixed Windows public health verification/TLS behaviour after successful Oracle activation. |
| **3.5.24** | Moved Mega Board Autopilot out of the board-sizing grid so enabling it could not shrink the board. |
| **3.5.25** | Stabilization-first Game Room release: System/Light/Dark themes, richer Players hub and live-room/profile actions. |
| **3.5.26** | Introduced release-integrity fingerprints and separated Start/Restart from deployment/provisioning responsibilities. |
| **3.5.27** | Made legacy SSH credential files safe packaging exclusions instead of deployment blockers. |

The current public archive does not contain a standalone release note for every number between 3.5.8 and 3.5.15, so the table deliberately avoids inventing milestones that are not preserved.

### 3.6.x — protected platform shell and game expansion

| Version | Main milestone |
| --- | --- |
| **3.6.0** | Established the protected fixed-sidebar Game Room baseline, social Home, game library, Players hub and per-game layout boundaries. |
| **3.6.1** | Continued the 3.6 protected shell baseline and release-validation contract. |
| **3.6.3** | Major stabilization/rebuild pass with protected Ludo/Poker/Mega geometry and stronger desktop/mobile shell rules. |
| **3.6.3b** | Reworked the Owner area into a connected tab hub and refined Mega Board chrome. |
| **3.6.4** | Added playable Word Game, Password and Anagrams Race modules on shared room infrastructure. |
| **3.6.4a** | Added Mega Board's server-authoritative 45-second anti-stall roll countdown / Autopilot takeover. |
| **3.6.4b** | Improved Mega Board action clarity with distinct Depot colouring and full-width trade decline. |
| **3.6.5** | Expanded Password/Anagrams setup and AI playability, plus targeted UI polish. |
| **3.6.6** | Reframed Word Game as a Daily/Practice single-player mode with shared leaderboard and personal statistics. |
| **3.6.7** | Ground-up Blackjack and WHOT rebuilds plus new Cheat and Dominoes modules. |
| **3.6.7b** | Deployment hotfix removing the desktop-only root icon from Oracle-critical release inputs. |
| **3.6.8** | Room-lifecycle and layout stabilization: reconnect remapping, AI-seat replacement, fresh room codes and tighter game shells. |
| **3.6.8a** | Security/ranked-UI hotfix: dependency floors, leaderboard layering/access and uniform icon outlining. |
| **3.6.8b** | Upgraded the Vite/esbuild security toolchain and raised the supported Node floor. |
| **3.6.8c** | Corrected the Oracle npm-audit gate to block HIGH/CRITICAL findings while still reporting moderate advisories. |
| **3.6.8d** | Consolidated game-brand icons onto a single-outline construction instead of the earlier double-outline treatment. |
| **3.6.8e** | Added server-authoritative live Bank building inventory to Mega Board with click-through inventory access. |

A standalone 3.6.2 release note is not preserved in the current public archive; 3.6.7b also references an intermediate 3.6.7a baseline whose dedicated note is not present.

### 3.7.0 — platform expansion and stabilization series

| Version | Main milestone |
| --- | --- |
| **3.7.0** | Expanded the platform with PWA install support, iOS/network diagnostics, persistent game requests, admin player visibility, Ayo and Word Board. |
| **3.7.0a** | Added automatic Windows/OpenSSH private-key ACL repair for Oracle deployment. |
| **3.7.0b** | Repaired new-game result/report contracts and type-check issues. |
| **3.7.0c** | Corrected new-game server type contracts and Ayo finish-state handling. |
| **3.7.0d** | Refined Ayo presentation/rules and Word Board board/tile behaviour. |
| **3.7.0e** | Stabilized game lifecycle, private-card redaction, SCOWL Word Board dictionary, Password team play, profile pictures and tablet layouts. |
| **3.7.0f** | Hardened Oracle packaging for tracked static release data. |
| **3.7.0g** | Added direct Mega Board emergency property liquidation during debt resolution. |
| **3.7.0h** | Added shared-creditor handling for exact maximum-rent ties. |
| **3.7.0i** | Repaired client finished-phase type narrowing without changing gameplay. |
| **3.7.0j** | Added the 150-second Mega Board Blitz roll window. |
| **3.7.0k** | Added live host-controlled turn-timer presets with authoritative persistence/recovery. |
| **3.7.0l** | Consolidated consistent bundled game icons across the platform. |

### 4.x — branded platform era

| Version | Main milestone |
| --- | --- |
| **4.0.0** | Established the branded session-arrival baseline, portfolio documentation and the first source state represented directly by public Git history. |
| **4.0.1** | Rebuilt ranked/post-match presentation, especially mobile standings and result hierarchy, without changing authoritative scoring. |
| **4.0.2** | Removed legacy phone-as-desktop viewport emulation and restored true device-width game layouts and mobile decision sheets. |
| **4.1.0** | Added persistent private Guilds: roles, permissions, chat, guild-organised rooms, room history and internal leaderboards. |
| **4.1.1** | Refined Game Room discovery, guild invitations, ranked presentation and the expanded Dark / Blue / Custom theme system while reducing nested UI scrolling. |
| **4.5.0** | Consolidated shared theme ownership, Appearance and authentication UI, responsive shell behaviour, reusable pre-game/modal primitives, game-family layout refinement, recovery/lifecycle work and server-authoritative progression foundations. |
| **4.5.1** | Closed Part 19 platform-navigation parity: desktop and signed-in mobile share Home, Games, Players, Rankings, Guilds and Inbox destinations, while Join Game remains a global action rather than a destination tab. |
| **4.5.2** | Added quantified Achievements and Gamer Score, game-native Ranked formats and archive-derived standings for Connect Four, Ludo and Ayo, Join/recovery polish, iPad/touch stability work, theme/logo refinements and hardened browser/PWA identity handling. |

The current 4.5 line is focused on shared platform rules and reusable UI foundations while preserving each game's own board/table identity and authoritative gameplay.

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

Current work is focused on the 4.5 platform/UI line:

- theme-owned platform chrome with player colour reserved for identity;
- Appearance, authentication and first-paint consistency;
- reusable room-setup, modal and confirmation patterns;
- responsive containment across desktop, short-height desktop, tablet and phone;
- Mega Board and Poker visual refinement without replacing approved game geometry;
- game-family standardisation across board, card/table and word/social modules;
- recovery and room-lifecycle reliability;
- server-authoritative achievements, Gamer Score and cosmetics progression;
- stronger automated regression coverage plus live multiplayer/device validation;
- public portfolio documentation that reflects shipped engineering milestones without exposing internal handoff notes.

---

Halieus Game Room is intended to show not only **what was built**, but **how a single game evolved into a multiplayer platform through requirements, architecture, testing, deployment and repeated iteration**.

