# 4.8 Solo semifinal binding to real Mega Board rooms — reviewed development slice

**Status:** Source candidate only. Builds on server-side Solo registration/seeding draft PR #229; still requires later actual finished-game receipt and advancement logic. Public HGR_SOLO_TOURNAMENT_ALPHA remains **off by default**. No production rollout, milestone promotion, PWA/artwork change, ranked/tournament score grant or gameplay economy change.

## What works

- Once a four-entrant Solo tournament is seeded, its host can bind **each semifinal** through the private authenticated POST /tournaments/solo/:id/matches/:matchId/bind-room endpoint using a real, already-existing unstarted Mega Board lobby code.
- The two human player seats must be connected, original distinct authenticated HGR accounts matching that exact bracket pairing; cannot be AI, Ranked, Blitz or Beta practice. A lapsed host, replaced room instance, changed roster, third seat, missing room, duplicate room across brackets or Guild fixture linkage fails closed.
- Binding commits original server room creation timestamp and freshly minted immutable board match UUID to the persistent Solo bracket. No fabricated rooms, winners or match completion receipts. Separate matches cannot share a room.
- Game-side guards recognise bound Solo rooms in game:preview, game:join, game:reconnect, game:start, game:add-ai, game:remove-ai, and game:leave. New joins and AI changes are blocked; token-based recovery requires the same original authenticated account; original lobby identity and all exact two-human seats are checked again at game start. This protects existing normal game sessions without changing unbound-room gameplay.
- Atomic persistent writes survive process restarts, reject duplicated room use and invalid/forged match UUIDs, and refuse destructive cancellation after room binding. Old unbound alpha registration records are read with null room identities, not reset.

## Audit tests

npm run test:solo:room-binding tests genuine in-memory server room objects (the same rooms store used by gameplay), registered account seating, mismatched identity, AI, Blitz, Ranked, Beta, absent/duplicate/started/tampered lobbies, host-only HTTP route, exact match identity, restart recovery and corrupt-match fail-closed. The test includes real Mega Board Socket.IO handlers with a genuine original two-player start (GameState phase ordering), plus preview/join/add/remove AI/leave/reconnect denial on locked lobbies. Both existing Solo registration and Guild fixture tests remain regression gates. Client/server TypeScript and full regression/build/Windows/Linux CI are mandatory prior to merging.

## Open gates before 4.8.0

- Server-only **finished-game receipt** from the real bound Mega Board GameState, using immutable game start, original room creation and exactly the two assigned human accounts; reject manual/duplicate/later-generation results. Advance match winners into final only after verified receipts, with crash/restart recovery.
- Safe failed/abandoned pre-start lobby **unbind/rebind** protocol and explicit forfeits; currently a bound lobby cannot be cancelled in-place, to avoid falsely releasing identity.
- Final room binding after both verified semifinal winners, losers bracket / double elimination and reset rules as accepted, actual match spectator routes and mobile UI. Full Guild+Solo owner acceptance remains mandatory; no actual tournament mode release is implied.

The canonical HGR launcher glyphs, Control UI and all permanent account/rating data remain untouched.
