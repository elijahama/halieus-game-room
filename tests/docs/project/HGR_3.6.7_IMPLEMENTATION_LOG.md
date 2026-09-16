# HGR 3.6.7 implementation log

## Requested scope

- Bring Blackjack back from scratch.
- Bring WHOT back from scratch.
- Add Cheat, named only Cheat.
- Add Dominoes.
- Remove the permanently visible website build number and make exact build information click-to-view.

## Implementation

Blackjack and WHOT no longer route through their pre-3.6.7 implementations. Their old client/server source snapshots are archived under `docs/archive/legacy-blackjack-whot-3.6.6`; compatibility files only re-export the isolated rebuilds.

Cheat and Dominoes use a new shared classic-table contract with distinct rules/state while sharing HGR room lifecycle, AI seats, reconnect tokens, spectators, live-room summaries and session archival.

Create Room exposes Casual/Ranked plus AI count/difficulty for Blackjack, WHOT, Cheat and Dominoes. All four can therefore be tested by one human with AI opponents.

The always-visible build marker created by `client/src/main.tsx` was removed. Exact release diagnostics remain available via Build Info controls on the Home sidebar and Display Settings panel.

## Preservation

Ludo and Poker protected screens are unchanged. Mega Board board/layout/gameplay is outside the 3.6.7 change set.
## 3.6.7a Oracle build hotfix

A Windows/Oracle production deployment exposed two TypeScript defects in the new Cheat/Dominoes classic-table handler that were not caught by the earlier dependency-limited validation environment. The public-state mapper now narrows Cheat vs Dominoes before calling the generic player-order helper, and Dominoes now defines the `pipTotal` helper used by host end-game ranking. These were compile-time defects; the release remains the 3.6.7 four-game feature set with no rule/layout redesign.

