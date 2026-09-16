# 3.6.6 validation

- Client and server TypeScript pass.
- Server production build passes.
- Dedicated 3.6.6 regression verifies Daily/Practice modes, single-player enforcement, leaderboard UI/data contract, larger Word Game composition and protected mature-game hashes.
- Runtime Socket.IO smoke verifies two independent Daily rooms receive the same puzzle, Practice is unranked, AI payloads cannot create Word Game AI seats, failed Daily attempts finalize, and only the first daily attempt is counted by the authenticated leaderboard endpoint.
- Launcher no-auto-deploy regression and release-integrity verification remain mandatory.
- Linux client Vite bundling remains unavailable in this validation environment because the preserved Windows dependency tree lacks Rollup's Linux optional native binary; Oracle/Windows clean npm ci remains the production client-bundle gate.
