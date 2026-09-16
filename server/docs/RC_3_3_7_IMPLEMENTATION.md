# Mega Monopoly v0.22.9 RC.3.3.7

## Implemented

- Phone portrait sheets and tablet mutually exclusive drawers retained from RC.3.3.5/3.3.6 and included in regression scope.
- Mandatory board decisions remain opaque, safe-area aware and internally scrollable on phones.
- Global queued action/card/Bus Ticket reveals retained. Free Parking now emits a global queued notice on every landing.
- Added queued animated cash deltas for every observed player balance change on every client.
- Jail / Just Visiting has a split corner visual and distinct token zones.
- A jailed current player can trade, build, sell, mortgage/unmortgage and manage Train Depots while the Jail decision is pending.
- Developed properties and stations with Train Depots can be traded with development intact. Existing mortgage-transfer interest remains in force.
- Speed Die retirement is reversible: all ownables owned means retired; any asset returned to the Bank means active; it retires again after all ownables are re-acquired.
- Asset displays are sorted clockwise from GO by board position.
- Kass Maneuver Award is tracked live from direct Birthday Gift ↔ GO transitions. Zero activity gives No award. Ties are resolved deterministically by game/turn order, then player id.

## Release checks

```powershell
npm run typecheck; if ($LASTEXITCODE -eq 0) { npm run build }
```

Manual regression targets: desktop, Android/iPhone portrait, iPad portrait/landscape, mutually exclusive drawers, Jail asset actions, developed-asset trades, cross-client card/Bus reveals, cash deltas, Free Parking notifications, forfeit/Speed Die lifecycle, Kass award and Match History.
