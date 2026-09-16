# Halieus Game Room 3.6.1 — Consolidated Fix Log

Date: 31 August 2026
Baseline: corrected 3.6.1 release package

## Release rules

- 3.5.27 remains the frozen Oracle rollback ZIP under `dev-tools/Oracle Quick Deploy/Backups`.
- Start and Restart must never deploy or provision Oracle.
- Update is the only deployment path.
- No global CSS zoom or scale hacks.
- Create/Join overlays are viewport portals and must remain centred in windowed and Full Screen modes.
- Ludo is complete and protected. Print Screen exposure is explicitly ignored as a capture artifact, not a game defect.
- Poker table, betting controls, seats and cards are protected. Only its Live Room presentation may be changed in this pass.
- Mega Board square scale/layout is approved. Only its Autopilot/header placement may change in this pass.

## Game Room shell

- Keep desktop sidebar fixed to the viewport; the page content scrolls, the rail does not.
- Keep the profile card directly below the Halieus Game Room brand and before Home.
- Navigation order: profile, Home, Games, Players, Join Game.
- Keep Beta Test, Full Screen, Theme and build identity reachable at the bottom of the rail.
- Theme choices are System / Light / Dark; System follows the OS/browser preference and the preference persists.
- Theme controls remain available in game menus.

## Home

- Preserve the current hero direction.
- Preserve Continue, Join with code and Watch a game.
- Preserve useful status counts, active/continuable rooms, online players and game browsing.
- Native friend/game invitations and Join/Spectate flows remain part of the platform.

## Games library

- Prevent card/category collisions at every desktop width.
- Use strict responsive grids with equal card sizing and better use of horizontal space.
- Keep game identity, status and Create Room actions clear.

## Players

- Keep search and All / Online / In Game / Offline filters.
- Use a balanced desktop directory/profile layout rather than leaving most of the screen empty.
- Player cards show presence and live-game status.
- Selected profile shows games played, wins, win rate, favourite game, streak, game-by-game record and recent results.
- Join / Spectate / Invite to Game remain available where room rules allow them.

## Mega Board

- Current board square, scale and player rails are approved.
- Do not resize or restructure the board.
- Move Autopilot into the same single metadata row directly after Status.
- Autopilot must not add a header row or affect board geometry.

## WHOT

- Keep the game and hand inside one native viewport.
- Keep all opponent seats visible at the top instead of clipping/hiding them.
- Reduce unused theatre space around the central table.
- Give the local hand a stable, readable bottom area.
- Keep Room Info + Live Room as a disciplined right stack.

## Connect Four

- Board geometry is approved; do not redesign it.
- Keep compact identifiable player markers.
- Make Live Room use the same right-rail density and structure as the approved Ludo layout.

## Blackjack

- Keep all six player seats/cards fully visible at 100% zoom.
- Pull the near player rail upward so cards are not cut by the viewport.
- Keep dealer/status centred and readable without allowing the felt to overflow.
- Make Live Room a usable Ludo-density section of the existing right control rail.

## Poker

- Table, cards, seats, betting and Autopilot are approved/protected.
- Only fix Live Room so its header/tabs/messages/compose area fit cleanly in the existing control rail.

## Ludo

- COMPLETE / PROTECTED.
- No visual, layout, responsive, fullscreen or gameplay changes.
- Washed-out Print Screen captures are not a product issue and are excluded from the defect log.

## Owner / Account

- Keep Owner sections separated: Overview, Players, Invites, Rooms, Audit, Test Lab, Account.
- Use one outer scroll container, not nested giant scroll areas.
- Keep forms and buttons compact rather than full-width/oversized.
- Keep invite history, player management, audit history and game records dense and readable.
- Keep useful personal summary stats and recent game results.

## Requested future game expansion

The following requested games remain explicitly logged as expansion work and must be implemented as isolated real game modules rather than fake/dead tiles: Villagers & Mafia, Wordle-style word game, Catan-style settlement game with original HGR presentation, Dobble/Spot-the-Match style game, Cheat/BS, Dominoes, Password and Anagrams Race.

These expansion engines are not declared complete by this stabilization package; preserving working games takes precedence over pretending unfinished multiplayer modules are production-ready.
