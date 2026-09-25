# HGR 4.5.1 — locked Mega Board implementation

Baseline: latest fetched `main`, `97c7bf2` (25 September 2026). This is an implementation record, not a new audit. The baseline already contained the retro palettes, contextual cosmetics, social density changes, podium markup and initial Part 18 styling. This pass completes functional gaps and verifies that work. Version is 4.5.1; no rule or breaking protocol change was made.

## Locked checklist

| Item | Implementation and evidence |
| --- | --- |
| 1 Lobby composition | Roster and controls share their bottom edge; eight-player roster scrolls within its column. Setup, timer, invites, recovery and Start/End remain grouped. Desktop and short-height measurements verify alignment; tablet/phone verify containment. |
| 2 Board appearance | Contextual selector in create-room and lobby exposes owned/locked boards and requirements. A per-account, per-room, per-match browser snapshot freezes the selected cosmetic after start, including refresh and parked-room recovery. Preferences changed elsewhere apply to the next match. It is a personal cosmetic, not a shared game-rule setting. A different device starts with that device's equipped appearance. |
| 3 Light mode | Surface/page/action foregrounds use measured luminance. All retro profiles and 256 grayscale custom surfaces pass 4.5:1 text contrast tests across base/raised/soft/strong surfaces. Light/dark lobby, board and results inspected at five viewport sizes. Fixed low-contrast primary roll/start controls and secondary lobby/result text. |
| 4 Mega green | Scoped game/setup/results tokens, host badge, active result tabs, primary actions and board focus use green/neutral identity. Property groups, decks, warnings, danger, award medals and player identity keep their semantic colours. |
| 5 Mortgage Broker | **Unresolved target.** No Mortgage Broker name or component exists in baseline application/shared source. Clarification requested. Existing mortgaged-property red treatment is retained; that is not claimed as a fix to a different, unidentified control. |
| 6 Game menu | Theme modal above menu verified by browser hit-testing and nested Escape behaviour. Shared readability controls reflow. Menu containment checked across seven game families on desktop/short/tablet/phone. No second appearance-panel scroller. |
| 7 Theme Library | Launcher copy has readable control/caption sizes. Apply/Cancel actually uses the intended responsive grid, integrated with the modal instead of the previous wrapping flex footer. |
| 8 Retro profiles | Existing expanded colour-only profiles retained: original Xbox, PS2/PS3/PSP/PSP Go/Vita/PS4, Dreamcast, GameCube, N64, Atari, C64, Arcade Cabinet/Neo Arcade and multicolour SNES. No console logos or controller symbols added. |
| 9 Custom themes | Shared `readableInk` selects by contrast against actual surfaces, including middle luminance. Preview uses the same function; metadata remains in normal grid flow. |
| 10 Turn status | Dark high-contrast status with a pale surface/dark foreground inversion in light mode. Approved board geometry unchanged. |
| 11 Doubles | Server captures presentation-only chain stage in the accepted dice result before rules reset the chain. Both human and AI roll paths emit it. UI uses the captured roll, not mutable current-turn state or a Jail heuristic. Real human handler tests cover stages 1/2/3, third-double Jail/turn advance, non-double/triple reset, and first-double landing on Go To Jail. Browser tests cover all four display states. |
| 12 Bus Ticket | Real button receives pointer events above decorative centre layers at all viewports. Accessible dialog shows authoritative remaining deck, expiry and held-ticket counts; Escape restores focus. No deck order is displayed. |
| 13 Room dock | Shared dock measures its trigger height, including text reflow. Pages reserve clearance; results footer remains above the dock. Observer safely handles unmount. |
| 14 Results | Removed forced tall cards and nested body overflow. Denser three-tab content, integrated sticky actions and a close button inside the header. All tabs checked against dock collision. |
| 15 Podium | First place centred/tallest, second left, third right, pictures/fallback and rating info. Explicit columns also handle one/two entrants; full ranking rows remain below. |
| 16 Player density | Inherited inline Online/name metadata and compact social sections retained. Presence caption uses the shared readable caption size. |
| 17 Home close | Full-app browser checks assert no visible stray modal/results close button on Home. Nested dialogs retain their own close ownership. |
| 18 Online green | Existing shared success-colour presence treatment retained, independent of game/theme branding. |

## Verification

- `npm run typecheck` and `npm run build` cover both client and server.
- `npm run test:regression` includes the existing gameplay/release/security contracts and the new `test:part18` runtime suite.
- `npm run test:part18:browser`: production React components and release CSS with deterministic public states, in light/dark at 1440×900, 1280×600, 820×1180, 390×844 and 360×640. These are UI fixtures, not simulated proof of a live multiplayer match.
- `npm run test:part17:browser`: built app and real server; authenticated progression/cosmetic API enforcement, setup for all 14 games, seven game-family reconnect/menu checks, preview/apply/cancel, Home and nested theme layering.
- `npm run test:browser`, `test:release:browser`, `test:website:browser`, `validate:release` and the real Oracle package-only regression remain release gates.
- Updated obsolete UI contracts narrowly: cosmetics are allowed in Mega pre-game setup but not the Home sidebar; the current theme dialog replaces removed interactive Build Info in the nested-menu test; avatar assertion follows actual markup order.
- Release integrity generation/verifier was not relaxed. No production deployment is performed by these checks.

Known limits: native-device testing and live production deployment are outside this local verification. The build's existing large-bundle advisory remains. Mortgage Broker is not marked complete. Detailed final command outcomes and source commit accompany the delivered archive.

## Navigation backlog only

Future platform navigation: **Home → Games → Players → Rankings → Guilds → Inbox**. Rankings should eventually offer Gamer Score and per-game Elo leaderboards. Define mobile navigation, permissions, empty states and authoritative data sources in that future work. The fetched baseline already includes a Rankings destination; this pass preserves it and does not implement the proposed navigation migration or add new ranking backends.
