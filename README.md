# Halieus Game Room

**Current milestone: 4.0.0** — branded arrival experience, platform/documentation consolidation, and the complete 3.7.x gameplay/reliability work carried forward.

**A private, real-time multiplayer game platform that brings board, card, word and social games into one shared game room.**

Halieus Game Room (HGR) is a modular multiplayer application built around one central idea: **the platform should own the shared experience, while each game owns its own rules**.

What began as a single property-trading board game grew into a broader platform with accounts, rooms, invitations, spectators, reconnection, shared navigation, responsive layouts, AI players, production deployment and a growing catalogue of games.

> **Development model:** Halieus Game Room is a **human-directed, AI-assisted software project**. AI tools are used extensively during implementation, debugging, testing and documentation. Product direction, rules, UX requirements, testing, acceptance/rejection decisions and deployment are directed and validated by the project owner.

---

## 1. What Halieus Game Room is

HGR is designed primarily for **private games between friends**, not for real-money play, public matchmaking economies, stores or monetisation-led systems.

The application provides one place to:

- sign in and enter the Game Room;
- browse the available game catalogue;
- create or join private rooms;
- invite other players;
- reconnect to games after refreshes or temporary disconnections;
- watch supported games as a spectator;
- play against human players or supported AI opponents;
- use the same account, room and social systems across multiple games;
- move between desktop, tablet and phone layouts without changing platforms.

The project is still actively evolving, but the long-term direction is clear: **adding another game should extend HGR, not create another standalone application.**

<!-- Screenshot: HGR welcome / Game Room landing page -->

---

## 2. Project evolution

HGR did not begin as a fourteen-game platform.

The project originally centred on a large property-trading board game that later became **Mega Board**. As that game grew, more of the difficult work stopped being specific to the board itself.

Features such as:

- room creation;
- player identity;
- invites;
- spectators;
- reconnect/recovery;
- timers;
- chat;
- results;
- responsive navigation;
- AI configuration;
- deployment;
- release validation;

were useful beyond one game.

That led to a structural change:

> **Halieus Game Room became the application. Individual games became modules inside it.**

This shift is one of the most important architectural decisions in the project. It allows shared multiplayer behaviour to be improved once at platform level while game-specific rules remain isolated inside each game module.

---

## 3. The player experience

A typical HGR session follows one continuous product flow.

### Arrival

On a fresh visit or sign-in, HGR presents a short branded introduction such as:

**Welcome to Halieus Game Room**

The intro is intended to feel like an arrival into the platform rather than a loading screen. It respects the saved light/dark theme and should not interrupt direct room links, game recovery or routine refreshes.

### Game Room

After entry, the player reaches the main Game Room, where they can:

- browse available games;
- continue an active session;
- create a room;
- join with a room code or invite;
- see relevant live-game activity;
- access account and social controls.

### Room setup

Each game reuses the same broader room philosophy while exposing the settings that are relevant to that game.

Examples include:

- human/AI player configuration;
- difficulty;
- timers;
- game variants;
- room visibility;
- spectator availability;
- game-specific rule options.

### Live game

Once a match begins, the client sends player actions to the server. The server validates those actions against the authoritative room and game state before broadcasting accepted results.

### Recovery

Refreshing the website or temporarily disconnecting should not create a new match. HGR attempts to restore the existing player seat, game state and server-owned timers.

### Results

Completed games use shared result and return-to-room patterns so every game does not need to invent a completely separate end-of-match system.

<!-- Screenshot set:
1. Game Room
2. Create-game screen
3. Live game
4. Results screen
-->

---

## 4. Game catalogue

HGR currently contains a mixture of board, card, word and social games.

### Board and strategy games

| Game | Description | Status |
| --- | --- | --- |
| **Mega Board** | Large property-trading board game with trading, auctions, development, debt resolution and multiple rule variants | Live |
| **Ludo** | Multiplayer race board game | Live |
| **Connect Four** | Server-validated turn-based strategy game | Live |
| **Ayo** | Traditional Yoruba seed game | Live |

### Card and table games

| Game | Description | Status |
| --- | --- | --- |
| **Poker** | Multiplayer Texas Hold'em with shared table systems | Live |
| **WHOT** | Card-shedding game with Nigerian-oriented rules support | Live |
| **Blackjack** | Multiplayer casino-style card game | Live |
| **Cheat** | Bluffing card game | Live |
| **Dominoes** | Multiplayer tile game | Live |

### Word and party games

| Game | Description | Status |
| --- | --- | --- |
| **Word Board** | Board-based word game | Live |
| **Word Game** | Five-letter word game | Live |
| **Password** | Clue-and-guessing game | Live |
| **Anagrams Race** | Real-time word race | Live |
| **Hidden Dictator** | Social-deduction game | Beta |

