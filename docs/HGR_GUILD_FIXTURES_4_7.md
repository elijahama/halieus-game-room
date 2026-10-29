# HGR 4.7.0 Guild-v-Guild fixture — staged implementation

## Second audited slice — real-room binding (source only)

After both Guild managers lock their lineups, a participating manager may
bind two **existing, independently created** ordinary Mega Board lobbies
using `POST /guild-fixtures/:fixtureId/bind-rooms` with
`{"roomCodes":["CODE01","CODE02"]}`. Both lobbies must have the exact
authenticated human account-ID rosters approved by both Guilds, have no AI,
no extra players, no active game, and no Ranked/Blitz rules. Each binding
records a unique boardMatchId, the actual room creation timestamp, room code
and verified account IDs. An already-bound fixture or room cannot be silently
reassigned.

The real Mega Board join and AI-add handlers now refuse attempts to alter the
locked roster; the normal host-owned start handler rechecks room identity,
connected seats and locked account IDs. Once that guard passes, it starts
the **ordinary Mega Board engine** for each board independently. The game
does not give teammates joint wallets, exempt them from rent, or change
normal economic gameplay. For bound fixtures, a participating manager can cancel **only if both original lobbies still exist and neither has started**; cancellation is refused once either board starts or its identity cannot be verified. Bound seat recovery additionally requires the original authenticated account and its reconnect token, preventing token-only cross-account takeovers.

Dedicated runtime tests launch both rooms through the real Mega Board start
handlers and reject tampered rosters, AI additions, duplicate assignment and
unauthorised operations. This is a substantive step towards 4.7.0, **not a
completed competitive fixture**: team outcome aggregation, tournament rating
settlement, automatic finished-game receipts, Guild-facing launcher/status
UI and end-to-end reconnect/forfeit acceptance remain pending. VERSION stays
at 4.6.10 until the playable milestone is complete.

## Scope of first audited slice (source only)

This is the **first 4.7.0 candidate batch**, not a released playable Guild tournament.
The roadmap's 4.7.0 milestone remains gated on **real simultaneous Mega Board
game creation**, independent regular economic rules, board result identity,
verified scoring and team outcome, cancellation/reconnect and usable UI.

This slice adds a durable, authenticated **two-board fixture proposal** to the
existing Guild service. A manager of one Guild nominates distinct, currently
enrolled players for both boards; a manager of the opponent Guild supplies its
own eligible lineups and explicitly locks the fixture. Each board contains
players from both Guilds and may not exceed the normal eight-seat limit.
Participants may not be booked into both simultaneous boards. Either Guild
manager can cancel the proposal/locked pre-launch fixture. The coordinator
serializes writes atomically to its own Guild data file, rejects corrupted
records and never modifies normal Ranked or tournament ratings.

### Routes (private, authenticated; no launch actions)

- `GET /guild-fixtures` lists only fixtures involving a Guild of the viewer.
- `POST /guild-fixtures` requires home Guild manager, two home lineups and away Guild ID.
- `POST /guild-fixtures/:fixtureId/accept` requires away Guild manager and its two lineups.
- `POST /guild-fixtures/:fixtureId/cancel` requires participating Guild manager.

Mutations require JSON and reject foreign Origin headers. Neither guest
clients nor unapproved Guild members may create/accept/cancel fixtures.

### Boundaries

This early proposal-only boundary is superseded by the real-room binding
slice above. Rooms are still created via the existing standard Mega Board
lobby flow; no automatic room creation or tournament result finalisation
is included. Binding does not change ratings, emit team victories or claim
a complete tournament. No production deployment, shutdown or downtime occurs. No
launcher, H geometry, colour family, canonical PNG or icon reference is changed.
The source version stays 4.6.10 until the **complete playable 4.7.0
milestone** passes end-to-end tests, Windows/Ubuntu CI, live acceptance and
controlled release verification.

### Next audited slices

1. Bind locked lineups to two actual independent normal Mega Board rooms,
   server-authenticate socket seat ownership and prevent duplicate launches.
2. Attach exact room/game-start identity to the existing isolated tournament
   rating ledger and canonical finished-match replay archive, with verified
   once-only completion.
3. Define and implement owner-approved two-board team scoring/tie/cancellation
   and replay/reconnect semantics, then provide Guild-facing fixture status/UI.
4. Verify end-to-end with four real accounts, full regressions and
   phone/tablet acceptance before version advancement.
