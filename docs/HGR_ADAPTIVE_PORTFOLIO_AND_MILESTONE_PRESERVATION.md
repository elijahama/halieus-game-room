# Adaptive Mega Board player portfolios and milestone preservation

## Scope and current status — 2 November 2026

Owner-requested UX: Mega Board player portfolios use the available panel space according to each player's holdings, rather than constraining a player with many properties to the same tiny area as one with two. Holdings are grouped by property colour (brown, light blue, pink, orange, red, yellow, green, dark blue), then stations, then utilities. Within a colour the original board sequence is preserved only for easy identification. Full ownership of a group produces a collapsed "Full set" disclosure; more than half produces "Majority set". The complete underlying list must remain expandable, including developments, mortgages and station depots. These are view-only summaries, never gameplay monopoly/rent changes.

The code candidate uses the existing authoritative board definitions to determine group totals and membership. Responsive chip layout uses the actual available width, with separate desktop rail and mobile/tablet drawer behavior; no board ownership/rent calculations have been changed. Player cards are weighted by owned-asset volume but each player remains reachable through the independently scrollable roster. Do not auto-expand a disclosure while a user is mid-inspection. Existing current-player emphasis and spectator visibility must persist. Preserve existing approved HGR H, game icons, navigation and privacy.

QA for this initial source candidate: targeted source regression, desktop/tablet/phone browser specimen, and TypeScript client/server typecheck. Full regression/release CI and owner-device acceptance remain separate gates; no claim of live Oracle deployment. Do not change VERSION until a separately approved release candidate has passed required release identity checks.

## Separate follow-up work (not included in this mini-batch)

1. Spectator board-first presentation: remove wasted space in large desktop sidebars, improve portrait/tablet sizing, accessible player/spectator rosters and turn-state clarity without revealing private player data. Verify all board skins at native and fullscreen aspect ratios.
2. Audit each Mega Board cosmetic against a shared 52-space square board grid; no board-specific offsets, transform drift, clipping, or changed hitboxes.
3. Cosmetic controls: immediate selected/equipped/locked feedback; gamer-score grant and refresh at account level; avoid unlock gates re-entering an endless pending state. Track existing issues #201 and #203.
4. Android/PWA notification contexts: preserve the approved Control H/cog icon, use the canonical HGR main glyph for generic site notifications, and existing game-specific approved icons for each supported game. Status bar monochrome assets derive from canonical references; no invented glyph geometry.
5. Noughts and Crosses: build on existing 3×3 / 4×4 / 5×5 Casual + Ranked rules foundation; add authoritative multiplayer rooms, joins, move/turn validation, reconnect, spectators, end-of-match receipts and targeted E2E tests. Existing issues #118 and #200.
6. Tournament: build from the existing Mega Board single/guild fixture and independent tournament-rating work. Proceed with a feature-flagged solo bracket and matching end-to-end tests (issue #199), then verified double elimination, separate ratings and replays. Do not claim 5.0 before complete owner acceptance.
7. Readability: Alata for compact ordinary game text, preserve restrained established heading fonts; no arbitrary reductions that make property/station names unreadable.

## Durable development checkout checkpoint policy

Treat the owner's half-step version labels 4.8, 4.85, 4.9, 4.95, 5.0 and 5.05 as milestone *snapshots* with canonical SemVer 4.8.0, 4.8.5, 4.9.0, 4.9.5, 5.0.0 and 5.0.5 respectively. Snapshot labels must not inflate VERSION or release readiness: a checkpoint is created only after the corresponding verified real source milestone is accepted.

At each checkpoint, preserve the exact Git SHA and associated source identity in a protected, immutable tag plus a distinct read-only archive/worktree under a safe owner-selected checkouts location. Keep original laptop development, published laptop release, and deployment source distinguished and independently identifiable. Never overwrite a prior milestone, clone private runtime data/secrets into Git, or copy generated deployment credentials. The active development checkout continues forward. Routine patch releases between checkpoints rely on Git history and release artefacts, not extra permanent working trees. For 5.0.0 specifically, the full tournament acceptance gate remains mandatory; a checkpoint request never bypasses it.

Release promotion requires version-matched build, tests, CI/release manifest and actual Oracle health fingerprint. Confirm each checkpoint archive and tag can be restored before declaring it preserved. This planning entry does **not** assert any of these future version checkouts have already been created.
