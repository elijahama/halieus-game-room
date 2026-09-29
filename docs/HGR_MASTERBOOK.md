# Halieus Game Room Masterbook

> **Living project summary and engineering map.**
>
> This document is the high-level source of truth for understanding Halieus Game Room (HGR). It does not replace detailed implementation docs; it connects them.

## 1. What HGR is

Halieus Game Room is a private, real-time multiplayer platform for board, card, word and social games. It began as the property-trading game that became **Mega Board** and evolved into one shared application with accounts, rooms, invitations, reconnect/recovery, spectators, guilds, progression, themes, responsive navigation and release/deployment tooling.

The governing product rule is:

> **The platform owns the shared multiplayer experience; each game owns its own rules.**

The current release number is not hard-coded here. The repository file `VERSION` is the production authority.

## 2. Project ownership and AI-assisted development

HGR is **human-directed, AI-assisted engineering**.

The project owner is responsible for:

- product direction and priorities;
- game rules and edge cases;
- platform requirements;
- UX and responsive behaviour;
- playtesting and real-device QA;
- acceptance/rejection decisions;
- release/deployment decisions;
- documentation goals;
- deciding how AI is used and what evidence is required.

AI tools assist heavily with implementation, debugging, refactoring, regression-test creation, analysis and documentation.

A portfolio-safe description is:

> I direct the product, gameplay rules, architecture requirements, testing and acceptance for Halieus Game Room. AI tools are used extensively during implementation and debugging, while I remain responsible for the requirements, QA, system decisions and final product direction.

See [AI-assisted development](AI_ASSISTED_DEVELOPMENT.md).

## 3. Runtime architecture

HGR uses a server-authoritative multiplayer model.

```text
React / TypeScript client
        |
        | HTTP + Socket.IO
        v
Node / Express / Socket.IO server
        |
        +-- platform services
        |   accounts
        |   rooms / invites
        |   presence / recovery
        |   chat / spectators
        |   guilds / progression
        |
        +-- game modules
            rules
            state
            validation
            AI
        |
        v
validated authoritative state
        |
        v
players and spectators render
```

The browser requests an action. The server decides whether that action is legal. Accepted state is then broadcast back to clients.

### Example: Connect Four

```text
player clicks a column
        ↓
React sends Socket.IO action
        ↓
server finds room + player
        ↓
server checks turn and legal column
        ↓
authoritative board changes
        ↓
result broadcasts
        ↓
clients render the accepted state
```

This is the basic mental model to use when explaining HGR technically.

See [ARCHITECTURE.md](../ARCHITECTURE.md).

## 4. Repository map

```text
client/                 React/Vite application
  src/platform/         shared client/platform UI and services
  src/games/            game-specific UI

server/                 Express + Socket.IO backend
  src/platform/         shared platform services
  src/games/            authoritative game modules

shared/                 contracts shared across client/server

tests/                  static, runtime and browser regressions
scripts/                release/build/cross-platform helpers
scripts/windows/        Windows operator tooling
desktop/                desktop packaging/integration
deploy/                 deployment-safe source
docs/                   current docs + historical implementation records
assets/branding/        canonical branding sources
```

The project root is reserved for stable entrypoints and project identity, not miscellaneous helpers.

## 5. Player platform

Shared player-facing systems include:

- persistent HGR accounts;
- profile pictures and player identity;
- Home / Games / Players / Rankings / Guilds / Inbox navigation;
- global Join Game flow;
- room invitations and game requests;
- reconnect and seat recovery;
- spectators where safe;
- shared results patterns;
- progression and Gamer Score;
- game-specific Ranked standings;
- themes, skins and cosmetic progression.

### Mobile navigation contract

On phone layouts, the permanent bottom navigation is:

**Home · Games · Join · Players · Guilds**

The centre Join control opens the existing room-code Join Game flow. It is not a “new game” shortcut.

The fixed mobile top bar owns utility controls such as menu/tools, fullscreen, inbox and profile. Content scrolls independently beneath the fixed chrome.

## 6. Games

The active catalogue includes board/strategy, card/table and word/party games. The catalogue is shared platform data so the same names/icons can be reused across Home, setup, live room and results surfaces.

Game modules own their own legal actions and authoritative state.

Examples:

- **Mega Board** — property, rent, auctions, mortgages, development, debt, bankruptcy and rule variants.
- **Poker** — table progression, betting state, cards and showdown rules.
- **Connect Four** — turn legality, legal columns and win evaluation.
- **Ludo** — movement and placement rules.
- **Ayo** — traditional seed movement/capture logic.
- **Word Board** — word-board legality and scoring.

See [Game catalogue](GAME_CATALOGUE.md) and [Gameplay rules](GAMEPLAY_RULES.md).

## 7. Guilds and social layer

Guilds are persistent player groups above individual game rooms.

Guilds own:

- membership;
- roles/permissions;
- persistent chat;
- room organisation;
- guild history;
- internal presentation of game records.

Guilds do **not** become a second gameplay authority. A guild-created room hands off to the existing HGR room/game systems. Finalised game sessions can then be projected back into guild history.

## 8. Appearance, themes and identity

The appearance system separates several concepts:

- **platform theme** — page/surface/accent system;
- **game identity** — game-specific colours/icons/motifs;
- **board/table skins** — cosmetic treatment of a game surface;
- **profile colour** — player identity, not a global UI override;
- **brand mark** — canonical H geometry and HGR identity.

### Standard atmosphere rule

**System / Light / Dark** use the selected game’s atmospheric glyphs and accent.

Explicit colour/profile/custom themes use a stable theme-owned glyph family whose colours follow the selected theme. Switching games should not replace that themed atmosphere.

