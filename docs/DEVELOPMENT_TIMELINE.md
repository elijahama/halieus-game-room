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

## Current 4.1.x development — Brand & Product Polish

The current post-Guilds polish pass is consolidating HGR's visual language rather than introducing another game-state authority.

Current work includes:

- shared `--hgr-*` design tokens;
- one consistent Halieus surface/spacing/radius/shadow language;
- launcher artwork derived from the real Halieus mark instead of unrelated utility styling;
- a version-led project-history surface on Home;
- cleanup of inconsistent layouts using the shared design system;
- developer/tooling surfaces that look native to the product.

The application version remains 4.1.0 until the next release decision. Launcher-art revisions are separate from product-version numbers.
