# HGR 3.6.5 Implementation Log

Scope: finish the new Word Arena rollout without disturbing the already-approved Word Game flow.

1. Password Create Room gains Casual / Ranked selection, AI player count, AI difficulty, and points-to-win options.
2. Anagrams Race gains the same options so it can be tested and played against AI without waiting for a second human.
3. AI seats are server-side players: they count toward room capacity, are exposed in room state, and participate in Password clues/guesses and Anagrams solving.
4. Word Game remains on its approved simple setup: no new setup controls are surfaced and its create payload is forced to the existing solo casual defaults.
5. Word Game icon geometry is centred in the library tile.
6. Owner panel height is content-driven on desktop so the footer becomes the actual visual bottom of the panel.
7. No Ludo, Poker core, Mega Board board geometry, or existing 3.6.4a/3.6.4b gameplay/UI safeguards are changed.
