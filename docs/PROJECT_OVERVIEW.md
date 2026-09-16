# Mega Monopoly Project Documentation

## Project status

Current release candidate: **v0.22.8 RC.8**

Mega Monopoly is a browser-based multiplayer property-trading board game implementation built with React, TypeScript, Express and Socket.IO. The project targets the UK Mega-style 52-space ruleset used throughout development, with multiplayer recovery, AI players, human Autopilot, direct room invites, responsive presentation and local/public tunnel deployment.

## Current product goals

- 2 to 8 active players
- Human and AI seats
- Human Autopilot using the same rule-based AI engine
- Real-time multiplayer state through Socket.IO
- Persistent active rooms and reconnection
- Direct `/join/ROOMCODE` invitations and QR codes
- Spectator mode with read-only table visibility
- Desktop, tablet and mobile support
- Light and dark themes
- Polished physical-board presentation and animation

## Major implemented systems

- Turn ordering and turn phases
- Standard dice and Speed Die
- Property, station and utility ownership
- Purchasing, rent and timed auctions
- Trading, mortgages and development sales
- Houses, hotels, skyscrapers and Train Depots
- Debt and bankruptcy
- Chance and Community Chest
- Bus Tickets and Mega special spaces
- Jail and Get Out of Jail Free cards
- Free Parking rule toggle
- AI players and Human Autopilot
- Game persistence and cross-browser recovery
- Host-controlled game termination
- Direct invite lobby and QR joining
- Beta feedback collection
- Spectator table view
- Activity history

## Repository layout

```text
client/   React + Vite browser application
server/   Express + Socket.IO game authority
shared/   Shared TypeScript game models, board and rules
docs/     Living project documentation
```

## Release philosophy

The server is authoritative for game rules and final dice results. Client animation never chooses outcomes. The browser receives the resolved game state and presents it visually.
