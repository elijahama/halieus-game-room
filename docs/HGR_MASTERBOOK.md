# Halieus Game Room Masterbook

> **Living project summary and engineering map.**
>
> This document is the high-level source of truth for understanding Halieus Game Room (HGR). It does not replace detailed implementation docs; it connects them.

## Current Part 26 checkpoint

[Part 26 acceptance record](HGR_PART26_ACCEPTANCE.md) records the Control lifecycle/PWA/launcher repairs, launcher-derived website H, compact appearance and desktop sidebar changes, Parts 20–26/Drive reference decisions, exact commits and outstanding real-device acceptance. Keep source validation separate from owner acceptance.

## 1. What HGR is

Halieus Game Room is a private, real-time multiplayer platform for board, card, word and social games. It began as the property-trading game that became **Mega Board** and evolved into one shared application with accounts, rooms, invitations, reconnect/recovery, spectators, guilds, progression, themes, responsive navigation and release/deployment tooling.

The governing product rule is:

> **The platform owns the shared multiplayer experience; each game owns its own rules.**

The current release number is not hard-coded here. The repository file `VERSION` is the production authority.

## 2. Project ownership and AI-assisted development

HGR is **human-directed, AI-assisted engineering**.

The project owner, **Elijah-Baptiste Amadasun**, is responsible for:

- product direction and priorities;
- game rules and edge cases;
- platform requirements;
- UX and responsive behaviour;
- playtesting and real-device QA;
- acceptance/rejection decisions;
- release/deployment decisions;
- documentation goals;
- deciding how AI is used and what evidence is required.

AI tools assist heavily with implementation, debugging, refactoring, regression-test creation, analysis and documentation.

A portfolio-safe description is:

> I direct the product, gameplay rules, architecture requirements, testing and acceptance for Halieus Game Room. AI tools are used extensively during implementation and debugging, while I remain responsible for the requirements, QA, system decisions and final product direction.

See [AI-assisted development](AI_ASSISTED_DEVELOPMENT.md).

## HGR Control Cloud Foundation

HGR Control now has a documented cloud-relay foundation alongside the verified private Tailscale route. The cloud design keeps the owner PC as the executor, requires an outbound authenticated PC connection, and permits only the fixed HGR Control action set. See [HGR Control Cloud Foundation](HGR_CONTROL_CLOUD.md).

## 3. Runtime architecture

HGR uses a server-authoritative multiplayer model.

```text
React / TypeScript client
        |
        | HTTP + Socket.IO
        v
Node / Express / Socket.IO server
        |
        +-- platform services
        |   accounts
        |   rooms / invites
        |   presence / recovery
        |   chat / spectators
        |   guilds / progression
        |
        +-- game modules
            rules
            state
            validation
            AI
        |
        v
validated authoritative state
        |
        v
players and spectators render
```

The browser requests an action. The server decides whether that action is legal. Accepted state is then broadcast back to clients.

### Example: Connect Four

```text
player clicks a column
        ↓
React sends Socket.IO action
        ↓
server finds room + player
        ↓
server checks turn and legal column
        ↓
authoritative board changes
        ↓
result broadcasts
        ↓
clients render the accepted state
```

This is the basic mental model to use when explaining HGR technically.

See [ARCHITECTURE.md](../ARCHITECTURE.md).

## 4. Repository map

```text
client/                 React/Vite application
  src/platform/         shared client/platform UI and services
  src/games/            game-specific UI

server/                 Express + Socket.IO backend
  src/platform/         shared platform services
  src/games/            authoritative game modules

shared/                 contracts shared across client/server

tests/                  static, runtime and browser regressions
scripts/                release/build/cross-platform helpers
scripts/windows/        Windows operator tooling
desktop/                desktop packaging/integration
deploy/                 deployment-safe source
docs/                   current docs + historical implementation records
assets/branding/        canonical branding sources
```

The project root is reserved for stable entrypoints and project identity, not miscellaneous helpers.

## 5. Player platform

Shared player-facing systems include:

- persistent HGR accounts;
- profile pictures and player identity;
- Home / Games / Players / Rankings / Guilds / Inbox navigation;
- global Join Game flow;
- room invitations and game requests;
- reconnect and seat recovery;
- spectators where safe;
- shared results patterns;
- progression and Gamer Score;
- game-specific Ranked standings;
- themes, skins and cosmetic progression.

