# 4.8 Solo tournament real-result verification and final advancement

**Status:** Independent source-only follow-up to the default-off Solo registration and real-lobby binding branches. Not an accepted 4.8.0 release; no production flag activation, website deployment, rating change or HGR branding change.

## Verified server gameplay pipeline

- On a truly finished server-owned Mega Board GameState, the existing trusted game:state lifecycle can invoke recordFinishedSoloTournamentBoard; there is **no** HTTP or client API for declaring results or winners.
- For the original bound room generation only, settlement verifies identity by the in-memory room pointer, original creation timestamp, started flag, current authoritative GameState object, original distinct human account and player-seat IDs, no AI/Ranked/Blitz/Beta and genuine gameStartedAt.
- The sole actual GameState.winnerId must match one of the original human player socket seats and its saved signed-in HGR account. CompletedAt, gameStartedAt, boardMatchId, room code/creation and verified winner are persisted in the same atomic Solo tournament store.
- Duplicate game completion notices are idempotent; later conflicting winner, substituted room, client result routes, forged match record and corrupt champion data fail closed.
- Semifinal 1 and 2 results **must both** be verified before participants of final are computed. Final initially awaits opponents; when both match receipts are accepted, only their two winners become the final participants. Host may then link a third real two-human Mega Board room, with the same original room/roster guards, and its real result yields one persisted champion.
- Existing ordinary Ranked ratings, Beta practice isolation, normal Mega Board rent/economy, Gamer Score, Guild fixtures and PWA artwork remain unchanged. Tournament ratings and rewards are not credited merely because a match is linked or scored; they require a separately accepted competition batch.
- Store reader accepts previous source-only alpha unbound/room-bound records with null result timestamps; no fictional result migration. A completed tournament has an exact final winner and both authenticated semifinal winners or the loader rejects it.

## Deterministic acceptance

Test with real platform game:start handlers and server-owned state transitions for two semifinals and final. Reject ongoing games, foreign winners, cloned state, earlier forged gameStartedAt, duplicate/conflicting receipts and any client winner API. Confirm persisted bracket, real final pairing, once-only champion, restart, tamper rejection. Keep standard full regression, client/server typecheck, production build, immutable source/release identity and Windows/Ubuntu PR CI mandatory. Actual owner real-device match progression and crash/forfeit recovery are separate.

## Still open before the owner-defined 4.8 and 5.0 goals

Full Solo and Guild bracket UI, tournament match deep links, safe abandoned-room unbind/rebind and forfeit rulings, double-elimination losers bracket and finals reset, replays/reports, separate ratings/leaderboards, mobile UX, real-player competition acceptance and zero-room production rollout. No one is authorised to call this release 4.8.0 or 5.0.0 from its source tests alone.
