# Halieus Game Room

**A human-directed, AI-assisted real-time multiplayer game platform for private games with friends.**

Halieus Game Room (HGR) brings board, card, word and social games into one shared application. What began as a large property-trading board game evolved into a modular platform with shared accounts, rooms, invitations, reconnect/recovery, spectators, responsive layouts, AI players, testing, deployment and release validation.

> **Current milestone:** 4.0.0  
> **Development model:** Human-directed, AI-assisted engineering.

## What HGR is

HGR is designed around one architectural rule:

> **The platform owns the shared multiplayer experience. Each game owns its own rules.**

The shared platform provides identity, rooms, invitations, presence, reconnect/recovery, spectators, chat, results, themes and common navigation. Individual game modules provide their own authoritative rules, state and game-specific UI.

## Player experience

A normal HGR session is intended to flow through:

1. a short branded **Welcome to Halieus Game Room** arrival;
2. the central Game Room;
3. game selection and room setup;
4. real-time multiplayer play;
5. reconnect/recovery if a browser refresh or temporary disconnect occurs;
6. shared results and return-to-room flows.

Direct room links and active-game recovery should not be interrupted by decorative intro presentation.

## Game catalogue

### Board and strategy
- **Mega Board** — property trading, auctions, development, mortgages, debt resolution and configurable rules
- **Ludo**
- **Connect Four**
- **Ayo**

### Card and table
- **Poker**
- **WHOT**
- **Blackjack**
- **Cheat**
- **Dominoes**

### Word and party
- **Word Board**
- **Word Game**
- **Password**
- **Anagrams Race**
- **Hidden Dictator**

## Shared platform systems

HGR reuses platform-level systems across games instead of rebuilding them independently:

- accounts and persistent player identity;
- room creation and room codes;
- invitations and private access;
- host controls;
- reconnect and seat recovery;
- server-owned timers;
- spectators with read-only state;
- room activity and chat;
- results and return navigation;
- responsive desktop/tablet/mobile shell;
- shared game branding and icon mapping.

## Server-authoritative architecture

The browser is responsible for presentation and player input. The server is responsible for game truth.

```text
React + TypeScript client
        |
        | HTTP / Socket.IO
        v
Node.js + Express server
        |
        +-- shared platform services
        |   accounts / rooms / recovery / spectators
        |
        +-- authoritative game modules
            rules / state / validation / AI
        |
        v
validated state broadcast
        |
        v
players and spectators render server state
```

### Connect Four example

When a player selects a column:

1. the React client captures the requested move;
2. Socket.IO sends it to the server;
3. the server identifies the room and requesting player;
4. the Connect Four rules validate the action;
5. authoritative state changes only when validation passes;
6. the resulting state is broadcast;
7. connected players and spectators render the accepted server state.

The same principle applies to more complex HGR games.

## Mega Board as a stress test

Mega Board is the deepest game system in HGR and has driven many important platform edge cases, including:

- auctions and trading;
- rent and shared payment outcomes;
- mortgages and development;
- bank building inventory;
- debt resolution before bankruptcy;
- turn and optional-action timers;
- reconnect-safe deadlines;
- configurable game modes;
- AI/autopilot strategy.

For example, refreshing the website must not grant a fresh timer. The server preserves an absolute deadline and reconnects the returning player to the existing seat/state.

## Production and deployment

HGR is deployed to a Linux production environment using Node.js, Nginx and HTTPS.

The deployment philosophy is candidate-first:

```text
development
  -> local validation
  -> release preparation
  -> candidate install/build
  -> validation
  -> activation
  -> health/fingerprint check
  -> keep or rollback
```

A failed candidate build should not replace the working production application.

GitHub and Oracle have different inclusion rules: repository documentation belongs in Git history, while Oracle packages only production-required inputs.

## Testing

HGR is developed through repeated:

```text
define behaviour
  -> implement
  -> type/build/static checks
  -> regression tests
  -> package candidate
  -> production candidate build
  -> browser/device/playtest validation
  -> accept, reject or revise
```

A feature is not considered correct merely because it compiles.

## My role

My role in HGR covers:

- product direction;
- gameplay and rule specification;
- UX direction;
- platform/game boundary decisions;
- testing and regression discovery;
- acceptance/rejection of implementations;
- deployment operation;
- AI behaviour and information-boundary requirements;
- project documentation and technical understanding.

I do **not** present HGR as software where every line was manually typed by me.

## AI-assisted development

AI tools are used extensively for:

- TypeScript/React/Node implementation;
- debugging;
- refactoring;
- regression-test creation;
- technical analysis;
- documentation;
- release preparation.

The project is best described as:

> **Human-directed, AI-assisted engineering.**

The owner defines the product, rules, requirements, tests and acceptance decisions; AI tools assist heavily with implementation and iteration.

## Technology

**Frontend**
- React
- TypeScript
- Vite
- Socket.IO client

**Backend**
- Node.js
- Express
- TypeScript
- Socket.IO

**Production**
- Linux
- Nginx
- HTTPS
- candidate deployment and rollback
- release-integrity validation

## One project, one repository

The canonical model is intentionally simple:

```text
Halieus Game Room folder on laptop
        |
        +-- Git / GitHub
        |      safe source + history + documentation
        |
        +-- Oracle deployment
               production-required package only
```

There is no separate “portfolio copy” of the application.

Private credentials, runtime data, backups and generated dependencies remain local and are excluded through repository safety rules.

## Documentation

Technical documentation lives under `docs/`.

Google Drive remains the deeper internal project knowledge base and decision history, while this repository contains documentation appropriate for source-control and portfolio readers.

## Security

See [SECURITY.md](SECURITY.md).

Never commit private keys, real environment secrets, runtime databases, account/player data or production backups.

---

Halieus Game Room is an ongoing project. This repository is being built to show both **what the platform does** and **how its requirements, architecture, testing and deployment evolved over time**.
