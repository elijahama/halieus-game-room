# HGR 4.7.0 Guild-v-Guild fixture — staged implementation

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

No game rooms are created here; locked lineups do not assign boardMatchIds,
change ratings, emit wins, trigger game launches or claim live tournament
functionality. No production deployment, shutdown or downtime occurs. No
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
