# Halieus Game Room — Project Overview

## Project status

Current milestone: **4.5.x** (`VERSION` is the authoritative release number)

Halieus Game Room (HGR) is a private, real-time multiplayer platform for board, card, word and social games. It began as the property-trading game that became **Mega Board**, then evolved into a shared application with common accounts, rooms, invitations, recovery, spectators, responsive navigation, progression, social systems and deployment infrastructure.

The core architecture rule is simple:

> **The platform owns the shared multiplayer experience; each game owns its own rules.**

## Product direction

HGR is designed primarily for private sessions between friends. It is not built around real-money play, public wagering, paid virtual currency or a public item marketplace.

The platform is intended to make adding another game extend one coherent product rather than create another standalone application.

## Current game catalogue

HGR currently exposes fourteen active game entries:

| Family | Games |
| --- | --- |
| Board & strategy | Mega Board, Ludo, Connect Four, Ayo |
| Card & table | Poker, WHOT, Blackjack, Cheat, Dominoes |
| Word & party | Word Board, Word Game, Password, Anagrams Race, Hidden Dictator |

Individual modules remain responsible for their own authoritative rules and legal actions.

## Shared platform systems

Current shared systems include:

- persistent HGR accounts and player identity;
- private guilds with roles, chat, room organisation and internal history;
- room creation, room codes and invitations;
- reconnect and seat-recovery flows;
- spectator support where the game can expose a safe read-only projection;
- server-owned timers and authoritative game state;
- shared Game Room navigation and responsive shell behaviour;
- appearance/theme preferences and platform identity;
- achievements and account-wide Gamer Score;
- game-native Ranked presentation and archive-derived standings;
- result/reporting patterns;
- production release identity, deployment validation and rollback-oriented operations.

## Navigation and Join

Signed-in desktop and mobile use the same platform destinations:

**Home → Games → Players → Rankings → Guilds → Inbox**

Join Game is a global action rather than a destination tab.

Recovery is separate from normal joining because it reclaims an existing seat rather than creating a new one.

## Progression and competitive systems

HGR deliberately separates accomplishment from competitive skill.

- **Achievements** track verified gameplay accomplishments.
- **Gamer Score** is the account-wide total derived from verified completed achievement values.
- **Competitive rating/standings** remain game-specific.

The current 4.5 Ranked definitions include:

- **Connect Four:** human-vs-human best-of-3 or best-of-5 Ranked series; best-of-1 is Casual.
- **Ludo:** human-only placement-aware Ranked comparison.
- **Ayo:** human-only Ranked duel; win/loss/draw drives rating while captured-seed differential is retained as a secondary statistic.

Verified standings are rebuilt from finalized Ranked session archives. Beta play is excluded from permanent progression/ranking records.

## Appearance and identity

Theme colour owns platform chrome and atmosphere. Player/profile colour is reserved for identity surfaces.

Halieus logo style persists independently from theme so changing colour theme does not silently replace an explicit logo choice.

Browser and installed-app identity also have distinct source roles:

- the standard HGR browser tab and shortcut favicon use canonical H geometry sourced from the branding icon set;
- supported game contexts may use the current game's icon;
- installed PWA/Apple-touch identity retains the approved rendered reference artwork; the live in-app H remains the themeable canonical vector.

## Architecture

The browser client is built with React, TypeScript and Vite. The backend uses Node.js, Express and Socket.IO.

The server is authoritative for membership, phase/turn legality and game state. Clients request actions and render accepted authoritative results.

See [../ARCHITECTURE.md](../ARCHITECTURE.md) for the current runtime architecture.

## Production and release engineering

HGR uses a candidate-first production model. Source is validated before activation, release identity is fingerprinted, runtime data lives outside replaceable application releases, and failed candidate activation should leave or restore the last working production application.

Repository-safe source and documentation are intentionally separated from private operator material such as SSH keys, real environment secrets and production runtime data.

See [DEPLOYMENT.md](DEPLOYMENT.md), [TESTING.md](TESTING.md) and [releases/RELEASE_4.5.2.md](releases/RELEASE_4.5.2.md).

## Development and validation model

HGR is **human-directed, AI-assisted engineering**.

The product owner defines product direction, rules, UX requirements, acceptance criteria, QA findings and deployment decisions. AI tools assist heavily with implementation, debugging, regression creation, refactoring and documentation.

A source commit or passing automated test is evidence of implementation, not automatic proof of user-visible acceptance. Live multiplayer/device checks remain explicit where required.

## Current acceptance work

The current 4.5.x source has automated validation coverage. Remaining real-device/user checks include:

- Brave/Chrome installed-app icon appearance;
- iPad focus/select/fullscreen behaviour;
- perceived board-style selection latency;
- Join/recovery presentation on phone/tablet;
- Ranked standings as genuine competitive results accumulate.

These items stay open until observed and accepted rather than being silently marked Validated.
