# Testing Guide

## Automated release validation

Run from the project root:

```powershell
npm run validate:release -- -SkipInstall
```

This checks TypeScript, production builds, server health and single-server client hosting.

## Required beta scenarios

### Multiplayer

- Two humans on separate devices
- Remote player through public tunnel
- Reconnect from the same browser
- Reconnect from another browser with recovery key
- Host closes and returns inside grace period
- Host ends room for everyone

### Gameplay

- Property purchase and declined-property auction
- £10, £50 and £100 auction increments
- Rent on undeveloped and developed groups
- Rail station and Train Depot rent
- Utilities
- Bus Ticket destination filtering
- Speed Die BUS automatically awards an ordinary Bus Ticket when available, then still requires a white-die/combined movement choice
- BUS expiry-before-award sequencing: old held tickets expire, expiry card leaves the match, newly awarded ticket survives
- Speed Die Mr. Monopoly
- Chance and Community Chest: every draw has a visible animated card reveal, including automated players
- Jail first, second and compulsory third attempt
- While jailed, trade, build, sell, mortgage, unmortgage and Train Depot actions remain available before the Jail decision is resolved
- Trading and mortgaged asset transfers
- Trading developed properties and stations with Train Depots, confirming development remains attached after acceptance
- Forfeit after Speed Die retirement, confirming returned Bank assets reactivate the Speed Die and later full reacquisition retires it again
- Kass Maneuver live tracking, zero activity No award behaviour and deterministic tie break
- Debt recovery and bankruptcy
- Revenue, expenses and profit/loss tracking across purchases, rent, builds, cards, auctions, trades, mortgages and debt
- Free Parking enabled with a funded pot, enabled with an empty pot, and disabled, confirming all clients receive the correct global notice

### Presentation

- 100% desktop browser zoom
- Tablet portrait and landscape
- Dark mode text contrast
- Two-second dice tumble with final pip result
- Reduced-motion operating-system setting
- No unrecoverable page layout cutoff
- Player action dropdown notifications queue without overwriting one another
- Balance changes produce queued positive or negative cash delta animations for every affected player
- Jail and Just Visiting render as visually separate areas and tokens use the correct area
- Phone portrait mandatory modals remain opaque, safe-area aware and internally scrollable
- Tablet and phone Players, Turn Actions and Game Menu overlays remain mutually exclusive
- Bus Ticket gained/expiry acknowledgements animate and dismiss
- Post-game graphs show axes, exact point values, player toggles and Ranking mode
- Post-game player action history contains all player-attributed gameplay actions

## RC 3.3.12 focused regression

- Header metadata reads in the order: Room — Match Ranked/Casual — players — Duration — clock, with no cramped duplicate labels.
- Casual lobby can add AI players after the recovered-host hotfix; ranked lobby still rejects AI by design.
- Auction remains open indefinitely before the first bid; first valid bid starts the competitive 8-second timer.
- Unimproved majority colour ownership charges 2x base rent; complete colour ownership charges 3x base rent; developed rent does not stack those multipliers.
- No property in a colour group can be mortgaged while any development remains anywhere in that colour group, including during auto-liquidation.
- Manual debt liquidation keeps property-management controls usable and can complete debt without enabling Autopilot.
- Chance/Community Chest never draw Chairman of the Board or Holiday Fund Matures.
- Final standings use elimination/survival order rather than bankrupt net worth.
- Launcher window may close while the detached server stays online; STOP_MEGA_MONOPOLY terminates the stored PID.