All game identities are defined through shared platform data so the same game name, icon and branding can be reused consistently on the homepage, setup screens and live-room UI.

<!-- Screenshot: full game catalogue -->

---

## 5. Shared platform systems

The games are different, but the surrounding systems are intentionally shared.

### Accounts and identity

HGR provides persistent player identity across the platform rather than treating every game as an isolated session.

### Rooms and invitations

The platform manages:

- room creation;
- room codes;
- invite links;
- player presence;
- host controls;
- join/rejoin behaviour;
- active-game discovery where appropriate.

### Reconnection and recovery

A browser refresh creates a new network connection, but it should not create a new player or reset the match.

HGR therefore separates **player identity and authoritative game state** from temporary Socket.IO connection identity.

### Timers

Turn and action timers are server-owned. Clients display the remaining time from an absolute server deadline instead of independently restarting timers after refresh.

Mega Board also supports live host control over its configured turn duration while retaining server authority.

### Spectators

Supported games can expose read-only spectator state through shared platform infrastructure.

Spectators may observe the information they are allowed to see, but they cannot submit gameplay actions or receive private player information that should remain hidden.

### Chat, activity and results

Shared room-level presentation includes features such as:

- room activity;
- chat;
- player lists;
- spectators;
- result presentation;
- return/continue navigation.

### Responsive platform shell

Desktop, tablet and mobile layouts use the same core application. Shared navigation, top-level controls and account UI are treated as platform concerns, while each game remains responsible for adapting its own table or board.

---

## 6. Architecture

HGR uses a **server-authoritative real-time multiplayer architecture**.

```text
┌──────────────────────────────────┐
│          React + Vite UI         │
│     desktop · tablet · mobile    │
└────────────────┬─────────────────┘
                 │
          HTTP + Socket.IO
                 │
                 ▼
┌──────────────────────────────────┐
│      Node.js + Express server    │
│                                  │
│  Shared platform services        │
│  • accounts / identity           │
│  • rooms / invitations           │
│  • recovery / presence           │
│  • chat / spectators             │
│                                  │
│  Authoritative game modules      │
│  • state                         │
│  • rules                         │
│  • validation                    │
│  • AI where supported            │
└────────────────┬─────────────────┘
                 │
        validated state update
                 │
                 ▼
┌──────────────────────────────────┐
│      Players and spectators      │
│       render server state        │
└──────────────────────────────────┘
```

The browser handles presentation and user input.

The server handles **game truth**.

---

## 7. Example: how a Connect Four move works

Connect Four is a simple example of the broader HGR architecture.

When a player selects a column:

1. the React client captures the requested move;
2. the request is sent over Socket.IO;
3. the server identifies the room and requesting player;
4. the Connect Four game handler checks whether the move is legal;
5. the authoritative board state is changed only if validation passes;
6. the server broadcasts the resulting state;
7. connected players and spectators render the accepted server state.

In simplified form:

```text
Player input
    ↓
React client
    ↓
Socket.IO
    ↓
Room lookup
    ↓
Server-side rule validation
    ↓
Authoritative state update
    ↓
Broadcast
    ↓
Client render
```

This same principle applies across HGR even when the rules become much more complex.

---

## 8. Game modules vs platform systems

One of the project's core design rules is to keep **shared platform behaviour** separate from **game-specific behaviour**.

### Platform responsibilities

Examples:

- accounts;
- player identity;
- rooms;
- invitations;
- recovery;
- connection management;
- spectators;
- chat;
- common navigation;
- results;
- themes;
- live-game discovery;
- deployment/release identity.

### Game responsibilities

Examples:

- Connect Four move legality;
- Poker betting and hand progression;
- Ludo movement;
- WHOT card rules;
- Mega Board rent, auctions, mortgages and development;
- Blackjack hand resolution;
- Word Board validation.

This division reduces duplication and makes it easier to add another game without rebuilding the entire multiplayer shell.

---

## 9. Mega Board as the deepest game system

Mega Board is the largest and most mature rules system inside HGR and has driven many of the platform's more difficult edge cases.

Its systems include areas such as:

- property ownership;
- rent;
- auctions;
- trading;
- mortgages;
- building development;
- bank building inventory;
- debt resolution;
- bankruptcy;
- turn/action timers;
- configurable game modes;
- AI/autopilot strategy;
- reconnectable multiplayer state.

### Debt resolution

A player who owes more cash than they currently hold is not necessarily bankrupt.

The game can enter a debt-resolution state where the player may perform legal actions such as:

