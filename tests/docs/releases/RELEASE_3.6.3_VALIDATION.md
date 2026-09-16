# Halieus Game Room 3.6.3 validation record

Status: source/release validation PASS; live Oracle/Windows visual acceptance remains pending.

Validated in the 31 August 2026 patch workspace:

- client TypeScript PASS;
- server TypeScript PASS;
- server production build PASS;
- dedicated `tests/regression-3.6.3.mjs` PASS;
- launcher no-auto-deploy regression PASS;
- isolated server runtime smoke PASS on a fresh `HALIEUS_DATA_DIR`;
- runtime reports version `3.6.3` and retired modules `["blackjack","whot"]` with zero active rooms for both;
- Ludo protected hashes unchanged;
- Poker protected screen/server gameplay hashes unchanged;
- Blackjack/WHOT runtime handlers absent from server registration;
- no credential-like private key files or owner setup-code files remain in the maintained tree;
- no stale nested `server/client`, `server/server` or `server/shared` copy;
- obsolete 3.5.0 Oracle-ready source archive removed from the maintained tree;
- offline patched-dependency baseline regression PASS;
- release manifest/fingerprint regenerated and verified across 236 integrity files; `RELEASE.json` is the canonical fingerprint record.

## Environment-specific gates

The uploaded dependency tree was produced for Windows. A direct Linux Vite bundle attempt therefore cannot load Rollup's Linux optional native package `@rollup/rollup-linux-x64-gnu`. This is an environment/dependency-tree mismatch rather than a TypeScript/source failure. The Oracle/Windows deployment path performs a clean `npm ci` and remains the authoritative client production-bundle gate.

`npm audit` could not contact `registry.npmjs.org` from the patch environment (`EAI_AGAIN`). No forced audit repair was used. The offline release regression pins the known patched dependency baselines already in the lockfile, but a registry-backed `npm audit` must still run on Oracle/Windows before final production acceptance.

## Live acceptance still required

- Oracle clean `npm ci` + client production build;
- registry-backed npm security audit;
- deployment health check and live 3.6.3 fingerprint confirmation;
- desktop/tablet/phone shell layout at 100% zoom;
- true browser fullscreen/fallback behaviour;
- Games/Create Room density and modal centring;
- Poker and Connect Four Live Room fit;
- Windows shortcut regeneration and visual confirmation of green/orange/blue/red launcher identities.