### Mobile navigation contract

On phone layouts, the permanent bottom navigation is:

**Home · Games · Join · Players · Guilds**

The centre Join control opens the existing room-code Join Game flow. It is not a “new game” shortcut.

The fixed mobile top bar owns utility controls such as menu/tools, fullscreen, inbox and profile. Content scrolls independently beneath the fixed chrome.

## 6. Games

The active catalogue includes board/strategy, card/table and word/party games. The catalogue is shared platform data so the same names/icons can be reused across Home, setup, live room and results surfaces.

Game modules own their own legal actions and authoritative state.

Examples:

- **Mega Board** — property, rent, auctions, mortgages, development, debt, bankruptcy and rule variants.
- **Poker** — table progression, betting state, cards and showdown rules.
- **Connect Four** — turn legality, legal columns and win evaluation.
- **Ludo** — movement and placement rules.
- **Ayo** — traditional seed movement/capture logic.
- **Word Board** — word-board legality and scoring.

See [Game catalogue](GAME_CATALOGUE.md) and [Gameplay rules](GAMEPLAY_RULES.md).

## 7. Guilds and social layer

Guilds are persistent player groups above individual game rooms.

Guilds own:

- membership;
- roles/permissions;
- persistent chat;
- room organisation;
- guild history;
- internal presentation of game records.

Guilds do **not** become a second gameplay authority. A guild-created room hands off to the existing HGR room/game systems. Finalised game sessions can then be projected back into guild history.

## 8. Appearance, themes and identity

The appearance system separates several concepts:

- **platform theme** — page/surface/accent system;
- **game identity** — game-specific colours/icons/motifs;
- **board/table skins** — cosmetic treatment of a game surface;
- **profile colour** — player identity, not a global UI override;
- **brand mark** — canonical H geometry and HGR identity.

### Standard atmosphere rule

**System / Light / Dark** use the selected game’s atmospheric glyphs and accent.

Explicit colour/profile/custom themes use a stable theme-owned glyph family whose colours follow the selected theme. Switching games should not replace that themed atmosphere.

### Gold system

Standard HGR chrome uses one saturated gold family rather than scattered mustard/brass values. Explicit colour themes can override the platform accent.

### Install identity

Browser favicon, PWA install icon and launcher identities are separate consumers of the HGR identity pipeline. Historical reference artwork must not silently override the current install icon.

### Canonical icon family

The 4.5.3 icon pass uses one simple H geometry across the main app, HGR Control and owner utilities. Main Halieus is bright gold; utility meaning lives in a separate corner badge rather than being cut into the H. The functional vector family also includes full-colour, monochrome-gold, white-only, black-only, inverted, outline and H-only permutations.

HGR Control is a separate app identity: its installed PWA, splash/header and Windows Control Mobile shortcut use the dedicated royal-blue Control mark rather than the main gold Halieus icon.

See [Brand asset pipeline](BRAND_ASSET_PIPELINE.md), [Cosmetic theme system](COSMETIC_THEME_SYSTEM.md) and [Game visual identity system](GAME_VISUAL_IDENTITY_SYSTEM.md).

## 9. Launcher and operator tools

Stable Windows entrypoints include:

- `Start Halieus Game Room.cmd`
- `Restart Halieus Game Room.cmd`
- `Close Halieus Game Room.cmd`
- `Update HGR GitHub.cmd`
- `Start HGR Control.cmd` / `Start-HGR-Control.cmd`
- `Start HGR Control Mobile.cmd` / `Start-HGR-Control-Mobile.cmd` — private phone/PWA launcher through Tailscale Serve
- `HGR-Control.cmd` — allow-listed local Control client (`status`, `restart`, `logs`)
- `FIRST RUN - Refresh Halieus Launchers.cmd`

Their responsibilities are deliberately separated.

### Start

Starts/opens the current HGR application. It does not update or deploy.

### Restart

Troubleshooting action. It closes and reopens the dedicated HGR app window without performing Git, build or deployment work.

### Update

The full update path. It synchronises source, validates, builds, runs regressions, updates release identity, warns connected players before production activation, deploys the validated candidate, restarts the production server only after success, and lets existing HGR clients refresh themselves onto the new release.

