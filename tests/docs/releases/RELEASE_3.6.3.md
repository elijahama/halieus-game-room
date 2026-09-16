# Halieus Game Room 3.6.3 release contract

Date: 31 August 2026  
Baseline: uploaded Halieus Game Room 3.6.1 workspace  
Scope authority: Drive document “HGR 3.6.3 Stabilization & Rebuild Log - 2026-08-31”.

## Protected areas

- Ludo screen and server gameplay handler remain byte-for-byte unchanged.
- Mega Board board geometry remains unchanged; its existing Autopilot placement beside Status is retained.
- Poker table, seats, betting controls and server gameplay handler remain byte-for-byte unchanged. Only the Live Room container receives layout/scroller corrections.
- Connect Four board geometry is not redesigned.
- Start / Restart / Update remain separate release operations.
- No global CSS zoom or root transform scaling is introduced.

## Platform stabilization

- Desktop Game Room uses a fixed viewport sidebar with main-content scrolling.
- Phone keeps fixed top/bottom navigation and hides the diagnostic build marker.
- Games categories occupy full-width library rows with desktop/tablet grids and swipeable phone rails rather than nested compressed category columns.
- Create / Join overlays remain viewport-centred and portalled outside animated page containers.
- Setup selection states are explicit and the Create/Join primary action inherits the active game accent through the portalled modal.
- Full Screen reports unsupported/blocked browser environments instead of silently pretending the state changed.
- Players/Home retain native active-room discovery, Join/Spectate, account game invitations and statistical profile detail.
- Owner/account keeps its existing compact multi-section information architecture.

## Game catalogue decision

Blackjack and WHOT are retained only as historical source modules. They are marked `retired`, excluded from the active catalogue, Quick Play, active-game discovery, saved-seat continuation and normal Join/Create surfaces. Their Socket.IO runtime handlers are not registered, so stale/direct client calls cannot create or join them. Historical types/statistics/report records remain readable.

The replacement queue is visible as an explicitly non-interactive roadmap: Villagers & Mafia, Word Game, original HGR Settlers, Spot the Match, Cheat / BS, Dominoes, Password and Anagrams Race. None is labelled playable until a real isolated module exists.

## Windows launchers and package safety

Action shortcuts use distinct HGR icon colours: Start green, Restart orange, Update blue and Close red. The source ZIP found in Drive contained private Oracle key files and owner bootstrap-code material; 3.6.3 removes those from the maintained/distributable tree. Stale nested application copies under `server/` are removed as well.

The deployment packer continues to exclude `server/data`, generated builds, dependency trees, runtime/log directories and credential-like files.

## Dependency audit gate

`npm audit` could not contact the npm registry in the Linux patch environment (`EAI_AGAIN`). No `npm audit fix --force` was used. Instead, 3.6.3 adds an offline release regression that pins the already-patched dependency baselines present in the lockfile: Vite 6.4.3, socket.io-parser 4.2.7, engine.io 6.6.9, Express 4.22.2, qs 6.15.3 and ws 8.21.2, while explicitly rejecting the compromised debug 4.4.2 package. This guards the known material HIGH-severity dependency families without pretending a registry-backed audit ran.

Oracle/Windows must still rerun `npm audit` with registry access before final production acceptance. Any new HIGH result must identify the exact dependency chain and receive the minimum compatible fix or a documented upstream blocker.
