# Mega Board Guild tournaments — 4.8 integration candidate

## Approved formats and results

Four distinct Guilds register through their owners/admins. The host starts once all four have entered. Registration order seeds first versus fourth and second versus third. The manager selects single or double elimination when creating the tournament; formats cannot change after creation.

Each bracket match uses a fresh approved two-board Guild fixture. Guild managers propose and approve original lineups, assemble two independent ordinary Mega Board rooms, and link the fixture. The games keep normal cash, rent and property rules. Official rooms reject AI, Beta practice, Ranked and Blitz. The fixture must be created after the tournament starts and cannot be reused by another bracket match.

The server records real finished-game receipts. A 2–0 fixture produces its winner directly. **Owner-approved on 11 November 2026: a 1–1 split requires a deciding third game.** Each Guild manager nominates one current member from that fixture's original lineup. A manager cannot nominate for the opposing Guild or substitute someone outside the original lineup. Both nominees must join a fresh, unstarted, ordinary two-human room created after the original boards finish. Either participating manager may link it. Linking locks both nominees and mints a new server match identity. Membership is rechecked at game start; later membership changes cannot rewrite completed results.

Only that real game's verified winning account settles the split fixture. Original board receipts and the 1–1 board score remain intact; the deciding result is recorded separately. No browser endpoint accepts a winner, points or result. Duplicate result delivery is idempotent; conflicting results, mismatched room generations or invalid persisted deciders fail closed.

| Format | Progression | Championship |
| --- | --- | --- |
| Single elimination | Two semifinals and final; one lost fixture eliminates a Guild | Verified final fixture winner |
| Double elimination | Semifinals; winners final; losers round 1; losers final; Grand Final | The undefeated finalist wins immediately if it wins the Grand Final. If the losers finalist wins, the same Guilds play a fresh reset fixture. Its winner is champion. |

A Guild must lose two fixtures to be eliminated from double elimination. A loss in one of a fixture's individual boards is not itself a bracket loss. Every final/reset fixture can itself require a third game after a 1–1 split. No byes, timed wins or manual disqualifications are introduced.

## Player and recovery controls

Guilds → Tournaments contains registration, format selection, invitation, bracket, existing fixture linking and decider controls. Original nominated players get Return to deciding game; the existing spectator route provides Watch. Same-device return uses the saved recovery token when available. UI shows saving, saved and retry feedback. Light/dark text uses existing HGR theme tokens; canonical artwork is unchanged.

An unsettled bound Guild room cannot be deleted through ordinary End-room or cleanup. Pre-start Leave cannot break the locked roster. Disconnect alone never awards a loss and retains the recovery slot. Once started, authenticated Leave/Forfeit forfeits only that player's normal Mega Board seat; a surviving human gains host continuity where needed. The result is settled through the same finished-game receipt path. Bound lobbies use extended tournament host grace. Existing completed receipts and pending deciders survive restart.

Both original unstarted fixture rooms may be released through the existing manager cancellation policy. A started fixture or bound decider cannot be silently reset, replaced or cancelled. A genuinely missing started room remains unresolved pending recovery; this candidate does not invent an arbitration winner or a new Guild reset-consent policy.

## API and persistence

- GET /guild-tournaments: authenticated, membership-scoped list; reconciles saved fixture results.
- POST /guild-tournaments: manager creates single or double format.
- POST /guild-tournaments/:id/register, /start, /cancel: authorized registration and host controls; cancellation only before bracket start.
- POST /guild-tournaments/:id/matches/:matchId/link: competing manager attaches an eligible unused fixture.
- POST /guild-fixtures/:fixtureId/tiebreaker/nominate: each Guild manager nominates its own original player.
- POST /guild-fixtures/:fixtureId/tiebreaker/bind-room: participating manager links the fresh deciding room.

Private reads are no-store. Mutations require authenticated JSON and same-origin requests. Fixture and bracket ledgers use atomic sequential writes in the durable Guild data directory. Malformed persisted rosters, bracket dependencies, deciding receipts and champions fail closed. Tournament results do not change normal Ranked or Gamer Score awards; separate tournament ratings remain on the 4.9 path.

## Validation and release gates

Real HTTP and Mega Board handler tests cover original board starts, split-result nomination permissions, room eligibility, membership-at-start, actual disconnect and authenticated forfeit, host continuity, immutable result delivery, saved nominations/results and bracket advancement. Coordinator tests exercise real-room receipt validation through both reset champions and a no-reset champion, second-loss elimination, duplicate fixture refusal, per-round disk restoration and tampered dependencies. The shared bracket engine also passes all 96 double-elimination result paths through the Solo suite. These tests are not claims of four humans playing full matches.

Real React browser checks cover 390/820/1440px, light/dark themes, 100–200% text, format submission, original-player options, error/retry feedback, locked nominations, Return/Watch and completed-decider presentation.

This is the source candidate in [PR #246](https://github.com/elijahama/halieus-game-room/pull/246), built on main's preserved 4.7.15 hotfix baseline. It is not a deployed 4.8 release. The Solo alpha remains default off. Remaining acceptance includes physical Android/iPad PWA background recovery and closed-app push, missing-room/cross-device recovery policy, integrated Windows/Ubuntu CI, owner end-to-end acceptance and safe release packaging/Oracle rollout. Reports, replay navigation, tournament ratings and broader tournament discovery belong to the later roadmap. Eight-or-more entrant brackets are not included.
