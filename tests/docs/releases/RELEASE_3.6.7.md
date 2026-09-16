# Halieus Game Room 3.6.7

## Four-game expansion

3.6.7 restores Blackjack and WHOT as isolated ground-up rebuilds and adds two new playable games: Cheat and Dominoes.

### Blackjack
- Fresh active implementation in `server/src/games/blackjack/rebuild.ts` and `client/src/games/blackjack/BlackjackRebuildScreen.tsx`.
- Six-deck shoe, dealer stands on soft 17, natural Blackjack pays 3:2, hit/stand/double actions, virtual chip table and AI difficulty support.
- HGR room create/join/recovery/spectate/live-room/chat/session-archive integration.
- Pre-3.6.7 Blackjack code is retained only under `docs/archive/legacy-blackjack-whot-3.6.6` for historical reference.

### WHOT
- Fresh active implementation in `server/src/games/whot/rebuild.ts` and `client/src/games/whot/WhotRebuildScreen.tsx`.
- New shedding engine with action-card handling for Hold On (1), Pick Two (2), Pick Three (5), Suspension (8), General Market (14) and WHOT (20), plus requested-shape handling.
- AI difficulty, recovery, spectators, room chat, live-room discovery and session archival are wired to the rebuilt runtime.
- Pre-3.6.7 WHOT code remains archive-only.

### Cheat
- New playable game named **Cheat** everywhere; no BS label is used.
- Hidden card hands, required-rank claims, Accept Claim / Call Cheat resolution, AI bluff/challenge behaviour and 2–6 player rooms.

### Dominoes
- New double-six Dominoes game for 2–4 players.
- Seven-tile two-player / five-tile larger-table deal, open ends, boneyard draws, pass handling and blocked-game resolution.
- AI seats choose legal tiles and draw/pass when blocked.

### Build information
- The permanent bottom-of-page build stamp has been removed.
- Exact version and release fingerprint remain available on demand through **Build Info** on Home and in the in-game display/settings menu.
- Release identity remains in document data attributes for diagnostics without permanently occupying the visible UI.

### Protected areas
- Ludo presentation remains byte-for-byte protected.
- Poker core table/game presentation remains byte-for-byte protected.
- Mega Board board geometry/gameplay is not part of this release.
## 3.6.7a Oracle build hotfix

A Windows/Oracle production deployment exposed two TypeScript defects in the new Cheat/Dominoes classic-table handler that were not caught by the earlier dependency-limited validation environment. The public-state mapper now narrows Cheat vs Dominoes before calling the generic player-order helper, and Dominoes now defines the `pipTotal` helper used by host end-game ranking. These were compile-time defects; the release remains the 3.6.7 four-game feature set with no rule/layout redesign.