- selling buildings;
- mortgaging eligible properties;
- managing assets;

before the debt is resolved.

### Shared rent outcomes

Some rules can produce multiple eligible rent recipients.

Instead of assuming every payment has one creditor, the server can split a single rent amount deterministically between tied eligible players.

### Building inventory

Available houses/hotels/buildings are treated as real bank inventory rather than purely decorative UI values.

These examples show why Mega Board is useful as a stress test for HGR's broader state-management model.

---

## 10. AI and automated players

HGR includes rule-based AI in supported games.

The design principle is:

> **AI should make decisions using information a human player could legally know.**

AI should not gain access to hidden cards, unrevealed roles or other private state simply because it runs on the server.

Mega Board also contains an Autopilot path that reuses strategic decision systems for a human-controlled seat.

Longer-term AI development is informed by real playtesting and observed human behaviour rather than only abstract optimal play.

---

## 11. Reconnection, timers and state continuity

Real-time multiplayer creates problems that are easy to miss in a single-browser prototype.

For example, refreshing a webpage changes the Socket.IO connection ID.

If timers were attached only to that socket ID, a refresh could accidentally create another full turn.

HGR instead preserves the existing server-owned deadline and reconnects the returning player to the live seat.

Example:

```text
Blitz turn begins at 2:30
        ↓
1:00 passes
        ↓
1:30 remains
        ↓
Player refreshes
        ↓
New socket connection
        ↓
Existing player/seat recovered
        ↓
Original deadline retained
        ↓
~1:30 remains
```

The refresh changes the connection, not the game clock.

---

## 12. Production environment

HGR is not only a local prototype.

The web application is deployed to a Linux production environment with:

- Node.js;
- Nginx;
- HTTPS;
- service-managed backend processes;
- persistent runtime data kept outside replaceable application releases;
- candidate-build validation;
- release fingerprints;
- rollback protection.

The live server remains the authoritative source for multiplayer state and persistent platform data.

---

## 13. Deployment and release safety

Deployment is treated as part of the engineering work rather than an afterthought.

A normal release flow is:

```text
Development workspace
        ↓
Release preparation
        ↓
Integrity manifest / fingerprint
        ↓
Source package
        ↓
Secure transfer to server
        ↓
Candidate dependency install
        ↓
Candidate build
        ↓
Validation
        ↓
Activate release
        ↓
Health + fingerprint verification
        ↓
Keep release OR restore previous version
```

A failed candidate build should **not replace the working production application**.

Private credentials, runtime databases and user data are intentionally kept outside public release packages.

---

## 14. Testing and regression workflow

HGR has been developed through repeated build → test → reject/correct → rebuild cycles.

Testing includes both automated checks and live use.

### Automated validation

The project uses checks such as:

```bash
npm run typecheck
npm run build
npm run test:regression
npm run validate:release
```

Regression coverage has grown alongside the project because fixing one multiplayer system can affect older behaviour elsewhere.

### Real-world testing

Manual testing includes:

- multiple browsers;
- multiple devices;
- real multiplayer sessions;
- refresh/reconnect scenarios;
- mobile/tablet layouts;
- spectator behaviour;
- timers;
- trading;
- debt/bankruptcy;
- game-specific rule edge cases;
- candidate deployment validation.

A feature is not considered correct only because it compiles.

---

## 15. Development process

A typical HGR iteration looks like this:

```text
Idea / playtest problem
        ↓
Define desired behaviour
        ↓
Clarify rules and edge cases
        ↓
AI-assisted implementation
        ↓
Static checks
        ↓
Regression tests
        ↓
Package candidate
        ↓
Production candidate build
        ↓
Browser/device/playtest validation
        ↓
Accept, reject or revise
```

Many changes begin with screenshots, observed multiplayer behaviour or a rule inconsistency rather than with a formal specification.

Those observations are converted into concrete implementation requirements before the next build.

---

## 16. My role in the project

My role is best described as **product direction, technical project development, systems specification, gameplay design and QA**.

I am responsible for:

- defining the overall HGR product direction;
- deciding how the original board-game project evolved into a shared game platform;
- specifying gameplay rules and edge cases;
- deciding which systems belong to the platform and which belong to individual games;
- directing UX and responsive behaviour;
- testing on real devices and in multiplayer sessions;
- identifying regressions;
- deciding whether an implementation is accepted, rejected or revised;
- maintaining and operating the deployment workflow;
- shaping AI behaviour and information boundaries;
- documenting the intended architecture and behaviour;
- learning and explaining how the systems I am directing work.

I do **not** present HGR as software where every line was manually typed by me.

