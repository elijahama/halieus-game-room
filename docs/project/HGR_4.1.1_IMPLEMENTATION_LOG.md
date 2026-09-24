# HGR 4.1.1 Implementation Log

## Approved scope

This implementation follows the saved post-4.1.0 UI reference and subsequent recorded walkthrough: Home discovery, player/social cleanup, Guild member invitations, canonical avatars, richer leaderboards, scroll-safe setup/menu surfaces, System/neutral Dark/Light themes, optional Blue, Custom RGB theming and per-game ambient colour.

WHOT gameplay redesign was explicitly excluded.

## Main implementation points

### Home and Players
`HomeScreen.tsx` removes Project History from Home and introduces a stateful discovery shelf. The shelf is derived from existing HGR data rather than pretending to have an external recommendation service: personal play counts, recent history, live rooms and unplayed catalogue entries provide the initial signals.

Online and recent-player shelves reuse canonical account avatars/profile pictures.

### Guilds
Guild storage now retains invitation records. Owners/admins can invite a real account by stable account ID. The server resolves the target account itself; the client cannot spoof display name/avatar data into membership.

Recipients receive pending invitations and explicitly accept or decline. Accepting creates normal guild membership and persists it in the same guild store.

Guild member rendering refreshes display identity from the account store so profile-picture changes propagate into Guilds.

### Themes
Theme choices are System/Dark/Light/Blue/Red/Green/Custom. System follows the device colour preference live, including if the OS preference changes while HGR is open.

Light and Dark are the standard HGR identity and retain yellow primary actions. Blue, Red and Green are explicit coordinated colour profiles. Custom stores four palette inputs and derives readable text/border/surface tokens from them. RGB, HEX and native colour-picker controls edit the same palette, with twelve coordinated starting profiles.

The old `theme-transitioning` choreography is no longer triggered. Theme switching is immediate.

### Modal and debt layout
Desktop room setup and game menus use the backdrop/document as the overflow escape hatch rather than placing a scrollbar inside the modal card. Mega Board debt property actions are arranged as compact option cards so more legal liquidation actions remain visible together.

### Validation
`tests/regression-4.1.1.mjs` protects the approved 4.1.1 behaviour and is chained after the historical 4.1.0 regression.


## Recorded walkthrough polish

The September walkthrough used GameBanana's featured-game presentation as a motion/layout reference. HGR keeps its own visual identity, but the Home hero now rotates content inside a fixed-height stage so different title and description lengths cannot make the entire block jump. Rotation content eases in while manual previous/next and direct game indicators remain available.

Home is intentionally a preview rather than another browsing surface. Discovery now shows four games and the Online/Recent player cards show three people each. Internal Home scrollbars were removed; **View all games** and **View all** now lead to the full browsing surfaces instead of duplicating an already-scrollable list.

The walkthrough also clarified three platform behaviours:
- **System theme** is restored as a real persisted mode and follows the device preference.
- **Guild Join/Create** controls are compact until deliberately opened, while the private-code area exposes **Invite HGR players** as a direct route into platform-native invitations.
- **Owner accounts** open on the same personal Profile & security surface as a normal player. Administration remains available through **Owner tools** instead of permanently taking over the account modal.

### Validation extension

`tests/regression-4.1.1-video-polish.mjs` protects the fixed hero stage, short Home previews, System theme, compact Guild actions and profile-first owner account behaviour. It runs after the existing platform-coherence regression.


## Session/profile hotfix

The final 4.1.1 walkthrough exposed four cleanup issues that stay within the polish milestone:

- Profile-picture updates were accepted by the client at up to 1 MB, but Base64 encoding expanded the JSON request beyond Express's default 100 KB body limit. The server parser now accepts up to 2 MB while the profile route still enforces the existing 1 MB image contract.
- The branded Halieus intro could become eligible in the middle of a browsing session after an administrator closed all recoverable rooms. Continuing/recovering a room now marks the intro handled in both React state and session storage; a fresh normal sign-in still receives the once-per-session intro.
- Profile-picture actions, selected-player drill-down and Guild member rows were tightened so identity/settings surfaces use less empty space without removing any actions.
- The Mega Board waiting room and Home featured-game arrows were compressed so the information hierarchy is easier to scan and the carousel controls no longer look like tall side tabs.

`tests/regression-4.1.1-session-profile-hotfix.mjs` protects the request-size fix, intro lifecycle and the main density contracts.


