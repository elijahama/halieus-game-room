# Halieus Game Room 3.6.7 validation

Status: SOURCE / ISOLATED RUNTIME VALIDATION PASS; WINDOWS REGISTRY-BACKED INSTALL/CLIENT BUNDLE REMAINS DEPLOYMENT-SIDE.

Validation completed in the packaging environment:

- TypeScript/TSX compiler syntax transpilation across the maintained source tree: PASS (175 source files, zero syntax diagnostics).
- Dedicated 3.6.7 structural regression: PASS.
- Existing Start/Restart no-auto-deploy regression: PASS.
- Isolated server-handler smoke using the actual 3.6.7 game handler modules after TypeScript transpilation:
  - Blackjack create -> AI seat -> start -> player action -> AI continuation: PASS.
  - WHOT create -> AI seat -> start/deal: PASS.
  - Cheat create -> AI seat -> start -> hidden-card play/claim: PASS.
  - Dominoes create -> AI seat -> start -> legal opening progression: PASS.
- Release-integrity manifest generation and verification: PASS before package handoff.
- Clean ZIP excludes node_modules, build/runtime data, logs, private-key material and generated deployment state.
- ZIP is re-extracted and release integrity + 3.6.7 regression are rerun against the packaged files before delivery.

The packaging environment cannot currently resolve `registry.npmjs.org`, so it cannot recreate the normal clean npm dependency tree for the full Vite client production bundle here. This is an environment/network constraint rather than a claimed passing gate. The normal Oracle/Windows clean `npm ci` remains the deployment-side client-bundle gate.
## 3.6.7a corrective validation

- Reproduced the Oracle/Windows TypeScript diagnostics reported for `server/src/games/classic-table/handlers.ts`.
- Corrected the `AnyRoom`/Cheat player generic narrowing at public-state serialization.
- Added the missing Dominoes `pipTotal()` helper used by end-game ranking.
- Dedicated source regression now guards both compile defects.
- Public release version is `3.6.7a`; npm/workspace metadata uses SemVer-compatible `3.6.7-a`.

