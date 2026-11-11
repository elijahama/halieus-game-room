# Solo Mega Board tournament registration and deterministic bracket seeding

> **Historical implementation checkpoint:** the default-off/source-only status below is superseded by the owner-authorized [4.8.0 activation and full-server acceptance](HGR_RELEASE_REVIEWS.md). The original engineering evidence is retained.

**Source scope:** first small 4.8 development slice from current verified 4.7.13 main. This is **not** complete Solo tournaments, the accepted 4.8 milestone, or the 5.0 Tournament Mode release.

## Working implemented behavior

- A real signed-in HGR account can create a **four-human-player** Solo tournament with an opaque invitation ID and bounded title. No username identity matching, AI seats, guest entrants or client-submitted winners.
- Participants register **only themselves** using authenticated sessions and the invitation ID. Repeated registration and four-slot overflow return explicit conflicts, including concurrent joins.
- The tournament host alone seeds a full four-person single-elimination bracket. First seed faces fourth, second faces third. Two semifinals and a final are durably stored; no game rooms or results are fabricated.
- The host may cancel an unbound seeded tournament; guest may leave before seeding only. Account-scoped reads reveal only the tournament(s) that the authenticated account created or joined.
- Atomic JSON persistence outside deployed code via HALIEUS_DATA_DIR (or existing Mega Board data root), bounded open-tournament count, restart recovery and corruption fail-closed. No player rating, achievement, rank, gamer score or match record is modified.
- API paths under /tournaments/solo enforce JSON Content-Type and same-origin POST checks. **Disabled by default** unless HGR_SOLO_TOURNAMENT_ALPHA=1 is explicitly set for a controlled development/test environment. Do not turn this on in production as a finished tournament.

## Tested

- tests/runtime-solo-tournament-registration.mjs: authenticated self-registration and privacy; host authorization; four-seat/race protection; deterministic bracket order; all winner and room fields null; idempotence and refusal of illegal state transitions; durable restore; canceled bracket restart; corrupt persisted winner rejected without overwrite; direct HTTP 401/403/409 and non-existent winner mutation route 404; source guard for default-off feature flag.
- Client/server TypeScript; standalone integration test. Full regression/release CI and independent owner acceptance remain separate gates.

## Remaining before 4.8 goal can be accepted

1. Bind approved Solo matches to verified, real unstarted two-human Mega Board rooms under authenticated player IDs; block roster substitution, Blitz, regular Ranked and Beta scoring bypass.
2. Accept results **only** from actual server-owned finished games with exact room creation identity, actual recorded game-start time and verified winner, once and only once. Safely advance bracket, handle reconnect/restart/forfeit.
3. Implement the chosen Solo double-elimination loser bracket and finals reset policy; tie/cancellation rules, spectators and match notifications.
4. Integrate the live UI and owner/device mobile acceptance with the four-Guild bracket and independent tournament standings. Do not call 4.8.0 complete until **both** Solo and Guild formats work end to end.

This first batch deliberately introduces no production-visible incomplete tournament controls and preserves canonical HGR artwork.

## Subsequent isolated room-binding candidate

A second source-only draft extends this registration foundation to host-authorised semifinals bound to existing real authenticated two-human Mega Board rooms, with immutable room generation and match UUID plus socket join/start/reconnect/AI guards. It remains default-off and results are not yet settled. See [4.8 Solo Room Binding](HGR_SOLO_ROOM_BINDING_4_8.md).
