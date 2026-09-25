# Part 17 phone/tablet acceptance evidence

Reviewed all 42 phone and 8 tablet PNGs from the two Drive folders on 25 September 2026. Phone/tablet labels come from folder membership; exact CSS viewport, DPR, orientation changes and transient animation timing cannot be inferred reliably from screenshots alone. Severity: P1 obstructed access/identity correction; P2 density/polish; Baseline = preserve; Investigate = reproduce before fixing. Owners below are likely source areas, not proven root causes.

Private screenshot images and raw documents are retained outside the repository. This matrix deliberately excludes account names, recovery keys, room codes and private game details. Image filenames are the acceptance reference; do not publish original screenshots without owner review.

| Filename | Device | Screen | Observation | Scope | Severity | Likely owner | Existing Part17 evidence | New finding |
|---|---|---|---|---|---|---|---|---|
| Screenshot_20260925_014906_Chrome.png | tablet | Mega live auction | Board and centred auction remain readable; considerable lower whitespace. | Mega | P2 | games/mega-board; index.css | Existing preservation baseline | No |
| Screenshot_20260925_015031_Chrome.png | tablet | Poker tablet lobby | Long stacked setup pushes roster beneath first viewport. | Poker | P2 | games/poker/PokerScreen.tsx; index.css | Existing vertical setup | No |
| Screenshot_20260925_015035_Chrome.png | tablet | Poker tablet lobby lower | Eight-seat roster and start control are readable but require scrolling. | Poker | P2 | PokerScreen.tsx; poker lobby CSS | Existing vertical setup | No |
| Screenshot_20260925_015044_Chrome.png | tablet | Poker tablet live | Complete table and action panel visible; preserve structure. | Poker | Baseline | PokerScreen.tsx; poker table CSS | Existing viable live layout | No |
| Screenshot_20260925_015047_Chrome.png | tablet | Poker tablet live lower | Bet controls and Auto area fit; large lower whitespace. | Poker | P2 | PokerScreen.tsx; poker responsive CSS | Existing refinement | No |
| Screenshot_20260925_015049_Chrome.png | tablet | Poker tablet live | Seats, pot and action panel remain contained. | Poker | Baseline | PokerScreen.tsx; poker table CSS | Existing preservation baseline | No |
| Screenshot_20260925_015107_Chrome.png | tablet | Poker tablet live | Metadata and navigation fit; no geometric redesign justified. | Poker | Baseline | GameChrome.tsx; PokerScreen.tsx | Existing preservation baseline | No |
| Screenshot_20260925_015120_Chrome.png | tablet | Home tablet | Wrong sidebar serif H; usable two-column library; compact sidebar text. | Shared | P1 | HalieusBrandMark.tsx; HomeScreen.tsx | Existing H / tablet refinement | No |
| Screenshot_20260925_015313_Chrome.png | phone | Home phone dark | Wrong serif H; tall hero places discovery below first viewport. | Shared | P1 | HalieusBrandMark.tsx; HomeScreen.tsx | Existing H / density | No |
| Screenshot_20260925_015336_Chrome.png | phone | Home phone light | Wrong serif H; very tall hero and narrow featured description. | Shared | P1 | HalieusBrandMark.tsx; HomeScreen.tsx | Existing H / density | No |
| Screenshot_20260925_015339_Chrome.png | phone | Home phone lower | Player cards fit; visible bottom nav only shows Home/Join in capture. | Shared | P2 | HomeScreen.tsx; hgr-design-v1.css | Existing mobile navigation review | Additional acceptance case; hidden destinations need runtime verification |
| Screenshot_20260925_015341_Chrome.png | phone | Home phone lower | Same readable player list; only Home/Join visible in footer. | Shared | P2 | HomeScreen.tsx; hgr-design-v1.css | Existing mobile navigation review | Repeat of 015339 |
| Screenshot_20260925_015344_Chrome.png | phone | Home overlay transition | Blurred backdrop only; no readable foreground drawer in this frame. | Shared | Investigate | HomeScreen.tsx mobile drawer | Not a proven persistent defect | Transition timing unknown |
| Screenshot_20260925_015346_Chrome.png | phone | Mobile drawer lower | Only lower utilities visible over backdrop at current scroll position. | Shared | P2 | HomeScreen.tsx; drawer CSS | Existing drawer containment | Verify scroll positioning |
| Screenshot_20260925_015348_Chrome.png | phone | Mobile drawer full | Wrong serif H; navigation and lower utilities otherwise visible. | Shared | P1 | HalieusBrandMark.tsx; HomeScreen.tsx | Existing H | No |
| Screenshot_20260925_015405_Chrome.png | phone | Account profile top | Single tall form consumes full phone viewport; close control visible. | Shared | P2 | platform/accounts/AccountPanel.tsx; index.css | Existing account density | No |
| Screenshot_20260925_015407_Chrome.png | phone | Account profile/security | Large profile controls and password panel require extended scrolling. | Shared | P2 | AccountPanel.tsx; index.css | Existing account density | No |
| Screenshot_20260925_015409_Chrome.png | phone | Account security/stats | Security and record summary stacked into long panel. | Shared | P2 | AccountPanel.tsx; index.css | Existing account density | No |
| Screenshot_20260925_015412_Chrome.png | phone | Account game statistics | Four columns crush game names and records; lower row text collides. | Shared | P1 | AccountPanel.tsx game stats; index.css | Existing narrow stats cards | No |
| Screenshot_20260925_015415_Chrome.png | phone | Account results/feedback | Results fit but extend already long profile; feedback follows below. | Shared | P2 | AccountPanel.tsx | Existing account density | No |
| Screenshot_20260925_015417_Chrome.png | phone | Account feedback/footer | Long empty feedback region adds scrolling to reach Sign out. | Shared | P2 | AccountPanel.tsx feedback | Existing account density | No |
| Screenshot_20260925_015420_Chrome.png | phone | Authentication hero | Wrong slab H prominently visible; oversized stacked hero. | Shared | P1 | AccountPortal.tsx; HalieusBrandMark.tsx | Existing auth H / density | No |
| Screenshot_20260925_015421_Chrome.png | phone | Authentication form | Wrong H persists; stacked hero/form and purple secondary arrow. | Shared | P1 | AccountPortal.tsx; account CSS | Existing auth H / theme leak | No |
| Screenshot_20260925_015423_Chrome.png | phone | Authentication secondary actions | One-time play and password reset arrows stay purple in blue/grey theme. | Shared | P2 | AccountPortal.tsx; account CSS | Existing non-theme arrows | No |
| Screenshot_20260925_015504_Chrome.png | phone | Mega phone waiting room | Dock overlaps lower ready-list section; long lobby stack. | Shared/Mega | P1 | RoomChatPanel.tsx; mega Lobby; index.css | Existing room-dock overlap | No |
| Screenshot_20260925_015507_Chrome.png | phone | Mega lobby host controls | Dock encroaches host-controls lower edge; start/end actions low. | Shared/Mega | P1 | RoomChatPanel.tsx; mega Lobby | Existing room-dock overlap | No |
| Screenshot_20260925_015516_Chrome.png | phone | Mega full lobby | Dock covers part of End room button. | Shared/Mega | P1 | RoomChatPanel.tsx; mega Lobby | Existing host-control obstruction | No |
| Screenshot_20260925_015531_Chrome.png | phone | Mega turn order upper | Dock overlaps turn-order roster near fourth player. | Shared/Mega | P1 | RoomChatPanel.tsx; TurnOrderScreen.tsx | Existing turn-order overlap | No |
| Screenshot_20260925_015532_Chrome.png | phone | Mega turn order lower | Roll control fits but dock obscures explanatory footer. | Shared/Mega | P1 | RoomChatPanel.tsx; TurnOrderScreen.tsx | Existing dock overlap | No |
| Screenshot_20260925_015601_Chrome.png | phone | Mega live board | Whole board visible and roll action reachable; metadata scrolls horizontally. | Mega | Baseline | Mega game layout / shared metadata | Existing usable board | No |
| Screenshot_20260925_015620_Chrome.png | phone | Mega live board after roll | Whole board retained; status/Autopilot visible in scrolled metadata. | Mega | Baseline | Mega game layout / GameChrome.tsx | Existing usable board | No |
| Screenshot_20260925_015639_Chrome.png | phone | Mega game menu | Live turn-timer settings visible beneath display controls. | Mega | P1 | games/mega-board/components/GameMenu.tsx | Existing Stage2B timer issue | No |
| Screenshot_20260925_015641_Chrome.png | phone | Mega menu lower | Live timer dropdown and distinct forfeit/end actions visible. | Mega | P1 | GameMenu.tsx | Existing Stage2B timer issue | No |
| Screenshot_20260925_015647_Chrome.png | phone | Home return | Player cards readable; Home/Join footer only in capture. | Shared | P2 | HomeScreen.tsx | Existing navigation review | Repeat 015339 |
| Screenshot_20260925_015654_Chrome.png | phone | Poker create | Long variant/setup stack; create action near bottom. | Poker | P2 | HomeScreen.tsx setup; PokerScreen.tsx | Existing vertical setup | No |
| Screenshot_20260925_015658_Chrome.png | phone | Poker lobby upper | Oversized single-column match/variant/stack metadata. | Poker | P2 | PokerScreen.tsx lobby CSS | Existing vertical setup | No |
| Screenshot_20260925_015701_Chrome.png | phone | Poker lobby middle | Stacked metadata, variants, invites and recovery continue vertically. | Poker | P2 | PokerScreen.tsx | Existing vertical setup | No |
| Screenshot_20260925_015703_Chrome.png | phone | Poker lobby lower | Start and add-AI reachable but far below upper setup. | Poker | P2 | PokerScreen.tsx | Existing vertical setup | No |
| Screenshot_20260925_015711_Chrome.png | phone | Poker full lobby | Long AI roster below start; mobile density could improve. | Poker | P2 | PokerScreen.tsx | Existing vertical setup | No |
| Screenshot_20260925_015720_Chrome.png | phone | Poker live upper | Eight-seat portrait ring overlaps nearby cards and pot area. | Poker | P1 | PokerScreen.tsx table seat CSS | Refines existing viable-structure baseline | New concrete crowding acceptance case |
| Screenshot_20260925_015722_Chrome.png | phone | Poker live lower | Seat overlap persists; separate local-hand/actions remain legible. | Poker | P1 | PokerScreen.tsx table seat CSS | Preserve action structure | Same crowding case |
| Screenshot_20260925_015725_Chrome.png | phone | Poker live lower repeat | Local hand visible; player seats still crowd table lower area. | Poker | P1 | PokerScreen.tsx table seat CSS | Preserve action structure | Same crowding case |
| Screenshot_20260925_015729_Chrome.png | phone | Poker actions | Hand, betting and one-shot Auto controls fit phone width. | Poker | Baseline | PokerScreen.tsx actions | Existing viable active structure | No |
| Screenshot_20260925_015750_Chrome.png | phone | Poker menu opening | Mostly blank dark backdrop; menu header near bottom edge. | Shared/Poker | P1 investigate | PokerScreen.tsx menu overlay; PokerScreen.tsx; overlay CSS | Extends responsive menu issue | New off-viewport sheet evidence |
| Screenshot_20260925_015752_Chrome.png | phone | Poker menu scrolled | Only a strip of display controls visible at bottom under huge backdrop. | Shared/Poker | P1 investigate | PokerScreen.tsx menu overlay; overlay CSS | Same menu evidence | Needs runtime scroll/portal reproduction |
| Screenshot_20260925_015754_Chrome.png | phone | Poker menu repeat | Header/close control near bottom; most sheet content off screen. | Shared/Poker | P1 investigate | PokerScreen.tsx menu overlay; overlay CSS | Same menu evidence | Repeated persistence across captures |
| Screenshot_20260925_015756_Chrome.png | phone | Poker menu theme controls | Theme/custom rows partly visible only at viewport bottom. | Shared/Poker | P1 investigate | PokerScreen.tsx menu overlay; overlay CSS | Same menu evidence | No independent cause proven |
| Screenshot_20260925_015803_Chrome.png | phone | Poker return to table | Crowded eight-seat ring remains; local hand readable below. | Poker | P1 | PokerScreen.tsx seat CSS | Preserve table/actions while refining | Same crowding case |
| Screenshot_20260925_015818_Chrome.png | phone | Owner overview | Tabs and counters truncate supporting labels; long stacked panels. | Shared | P2 | AccountPanel.tsx owner overview; index.css | Existing account responsive work | No |
| Screenshot_20260925_015820_Chrome.png | phone | Owner overview lower | Sparse vertical metric stack and actions extend modal length. | Shared | P2 | AccountPanel.tsx owner overview | Existing account density | No |