A failed update must stop rather than activate or refresh into an incomplete state.

### HGR Control

`Start HGR Control.cmd` starts the local authenticated Control Agent development workflow. `Start HGR Control Mobile.cmd` adds the private phone path: the agent still listens only on loopback, while Tailscale Serve provides a tailnet-only HTTPS endpoint and a short-lived pairing flow. The companion PowerShell client remains allow-listed to the approved local actions.

See [Project structure and Windows commands](HGR_PROJECT_STRUCTURE_AND_WINDOWS_COMMANDS.md).

## 10. HGR Control — phone launcher/control plane

HGR Control is the next extension of the launcher system: a mobile-first controller that can securely request a small set of predefined HGR maintenance actions from the owner’s PC.

It is **not** a remote shell.

The intended architecture is:

```text
Phone PWA
   |
   | Tailscale Serve · private HTTPS · :8443
   | 8-digit pairing code → HttpOnly mobile session
   v
127.0.0.1:43127
HGR Control Agent on owner PC
   |
   +-- status
   +-- start
   +-- restart
   +-- close
   +-- update
   +-- recent logs
   |
   +-- links opened on phone
       HGR website
       GitHub
```

The foundation began read-only. Authentication, operation locking, audit logging and fixed Windows executors now cover Start, Restart, Close and Update. The private installable phone PWA behind Tailscale Serve is real-device verified for pairing, status, logs, session persistence/invalidation and Restart. Start, Close and Update are implemented in source and awaiting the next real-device action QA pass. Close/Update use short-lived one-time confirmations, and Update exposes asynchronous release/deployment progress without accepting arbitrary shell input.

See [HGR Mobile Control](HGR_MOBILE_CONTROL.md).

The Mobile Control document also keeps a troubleshooting history of real implementation failures and their fixes so future changes preserve the reasoning behind the architecture.

### HGR Control Lab

The Tailscale phase is also treated as a practical networking/security lab. The objective is not simply to demonstrate Tailscale itself, but to demonstrate the design and validation of a constrained control plane: loopback-only privileged service, private HTTPS exposure, device pairing, secure sessions, allow-listed commands, operation locking, audit logging and real-device testing.

A portfolio-safe description is:

> I built and tested a private mobile control plane for HGR as a networking/security lab. The Windows control agent remains bound to loopback, Tailscale Serve provides private HTTPS transport, the phone pairs through a short-lived code, and the agent accepts only predefined maintenance actions rather than arbitrary shell commands. I validated the design on a real Android phone and Windows PC, including session persistence, session invalidation and remote HGR restart.

The lab is intentionally useful beyond Tailscale: the same action/authentication model can later be extended through an Oracle-hosted relay while retaining Tailscale as a private fallback.

## 11. Release engineering

HGR uses candidate-first release/deployment thinking:

```text
source change
   ↓
typecheck
   ↓
regressions
   ↓
release identity
   ↓
production build
   ↓
candidate validation
   ↓
player maintenance warning
   ↓
deployment / activation
   ↓
health + exact release verification
   ↓
existing clients reload onto the new fingerprint
```

`VERSION` is the sole current release-number authority. Generated consumers should derive from it rather than hard-code the latest patch.

Historical documentation may refer to the patch in which a feature was introduced. Executable “current version” assumptions should not.

### Deployment security gate

Production deployment and release CI intentionally share the high/critical npm audit gate. A high or critical advisory blocks activation by design; remediation is to patch or override the affected dependency and refresh the lockfile, never to bypass or lower the gate. Operational recovery details live in [Deployment](DEPLOYMENT.md).

### Oracle deploy helper ownership

The version-controlled Oracle deployment authority is `tests/dev-tools/Oracle Quick Deploy/`. Its deploy wrapper, remote installer and provisioning/diagnostic helpers are tracked so release checks can inspect the actual deployment logic. The owner-PC `dev-tools/Oracle Quick Deploy/` directory is an intentionally ignored/private working mirror, not a second source of truth.

