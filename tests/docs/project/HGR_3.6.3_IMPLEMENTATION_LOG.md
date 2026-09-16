# HGR 3.6.3 — Implementation Log

Authoritative scope: Google Drive “HGR 3.6.3 Stabilization & Rebuild Log - 2026-08-31”.

Implemented in source:

- retired WHOT and Blackjack from active catalogue/runtime without deleting historical module source;
- exposed the requested replacement backlog as non-playable roadmap cards;
- corrected desktop fixed-sidebar/main-scroll ownership and mobile build-marker/navigation rules;
- rebuilt Games category layout as full-width responsive rows/rails;
- strengthened selected room-setup state and game-accent Create/Join actions;
- added explicit fullscreen unsupported/blocked feedback;
- enlarged/contained Poker Live Room only, preserving Poker table/gameplay source;
- contained Connect Four room activity without touching board implementation;
- preserved Mega Board board geometry and existing top-HUD Autopilot position;
- protected Ludo byte-for-byte;
- generated distinct Start/Restart/Update/Close HGR launcher icons;
- removed packaged Oracle private-key files, owner bootstrap-code files and stale nested server application copies;
- added a dedicated 3.6.3 regression and release-integrity contract.

Validation note: TypeScript, server build, the dedicated 3.6.3/launcher regressions, release fingerprint verification and an isolated server runtime smoke all pass. The uploaded dependency tree is Windows-native, so the Linux client bundle cannot load Rollup's optional Linux native package; Oracle/Windows clean `npm ci` remains the production client-bundle gate. Registry-backed `npm audit` is also pending there. In the meantime, the release regression pins the known patched Vite/Socket.IO/Engine.IO/ws/Express/qs/debug dependency baseline instead of using `--force` or claiming a false clean audit.
