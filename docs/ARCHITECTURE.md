# HGR Architecture

Halieus Game Room uses a server-authoritative real-time multiplayer architecture.

## Core flow

```text
React client
   |
   | HTTP / Socket.IO
   v
Node / Express server
   |
   +-- platform services
   |   identity
   |   rooms
   |   invites
   |   presence
   |   reconnect
   |   spectators
   |
   +-- game modules
       rules
       state
       validation
       AI
   |
   v
validated state broadcast
   |
   v
players and spectators render server state
```

The client requests actions. The server decides whether those actions are legal.

## Platform vs game responsibilities

Platform-level systems include accounts, room lifecycle, invitations, recovery, timers, spectators, chat, shared navigation and results.

Game modules own game-specific state and rules.

Examples:

- Connect Four owns legal column placement and win-state evaluation.
- Poker owns betting, hand state and table progression.
- Mega Board owns rent, auctions, mortgages, development, debt resolution and bankruptcy.
- Word Board owns word-board validation rules.

## Reconnection

A network socket is temporary; a player seat is not.

Refreshing a browser creates a new Socket.IO connection, but HGR should reconnect that new connection to the existing authenticated player/room state rather than creating a new seat.

Authoritative timers use absolute server deadlines so reconnecting cannot grant a fresh turn.

## Spectators

Spectators receive read-only state suitable for observation. They must not be able to submit gameplay actions or receive hidden/private information that a normal spectator should not see.

## Production boundary

The Git repository contains source and public-safe documentation. Oracle deployment packages only what is required to install, build and run production. Repository metadata is not automatically a runtime dependency.