The portfolio value of the project is in the combination of **requirements, technical reasoning, systems design, iteration, testing, deployment and ownership of the final product direction**.

---

## 17. AI-assisted development

AI assistance is a substantial part of HGR's implementation process and is intentionally disclosed.

AI tools have been used to help with:

- TypeScript, React and Node implementation;
- debugging from logs and screenshots;
- refactoring;
- regression-test creation;
- code review;
- edge-case analysis;
- documentation;
- release preparation.

This does not mean that the project was produced from one prompt.

The process is iterative: generated implementations are tested against the intended rules and product behaviour, then accepted, corrected or rejected.

I describe the project as:

> **Human-directed, AI-assisted engineering.**

That description is intended to be transparent about how the software was produced while also accurately representing the design, testing and operational work involved.

---

## 18. Technology stack

### Frontend

- React 18
- TypeScript
- Vite
- Socket.IO client

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO

### Desktop / local experience

- Electron-based Windows shell / launcher tooling

### Production

- Linux
- Nginx
- HTTPS
- Node.js services
- release-integrity validation
- candidate deployment and rollback workflow

---

## 19. Repository structure

The public repository is organised around the platform/game boundary.

```text
Halieus Game Room/
├── client/
│   └── src/
│       ├── platform/      # Shared UI, networking and account systems
│       └── games/         # Game-specific interfaces
│
├── server/
│   └── src/
│       ├── platform/      # Shared rooms, identity, recovery, etc.
│       └── games/         # Authoritative game logic
│
├── shared/                # Shared contracts/models
├── desktop/               # Desktop/launcher integration
├── docs/                  # Public technical documentation
├── scripts/               # Build/release tooling
└── tests/                 # Regression coverage
```

The public portfolio edition intentionally excludes private operational material and obsolete internal release history.

---

## 20. Local development

### Requirements

- Node.js **20.19+**
- npm

### Install dependencies

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

Environment-specific values should be created from safe example files.

Never commit real `.env` files, private keys or production data.

---

## 21. Public repository and security boundaries

The public HGR repository is a **portfolio-safe edition** of the development project.

It should contain enough real source and documentation to demonstrate how the application works without exposing operational secrets or private player information.

The public repository must exclude:

- SSH/private keys;
- cloud credentials;
- secret environment values;
- production account/player data;
- invite/recovery secrets;
- runtime databases;
- backups;
- private workstation files;
- machine-specific operational data;
- `node_modules`;
- generated production build output;
- internal documents that contain obsolete or private deployment information.

A safe `.env.example` may document required variable names without real values.

---

## 22. Current development direction

HGR remains under active development.

Current priorities include:

- increasing visual consistency between game modules;
- improving the Game Room arrival experience;
- adding a polished **Welcome to Halieus Game Room** intro for fresh sessions/sign-in;
- strengthening refresh/reconnect behaviour;
- continuing responsive/mobile refinement;
- expanding game-specific polish;
- improving automated regression coverage;
- documenting the platform for public portfolio use;
- preparing a clean public GitHub edition without private production material.

---

## 23. Portfolio screenshots

The public README should use **real screenshots of the running application**, not generated images pretending to be the product.

Recommended captures:

1. **Welcome / Game Room landing**
2. **Full game catalogue**
3. **Create-game / room setup**
4. **Mega Board live match**
5. **Poker or WHOT table**
6. **Connect Four or Ludo**
7. **Mobile Game Room**
8. **Spectator / social-room example**
9. **Results screen**

Short GIFs can later demonstrate:

- creating/joining a room;
- moving from the Game Room into a match;
- reconnecting after refresh;
- live multiplayer state updates.

---

## 24. Summary

Halieus Game Room is both a multiplayer application and an ongoing systems-development project.

It demonstrates the progression from one game into a modular platform, including:

- server-authoritative multiplayer;
- reusable room infrastructure;
- state recovery;
- spectators;
- timers;
- AI players;
- responsive UX;
- complex board-game state;
- automated regression testing;
- production deployment;
- release verification;
- AI-assisted development under human direction.

The project is designed to show not only **what was built**, but also **how requirements, technical decisions, testing and iteration shaped it over time**.

## 4.0.0 corrective audit

The intro handoff and safe audit fixes retain version 4.0.0. See [audit and changelog](docs/AUDIT_4.0.0.md), [validation](docs/VALIDATION_4.0.0.md), and [security/publication guidance](SECURITY.md). Historical release notes are not current validation evidence. This owner release is not a sanitized public GitHub upload.

The replacement **Deployment Fix** package also corrects the Oracle archive's missing root files. See [deployment correction and packaging test](docs/DEPLOYMENT_FIX_4.0.0.md).