### Gold system

Standard HGR chrome uses one saturated gold family rather than scattered mustard/brass values. Explicit colour themes can override the platform accent.

### Install identity

Browser favicon, PWA install icon, Apple touch icon and social preview are separate consumers of the HGR identity pipeline. Historical reference artwork must not silently override the current install icon.

See [Brand asset pipeline](BRAND_ASSET_PIPELINE.md), [Cosmetic theme system](COSMETIC_THEME_SYSTEM.md) and [Game visual identity system](GAME_VISUAL_IDENTITY_SYSTEM.md).

## 9. Launcher and operator tools

Stable Windows entrypoints include:

- `Start Halieus Game Room.cmd`
- `Restart Halieus Game Room.cmd`
- `Close Halieus Game Room.cmd`
- `Update HGR GitHub.cmd`
- `FIRST RUN - Refresh Halieus Launchers.cmd`

Their responsibilities are deliberately separated.

### Start

Starts/opens the current HGR application. It does not update or deploy.

### Restart

Troubleshooting action. It closes and reopens the dedicated HGR app window without performing Git, build or deployment work.

### Update

The full update path. It synchronises source, validates, builds, runs regressions, updates release identity, performs the configured deployment flow and restarts HGR only after success.

A failed update must stop rather than restart into an incomplete state.

See [Project structure and Windows commands](HGR_PROJECT_STRUCTURE_AND_WINDOWS_COMMANDS.md).

## 10. HGR Control — phone launcher/control plane

HGR Control is the next extension of the launcher system: a mobile-first controller that can securely request a small set of predefined HGR maintenance actions from the owner’s PC.

It is **not** a remote shell.

The intended architecture is:

```text
Phone PWA
   |
   | authenticated private connection
   v
HGR Control Agent on owner PC
   |
   +-- status
   +-- start
   +-- restart
   +-- close
   +-- update
   +-- recent logs
   |
   +-- links opened on phone
       HGR website
       GitHub
```

The first foundation is intentionally read-only: a local status endpoint plus a shared action contract. Process execution is added only after authentication, operation locking and audit logging are in place.

See [HGR Mobile Control](HGR_MOBILE_CONTROL.md).

## 11. Release engineering

HGR uses candidate-first release/deployment thinking:

```text
source change
   ↓
typecheck
   ↓
regressions
   ↓
release identity
   ↓
production build
   ↓
candidate validation
   ↓
deployment / activation
   ↓
health + release verification
```

`VERSION` is the sole current release-number authority. Generated consumers should derive from it rather than hard-code the latest patch.

Historical documentation may refer to the patch in which a feature was introduced. Executable “current version” assumptions should not.

See [Deployment](DEPLOYMENT.md), [Testing](TESTING.md) and [GitHub workflow](GITHUB_WORKFLOW.md).

## 12. Validation philosophy

Passing code is not automatically accepted product behaviour.

HGR validation combines:

- TypeScript typechecking;
- static regression tests;
- runtime regression tests;
- browser/geometry tests;
- release-integrity checks;
- build verification;
- real-device screenshots and testing;
- actual multiplayer playtests.

When a visual or mobile issue is reported, the screenshot/device result is evidence that the implementation contract is not yet satisfied even if earlier automation passed.

## 13. Security boundaries

Important boundaries include:

- clients do not decide authoritative game legality;
- spectators must not receive private player state;
- secrets and private deployment keys do not belong in Git;
- production runtime data is not a release artifact;
- HGR Control must never accept arbitrary command strings, executable paths or user-supplied shell arguments;
- remote control should use a private network path plus application authentication;
- destructive/expensive actions should require confirmation and operation locking.

## 14. Current development roadmap

Near-term work:

1. HGR Control read-only foundation. **Complete.**
2. Secure Windows action executor. Restart is now authenticated and implemented; Start/Close/Update remain staged.
3. Operation locking + audit log are implemented for Restart; structured live update progress remains.
4. mobile HGR Control PWA.
5. private Tailscale connection and device setup.
6. themed atmosphere continuation for profile themes such as Brass & Coal.
7. Light-mode contrast review for coloured fills and text.
8. continued real-device mobile QA.

Longer-term work should continue to preserve the platform/game separation rather than duplicating infrastructure inside each game.

## 15. How to explain HGR

A short technical explanation:

> Halieus Game Room is a server-authoritative multiplayer platform built with React, TypeScript, Node, Express and Socket.IO. Shared platform systems handle identity, rooms, recovery, social features and navigation, while individual game modules own their own rules and state. I direct the product and technical requirements, test the system across devices and multiplayer sessions, and use AI extensively as an implementation and debugging tool.

A slightly deeper example:

> If a player makes a move in Connect Four, the browser does not simply update the board and declare the move valid. It sends the action through Socket.IO to the server. The server checks the room, player, turn and game rules, changes authoritative state only if the action is legal, and broadcasts the accepted result back to players and spectators.

## 16. Documentation map

Start with this Masterbook, then go deeper:

- [Architecture](../ARCHITECTURE.md)
- [Project overview](PROJECT_OVERVIEW.md)
- [Game catalogue](GAME_CATALOGUE.md)
- [Data model](DATA_MODEL.md)
- [Socket events](SOCKET_EVENTS.md)
- [Testing](TESTING.md)
- [Deployment](DEPLOYMENT.md)
- [AI-assisted development](AI_ASSISTED_DEVELOPMENT.md)
- [HGR Mobile Control](HGR_MOBILE_CONTROL.md)
- [Documentation index](README.md)

Historical RC, patch and implementation logs remain evidence of how the project evolved; they are not automatically the current behavioural source of truth.
