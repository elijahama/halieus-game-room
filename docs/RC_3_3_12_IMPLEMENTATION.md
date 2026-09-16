# RC 3.3.12 Implementation Notes

Release: `0.22.9-rc.3.3.12`

This patch is based on the hotfixed rebuild supplied after the 9 August multiplayer test.

## Implemented fixes

### Header metadata

The in-game header now uses one consistent metadata sequence:

`Room <code> — Match <Ranked/Casual> — <n> players — Duration <time> — <clock>`

Desktop spacing is reduced and consistent. The existing phone layout can now target the header metadata through the `game-header-details` class instead of relying on unmatched selectors.

### Auctions wait for participation

A timed auction no longer expires merely because nobody has bid yet.

- Auction opens in a ready/waiting state.
- The competitive 8-second timer starts on the first valid bid.
- Every subsequent valid bid resets that timer as before.
- Deadline resolution is ignored until a highest bidder exists.

This prevents a declined property from silently leaving the auction unsold before anybody participates.

### Legal mortgage/liquidation rules

Colour-group mortgage validation now checks the entire group, not only the selected property.

A property in a colour group cannot be mortgaged while **any** property in that group still has houses, a hotel or a skyscraper. Automatic debt liquidation uses the same restriction, so it must sell legal development levels before mortgaging that group.

### Manual debt liquidation

The debt UI no longer immediately closes the property-management panel after the player chooses manual liquidation.

During an unresolved debt, the debtor can remain in the Properties panel and use legal cash-raising actions. Server-side asset actions already re-run debt settlement after cash is raised, so Autopilot is no longer required to finish a manually recoverable debt.

### Mega Monopoly unimproved colour rent

Unimproved property rent now applies the Mega ownership bonuses centrally:

- majority of a colour group: `2x` base rent;
- complete colour group: `3x` base rent;
- once developed, the normal development rent table takes over.

The global rent notice also identifies majority-double and complete-group-triple rent.

### Deck cleanup

Removed these non-Mega cards from the active decks:

- `You Have Been Elected Chairman of the Board`
- `Holiday Fund Matures`

Persisted decks are already normalized against the current card definitions, so removed card IDs are discarded when state is recovered.

### Final standings

Player statistics now store `finishPosition` at elimination time.

For a four-player match, the first eliminated player is assigned 4th, the next 3rd, the last eliminated player 2nd, and the last active player 1st. Winner screen and exported match report sort by this placement instead of bankrupt players' remaining net worth.

### Background launcher

`Mega Monopoly` now starts the Node server as a hidden detached process through `start-background.ps1`.

- Closing the launcher window no longer intentionally owns the server lifetime.
- PID is saved to `.runtime/mega-monopoly.pid`.
- stdout: `logs/server.log`
- stderr: `logs/server-error.log`
- `Close Monopoly` first kills the recorded PID, then falls back to the listener on port 3000.
- Tailscale Funnel remains in background mode.

Because this release was assembled in a Linux build environment from a ZIP containing Windows-native Vite/Rollup dependencies, the launcher also has a **one-time Windows client build check**. If `client/dist` is not marked for the current `VERSION`, it runs the client build on the target Windows machine and records the release marker. Later launches reuse that bundle.

## AI hotfix status

The supplied hotfixed baseline contains the recovered-host repair in `aiLobbyHandlers.ts`: a recovered host seat can repair a stale `hostId` before host-only AI add/remove operations are rejected.

No additional AI rewrite was made in this patch. AI-player addition should be retested in a Casual lobby on the target Windows build.

## Automated regression coverage

Run:

```powershell
npm run test:regression
```

The regression script checks:

- elimination placement order;
- auction waiting before first bid and first-bid timer start;
- majority `2x`, complete-group `3x`, and developed-rent takeover;
- auto-liquidation clearing colour-group development before mortgaging that group;
- removal of the two invalid cards.

## Manual acceptance pass

1. Create a Casual lobby and add Easy, Normal and Hard AI seats.
2. Decline an unowned property and wait longer than 8 seconds without bidding; confirm the auction remains open.
3. Place the first bid; confirm the 8-second countdown begins then.
4. Own a colour majority with no buildings and verify `2x` base rent.
5. Own the complete colour group with no buildings and verify `3x` base rent.
6. Add a development and verify the development rent table replaces the ownership multiplier.
7. Enter debt while a colour group is developed; confirm neither manual nor automatic liquidation can mortgage any property in that group until all group development is sold.
8. Choose Manual Liquidation; confirm the Properties panel stays usable and the debt clears without enabling Autopilot once enough cash is raised.
9. Play through multiple bankruptcies and verify final standings follow survival order.
10. Close the launcher after startup and confirm the site remains online. Run `Close Monopoly` and confirm port 3000 stops.
11. Confirm neither removed card appears in Chance or Community Chest draws.
