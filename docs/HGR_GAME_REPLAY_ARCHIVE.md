# HGR universal game replays — owner direction and Part 37 foundation

**26 October 2026. Owner approved global scope. Version: 4.6.0 foundation candidate in the 4.6.x development series; 5.0.0 is reserved for fully realized Tournament Mode. Status: isolated source foundation, NOT LIVE or fully integrated.**

## Product requirement

Follow the quality of Chess.com's finished-match review workflow for **every HGR game**, not just Mega Board and not just tournaments. An authorized player should be able to open **Game History**, choose a finished match, replay/step through the game, scrub or navigate its key events, inspect the end report, share a permission-controlled view and download a portable record. Where practical offer separate human-readable text and JSON export. A multi-board Mega Board Guild fixture should link to both ordinary game archives; it must **not** create a second incompatible tournament-only replay format.

Games in current HGR catalog (14): Mega Board, Poker, Blackjack, WHOT, Ludo, Hidden Dictator, Connect Four, Word Game, Password, Anagrams Race, Cheat, Dominoes, Ayo and Word Board. Newly added games must use the same archive contract. Tic-tac-toe/Noughts and Crosses is future/other scope and gets its own adapter when actually in the authoritative HGR catalog.

## Separation and safety

- Ranked and tournament ratings/stats are separate ledgers. Replays are an **HGR-wide infrastructure service**, associated with a game and optionally linked to a tournament/fixture. A tournament replay never modifies regular ratings and a regular replay never modifies tournament ratings.
- Only server-confirmed finished results may become permanent archives. Never persist raw private game rooms or unredacted client state. Game-specific adapters explicitly choose public-safe replay events and board checkpoint fields. Hide unrevealed cards/hands, secret roles, policy hands, private chats, reconnect credentials, socket IDs or undisclosed participant information where required. Hidden-information games require a specific review of **post-match** reveal policy; no universal reveal-everything shortcut.
- The first universal portable record uses `hgr-game-replay` version 1, with game ID, match/room identity, start/end times, participants, action events and a discriminated playback track. Native Mega Board checkpoint track is implemented using the existing privacy-safe replay frames; all other games currently have an **event-timeline foundation**, not yet state-by-state visual board playback. These must receive audited game-specific visual adapters later.
- A common server-side store is isolated under `HALIEUS_DATA_DIR/replays/<game>/<SHA256 match id>.json` (or local data root). Files are immutable per match and written atomically. It has no public URL, socket listener or permissions bypass. Retrieval and sharing must be authorized server-side before adding a route; source-only changes do not expose game records to spectators.
- No game replay restores or mutates a live match. Downloadable JSON is an archive, **never** a save-slot or resumption token. Only expose sanitised results/frames and account identity when appropriate; future share links need explicit owner consent, scope and revocation.
- Current Mega Board in-room replay keeps up to **240 checkpoints**. Early checkpoints may be lost in long matches. Do **not** mislabel that as a full-game visual replay or full deterministic action record. Before global launch, replace bounded in-room presentation history with a durable complete server action/event stream and accurately represent incomplete legacy records.

## Part 37 implementation (foundation only)

1. `shared/platform/game-replay.ts`: shared typed archive contract supporting all 14 catalog game IDs, text and JSON export, separate native-checkpoint and event-timeline tracks; optional fixture references.
2. `server/src/platform/game-replay-timeline.ts`: strictly whitelisted completed-match public-event adapter contract usable by every game's handler in subsequent small batches.
3. `server/src/platform/game-replay-store.ts`: versioned immutable per-game storage by hashed ID, atomic persistent writes, identical-finish deduplication and rejection of conflicting overwrites.
4. `server/src/games/mega-board/utils/mega-game-replay.ts`: verified finished-match Mega Board conversion to the shared archive, with native replay frames and optional tournament linkage; no private rooms saved.
5. `tests/runtime-hgr-game-replay-archive-part37.mjs`: tests all 14 game IDs, JSON+TXT, privacy whitelisting, immutability/concurrency, path traversal and finished-only guards.

**Release gate:** Do not claim this foundation makes all game histories downloadable on the website. No in-game controls, retrieval API, multi-game visual adapters or end-of-game lifecycle triggers ship in this batch. Each subsequent adapter needs persisted immutable completion, consent/permissions for viewing, checkpoint and event coverage, tests and a release identity audit before declaring live. Continue game-by-game in mini-batches, protecting working owner data and canonical HGR launcher art.
