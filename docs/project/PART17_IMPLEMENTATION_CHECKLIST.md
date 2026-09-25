# Part 17 — full HGR 4.5 implementation

Current implementation record, 25 September 2026. The user's full-implementation request supersedes the previous stage-only restrictions. Source starts at dabad9491b34cf25f5721600de83e93238af0621, retaining the reviewed Stage 1, Stage 2A and website-H commits. VERSION remains 4.5.0; visible label remains Build 4.5. No game-rule redesign or production deployment.

## Request-to-implementation checklist

| Original section | Implemented outcome | Evidence / source |
|---|---|---|
| 1 Release identity | Retained canonical VERSION, generated labels, fingerprint and cache identity. | release-integrity; release identity regression/browser |
| 2 Website identity | Retained approved block H and untouched launcher/reference bytes. | website regression/browser; 16 protected asset hashes |
| 3 Theme precedence | Theme owns Home recovery actions, chrome, focus and room chat. Player colour remains on avatars. Semantic and gameplay colours retained. | HomeScreen; hgr-part17.css; theme preview browser checks |
| 4 Preview/Apply/Cancel | Profiles, quick modes and custom palettes preview the whole app; Apply persists; Escape, close and unmount restore saved values. | themePreview; ThemeButton; browser-part17 |
| 5 Cosmetic ownership | Removed global Home collection; settings expose only relevant board/table/card slots. Material previews replace H placeholders. Server checks unlocks and saves equipped choices. | DisplaySettingsPanel; SkinLibraryButton; shared skins; accounts API |
| 6 Player settings | Canonical Appearance controls share stored text/density values with game shortcuts. Fixed non-compounding text roles, compact username with Edit, responsive record cards, bounded build-info dialog. Existing aligned Upload/Remove controls retained. | AccountPanel; DisplaySettingsPanel; measured Small < Standard < Large browser assertion |
| 7 Entry screen | Desktop welcome/form columns; phone single column; theme-driven arrows/intro retained. | account342 layout; auth browser checks; intro handoff suite |
| 8 Scroll ownership | Shared fullscreen-aware portal, background lock, focus containment/restoration, one game-menu scroll owner and bounded theme/skin surfaces. | ModalPortal; useModalLifecycle; browser menus and nested Build Info |
| 9 Confirmations | Shared centered confirmation portal; Mega end/forfeit now uses the same component. | ConfirmDialog; GameMenu; shared CSS |
| 10 Pre-game system | Shared PreGameShell wraps all 14 create flows, preserving each game's payload/settings. Flat two-column setup on desktop and one on phones. | PreGameShell; HomeScreen; all 14 dialogs across five viewports |
| 11 Mega Board | Preserved board geometry; restored deck colours, opaque centre messages and Last roll; joined mode/Free Parking block; green Start; dock safe space. Timer host-only before start, copied to match, immutable thereafter on server/UI. | LobbyScreen; GameMenu; turnHandlers; runtime-part17; browser live recovery |
| 12 Poker | Restored established burgundy/green materials independent of theme; distinct D/SB/BB; separate duration/clock. Preserved tabs/Autopilot; compact control rail; contained eight-seat phone grid and five community cards. | PokerScreen; RoomTimeMeta; hgr-part17; eight-seat browser geometry |
| 13 Ludo | Four race rows without clipped panel/inner scrolling; framed board-first support rail with shared Chat/Log/Spectators. Fixed saved-seat recovery on direct refresh. Gameplay colours retained. | LudoScreen; App reconnect; live recovery/browser containment |
| 14 Connect Four | Foreground perforated grid sits above falling discs; stable disc key and reduced-motion support retained. Shared setup/menu. | ConnectFourScreen; hgr-part17; real server match/browser |
| 15 Word Game | Puzzle/input centered between proportionate leaderboard and room rail; phone puzzle first; removed isolated toggle-only rail. | WordArenaScreen; hgr-part17; browser live recovery |
| 16 Ayo | Preserved wood board; attached player bars; compact supporting rail and spacing. | AyoScreen; hgr-part17; browser live recovery |
| 17 Hidden Dictator | Shared chrome/menu/confirmation improvements only. Deep voting/policy redesign remains explicitly outside the original requested scope. | HiddenDictatorScreen; shared portal |
| 18 Dominoes | Retained tested valid-start/real-end guards, cancellation, recovery, rematch and unique archive behaviour; shared menu/setup. | runtime-classic-lifecycle; ClassicTableScreen; browser recovery |
| 19 Badges | Shared max-width/min-width/wrapping rules for availability, role and status labels. | hgr-part17.css |
| 20 Room bar | Floating and embedded room panels respect viewport/parent widths; lobby/order reserve dock space and safe area. | hgr-part17.css; browser containment |
| 21 Progression | Account-bound server achievements, derived GamerScore separate from Elo, cumulative Kass/trades/active time, single-match feats and cosmetic rewards. Durable archive replay prevents duplicate awards. Test Lab, spoofed names and host cancellation excluded. | progression.ts; shared contracts; authenticated browser match/API; runtime-part17 |
| 22 Engineering | Shared primitives replace repeated overlay/preview/setup behaviour. Regression chain includes new runtime tests; browser suite exercises five viewports. | package scripts; tests/runtime-part17.mjs; tests/browser-part17.mjs |
| Additional screenshot | Other Rooms spans available width; Continue follows theme; recovery cards use canonical game icons. Mobile header/avatar and drawer containment refined. | HomeScreen; hgr-part17.css; Home browser screenshots |

