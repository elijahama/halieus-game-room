# Halieus Game Room Development Timeline

This document is the canonical version-led project history.

GitHub source history begins with the 4.0.0 repository import. Earlier milestones are reconstructed from the preserved release notes, implementation logs, validation documents and regression contracts that shipped with HGR.

## Foundation — 0.22.x

HGR began as an increasingly complete server-authoritative board-game implementation. The foundation line built out:

- turn order;
- ownership and rent;
- building and mortgages;
- bankruptcy and debt handling;
- Chance, Community Chest and Bus Ticket events;
- auctions;
- Mega spaces, Jail, Speed Die and Train Depots;
- trading;
- persistence;
- AI / Autopilot;
- synchronized presentation and result reporting.

## Release-candidate era — 3.3.x to 3.4.x

The project shifted from feature accumulation toward public-access hardening and presentation quality.

Key themes included:

- phone/tablet/fullscreen behaviour;
- synchronized dice, movement and consequence presentation;
- complete event-card coverage;
- cleaner final results;
- stable public networking;
- stronger regression coverage;
- protecting server-authoritative rules while the UI evolved.

## 3.5.0 — Desktop + Oracle Foundation

3.5.0 introduced the compact public version scheme and established the permanent production architecture:

- compact product version shared by client/server;
- stable Windows product identity;
- secure Electron desktop shell;
- canonical Oracle persistence path;
- production/developer target separation;
- Oracle deployment templates;
- safer local launch behaviour.

### 3.5.x — Deployment hardening

The rest of the 3.5 line focused heavily on production safety:

- release-integrity hashing;
- safer Oracle packaging;
- SSH credential exclusion;
- Start/Restart separated from deployment;
- update tooling that could evolve without exposing owner credentials.

3.5.27 is the preserved endpoint of that deployment-hardening line.

## 3.6.0 — Protected Game Room Shell

3.6.0 closed the unstable UI-iteration period and established a protected platform baseline.

It introduced or stabilized:

- fixed desktop sidebar;
- profile-first navigation;
- Home / Games / Players / Join Game hierarchy;
- active-room discovery;
- account-to-account invitations;
- richer player statistics;
- responsive game library;
- per-game layout protection for Mega Board, Poker, Blackjack, WHOT, Connect Four and Ludo.

### 3.6.x — Responsive and gameplay-platform refinement

The 3.6 line then expanded and hardened that shell:

- viewport fitting and phone/tablet repair;
- room recovery;
- human joins replacing AI in open lobbies;
- fresh room codes on create;
- Word Game / Password / Anagrams / Word Arena development;
- ranked/global leaderboard surfaces;
- dependency and deployment security gates;
- uniform game icon treatment;
- Mega Board live Bank building inventory.

3.6.8e is the preserved final 3.6 hotfix in the historical release archive.

## 3.7.0 — Platform Expansion

The 3.7 line expanded HGR beyond the original set of modules.

The signed release contract records work including:

- PWA installation;
- iOS/network diagnostics;
- persistent game requests;
- admin player visibility;
- Ayo;
- Word Board;
- profile-picture uploads;
- tablet-responsive game layouts;
- private-card-state redaction;
- stabilized game lifecycle;
- static release-data packaging;
- Mega Board debt/property liquidation and maximum-rent fixes;
- Blitz and live turn-timer controls;
- consistent bundled game icons.

3.7.0a through 3.7.0l represent the preserved stabilization/hotfix progression.

## 4.0.0 — Major-version Baseline

4.0.0 consolidated the branded session-arrival experience and the portfolio/documentation baseline that became the public GitHub source starting point.

This is the first HGR version whose development history is fully represented by repository commits rather than only preserved historical release material.

## 4.0.1 — Ranked Results + Mobile UX

4.0.1 was a presentation-focused patch:

- clearer Mega Board ranked rating movement;
- separated placement/performance/award bonus presentation;
- readable award chips;
- mobile final standings converted into labelled cards;
- cleaner mobile result actions;
- shared phone-result improvements.

Authoritative ranked scoring did not change.

## 4.0.2 — True Device-width Mobile Recovery

4.0.2 corrected a major real-device layout problem caused by legacy desktop-viewport emulation.

The patch:

- removed forced 980px gameplay viewport behaviour;
- restored true device-width phone layouts;
- rebuilt Mega Board phone fit;
- introduced compact metadata rails;
- bounded mandatory mobile decisions as sheets;
- strengthened shared mobile game-menu behaviour;
- improved Hidden Dictator mobile bounds.

Gameplay/ranking rules remained unchanged.

## 4.1.0 — Guilds & Persistent Groups

4.1.0 added the first persistent social-group layer:

- private guild creation and invite-code joining;
- persistent membership;
- Owner / Admin / Moderator / Member roles;
- server-validated room permissions;
- persistent guild chat;
- guild-organised rooms using normal HGR room codes;
- Join/Spectate handoff into existing game modules;
- guild room history;
- internal guild leaderboard;
- responsive Guild management inside the Players/social area.

Guilds deliberately remain a social/platform layer rather than a second gameplay authority.

## 4.1.1 — Social, Theme and Game Room Polish

4.1.1 refined the post-Guilds platform without changing HGR's server-authoritative gameplay model.

The release added or improved:

- richer Game Room discovery shelves and player social strips;
- direct persistent guild invitations between HGR accounts;
- better guild-member identity and profile-picture handling;
- ranked Mega Board podium presentation while preserving the full standings table;
- neutral Dark plus explicit Blue and Custom theme modes;
- persisted custom theme colours;
- first-paint awareness of the expanded theme system;
- reduced nested scrolling in room creation and game-menu surfaces;
- targeted Mega Board debt/liquidation layout improvements.

WHOT's larger gameplay/table redesign remained intentionally separate from this patch.

## 4.5.0 — Shared UI, Theme and Progression Foundation

4.5.0 is the current HGR milestone. It consolidates a large set of platform-wide UI and lifecycle rules so future game work can reuse shared primitives instead of accumulating isolated fixes.

The 4.5 line includes:

- canonical 4.5.0 release identity and refreshed website/platform H branding;
- separation of launcher/reference artwork from the website/platform identity;
- selected-theme ownership of generic platform chrome, with profile colour reserved for player identity;
- theme-library preview before apply, with cancel/revert behaviour;
- rebuilt Appearance/account presentation and theme-aware authentication actions;
- shared text-size and density preferences;
- responsive shell and mobile room-access corrections;
- centralized modal/confirmation infrastructure;
- reusable pre-game/create-room foundations;
- Mega Board setup, timer and board-presentation refinements while protecting approved board geometry;
- Poker table palette and layout restoration while protecting the approved lobby and Actions / Players / Chat structure;
- Ludo and Connect Four table-layout refinements, including Connect Four disc layering behind the foreground grid;
- classic-table lifecycle corrections and stronger room recovery handling;
- platform progression infrastructure for server-authoritative achievements, account-wide Gamer Score and cosmetics unlock state;
- expanded browser/runtime regression coverage for the shared 4.5 contracts.

The 4.5 work is still validated feature-by-feature through regression checks and live UI/gameplay testing; a source commit alone is not treated as proof that every player-facing detail is accepted.
