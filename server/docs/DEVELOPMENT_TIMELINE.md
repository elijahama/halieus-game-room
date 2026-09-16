# Development Timeline

## Foundation releases

The project progressed through incremental rule packs covering turn order, ownership, rent, development, mortgages, bankruptcy, cards, auctions, Mega spaces, Jail, Speed Die, Train Depots, trading, persistence and AI.

## Current phase

**v0.22.9 RC.3.3.9 — Presentation, Rules and Public-Access Hardening**

Current release-candidate priorities:

- synchronized dice, movement and consequence presentation
- complete Chance, Community Chest and Bus Ticket event coverage
- shortage-only direct Hotel and Skyscraper rules
- creditor-correct bankruptcy and automatic Speed Die lifecycle
- reliable Turn 1 result graphs and cleaner final results presentation
- stable phone/tablet layout and fullscreen behavior
- stable free Tailscale Funnel public endpoint
- browser/app icon metadata and final UI polish

## Remaining before v1.0

1. Validate RC.3.3.9 on the Windows target machine.
2. Run friend beta tests on desktop, tablet and mobile.
3. Complete one full two-human match.
4. Complete one full human-vs-AI/Autopilot match.
5. Fix release-blocking bugs only.
6. Perform the mandatory v1.0 source-annotation pass across the entire codebase. Every source area must be documented, with comments focused on intent, rules, invariants and non-obvious behavior rather than restating obvious syntax.
7. Package clean v1.0.0.
8. Keep the Tailscale Funnel public endpoint documented and tested for remote play.