## Later-stage acceptance

Reserve dock space above safe-area controls in lobby/turn-order; verify End Room and roll actions remain unobstructed with 1–8 seats. Reflow account statistics to readable cards without losing keyboard/scroll access. Retest auth arrows under custom, light and dark themes. Move Mega timer configuration only in approved Stage2B. Reduce Poker setup density without altering legal setup values. Reproduce Poker sheet positioning at multiple scroll offsets and eight-seat crowding before choosing a contained fix. Preserve Mega board geometry, Ludo and Poker action structure. Tablet changes should refine spacing and hierarchy. A single blurred transition frame is insufficient to diagnose a persistent invisible drawer.



## Full implementation follow-through (supersedes Later-stage acceptance above)

All 50 rows remain the original observations. Implementation now maps them as follows:
- 014906, 015601, 015620: approved Mega geometry retained; centre/deck/metadata readability polished.
- 015031, 015035, 015654, 015658, 015701, 015703, 015711: shared compact create shell and responsive Poker setup summary; legal options preserved.
- 015044, 015047, 015049, 015107, 015729: approved Poker table/actions/Autopilot retained; materials, metadata and rail spacing corrected.
- 015120, 015313, 015336, 015348, 015420, 015421, 015423: block H preserved, smaller phone hero, intentional desktop auth, themed arrows, contained mobile header.
- 015339, 015341, 015344, 015346, 015647: responsive navigation and viewport-bound scrolling drawer; transient blurred image is not treated as a proven persistent defect.
- 015405, 015407, 015409, 015412, 015415, 015417, 015818, 015820: shared account portal, compact identity, canonical Appearance and auto-fit record cards. Bounded data lists retain intentional scrolling.
- 015504, 015507, 015516, 015531, 015532: dock width and reserved lobby/ordering bottom space corrected.
- 015639, 015641: Mega timer moved to pregame; server rejects live changes.
- 015720, 015722, 015725, 015803: eight-seat phone grid, bounded community cards, legible seat labels.
- 015750, 015752, 015754, 015756: shared centered portal and menu max-height beat the legacy offscreen bottom-sheet rule; verified at phone/short-screen sizes.

Additional Home screenshot: full-width Other Rooms, themed Continue action and canonical game icons. Current source and runnable checks: PART17_IMPLEMENTATION_CHECKLIST.md. Physical-device touch validation remains distinct from Chromium responsive emulation.
