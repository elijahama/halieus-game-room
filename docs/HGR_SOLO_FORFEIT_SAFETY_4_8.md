# HGR 4.8 Solo tournament — real forfeit and pending-room preservation

Status: **source-only candidate** layered on unmerged Solo registration, real binding and verified-results drafts; public flag HGR_SOLO_TOURNAMENT_ALPHA remains disabled by default. This is NOT an accepted 4.8 milestone, 5.0 mode, public website update, or recovered abandoned match.

## Implemented guarantees

- Bound Solo room host cannot use normal End room to discard an unfinished match, including while results are being persisted. The general server room lifecycle also refuses such deletion, protecting host-grace expiry and indirect cleanup calls.
- Before a verified match begins, original player lineup cannot be broken using Leave. An unfinished Solo lobby gets the 24-hour active-game reconnect grace rather than the unrelated ordinary 90-second lobby timeout; the shared deletion check still refuses clearing the bound match at expiry.
- After game start, a bound Solo host using Leave takes the same *real gameplay forfeit* path as a non-host participant. No fabricated winner is recorded. The surviving connected registered human becomes room host, retaining results/recovery and avoiding a dead forfeited host reference.
- Explicit Forfeit already uses the canonical Mega Board elimination engine; this batch verifies it for both roles and retains spectator continuity. The winner reaches the tournament through the separately verified server GameState result receipt (only if real game rules have produced a single true winner).
- A Forfeit event after the genuine GameState has already entered the finished phase is rejected rather than mutating the champion during asynchronous receipt storage; ordinary Leave remains available to exit completed results safely.
- Ordinary non-tournament rooms keep their 90-second lobby timer, existing End-room and Leave semantics. No HGR canonical launcher artwork, account stats, Ranked scores, Gamer Score, board economics or release identity is changed.

## Verified runtime acceptance

The new tests/runtime-solo-tournament-forfeit-sockets.mjs drives actual Mega Board session, lobby and game-state handlers through real two-human semifinal and final lobbies, checking host Leave, explicit Forfeit, protected End room and shared endRoom deletion, untouched ordinary room closure, surviving-host transfer, spectator view, exact verified winner and persisted champion, duplicate receipt idempotence, and 24-hour versus 90-second grace.

## Remaining recovery problem

This batch intentionally does NOT automatically cancel or rebind a deleted/abandoned tournament lobby. Rebinding requires positive proof the original never started plus an owner/participant-controlled protocol, collision/replay protection and persistent recovery receipts. **Never** grant a forfeit winner merely because someone disconnected, backgrounded their PWA or missed the host-grace timer. This must be completed before owner acceptance of a fully playable Solo 4.8 format.

Cross-platform CI, full regression, actual phone/PWA reconnection and owner acceptance are separate release gates; see the feature PR receipt. Protected HGR original source and icon-family assets are unchanged.