## Theme canvas, Friends shelf and hero hotfix

- Bridged the legacy Game Room shell to the current `--hgr-*` palette so Blue and Custom now recolour the full workspace instead of leaving the old dark canvas underneath.
- Kept per-game background colour effects as atmosphere overlays on top of the selected theme rather than as the page colour itself.
- Reworked Custom presets toward coordinated creative-app palettes and expanded the library to twelve distinct starting profiles while preserving RGB/HEX editing.
- Fixed the featured hero title/room overlap caused by parent-relative `em` grid rows; title and description now reserve their own stable text areas.
- Prevented accidental hero text selection from presenting as a large browser-blue block.
- Removed the generic recommendation fallback from **Friends Are Playing** and added an explicit empty state when there is no live friend-game data.
- Added regression coverage for the full-shell theme bridge, studio-style preset direction, truthful Friends shelf and hero geometry.

## Source baseline archive policy

- Canonical source snapshots now advance in half-version intervals: `.0`, `.5`, next major `.0`, next `.5`, and so on.
- The current 4.1.x line therefore uses **4.0** as its canonical source baseline.
- The exact 4.0 snapshot is preserved at `source-baseline-4.0`, pointing to commit `ec0d2193d8b6133452d57f312d86e2ea90f23e74` (`Import Halieus Game Room 4.0.0 source`).
- `source-baseline` is the moving branch used for the current source-material ZIP.
- A new source-baseline workflow will freeze and archive exact milestone commits when `VERSION` reaches values such as `4.5.0`, `5.0.0`, `5.5.0`, `6.0.0`, and `6.5.0`.
- Intermediate and patch releases do not move the source snapshot.

## Brand, theme and launcher coherence pass

- Replaced font-glyph carousel arrows with shared SVG chevrons and centred them with layout rather than glyph metrics.
- Removed the square glow/border treatment around featured game artwork so the artwork itself defines its silhouette.
- Added a shared adaptive Halieus H mark for the website chrome and intro. This is an interim consistency component, not the final rebrand.
- Changed primary actions, including Join Game, to one solid theme action colour instead of the multi-band gradient treatment.
- Custom themes now derive a readable solid action colour and white action text when required by contrast.
- Standard Dark now uses one neutral graphite workspace/surface hierarchy and bridges legacy `--mm-*` surfaces to the same palette. Blue remains the intentionally chromatic dark theme.
- Renamed generated Windows Start Menu shortcuts to `Start HGR App`, `Restart HGR App`, `Close HGR App`, and `Update HGR Site` so local app-window controls are not confused with Oracle/cloud service controls.
- The underlying `.cmd` filenames remain unchanged for compatibility.
- Added regression coverage for shared branding, arrow alignment, theme-primary actions, dark-surface consistency and launcher semantics.

## Deferred visual identity work

- A broader HGR rebrand is intentionally deferred until a visual model sheet is designed and approved.
- The model sheet should define the core H mark, standard/high-contrast/low-contrast treatments, theme-linked variants, launcher icon family, spacing, radii, typography and positional rules before those changes are rolled across the product.
- A 4.5 milestone is a candidate for that larger visual refresh, but no version bump is implied by this note.

### Guilds menu correction

- Removed the redundant full-width Guild action strip that still made Join/Create look like permanent setup content.
- Moved **Join guild**, **Create guild**, and **Players** into the Guilds page heading as compact page actions.
- Join/Create continue to open their existing top-layer modals; the guild workspace now begins immediately beneath the heading.
- Added responsive heading-action layouts for tablet/mobile and regression coverage preventing the old setup bar from returning.

### Profile-picture consistency correction

- Added one canonical uploaded-image crop rule across sidebar identity, mobile profile access, player cards, guild members, guild invites and account/admin surfaces.
- Profile pictures now remain clipped to their intended square tile with centred `object-fit: cover` behavior instead of escaping or stretching the identity frame.
- Updated the 4.1.1 intro regression to recognise the shared Halieus brand component rather than the retired versioned PNG reference.

## Functional feedback conversations