STEP 9 of `Update HGR GitHub.cmd` refreshes `deploy-from-windows.ps1` and `quick-install.sh` from the tracked canonical copies immediately before deployment. Private `update-website.ps1`, SSH keys and production credentials stay local and must never enter Git. A PowerShell failure at the wrapper's final `throw` means the remote installer returned non-zero; diagnose the preceding Oracle output first rather than treating the guard line as the defect.

See [Deployment](DEPLOYMENT.md), [Testing](TESTING.md) and [GitHub workflow](GITHUB_WORKFLOW.md).

### Player-safe update handoff

Production activation now participates in the player experience instead of behaving like an unexplained disconnect. After a candidate has passed build/integrity validation, Oracle asks the currently running HGR server over loopback to broadcast an update warning. Connected players are told that a restart is coming and to keep recovery information available, then receive a short grace period before the service stops.

When the server returns, the Socket.IO `server:ready` payload includes the exact release fingerprint. An older loaded client detects that the server is now a different release and refreshes the **same browser tab/window**. The owner-PC updater therefore no longer force-kills and reopens an existing dedicated HGR window after every successful deployment. A pre-feature window receives one bootstrap Restart so it can load the release-aware client and create a local capability marker; later updates preserve that window and let it refresh itself. HGR is opened only if the dedicated window was already closed. The hard Restart launcher remains the fallback for recovery.

HGR Control and the Windows launcher family now share one semantic icon system: Start green, Restart orange, Close red, Update light blue, PowerShell slate and OpenShard purple. HGR Control uses a separate royal blue so it cannot be confused with either Update or OpenShard. Every utility icon uses the same simple canonical H plus a small white corner badge; the H itself no longer contains the retired play-cut geometry.

## 12. Validation philosophy

Passing code is not automatically accepted product behaviour.

HGR validation combines:

- TypeScript typechecking;
- static regression tests;
- runtime regression tests;
- browser/geometry tests;
- release-integrity checks;
- build verification;
- real-device screenshots and testing;
- actual multiplayer playtests.

When a visual or mobile issue is reported, the screenshot/device result is evidence that the implementation contract is not yet satisfied even if earlier automation passed.

## 13. Security boundaries

Important boundaries include:

- clients do not decide authoritative game legality;
- spectators must not receive private player state;
- secrets and private deployment keys do not belong in Git;
- production runtime data is not a release artifact;
- HGR Control must never accept arbitrary command strings, executable paths or user-supplied shell arguments;
- remote control should use a private network path plus application authentication;
- destructive/expensive actions should require confirmation and operation locking.

## 14. Current development roadmap

Near-term work:

1. HGR Control read-only foundation. **Complete.**
2. Secure Windows action executor. **Start/Restart/Close/Update are implemented; Restart is real-device verified, while Start/Close/Update await real-device action QA.**
3. Operation locking + audit logging cover mutable actions. **Short-lived Close/Update confirmations and asynchronous Update progress are implemented.**
4. mobile HGR Control PWA control surface. **Status, Start, Restart, Close, Update progress and logs are implemented; Restart and the session lifecycle are real-device verified.**
5. private Tailscale Serve + short-lived phone pairing path. **Implemented; real-device pairing, installed-PWA persistence and session invalidation verified. Persistent trusted-device pairing is a future convenience improvement.**
6. themed atmosphere continuation for profile themes such as Brass & Coal.
7. Light-mode contrast review for coloured fills and text.
8. continued real-device mobile QA.

Longer-term work should continue to preserve the platform/game separation rather than duplicating infrastructure inside each game.

## 15. How to explain HGR

A short technical explanation:

> Halieus Game Room is a server-authoritative multiplayer platform built with React, TypeScript, Node, Express and Socket.IO. Shared platform systems handle identity, rooms, recovery, social features and navigation, while individual game modules own their own rules and state. I direct the product and technical requirements, test the system across devices and multiplayer sessions, and use AI extensively as an implementation and debugging tool.

A slightly deeper example:

> If a player makes a move in Connect Four, the browser does not simply update the board and declare the move valid. It sends the action through Socket.IO to the server. The server checks the room, player, turn and game rules, changes authoritative state only if the action is legal, and broadcasts the accepted result back to players and spectators.

## 16. Documentation map

Start with this Masterbook, then go deeper:

- [Architecture](../ARCHITECTURE.md)
- [Project overview](PROJECT_OVERVIEW.md)
- [Game catalogue](GAME_CATALOGUE.md)
- [Data model](DATA_MODEL.md)
- [Socket events](SOCKET_EVENTS.md)
- [Testing](TESTING.md)
- [Deployment](DEPLOYMENT.md)
- [AI-assisted development](AI_ASSISTED_DEVELOPMENT.md)
- [HGR Mobile Control](HGR_MOBILE_CONTROL.md)
- [Documentation index](README.md)

Historical RC, patch and implementation logs remain evidence of how the project evolved; they are not automatically the current behavioural source of truth.


## Part 26 Batch 1 — approved Control crop, 2 October 2026

Latest main had replaced the model sheet with a 256x256 PNG whose IDAT checksum was invalid. Dimension-only checks missed this. Owner selected the lower-row blue gear Control icon; the authority and PWA copy now contain that exact crop, resized without redrawing. Provenance is in HGR_CONTROL_LAUNCHER_SOURCE.md. Regression retains square checks and adds chunk checksums, decompression, corrupt-file rejection and approved-artwork hash. Existing distinct Stop badge, canonical Stop target, stale export cleanup, actual shortcut IconLocation validation and explicit icon-cache refresh remain enabled.

Source/CI results and real owner-PC/phone acceptance are recorded separately. Owner acceptance must confirm visible Control/Stop icons, canonical launcher names and successful background start/stop. CI alone does not establish that acceptance.


## Part 26 Batch 2 — running Control update lifecycle