## Prioritized concrete findings and corrections

P1: Dominoes false completion and live restart were corrected in Stage 2A and remain covered. Live Mega timer mutation is now rejected. Ludo refresh now reconnects a saved seat instead of opening an invite. Host-ended Ayo/Connect Four/Word sessions no longer count as completed matches. Fresh starts have distinct archive identities, and concurrent finalization snapshots are immutable and committed atomically. Private progression attribution is removed from public game states/acknowledgements.

P1: Legacy phone bottom-sheet specificity displaced Poker menus beyond the viewport. The shared portal plus final bounded sizing fixes this across games. Eight Poker seats no longer overlap. Ludo's parent status panel, not merely its list, now fits all four rows. Fixed text scaling no longer compounds nested em values.

P2: Theme preview persistence, avatar colour leakage into Home chrome, wrong Poker material, fragmented setup framing, repeated nested scrollers, overlarge supporting panels, Home recovery width/icons and badge/dock overflow have implementation changes listed above. Existing approved setup options, game logic, visual assets and stage history are preserved.

## Progression data and privacy

Achievements derive from server-finalized normal matches with stable authenticated account attribution. Existing name-only historical archives remain usable by legacy statistics but are not retroactively credited as verified achievements. Test Lab taints a match's progression; recovery by another account cannot transfer credit. Real action intervals are capped at 60 seconds; idle time and disconnected/autopilot intervals do not accumulate. Five Kass Maneuvers and five successful trades are cumulative across matches. Three-way credit belongs to the successful initiator after actual transfers. Ludo checks four home pieces; Poker checks the evaluated winning hand score, including ace-high straight flush for Royal Table.

The finalized archive is the durable source of truth. Ledger rebuilding is serialized and idempotent; temporary writes are atomically renamed. Keep the private sessions/accounts directories in production backups. Archive replay currently scans finalized records, so a future incremental index may be appropriate as historical volume grows. This does not change current game rules. Cosmetic selection APIs enforce earned entitlements, including for administrators; beta previews are session-local. No currency was introduced.

## Validation and scope limits

Run `npm run typecheck`, `npm run build`, `npm run test:regression`, `npm run test:part17:browser`, `npm run test:browser`, `npm run test:release:browser`, `npm run test:website:browser`, and the package-only Oracle regression. New browser checks cover desktop, short desktop, tablet, phone and short phone, all 14 create dialogs, seven live game families, recovery, nested menus, text scaling and a genuinely authenticated completed match with entitlement enforcement.

Browser screenshots and private test runtime data stay outside the source package. Chromium viewport emulation is not a claim of testing physical iOS/Android devices or every late Hidden Dictator phase. Production has not been deployed. The existing large-bundle warning remains a performance follow-up; the application builds successfully. Historical audit/stage documents are preserved as dated records and superseded by this checklist for current implementation status.
