# 4.8 Solo tournament: unanimous pre-start lobby recovery

**Isolated development draft.** Builds on source-only Solo registration, true match binding, trusted result settlement and forfeit protection. Public HGR_SOLO_TOURNAMENT_ALPHA remains default-off. Not a complete 4.8 or 5.0 milestone and not installed in production.

## Server-authoritative recovery contract

- The only permitted reset concerns an existing, positively verified **never-started** room whose exact server room generation, identity and the two original human account seats still match the bound Solo semifinal or final.
- Each of those two **distinct authenticated HGR accounts** calls the private JSON/same-origin POST .../approve-prestart-reset for its own pending match. Neither the tournament host nor an admin can approve on behalf of another entrant. Duplicate approval is rejected; approval expires after ten minutes. A second genuine recent approval is required.
- No one receives a forfeit win for disconnection, PWA backgrounding, missing the grace timer or being absent. The lobby can contain a disconnected original player; their authenticated account approval remains required.
- While final approval is durably saved, a pending lock prevents the old room from starting. Once the Solo bracket's state has safely returned to awaiting-room (and its old room code/createdAt/boardMatchId cleared), the real Socket.IO room lifecycle closes and informs the old lobby and saves the updated room store. The tournament host may bind a **new** genuinely unstarted two-human lobby with a new server-minted match UUID. Original pairing, other tournament match receipts and winner-free state remain intact.
- Missing original rooms, reused room codes with a different creation time, played or started lobbies, changed human account seats, AI, Beta, Ranked/Blitz, outsider approval, double approval and unavailable server-side close operation all fail closed. No client winner route or trusted-game receipt is invented. Source-only alpha legacy records migrate to empty approval fields without rewriting earlier results.
- If an unexpected post-persist original-room closure failure occurs, it is logged and returned as an error rather than silently claiming an active match was reset. This edge needs a specific crash/recovery audit and owner acceptance before public enablement; an administrative reset must never be inferred from a disappeared room.

## Verification

Test tests/runtime-solo-prestart-rebind-consent.mjs with the genuine server room store, Express signed-in accounts and actual room End lifecycle: unauthorized and single-signature reset blocked, original lobby remains bound; two approvals close exactly the original never-started room; a replacement room gets a distinct real match identity; after start, reset is refused; missing/replaced rooms refuse reset; disconnected host can approve via its account; approval older than ten minutes does not count. Existing Solo registration, real-room, receipt and forfeit tests must remain passing. TypeScript, full regression, production build, source-integrity and Windows/Ubuntu CI are independent gates.

## Remaining before 4.8 goal

Unexpected crash during the multi-store handoff, persisted room save reconciliation after restart, administrative adjudication of genuinely missing original rooms or interrupted games, full real-player PWA reconnect testing, Solo and Guild tournament screens, approved double-elimination losers bracket/final reset, results/reports/replay and explicit owner acceptance. The production 4.7.13 website is separate and unchanged.

## Durable recovery implementation — 11 November 2026

The previous cross-store crash window is repaired in the integrated source candidate. A second valid entrant approval first persists a reset-pending record containing both approvals and the original room generation/match identity. All normal room start, join, cleanup and cancellation guards retain that binding. Only the server reset lifecycle can retire that exact unstarted room. It waits for a strict room-save barrier that propagates disk errors before committing the bracket back to awaiting-room.

Startup loads the tournament journal, strictly restores the room store, then reconciles pending resets before accepting sockets or restoring host timers. Missing rooms are recoverable only when a durable reset intent already proves the two-player authorisation; an initially missing room still cannot begin a reset. A changed/started original room fails closed. Interrupted or failed deletion retains the pending record for recovery. No winner or result is fabricated.

Validation: client/server typechecks, existing two-entrant consent/runtime tests and six real child-process restart cases pass: first approval only, after intent persistence, after in-memory deletion, failed room save, after durable room deletion, and after final bracket commit. Replacement bindings receive a fresh match identity. This closes the documented reset durability blocker in source, not the remaining full 4.8 bracket, UI, device or release acceptance.