Batch 1 source commit 4714d1758e4f1057376e2eb68376e88774dd1db6 passed CI run 37064062685 (#773). Windows export, actual shortcut metadata and cache-refresh commands passed in the isolated checkout; owner-visible acceptance is pending.

Updater now captures Control state before pulling. Stopped-before-update stays stopped; replaced processes are preserved. Existing Control receives an authenticated local graceful stop (legacy fallback retained), restarts from updated source, verifies its listener and rejects reused runtime credentials. The normal start helper re-establishes and health-checks the saved Tailscale HTTPS port and generates fresh pairing state. Tests cover stopped/running/stale snapshot states, port preservation, token rotation, real authenticated shutdown and unauthorized shutdown denial. Real owner-PC/phone update, Serve-route and re-pair acceptance remain pending.


## Part 26 Batch 3 — phone state and installed-shell takeover

Batch 2 passed CI 37066007790 after process identity was made independent of PowerShell JSON date conversion. Batch 3 adds live pairing expiry, an expired-form Retry connection action, bounded network requests and idle connection monitoring. Reopening Control renews an expired code; it does not leave the owner trapped in an already-running message. Worker activation actively navigates older installed shells that have no update listener, deletes only Control caches, and never caches API responses. The offline fallback uses Owner PC unavailable and Retry connection. Manifest dimensions match the actual Control PNG. Browser regression simulates a genuinely stale service worker then checks fresh/expired/paired/disconnected states. Real installed Chrome/Brave and tailnet acceptance remain pending.


## Part 26 Batch 4 — launcher-family website H and compact appearance

Batch 3 commit 3fe28ef1e8e01e5eafb606abb931bde26b464963 passed CI 37067888616. Website H now traces the wide, angled caps and proportions of the approved no-badge launcher glyph (ChatGPT Image 25 Sept 2026, 18_26_58-6.png); the narrow slab-serif reconstruction was rejected by the owner. All SVG consumers and flat exports share this path, with a new favicon revision. Launcher raster masters are preserved. Personal tiles use an integrated face gradient and the existing palette; glyph-only choices remain tile-free. Ten independent logo choices stay grouped. Theme is a compact full-width row, avoiding the stretched empty column. Desktop navigation has a neutral raised active face, a restrained brand edge and a compact Join action with physical depth; mobile navigation structure and game buttons are unchanged.


## Part 26 Batch 5 — canonical lifecycle helpers

Canonical CMD launchers and updater now call start-control.ps1 / stop-control.ps1. Old Mobile-named scripts are compatibility shims only, with no duplicated implementation or generated user-facing shortcut. The ignored hgr-control-mobile-state.json filename is deliberately retained to let the updated stop/update helpers recognise an agent launched before this change; renaming live state would strand that process. Release integrity and Oracle package checks require both new canonical helpers and legacy compatibility entry points.


## Part 26 Batch 6 — verified launcher refresh

Control generation rejects even matching square authority/delivery PNGs when their hash is not the approved artwork. ICO validation checks its directory, dimensions, bit depth, byte length and exact embedded PNG. Stale generated-file removal and Windows cache refresh failures now stop the stage. Shortcut validation also checks icon index, executable and working directory; paths containing commas are supported. Windows runtime regression uses a disposable project and fake Start Menu, verifies all sixteen shortcuts, and rejects corrupted ICOs, wrong icon indices/targets, cache failure and unapproved artwork. It does not launch the desktop app, Control or an update/deployment.


## 3 October 2026 — approved Control icon integration

The owner-approved integrated blue cog artwork supersedes the 2 October model-sheet crop. The canonical H itself is not redrawn. Authority: `assets/branding/references/HGR Control Launcher.png`, transparent indexed 192×192 PNG, SHA256 `90fb5be18b805841df83ef8e0b2c62ce59184336de1876befab48edf2a076ff4`. Byte-identical copies serve the private Control PWA and Cloud Control `/control/`; the in-site admin launcher uses the Cloud Control image. Splash/header, favicon, Apple-touch and manifest references use the approved artwork revision. The manifest describes an ordinary icon rather than claiming mask-safe artwork.

Windows exports remain verified 256px PNG/ICO derivatives. Stop Control adds only the existing explicit red stop treatment. Other launcher masters are unchanged. Model-sheet exclusion, pinned approval hash, PNG decode checks, stale export cleanup, actual shortcut icon/target validation and cache-refresh failure checks remain enforced. Private shell cache v10 replaces v9; Cloud Control stylesheet and image URLs are revised. Browser coverage verifies rendered image decoding and approved URLs after stale-shell takeover and on cloud/admin surfaces.

This batch changes branding only: no relay, telemetry, cancellation, enrollment or remote-action implementation. Source checks/CI do not establish installed-device acceptance. After the normal updater, the owner must check actual Windows Control/Stop icons and existing Chrome/Brave installed PWA artwork, then compare `/control/` and the in-site admin launcher. Mobile OS launcher refresh timing must be verified on-device.


## 5 October 2026 — bounded Mega Board creation acknowledgement

`game:create` previously awaited account cosmetic/progression storage without a deadline before acknowledging; the client likewise waited indefinitely. Cosmetic lookup now has a two-second deadline with the existing starter-board fallback, including rejected lookups. Late cosmetic results do not change an already-created room. Normal successful preference selection and ranked/blitz creation rules are preserved.

The client waits at most ten seconds for acknowledgement, clears Creating on error/disconnection, and asks the player to retry the same code. Repeating creation on the same connected host socket returns the existing lobby and recovery key without creating another seat. Other sockets still receive the occupied-code error and never receive that key. This is not cross-connection recovery without a saved key. Invalid payloads receive a failure acknowledgement.

Focused regression exercises the real handler over Socket.IO and the actual App submit handler: successful room/session/navigation, stalled/rejected cosmetics, late-result isolation, lost acknowledgement, retry, disconnect, duplicate host/foreign socket and malformed payload. Full typecheck, regression, release integrity and production build are required before merge. This change does not alter game rules, branding or Control operations.


## 4.5.4.13 — board-name casing (5 October 2026)

Mega Board lobby summaries consume the existing canonical cosmetic catalog label (Classic Board, etc.), rather than deriving lowercase text from the stored slug. IDs, unlocks, Beta rules and labels themselves are unchanged. Canonical VERSION remains 4.5.3 until the 4.5.5 acceptance gate.


## 4.5.4.14 — Control action states

Cloud Update appearance follows the real disabled attribute. Approved/online/idle makes Update interactive; active updates and dispatch disable both Update and Revoke cloud access. Unimplemented Start/Restart/Close stay disabled. Backend permissions and revocation enforcement are unchanged.


## 4.5.4.15 — truthful Cloud Update progress

Control prominently displays the real reported updater phase and last update timestamp. Progress percentages and width remain server-owned; a running-only subtle animation indicates activity without incrementing progress. Reduced-motion preferences disable animation. Terminal success/failure/rejection have distinct titles and colours while failure diagnostics remain available. Missing timestamps are shown as unavailable, never invented.


## 4.5.4.16 — fullscreen across Control navigation

HGR and /control/ are separate documents. Cross-document browser navigation may exit native fullscreen; neither destination requests fullscreen without a user gesture. A shared navigation helper remembers fullscreen intent for same-tab HGR ↔ Control links and offers Resume fullscreen or Stay in window after navigation/history return. Installed standalone windows avoid redundant prompts. iPad/iPhone keep the existing native-input safety restriction. Actual OS/PWA acceptance remains separate from browser tests.


## 4.5.4.17 — Control account pictures

Control header and player-list avatars consume the canonical account profilePicture field, with the existing avatar/initials fallback for absent or failed images. Image fitting is contained within the existing avatar shape. No identity, permission or account-storage changes.


## 4.5.4.18 — portrait Control containment

Portrait Control has an explicit Game Room link in its top utility row. Mobile cards share a single border/radius/surface treatment, profile frames avoid duplicate shadowing, enrollment controls wrap, and main content owns bottom dock clearance. Operation progress sits above the mobile dock so it does not cover the header return action. Keyboard focus outlines remain visible and Control retains its blue identity.


## 4.5.4.19 — separately scoped Cloud Control install identity

Cloud Control has its own /control/ manifest identity, standalone start URL, Apple-touch reference and scoped worker. The 192px icon remains byte-identical to approved Control artwork; the 512px export is a documented raster resize only, with source/export hashes pinned. The H and cog are not redrawn and launcher masters are unchanged. Browser install prompts are offered only when the browser supplies them; iOS uses Share → Add to Home Screen.

The Control worker caches only a public offline page and approved artwork; administrative responses/actions never enter its cache. Main HGR bypasses /control/ and deletes only its own shell caches. Control likewise deletes only its own caches. Offline Control cannot show stale account/operation data and offers Retry connection. OS-installed icon appearance and standalone behavior still require owner-device acceptance separately from browser/CI checks.


## 4.5.4.20 — integrated admin Control access

Control access is an in-flow Home navigation utility on desktop and an item in the mobile top-bar More tools panel. It no longer floats over page/game content. Visibility derives from the existing authenticated account state and remains owner/admin-only; backend permissions remain authoritative. The approved artwork is unchanged. From game screens, the existing Game Room return leads to these utilities.

The source stabilisation list .13–.20 is now implemented. Release 4.5.5 remains gated on the owner-device sweep recorded in HGR_4.5.5_ACCEPTANCE.md; canonical VERSION stays 4.5.3 until that evidence exists. Tailscale remains available.


## 5 October 2026 — stranded Control update correction

Owner confirms new rooms can be created and the earlier room remains active. Apple-device sign-in/boot acceptance is still pending; no release version bump.

The 4 October 23:57 Cloud Update remained at 3% after its bridge restarted: the cloud retained Running, but the local marker already recorded a failed interrupted handoff. The bridge previously retained its request association only in memory. Persist the request/local-operation/baseline/deadline while observing an update, resume observation after restart without repeating Update, and retain the journal until a terminal report is acknowledged. Cloud operations with no report for 55 minutes become explicitly unconfirmed failures; this never kills an updater or claims success. Late reports cannot reopen terminal operations. Local Control still enforces its active-operation guard on retries.

Operation cards retain role colour (blue Update, green Start, orange Restart, red Close) and readable unavailable reasons. Only Update is presently supported by the cloud bridge. Start/Restart/Close remain owner-PC actions, explicitly labelled rather than misleadingly enabled. A running Update explains its busy state.

Source validation is separate from production acceptance. A fresh cloud update reaching a verified terminal result and owner-PC/phone visual checks remain required.

### 4.5.5 Batch 1 — Control mobile reliability decision

The 4.5.5 mobile pass begins with Control reliability rather than visual Game Room changes. The durable rule is that remote Update progress must survive Control process replacement: the owner-PC updater writes phase/percentage checkpoints to the runtime update-result marker, the detached finalizer owns the final restart checkpoint and terminal result, and the cloud bridge recovers from that marker after restart. In-memory `activeOperation` is an optimisation, not the authority for long-running Update continuity.

On mobile, the Control update surface may be minimized and moved between viewport corners. A minimized bottom position must remain above the fixed Control navigation. The four allow-listed owner operations use a compact two-column mobile dashboard while preserving their role-specific colours.

This batch does **not** change the canonical launcher family, Control artwork, Game Room mobile carousel, account settings, owner-theme treatment, or VERSION. Those remain separate audited work. VERSION stays 4.5.4 until the planned 4.5.5 mobile batches pass real-device acceptance.

### 4.5.5 Batch 2 — mobile hub layout decision

The Game Room mobile Home surface must not be a compressed desktop composition. The featured-game selector is a horizontal scroll rail with fixed target widths; the featured content keeps usable art and text space. Mobile selected controls are flat theme-aware surfaces with restrained brand accents rather than the desktop glossy/elevated treatment.

The accepted five-item fixed bottom navigation is preserved. Player action triggers and modal close buttons use explicit square centring so glyph baselines cannot visually drift. These rules are phone/tablet-scoped and must not alter desktop or in-game table geometry.

VERSION remains 4.5.4 until the 4.5.5 mobile batches and real-device acceptance are complete.

Batch 2 automated validation gate: the normal HGR release-identity workflow must pass against this source state before the next 4.5.5 batch is treated as accepted.


### 2026-10-07 — HGR 4.5.5 mobile featured-carousel rollback/fix

Owner-device review rejected the first Batch 2 portrait carousel geometry. The regression was caused by retaining the legacy two-column `.halieus-showcase-feature` grid while moving the thumbnail rail back into normal document flow; the feature card was therefore forced into the narrow first column and the rail occupied the second, producing a large empty block and missing/squeezed feature copy.

Durable mobile rule: below 760px, the featured-game stage and its thumbnail rail share **one full-width parent column**. The stage may use an internal artwork/copy grid, but the rail must sit on its own full-width row below it. Do not reintroduce a parent-level artwork/rail two-column split on portrait mobile. Owner-device visual acceptance remains required before 4.5.5 is released.


### 2026-10-07 — Control Update durable operation identity

The 4.5.5 Control Update path now binds every durable update-result marker to the exact local Control operation ID. The Control Agent passes its generated operation ID into `control-update.ps1`; the bridge persists it with each phase/percentage checkpoint; `control-update-finalize.ps1` carries it across the Control restart and terminal result; and the cloud bridge prefers exact operation-ID matching when recovering progress. The older started-at marker comparison remains only for backward compatibility with markers created before this hardening.

Durable rule: long-running remote Update continuity must not depend only on process memory or on an unscoped runtime marker. Progress/recovery must be attributable to the exact dispatched Control operation before the cloud UI treats it as current. 4.5.5 remains blocked until a real phone-triggered update advances beyond 3%, survives the owner-PC Control handoff and reaches an explicit terminal result.


### 2026-10-07 — 4.5.5 palette ownership, player-colour scope and Control operation icons

Theme Library and Custom now share the same four-colour workspace rendering contract: page, surface, primary accent and secondary accent are expanded through the same `customThemeVariables` surface hierarchy. Theme Library is organised as **Starting palettes → Unlockables → Core → Workspace palette**. Starting palettes are the editable Custom presets (deduplicated against exact profile palettes); Core/Unlockable profiles retain their progression metadata; Workspace palette is the player's saved custom RGB/HEX palette. A Theme Library profile must not fall back to legacy/navy card backgrounds that Custom does not use.

Player colour is identity fallback data only. It may fill an initials/avatar tile when no profile picture exists (or when a picture fails to load), but it must not set theme accents, panel/background colour, navigation selection, borders, glow, guild markers or other platform chrome. Uploaded profile pictures render without a player-colour backing treatment; all surrounding chrome follows the active HGR theme.

Control Update state icons are semantic and consistent. Idle may show the static Update glyph. Running uses a CSS activity ring; no arrow/image/tick is rotated as a fake spinner. Succeeded uses a static tick, failed a static failure mark and rejected a static neutral mark. The global update toast and the Operations Update tile use the same state vocabulary.

These are 4.5.5 acceptance rules. Canonical VERSION remains 4.5.4 until real-device validation confirms the mobile carousel, Control update completion path, theme rendering and player-colour isolation.
