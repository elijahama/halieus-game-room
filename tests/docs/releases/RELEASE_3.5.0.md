# Halieus Game Room 3.5.0 — Desktop + Oracle Foundation

Status: implementation candidate; production/Windows validation pending.

This release starts the compact public version scheme and establishes the permanent production/desktop architecture.

Implemented foundation:
- compact `3.5.0` product version shared by client/server;
- stable version-free Windows product/executable/installer identity;
- secure Electron desktop shell targeting `halieus.remotewire.net`;
- explicit separation of packaged production client and developer target;
- canonical `HALIEUS_DATA_DIR` support for Oracle persistence;
- admin-only/sanitised session-archive status endpoint;
- Oracle systemd/Nginx/environment deployment templates;
- local laptop launcher no longer starts Tailscale Funnel automatically;
- Ludo, Poker, Mega Board and WHOT icon corrections approved for this cycle.

Still requires environment-specific validation:
- deploy/migrate canonical data on the actual Oracle host;
- DNS/TLS/public route validation for `halieus.remotewire.net`;
- build/sign/smoke-test `Halieus Game Room Setup.exe` on Windows;
- laptop-off production acceptance test;
- browser ↔ desktop multiplayer interoperability.

## Automated validation completed in the implementation environment
- client TypeScript: PASS
- server TypeScript: PASS
- server build: PASS
- complete historical regression/integration chain through RC 3.4.4b: PASS after updating superseded version/icon/path assertions for the new 3.5.0 architecture
- dedicated 3.5.0 Desktop + Oracle foundation regression: PASS
- Electron main-process syntax check: PASS
- runtime server smoke test with an isolated `HALIEUS_DATA_DIR`: `/health` returned version `3.5.0` and the unauthenticated `/session-archive/status` request returned HTTP 403 as intended
- release ZIP integrity checks: PASS

Integration tests create temporary game/session evidence when run against legacy local paths. Before producing the owner package, `server/data` was restored from the exact uploaded baseline so the test run did not overwrite the user's supplied account/runtime state.

## Environment-specific gates still open
The production Oracle deployment and Windows installer are deliberately not marked validated from this Linux implementation environment. `Halieus Game Room Setup.exe` must be generated/smoke-tested on Windows, and Oracle must pass the laptop-off/Tailscale-off acceptance test before 3.5.0 is called production-complete.