- Replaced the old write-only feedback path with a persistent feedback conversation store at the durable Halieus feedback data directory.
- Existing `feedback.ndjson` submissions are migrated into the new store instead of being discarded.
- Game feedback now keeps structured source, game, room, player, build and page context.
- Mega Board and Poker in-game feedback now use the same account-aware feedback service; profile feedback can target any current game from one selector.
- Every signed-in player can submit feedback from their own profile and see their previous submissions, workflow status and owner reply.
- Owner/Admin tools now include a Feedback inbox with Open / Reviewing / Answered / Closed states and an in-site reply composer.
- Owner replies are stored with the feedback item and become visible to the submitting player in their profile.
- The PowerShell feedback viewer now reads the conversation store and falls back to the legacy NDJSON file when needed.
- Added release regression coverage for persistence, legacy migration, game context, profile history, owner inbox and reply visibility.


## Openshard development provenance

- Added Openshard as optional **development-only provenance tooling** for HGR's human-directed, AI-assisted engineering workflow.
- Openshard is not a gameplay/runtime dependency and is not required by players or the Oracle production service.
- Added a dedicated HGR setup/usage guide covering local receipts, supported-agent capture, privacy boundaries, telemetry and the distinction between receipts and verification.
- Added Windows helpers for `setup`, `doctor`, `last`, `history`, `stats`, `tui` and optional telemetry disablement.
- Added `/.openshard/` to repository ignores so local receipt history cannot become source, production data or a source-baseline input.
- HGR credits the upstream Openshard project and its Apache-2.0 licence rather than vendoring or presenting the tool as HGR code.


## AI provenance architecture milestone

- Promoted Openshard from a setup/tooling note into a documented HGR engineering architecture decision.
- Defined the evidence chain from human requirement -> AI-assisted implementation -> Openshard receipt -> Git diff -> HGR validation gate -> human acceptance -> GitHub history.
- Explicitly separated **provenance** from **correctness**: a receipt can describe an AI-assisted run, but it does not replace type checking, regression tests, production builds, release-integrity validation or human playtest/visual acceptance.
- Documented the runtime boundary: Openshard remains development-only and HGR must build, deploy and play normally without it.
- Documented why receipt state remains outside Git, production data and half-version source baselines.
- Added portfolio/interview language that accurately describes human ownership, substantial AI implementation assistance and receipt-backed provenance where the integration supports it.
- Recorded the limitation that not every AI interaction is automatically capturable; HGR documentation therefore says **receipts where supported** rather than claiming universal capture.


### HGR OpenShard launcher shortcut

- Added a generated **HGR - OpenShard** Start Menu shortcut alongside the existing HGR PowerShell launcher family.
- The shortcut opens the OpenShard TUI at the HGR repository root through `scripts/windows/OpenShard-HGR.cmd tui`.
- It remains development-only and is deliberately absent from the Oracle/player runtime launcher set.
- It currently reuses the approved HGR terminal launcher artwork; a dedicated icon remains deferred to the visual model-sheet/rebrand stage.
- Added regression coverage so the shortcut name, helper route and TUI action cannot silently drift.


## Standard identity and account/lobby polish

- Corrected Light so it is the bright version of the standard HGR identity rather than an accidental blue profile. Primary actions such as **Join Game** and **Continue** remain yellow in standard Light and Dark.
- Added first-class **Red** and **Green** profiles beside the existing Blue profile. Each profile recolours the complete workspace/surface hierarchy rather than changing only one accent.
- Expanded Custom to twelve coordinated creative-tool-style presets. RGB/HEX editing remains available after a preset is selected.
- Updated the first-paint boot path and in-game Display settings so Red/Green survive reloads and are available consistently outside the Home screen.
- Reordered the player account hierarchy to **profile/security -> personal game record -> feedback**, keeping Owner Tools as a separate administration destination.
- Normalised Owner Tools, invite history, player administration, feedback, rooms, audit and test-lab surfaces onto active HGR theme tokens rather than a lingering blue admin palette.
- Bounded the Mega Board lobby roster to a six-row preview height; seventh/eighth seats scroll inside the roster instead of extending the waiting-room layout below its control column.
- Kept the live Mega Board countdown in the top match metadata row beside Room / Match / Players / Duration / Status. The game-menu timer control remains a host setting, not the live timer display.
- Stopped treating every live room as a friend room. Until HGR has a canonical friend relationship graph, **Friends Are Playing** intentionally stays empty rather than presenting unrelated games as friend activity; the general live-room section is labelled as player activity instead.
- Added regression coverage for standard yellow Light actions, Red/Green profiles, twelve presets, owner-theme inheritance, account ordering and bounded Mega Board roster behaviour.
