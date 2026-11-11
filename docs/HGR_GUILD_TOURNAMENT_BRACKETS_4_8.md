# Mega Board Tournament Mode — Guild knockout candidate for 4.8.0

## What is actually being implemented

The first 4.8.x tournament milestone is an **operational four-Guild, single-elimination bracket** within the existing **Guilds → Tournaments** area. It uses the established real two-board Mega Board fixtures rather than mocks, AI results or manually entered wins.

An eligible Guild owner/admin may create a named knockout. The host shares its invitation ID with three other Guild managers. Each manager explicitly registers their Guild, and the host starts only when four distinct real Guilds have signed up. The transparent seed order is registration order (first versus fourth, second versus third), **not an invented rating or ranking**.

In each semifinal, competing Guild managers use the already-working two-board Guild fixture system: manager proposals, opponent approval, real separate Mega Board lobbies, authenticated locked rosters, standard economic rules, real game start and finished-game receipts. A manager links that verified fixture to the bracket match. Official tournament fixtures must be created after that tournament starts: historical finished games cannot be retroactively credited to a new knockout. The tournament coordinator reads the **server-persisted completed two-board receipts** and advances the Guild winning both boards. No browser API accepts arbitrary winner IDs, points, F1 awards or manual match outcomes. Once both semifinals have verified winners, the final becomes ready; another authenticated two-board fixture determines the champion. Completion and progress persist across server restarts.

**A 1–1 split is deliberately unresolved** until a formal tiebreak rule has been approved. It does not fake a winner or auto-advance a Guild. Tournament ratings remain independent and unmodified; no new rating awards occur in this slice. The system is separate from non-scoring Beta practice and never binds a Beta, AI, Ranked or Blitz lobby as an official fixture (the underlying verified fixture guards enforce these restrictions).

## API, state and permission boundary

- `GET /guild-tournaments`: authenticated, returns only tournaments where the viewer belongs to a registered Guild; reconciles finished receipts.
- `POST /guild-tournaments`: authenticated Guild manager creates a four-team tournament.
- `POST /guild-tournaments/:id/register`: invite-ID registration restricted to the registering Guild's manager.
- `POST /guild-tournaments/:id/start`: host Guild manager starts exactly four confirmed entrants.
- `POST /guild-tournaments/:id/matches/:matchId/link`: competing Guild manager attaches a server-verified fixture for the correct Guild pair. Duplicate reuse across tournament matches is rejected.
- `POST /guild-tournaments/:id/cancel`: host manager may cancel only before starting.
- Mutations require JSON and same-origin requests. The competition ledger is a separate atomic-write file under the durable Guild data directory; corrupted records fail closed. No private results are exposed through unauthenticated list operations.

The UI lives inside the already existing Guild Tournament tab, with the invitation ID, registration and start controls, two semifinal cards, final, linked fixture status and champion. It does **not** replace the existing real Guild fixture panel or alter the main Mega Board engine or canonical branding.

## Not yet complete (must not be represented as 5.0)

- Full Solo player-registration and solo bracket match binding.
- Double elimination, loser bracket, Grand Final reset semantics, byes and multi-round eight-or-more-entrant brackets.
- Owner-approved tie/forfeit and no-show arbitration, automatic cancellation/recovery of abandoned brackets.
- Formula One-inspired individual and team point policy and tournament-only rating settlement.
- Dedicated tournament discovery/search, bracket spectator routing and finished Mega Board replay/report presentation.
- Physical Android PWA testing with four real Guild managers, real live games and reconnects; independent Windows/Ubuntu CI; tagged 4.8.0 release packaging and safe Oracle rollout.

## Release gate

This is a source candidate for **4.8.0**, not an automatic 5.0 milestone and not a live deployment. The last approved live source release is 4.7.10. Authoritative VERSION and release fingerprint must advance together only after final green CI and release preparation. Do not auto-run a scheduled maintenance window to deploy this. Existing Mega Board game safety, roster, replay, account, UI and production data are protected.

See [version roadmap](HGR_DELIVERY_BATCHES_AND_TOURNAMENT_ROADMAP.md), the existing real Guild fixture description, and the corresponding source PR for the current acceptance status.
