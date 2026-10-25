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

Control prominently displays the real reported updater phase and last update timestamp. Progress percentages and width remain server-owned; a running-only subtle animation indicates activity without incrementing progress. Reduced-motion preferences disable animation. Terminal success/failure/rejection retain distinct titles and semantic icons, while the surrounding card chrome stays neutral for failure/rejection and the captured failure reason remains available. Missing timestamps are shown as unavailable, never invented.


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

The Control update surface may be minimized and moved between viewport corners on desktop or mobile. A minimized bottom position on mobile must remain above the fixed Control navigation. The four allow-listed owner operations use a compact two-column mobile dashboard while preserving their role-specific colours.

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

Theme Library and Custom share the same four-colour workspace rendering contract: page, surface, primary accent and secondary accent are expanded through the same `customThemeVariables` surface hierarchy. Theme Library contains **Core** plus progression **Unlockables**. Core is now the curated set of the former working Custom presets (Studio Graphite through High Contrast), promoted into proper always-available profiles while retaining the Custom-mode moving ambient-emblem logic. The Custom editor itself remains preset-free and directly edits the player's saved four-colour workspace. The duplicate Workspace-palette card remains removed.

Player colour is identity fallback data only. It may fill an initials/avatar tile when no profile picture exists (or when a picture fails to load), but it must not set theme accents, panel/background colour, navigation selection, borders, glow, guild markers or other platform chrome. Uploaded profile pictures render without a player-colour backing treatment; all surrounding chrome follows the active HGR theme.

Control Update state icons are semantic without duplication. The Operations Update tile shows the static Update glyph when idle and a CSS activity ring only while work is running; after a terminal result it returns to idle. Succeeded, failed and rejected are shown once in the persistent/global operation status, using static semantic marks. Failure/rejection do not paint the whole status card red. The captured owner-PC failure reason is surfaced in the global summary/details so a failed remote update can be diagnosed instead of merely labelled failed.

These are 4.5.5 acceptance rules. Canonical VERSION remains 4.5.4 until real-device validation confirms the mobile carousel, Control update completion path, theme rendering and player-colour isolation.


## 7 October 2026 — Part 28 theme-control simplification

Theme selection is deliberately simpler. **System, Light and Dark** remain the immediate base appearance modes. Theme Library exposes **Core** beside progression **Unlockables**. Core is the promoted former Custom preset set; those presets are no longer duplicated inside the Custom editor. The duplicate saved Workspace-palette tile remains removed.

**Custom** is now one direct four-part editor for **Workspace, Panels, Primary UI and Secondary UI**. Each colour is adjusted with RGB sliders, while the current hexadecimal value remains visible for reference. A compact main-site preview and four-part legend sit below the controls so the player can understand which part of the HGR shell each colour owns without browsing duplicate preset cards.

Existing theme/profile data and entitlement rules are not deleted by this UI simplification. Previously stored profile identifiers remain readable for compatibility, Beta/Test Lab still exposes genuine progression-gated themes for testing, and game-surface cosmetics remain independent from platform chrome. This is a presentation/selection decision, not a game-rule or progression rewrite.

Source regression must protect the visible promoted Core preset set, Unlockables, the absence of a second preset gallery inside Custom, the absence of the duplicate Workspace card, and the RGB/HSL editor. Core preset backgrounds must keep moving ambient emblems when reduced motion is not requested. Real-device visual acceptance remains separate from CI.


### 2026-10-07 — Part 28 Control update status simplification

The persistent Control operation status is now the single terminal-status surface for Update. The Operations Update tile represents only **idle** and **running**, so a terminal failure/success icon is not duplicated at the bottom of the Operations dashboard. Failure/rejection keep neutral card chrome; the semantic status mark and exact captured owner-PC reason remain visible.

The operation status can be minimized on **desktop and mobile** and snapped to a viewport corner. The compact form behaves like a global service/status banner: it remains available while the owner moves around Control without monopolising the page, and tapping it expands the full details again. Mobile bottom placement still clears the fixed navigation.

This changes presentation only. Server-owned progress, durable operation IDs, failure capture, timeout/recovery rules and the rule that failed updates must stop rather than deploy remain unchanged. A source pass cannot identify a machine-specific update failure by itself; the next real owner-PC failure must be diagnosed from the now-surfaced bounded failure reason and operation history.


### 2026-10-07 — Part 28 Control Update blank-line failure

A real website-triggered owner-PC Update reached Control and failed at **3%** before source synchronisation/build/deployment. The captured PowerShell reason was `Cannot bind argument to parameter 'Line' because it is an empty string.` Root cause: `control-update.ps1` streamed CMD output into `Update-HgrProgressFromLine`, whose mandatory string parameter rejected blank output lines before the function body could inspect them.

Durable rule: progress parsing must treat blank/whitespace updater output as a no-op. The parser now explicitly permits an empty string and returns before marker matching. This preserves live progress, bounded/redacted failure capture, exact operation IDs and the rule that a failed update never deploys an incomplete candidate.

Source CI validates the guard. Real-device acceptance still requires a fresh Cloud Update to advance beyond 3% and reach either the next truthful failure or 100% completion.


### 2026-10-07 — Part 28 Control visual correction

A failed/rejected global Control operation keeps a semantic status glyph but **no coloured icon-tile highlight**. Neutral card chrome and a transparent status-icon background prevent failure from becoming a large visual alarm while preserving truthful state.

On mobile, the top-right profile control is avatar-only. When the text label is hidden, the control frame collapses to a compact square around the avatar instead of retaining desktop chip padding. This keeps the visible border proportional to the profile picture.


### 2026-10-08 — Part 28 Core theme restoration correction

Part 28's first simplification removed too much from Theme Library. The corrected durable split is:

- **Core**: the former working Custom presets are promoted into proper always-available Theme Library profiles. They keep the same four-colour palette behaviour and the same moving ambient-emblem atmosphere that made those presets work.
- **Unlockables**: progression-gated profile themes remain beside Core and keep their existing entitlement/Beta rules.
- **Custom**: remains the direct RGB/HSL editor plus compact main-site preview/legend. It no longer duplicates the Core presets as a second gallery.
- **Workspace palette card**: stays removed from Theme Library because it duplicates the Custom editor.

Legacy Core profile IDs remain readable for compatibility with saved accounts, but they are not the visible Core catalogue. This preserves old state without presenting the wrong static Core choices.


### 2026-10-08 — Cloud Update progress delivery retry

Real-device testing established that the owner-PC updater can continue successfully while the website progress UI appears stalled. The bridge used the latest locally observed marker as if it had been delivered; a failed cloud POST during the production restart therefore suppressed later retries of the same progress phase.

The durable model now distinguishes **observed locally** from **acknowledged by the cloud**. Running progress updates advance the bridge's acknowledged phase/percentage only after a successful cloud response. Terminal success/failure is retried across temporary website unavailability, and an already-observed terminal marker is never replaced by a synthetic timeout. The persistent pending journal remains the restart authority.

Control stylesheet/script revisions are cache-busted with the behaviour change. Terminal status glyphs have explicit animation/transform cancellation; only the running activity ring is permitted to rotate.


### 2026-10-08 — Custom theme HSL/contrast controls and logo selection isolation

The Custom theme editor keeps RGB as the canonical direct channel editor and adds HSL as a complementary editing model. Hue controls colour family, Saturation controls colour intensity and Lightness controls brightness/neutrality. Setting Saturation to zero produces greys; a Greyscale shortcut performs that exact operation without creating a separate fifth palette colour.

Custom also exposes live numeric contrast guidance for text/surface and workspace/panel relationships. Contrast values are informative only and never auto-correct a user's chosen colours.

The logo preset picker is visually independent from player identity colour and theme accent. Its selected state uses neutral border/surface tokens. Player colour remains restricted to initials/avatar fallback identity and must not own logo selection borders, platform chrome, navigation or theme state.

Theme Library remains **Core + Unlockables**. Core is the promoted former Custom preset set, using the Custom-style ambient background logic; Unlockables retain progression/Beta rules. Custom itself remains a slider editor rather than duplicating those presets.


### 2026-10-08 — Control available-operation highlight correction

An available Control operation must not look permanently selected, failed or alarmed. Operation cards keep their role-specific top edge/icon colour, but the card body uses a restrained neutral Control surface when enabled. Stronger role colour is reserved for the actual running indicator/status, not readiness alone.


### 2026-10-08 — 4.5.5 forced live delivery correction

A repeated real-device report showed that validated Part 28 source changes were still not visible after updating. Audit found a delivery mismatch: the repository continued to declare the product/PWA shell as **4.5.4** even though the accepted UI work and tests were already operating under the 4.5.5 contract.

Durable correction: Part 28 is cut as an actual **4.5.5** release. VERSION/package identity, service-worker cache namespace, manifest/icon URLs, browser favicon identity, main Control-navigation revision and Cloud Control CSS/JS revision move together. A final Part 28 stylesheet is imported last so legacy/mobile/player-accent rules cannot override the approved appearance-control behaviour.

This is a delivery/authority fix, not a geometry redesign. Canonical HGR H geometry is unchanged. Theme Library remains Core + Unlockables; Custom remains RGB + HSL + Greyscale + contrast guidance; player colour remains avatar/initials fallback only; Control update progress and terminal-state rules remain as previously approved.


### 2026-10-08 — Core preset atmosphere and logo-rim correction

Owner-device review clarified the intended Core model. The visible Core catalogue is the former working Custom preset set: Studio Graphite, Soft Light, Deep Blue, Forest, Crimson, Aubergine, Cyan Studio, Warm Amber, Slate Mint, Midnight Violet, Sand and High Contrast. These are promoted to proper Core profile IDs while preserving the original Custom atmosphere behaviour: generic ambient symbols move behind the platform and derive colour from each palette. Progression Unlockables remain separate.

Legacy Core profile IDs are retained only for saved-profile compatibility and are hidden from the visible Core group.

The yellow rim seen around a recoloured H was traced to two independent stale-gold sources: `--hgr-logo-border` did not move with custom/profile logo colour, and the pre-React boot curtain carried hard-coded gold border/glow values. The runtime logo rim now derives tonally from the active logo colour, the boot curtain border/glow derives from `--boot-accent`, and the branded intro glow follows `--hgr-brand`. Canonical H geometry and launcher artwork are unchanged.


### 2026-10-08 — Control Update 3% `@echo` bootstrap failure

Real-device Cloud Update failed immediately at 3% with `'@echo' is not recognized as an internal or external command`. The failure occurred before STEP 1/Git sync.

Root cause was a Windows execution-boundary interaction:
- the tracked `Update HGR GitHub.cmd` carried a UTF-8 BOM before `@echo off`;
- `control-update.ps1` invoked the batch file directly from Windows PowerShell while PowerShell owned `2>&1`;
- the batch parser's first-line stderr was therefore surfaced as a PowerShell error record, and `$ErrorActionPreference = "Stop"` terminated the bridge before the updater could reach Git.

Durable correction:
- the root updater is stored without a BOM and begins byte-for-byte with `@echo off`;
- Cloud Control resolves `cmd.exe` explicitly and runs the fixed batch launcher through `cmd.exe /d /s /c`;
- stdout/stderr merging occurs **inside cmd.exe**, so PowerShell receives ordinary updater text and the real batch exit code instead of converting native stderr into a terminating pipeline error;
- Control audit prefers the bounded failure reason written to `hgr-control-update-result.json`, avoiding PowerShell `throw`/CategoryInfo/FullyQualifiedErrorId noise on the phone.

Because the broken owner-PC wrapper cannot pull its own replacement before STEP 1, the owner must perform **one local bootstrap update/pull** after this fix lands. Subsequent website-triggered updates use the corrected path.


### 2026-10-10 — updater self-rebase snapshot

A local owner-PC update successfully fetched and rebased `origin/main`, then immediately printed `'errorlevel' is not recognized as an internal or external command` and fell into the rebase-failure branch even though Git had already reported success.

The fault was not Git state. `Update HGR GitHub.cmd` is itself tracked by Git and was being replaced while that same batch file was still executing. Windows CMD reads batch files incrementally, so changing the executing file can move/replace bytes underneath the interpreter and corrupt the next parsed command. In this case the following `if errorlevel 1` line was effectively read as a malformed `errorlevel` command.

Durable rule: the root updater now copies its current bytes to a unique TEMP snapshot before any Git work, records the actual HGR repository root in `HGR_PROJECT_ROOT`, and executes the update from that immutable snapshot. Git may then replace the tracked root updater safely during fetch/rebase. Every project-relative helper path uses `HGR_PROJECT_ROOT`, never the TEMP snapshot directory.

This also explains why simply retrying after the screenshot can work: the rebase had already completed, so the local checkout already contained the newer files. The snapshot rule prevents future updates from depending on that accidental recovery path.


### 2026-10-10 — updater safe re-push check

The updater now includes a **safe re-push check** after source validation/sync. Previously, a clean working tree could still be locally ahead of `origin/main` because of an already-existing local commit, yet STEP 4 could report “nothing needs committing” and proceed without uploading that commit.

STEP 7B now:
- fetches the latest remote branch;
- verifies `origin/main` is an ancestor of local `HEAD`;
- counts commits in `origin/main..HEAD`;
- pushes those validated ahead commits automatically when the count is non-zero;
- refuses to push if history diverged or GitHub changed in a way that needs another rebase;
- never uses `--force` or `-f`.

This is deliberately a **re-push**, not an unconditional push. Equal branches are a no-op; behind/divergent branches stop safely and instruct the owner to rerun the updater so STEP 1 can rebase first.


### 2026-10-10 — Control regression failure summary cleanup

A real Cloud Update progressed into the validation pipeline and then failed during regression testing. The underlying regression was a false positive: the new “never force-push” guard matched the updater's explanatory text `Do NOT use git push --force.` even though no force-push command existed.

The guard now matches only executable command lines that begin with `git push --force` or `git push -f`. Human-readable warnings may still mention those prohibited commands.

The same failure exposed a second presentation issue. Node's AssertionError serialised the tested batch file into escaped `\r\n` source text, and the Control failure parser selected embedded source strings such as `echo [STOPPED] Build failed` as if they were runtime failures. Control now prioritises one real `AssertionError`, then one anchored runtime `[STOPPED]`/`[ERROR]` line, then bounded diagnostics. Escaped source dumps and embedded `echo [STOPPED]` source lines are excluded.

This means a future regression failure should read like `AssertionError [ERR_ASSERTION]: <actual contract>` rather than dumping several unrelated STOPPED messages from the updater source.


### 2026-10-10 — Core and Custom use one background-symbol engine

The Core background requirement is architectural, not merely visual. Promoted Core palettes must not own a separate profile-atmosphere implementation that happens to look similar to Custom.

The runtime now resolves one explicit **Custom atmosphere engine**:
- Custom mode enters it directly.
- A visible promoted Core profile enters that same engine through `usesCustomAtmosphereEngine(...)`.
- Both receive symbols from the same `customAtmosphereSymbols()` generator.
- HomeScreen marks both with `data-atmosphere-engine="custom"` / `data-atmosphere-source="custom"`.
- The final animation/visibility CSS targets that shared engine marker, so Core cannot silently fall back to a static profile-background path.

Only the palette changes between promoted Core themes. The moving generic background emblems and their animation mechanism are the same system Custom uses. Reduced-motion preferences remain authoritative.


### 2026-10-10 — visible post-update launch + current-H raster delivery

Real-device acceptance found two delivery gaps after the updater itself completed.

First, the post-update client handoff could see any Edge process using the dedicated HGR profile and assume the HGR app window was already open. Background Edge/profile processes can survive without a visible app window, so a successful update could finish without launching anything. The handoff now treats HGR as already open only when a matching dedicated-profile Edge process has a non-zero `MainWindowHandle`. Start/Restart are invoked through `cmd.exe`, and the handoff waits for a visible HGR window. If no visible window appears, the update fails instead of silently claiming a successful client handoff.

Second, the canonical launcher-family H vector had been corrected after several committed raster consumers were last generated. The SVG/browser mark was current, but favicon/PWA/social-preview and desktop/package PNG/ICO copies could still contain the older H. Release CI now runs `scripts/generate-platform-icons.mjs` before release validation. It renders the main Halieus favicon, 180/192/512 PWA icons, social/share PNG, main Windows/package PNG/ICO copies and `HGR Main.png` from the canonical current-H main vector, then records source/output hashes in `client/public/identity-artwork.json`.

The identity cache revisions move to `install-h5` and `brand-h9` so browsers and installed-PWA discovery do not keep the prior raster family. Role-specific Start/Restart/Close/Update/PowerShell/OpenShard/Control artwork remains under its approved rendered-PNG authority and is not redrawn by the main identity generator.

## Part 29 — Windows canonical-H identity checkout correction (11 October 2026)

An owner-PC Update reached client prebuild and stopped before deployment: `copy-approved-pwa-icon.mjs` rejected the main H icon's source hash as stale. CI-generated assets on `main` were previously validated, but Windows Git checkout can convert SVG line endings because the prior `.gitattributes` did not explicitly pin `*.svg` to LF. A changed line ending is not a changed H geometry.

Protect against this source-identity false positive by pinning SVG checkout to LF and hashing only SVG identity **source text** with CRLF/CR normalised to LF in both the generator and validator. Keep exact byte hashes for PNG/ICO output. A genuinely edited SVG must still be rejected unless canonical main assets are deliberately regenerated and validated. Do not auto-redraw or overwrite Start, Restart, Close, Update, PowerShell, OpenShard or Control artwork as a side effect of Update.

The client prebuild now names the mismatched source so a real local override can be distinguished from a line-ending artefact. Source regression covers LF-vs-CRLF equivalence and genuine artwork-change rejection. Owner-PC rerun and visible installed-icon acceptance remain pending.

## Part 29 — rejected PWA logo update (12 October 2026)

Owner's Brave `Review logo update` screenshot shows the installed app's archived rectangular block H on the left and the retired play-cut H proposed on the right. **Neither is the approved current launcher-family H.** The current committed 192/512px install images and `HGR Main.png` were inspected: they use the canonical flared H without a play triangle. This is a delivery/cache/installed-shell acceptance failure, not permission to redraw the H.

Correction: advance the main HGR install identity URL revision from `install-h5` to `install-h6` across the manifest, first-paint HTML, identity guard, social previews and service-worker preload/notification paths. The main product's static server explicitly disables HTTP storage for manifest and icon identity files, leaving Control identity separate. The Oracle candidate gate compares built 192/512px PNG bytes with the signed source; the post-activation gate compares the exact 192/512px PNG bytes fetched from the live *Oracle loopback application* and rolls back if they disagree. Exact health/version checks remain in place. This does **not** prove the public-domain edge or OS-installed Chrome/Brave artwork; device acceptance is still required.

No canonical geometry, role-specific launcher PNG/ICO, theme, game UI or version number is changed. Do not approve a PWA logo change showing the retired play symbol. Preserve player/recovery state; do not recommend uninstalling the installed app as a first-line action.

## Part 29 — update no-op visibility correction (13 October 2026)

An owner report says Update produced no visible change. GitHub source verification alone does not establish that the owner PC deployed or refreshed the installed app. The local PC was offline to Desktop Commander during diagnosis, and public website health/manifest could not be fetched externally, so the precise workstation cause remains unverified.

Source audit found a genuine false-success branch in `Update HGR GitHub.cmd`: after GitHub sync and local validation, if no private website updater or local Oracle deploy helper existed, the command printed `HGR UPDATE COMPLETE` and proceeded with post-update launcher/client handoff **despite having skipped deployment**. This branch now fails explicitly and stops before any post-deploy handoff. Successful interactive updates keep their final summary visible until the owner dismisses it; noninteractive Cloud Control updates still exit automatically. The final summary reports a source fingerprint, not unverified live browser/install acceptance.

Acceptance: run Update on the actual Windows owner PC, retain the final console output, confirm Oracle deployment and its release fingerprint, then separately verify the actual live PWA icon and HGR window. A passing GitHub run is not a substitute for those checks.

Part 29 follow-up: the initial no-op visibility batch exposed a stale Part 17 regression that prohibited *any* pause after deployment. Its intent was to protect noninteractive updates from hanging, not to conceal the result of a manual owner run. That assertion now specifically requires the manual-only `HGR_UPDATE_NONINTERACTIVE` gate and prohibits the old false-success label.

## Part 29 — manual updater launch and shortcut handoff (13 October 2026)

Owner clarified that Update ran its console processes, closed, and visibly opened neither HGR Control nor the website. Deployment success was therefore not observable. Source audit located two independent behaviours: the generated `HGR - Update Site` shortcut targeted the ignored private `Update Halieus Website.cmd` deploy-only launcher instead of `Update HGR GitHub.cmd`; and the full updater preserved a stopped Control agent while trusting in-place release refresh for a pre-existing Edge window. Which shortcut the owner clicked on the previous run remains unconfirmed; both paths were insufficient for the requested **manual** update UX.

The generated Update Site shortcut now calls the tracked canonical all-in-one Update CMD, with actual shortcut-target assertions and a real isolated Windows launcher fixture check. The ignored private deployment helper remains available internally for STEP 9 but is not the normal owner-facing Update launcher. A successful manual Update restores/focuses the dedicated Edge HGR window without killing an active room and calls the canonical `Start HGR Control.cmd` entry point to open its private pairing card or renew expired pairing when needed. If Control cannot start, the result is PARTIAL instead of silently reporting total success. Remote Control-initiated updates still leave a previously stopped agent stopped and do not force foreground windows.

A safe local `%LOCALAPPDATA%\\Halieus Game Room\\last-update-result.txt` receipt now persists the outcome when the console closes. No secrets are written into the receipt. Due to the existing temporary updater snapshot, **one first bootstrap run from the tracked `Update HGR GitHub.cmd` file** is needed to refresh the old shortcut; thereafter the Update Site shortcut points to the canonical workflow. Owner-device proof remains pending. This patch does not touch branding geometry or launcher-art PNGs.

## Part 29 — Cloud Update 38% regression isolation and GitHub owner rename (13 October 2026)

The owner supplied the complete `hgr-control-update.out.log`. Git pull, release generation, TypeScript, and full production build completed; many regression checks passed. The run then stopped in `tests/runtime-control-update.ps1` with `Expected 2 lifecycle calls`. The following `tests/runtime-control-lifecycle.mjs` `1 !== 0` was its wrapper reporting the same failing PowerShell test. No Oracle STEP 9 deployment took place in that Cloud Update attempt.

Root cause: Cloud Update deliberately sets `HGR_CONTROL_DEFER_REFRESH=1` while the real Control agent owns the pending operation. The lifecycle fixture ran in a spawned PowerShell process inheriting that production flag; the *isolated fixture* therefore skipped its expected simulated stop/start. Production deferral itself is correct and must remain unchanged to avoid stranding Cloud Update during its own agent restart.

Corrective batch: launch the fixture with a clean environment free of Cloud Control lifecycle flags, and explicitly clear those flags at the start of the standalone fixture so direct invocation is also safe. Add an internal fixture-only test of the deferred branch: it must preserve its snapshot and make **zero** simulated lifecycle calls, then perform the verified two-call restart after the test clears the simulated deferral. CI now reruns the actual lifecycle regression with injected Cloud Update flags. No live Control lifecycle code, player state, H geometry or Oracle deploy machinery changes.

GitHub account owner was renamed from `Laijee27` to `elijahama`. Current canonical URL verified through GitHub API: `https://github.com/elijahama/halieus-game-room`. The owner's local `origin` still reported the old URL, which redirects; the updater migrates **only** this explicitly known old HGR origin to the new same-protocol URL, never force-pushes, and leaves all other remotes untouched. `package.json` repository metadata is synchronized. User-device cloud restart, Oracle deployment and public icon acceptance remain pending.

## Part 29 — 62% Cloud Update CMD re-push parsing and renamed origin (13 October 2026)

Owner screenshot: Cloud Update reached 62% but failed with `ahead was unexpected at this time` after Git fetch still displayed `Laijee27`. No Oracle deployment success can be inferred. STEP 7B contained a raw `commit(s) ahead` echo inside a parenthesized Windows CMD IF block. Parentheses in this context can terminate CMD block parsing. Removed the raw parenthetical from this echo, preserving remote ancestry checks, ahead count and strictly non-force push. Added `git remote get-url origin` immediately after the exact-match old-owner migration to make effective configured GitHub URL visible.

The original account URL `https://github.com/Laijee27/halieus-game-room` redirects to `https://github.com/elijahama/halieus-game-room`; no new repository was created. A dedicated `windows-latest` GitHub job now extracts and **executes the real CMD STEP 7B IF block** with ahead and zero-ahead mock counts, and tests the real origin rename block against a disposable local Git fixture. No real network, credentials or pushes are involved in these smoke tests.

Acceptance awaits owner-PC updated script reaching Oracle deployment and final Control handoff; a Cloud Update from a pre-pull script snapshot may still need a first fetch. No branding or player-state changes.

## Part 29 — Cloud Update 88% desktop-session false failure (13 October 2026)

Owner Control Cloud screenshot: operation stopped around 88% after deploy with `[STOPPED] Update/deploy completed, but the HGR client could not be refreshed/opened cleanly`. Owner independently confirmed HGR was actually open on their laptop. The defect was the updater executing `scripts/windows/post-update-client.ps1` during **noninteractive Cloud Update** and treating failure to enumerate a visible Edge app window in the updater's session as a *deployment failure*. A Windows background agent may not have access to the interactive user's desktop/window handles. The owner using an independently installed app on the phone does not require a Windows window to open on either device.

Decision: only a **manual owner-PC Update** calls the desktop launcher/window-visibility helper; it must still verify/restore a visible dedicated HGR window. A **Cloud Update** skips local Windows UI launching and verification entirely, after validated Oracle deployment. It then proceeds with launcher metadata refresh and the existing deferred Control restart handoff; the independent finalizer alone reports Cloud Update 100% after the Control service is restarted/verified. Do not skip the Oracle deployment integrity checks, release identity gates or the Control finalizer. Do not fake desktop visibility; the safe local update receipt writes `HGR_WINDOW=SKIPPED_BACKGROUND_ONLY` for Cloud and `HGR_WINDOW=VERIFIED` for successful manual update. Background Control state is `DEFERRED_TO_CLOUD_FINALIZER` until finalizer verification.

CI protects the decision with source regressions and a real Windows CMD smoke test extracting the actual client-handoff branch and testing both Cloud and manual modes with a disposable local stub helper. The cloud mode must not invoke the stub; manual mode must invoke `-ShowWindow`. Owner device acceptance awaits a successful 100% Cloud Update and refreshed Control bridge. No H geometry, icons, themes or game state are changed.

## Part 29 — restore mandatory Update and retire private Control launcher pair (13 October 2026)

Owner confirmed the laptop's owner launcher group showed PowerShell, OpenShard, Control, Start, Restart and Close, but **no Update**, and asked to replace the now-redundant Tailscale-oriented Control launcher with Update. Source audit found `scripts/windows/launcher-shortcuts.ps1` silently made creation/verification of the Update .lnk conditional on whether `Update HGR GitHub.cmd` existed at refresh time. This allows a superficially successful refresh with no essential updater link.

The owner-facing launcher set is now **six roles in each managed folder**: Start (green), Restart (amber), Close (red), Update (light blue), PowerShell (slate), OpenShard (purple). Rename the old ambiguous `HGR - Update Site.lnk` to obvious `HGR - Update.lnk`, targeting the existing full GitHub update CMD, and verify shortcut icon and target in the project `HGR Launchers` and Windows Start Menu. The generator **must fail before deleting prior shortcuts** if its canonical Update CMD is missing. It must never silently omit Update. The generated obsolete `HGR - Control`, `HGR - Stop Control`, and old Update Site links are retired, including loose copies in project/Start Menu roots. This is a launcher visibility change, not a destructive service migration.

IMPORTANT: The phone/tablet website Control still relies on an outbound owner-PC Control bridge, backed by a local Control Agent. The present agent startup also uses Tailscale Serve for legacy private pairing. **Do not delete the agent, disable the cloud bridge or uninstall Tailscale in this batch**, as doing so could break web Cloud Update. The approved blue Control icon stays in reference/PWA assets for the web Control product, but not the core laptop shortcuts. Internal Control start/stop CMD helpers remain available for recovery. A future fully Tailscale-independent background Control bootstrap is a separate audited migration that requires device-level proving.

Regression: the Windows isolated launcher fixture must create exactly 12 .lnk files (6 roles × 2 groups), verify the Update .lnk's canonical target and icon, reject a missing updater without erasing existing links, reject corrupted .lnk metadata, and verify retired Control shortcuts are absent. Owner-device shortcut refresh and the physical pinned/desktop copies remain to be confirmed after pull.

## Part 29 — Core and Custom themed background symbols: visible movement and browser acceptance (13 October 2026)

Owner has repeatedly reported that the themed background symbols are not working as requested. The earlier Part 28 source-only checks guaranteed that promoted Core and Custom pick the same atmosphere symbols and marker, but did not exercise rendered browser opacity or movement. Auditing the CSS cascade revealed desktop/touch rules that faded these glyphs to 0.052–0.09 opacity. The final CSS authority now sets shared Core/Custom glyph opacity to 0.17, preserves primary/secondary palette tint, runs the exact same 17-second float animation and honors reduced-motion. The generic Core/Custom symbol sequence remains independent of the selected game; System/Light/Dark continue to use the selected game's motif.

Important regression coverage: the new built-release Playwright test runs the actual app on desktop and mobile Chromium. It checks rendered glyph opacity, actual transform movement after 850 ms, identical symbols and animation between Custom, Studio Graphite, Cyan Studio and Soft Light, the game-owned atmosphere for Dark, and disabled animation when reduced-motion is requested. A stale Part 17 test was aligned to the equivalent expanded CSS animation declaration without weakening the runtime test. No branding assets, launcher artwork, server game rules or account state were changed. Device acceptance after website deployment is still pending.

## Part 30 — Complete Beta console/retro/arcade theme background coverage (14 October 2026)

Owner tested the unlockable console profiles in Beta/Test Lab and found no visible background-symbol differences. This was not solved by the earlier Part 29 Core/Custom fix. Two distinct code defects were audited: (1) `client/src/platform/theme.ts` mapped **17 console-related profiles** to the same `ATMOSPHERE_CONSOLE` glyph array, with two arcade profiles using shared arcade glyphs; (2) `hgr-4.5.5-part28-authority.css` raised glyph opacity/z-index/animation only for `data-atmosphere-engine="custom"`, while all non-Core unlockables render with `data-atmosphere-engine="profile"` and inherited old ~0.05–0.09 opacity and negative stacking.

Correction assigns each progression profile its own nine original Unicode ambient marks, inspired by its hardware era without copying proprietary platform logos or gameplay controls. Each theme continues using its existing palette. The final CSS extends proven Core/Custom rendering to the profile engine with matching specificity, animated 17s ambient float, visual layering and reduced-motion support. Base System/Light/Dark game glyphs remain unchanged. Theme requirement metadata is NOT changed: Beta remains an override through the existing `themeIsAvailable` gate and skips the account unlock API.

Verification adds a **real Chromium browser** test for every progression-gated profile on desktop and mobile: unique symbol signature, 9 glyphs, computed opacity >= 0.14, nonnegative layer stacking, running animation, and no game-symbol contamination. Representative console families also prove moving transform over time. The test opens the real Theme Library, enables Beta via the established event, clicks a normally locked console theme, and confirms that Apply preserves its correct background. Existing Core/Custom and reduced-motion tests are retained. GitHub CI and actual owner-device deployment remain separate acceptance criteria.

## Part 30 — Beta Test Lab theme persistence isolation (14 October 2026)

During the console atmosphere audit, a second Beta bug was found: `ThemeButton.applyPreview` called `commitTheme` even for Beta-unlocked profiles, and `commitTheme` always stored selection in normal `localStorage`. That leaks normally locked console cosmetics into the owner's permanent appearance. The prior contract explicitly requires Beta cosmetic selections to be session-only, with their unlock metadata untouched.

`themePreview.ts` now routes **all** Beta theme applications to `sessionStorage["halieus-beta-theme-selection"]` rather than the normal theme keys. `committedTheme()` returns a validated Beta session appearance only when Test Lab is active, falling back to normal saved appearance otherwise. App + ThemeButton initialise from the effective session appearance after page reload; exiting Test Lab or signing out removes the Beta selection and immediately redispatches the normal saved appearance. No gameplay rules, real account entitlements or permanent theme values change. A stale/incomplete Beta session JSON payload is rejected. The browser test must select and Apply a locked console theme through the real picker, assert that normal storage did not change, reload inside Beta to verify the preview persists, and reload outside Beta to verify normal Custom appearance returns.

## Part 30 — Correct actual theme wallpaper paint order, not merely computed opacity (15 October 2026)

**Owner-device reproduction:** Connected to Lagz using Remote Desktop Commander. The owner laptop's `main` matched GitHub (`3fa6a0e`), the public `/health` endpoint reported `hgr-4.5.5-f7d67b07ef543cc3`, and the last Cloud Update result recorded 100% success. A fresh, isolated Playwright browser loaded the public website's real hashed CSS and JS on desktop and mobile. It confirmed that all 12 curated Core palettes use the Custom symbols and all 19 progression profiles have distinct animated symbols. However, full-window screenshots showed **no visible ambient symbols** through the opaque home cards. Previous automated checks read glyph CSS opacity/animation only and therefore falsely passed.

**Root cause:** `client/src/styles/hgr-4.5.1.css` placed `.halieus-main` at stacking `z-index:2` above the fixed `.halieus-theme-atmosphere` layer at `z-index:0`. Most of the screen is opaque panels, so the moving glyphs were painted **behind** the interface. Increasing opacity to 0.17 in Part 29 did not change that. Browser diagnostics captured visible glyph bounding boxes behind `.halieus-main` and its child controls. These screenshots are temporary runtime audit artifacts and are not branding references.

**Scoped resolution:** For Core/Custom and Beta progression profile engines only, promote the noninteractive motif layer above the opaque page cards (`z-index:3`), force the promoted container **transparent and transition-free** and remove its large `::after` canvas gradient. Do not promote an opaque fullscreen background, darken the workspace or block click targets. Keep decorative spans at 20% opacity with palette colours and their existing 17-second movement. Shift two central symbols away from primary text/buttons and soften those positions on narrow mobile layouts. The standard System/Light/Dark game-owned atmosphere remains on its existing layering. No H geometry, icons, board art, game state, Control agents or unlock metadata were modified.

**Regression gate:** `tests/browser-theme-atmosphere.mjs` now asserts layer order, transparent background, absence of an opaque after-gradient, pointer-event pass-through and actual Chromium *screenshot pixel differences* when the glyphs are hidden, sampling pixels inside the content region on desktop and mobile. The test compares Custom, Soft Light Core and a Beta console theme, while retaining all previous engine parity, profile uniqueness, motion, reduced-motion and Beta session-preference tests. Part 17 and Part 29 source regressions enforce 20% motif opacity. Local owner-PC typecheck, full regression chain, production build and pixel-verification passed. Production redeployment and direct public-site re-test must be recorded separately; do not infer live success from source checks.
The screenshot-pixel decoder (`pngjs` v7) is a direct HGR development dependency, while QR generation keeps its existing nested `pngjs` v5 dependency; no runtime game feature uses the new test dependency.

## Part 29 — Mega Board mortgage, roster and liquidation viewport correction (18 October 2026)

The owner supplied five screenshots from five-player ERU38J showing mortgaged board properties fading to white/grey, owned holdings truncated after six pills, and a disproportionately zoomed-in debt liquidation/full management panel. Root causes were verified in client code: `hgr-game-surfaces-v45.css` overwrote the intended red mortgage tile with themed material and a desaturation filter; `PlayerRail.tsx` explicitly sliced the full owned list at six; desktop CSS used three tiny columns and hid overflow; `GameSidebar.tsx` rendered the debt controls outside its scrollable overlay body.

Repair is intentionally UI-only, no server-side property/debt rule changes. New last-loaded `client/src/styles/hgr-4.5.5-mega-board-portfolio.css` makes the entire mortgaged square unequivocally red with white ink; property-group strips remain for property identity. The rail maps **every** owned space, shows an owned-asset count, uses two readable columns and scrolls within the allotted player-card area; mortgaged chips have red status dots/fill. Debt resolution is now inside the popup's own scrollable body; it cannot stack as a duplicate above the full Property Manager. The liquidation shell is narrower, height-bounded on desktop/tablet/phone and the full manager offers `← Debt options` to return while debt is active. Do not change bank actions, mortgage legality or gameplay.

Targeted source assertions (`tests/regression-mega-board-portfolio.mjs`) protect these contracts; the new Chromium layout fixture (`tests/browser-mega-board-portfolio.mjs`) checks **computed** red/white mortgage paint despite legacy styles, 26 owned chips existing and scrollable, and containment plus scrollable debt options at desktop, tablet and mobile widths. Browser checks run in release CI after build. Live-site owner acceptance still required and a successful GitHub run is not an Oracle deployment.

### Mega Board follow-up — every online seat and stale Last roll (18 October 2026)

Owner supplied two further screenshots during the same UI batch. The split 3/2 Mega Board rails themselves still had a last-wins CSS rule making each side a fixed grid with one non-scrollable row per player and overflow hidden. The scoped layout authority now overrides this with a vertically scrollable, content-sized player-card rail, retaining independent scrolling for the complete property inventories. The header exposes both visible seats and the actual connected count across all non-bankrupt match participants, without claiming every registered website user is in the match.

GameBoard had labelled the globally persisted `gameState.lastDiceRoll` as `Last roll` after a turn had already advanced to a different player. It now only displays dice in the board centre when the most recent server `activityLog` roll belongs to the active player and the current round; it displays a waiting/jail prompt otherwise. During an active roll the existing overlay animation still handles the sequence. This is presentation-only and does not clear the authoritative lastDiceRoll or alter server turn order, doubles, speed-die or event logs.

## Part 29 — Obaseki Award (Mega Board; 18 October 2026)

Owner requested: “Obaseki Award — when someone collects over £200 with all utilities.” Decision: a **match award** under the existing Mega Board Results > Awards / Ranked match-bonus system, titled **Obaseki Award**, symbol 💡, awarded to **each player who receives a single utility-rent payment strictly greater than £200 while holding all three utilities (Gas, Electric, Water)**. Exactly £200 does not qualify and two smaller rent receipts totalling more than £200 do not qualify. The three-utility rate is 20× the white-dice total; totals of 11 or 12 naturally clear £200. The requirement does **not** include property/station rent, unpaid debt, rent collected before completing the utility set, or income while any utility is owned by another player. Awards already earned in a match are not rescinded if a utility is later traded. Server records the largest eligible single receipt in optional backward-compatible `PlayerMatchStats.peakUtilityRentWithAllUtilities` on payment, covering direct rent, deferred debt repayment and partial shared rent settlements. Older matches safely default to zero; no retroactive inference. `getMatchAwards` supports a strict threshold to grant this award to every qualifying player while preserving winner-takes-most existing awards. The award appears in result cards and reports; ranked bonus contribution is 7 points under the existing capped rating calculation. This is not an account-wide Gamer Score achievement. Unit regression verifies threshold 200/201 per receipt, exclusion of two smaller payments totalling over £200, both receipt paths, and other ownership/rent exclusions. Gameplay rent multipliers, ownership and payment rules remain unchanged.

### QA correction — Players drawer at ≤1180px (18 October 2026)

The first Chromium viewport test was invalid on tablets because it inspected `.player-rail-side`, which the app deliberately hides below 1181px. The responsive test now instantiates the actual `.tablet-players-drawer > .player-rail` structure for tablet/phone and the desktop split rail for desktop. It asserts seven match seats, 26 asset chips, scrollable inventories, red computed mortgage paint, and bounded debt controls at all three widths. A separately scoped drawer rule ensures an internal, height-bounded property inventory even on phones.

## Part 29 — Online directory search visibility (18 October 2026)

Owner Players page screenshot shows a stale `Sam` search while the `All` status filter is active, explaining why only Sam E appeared. Fix now makes `All` and `Online` clear the name search, shows `N of M shown · K online`, and exposes a clear-search button. Directory refresh is isolated from six other profile/social requests, and refreshes each 10 seconds and after foreground resume, so unrelated endpoint failures cannot freeze the roster. The existing privacy/visibility rules and presence timeout remain in force. Owner-device verification after deploy is pending.

## Part 30 — 19 October 2026 audited owner Update and default-browser window handoff

**Audit / source authority:** On 19 October the owner laptop Lagz was behind GitHub main (e9a2c0a versus 6460d8f). The earlier Part 29/30 Mega Board, Players, themed background and launcher source fixes were already merged and regression-protected; do not duplicate or rewrite those patches. The clean checkout was safely rebased through the canonical Update HGR GitHub.cmd.

**Validation and Oracle update:** The laptop passed client/server typecheck, production builds, full regression suite including real launcher-icon Windows tests, and Oracle package preflight. Oracle successfully activated HGR 4.5.5 release fingerprint `hgr-4.5.5-af4e7f5199899998`; local and public HTTPS /health showed an online server and matching release fingerprint. All six approved HGR launchers (Start, Restart, Close, Update, PowerShell, OpenShard) were regenerated and verified in project and Start Menu folders. The private Control shortcut remains retired, but the Control agent/service is preserved.

**Discovered manual-Update regression:** Despite a successful server deployment, the updater exited code 1 during its final Windows handoff. Lagz has no Edge installation; Start Halieus Game Room.cmd correctly fell back to the default Brave browser, where an HGR-titled live window was visible. However, scripts/windows/post-update-client.ps1 recognized ONLY a profile-matched Edge process and falsely claimed that no HGR window had opened. The generic last-update receipt was left RUNNING rather than claiming a false full success.

**Scoped repair:** Centralize verified app-window detection in Get-HgrVisibleAppProcess, keeping the original dedicated Edge-profile route first. If Edge is unavailable, recognize only visible HGR-titled Brave/Chrome processes whose command line contains an approved HGR website URL (halieus.remotewire.net or play.halieus.net). Foreground the verified process; never treat an invisible renderer, arbitrary browser tab or background process as an accepted handoff. Preserve Start-only/no-deploy and Control security semantics. Extend tests/regression-brand-theme-launcher-coherence.mjs to protect detection, URL/title checks and activation. Real Lagz handoff test and targeted regression passed.

**Acceptance boundary:** The initial server deployment and laptop code sync were verified; the initial end-to-end updater was PARTIAL because of final client handoff. Repeat the complete updater after the focused correction is committed; separately confirm owner-facing visual behaviour on desktop, tablet and phone. Source/CI tests are not owner visual acceptance.

## Part 30.2 - Unbounded website typography pilot (19 October 2026)

**Owner intent:** The website's default Inter/Segoe typography feels generic. Trial the PSR-approved **Unbounded** typeface on HGR's website before resuming Mega Board tournament design. This is a reversible, typography-only visual pilot; do not change the approved HGR H/logo, icons, theme imagery, layout structure, gameplay, access permissions, or tournament state.

**Implementation contract:** Bundle OFL-1.1 licensed `@fontsource-variable/unbounded` as a direct **client runtime dependency** (v5.3.0) and import its variable `wght.css` locally in `client/src/main.tsx` rather than relying on an external Google Fonts URL. Load a final dedicated `hgr-4.5.5-unbounded.css` override after existing HGR styles. It changes the generic website/controls' font family to `Unbounded Variable` with Windows/system fallbacks, and mildly tightens control letter spacing. Preserve specialist mono fonts, tiny Mega Board space labels, property deed text, numeric/symbol glyphs and themed atmosphere font declarations. Preserve the existing responsive structure; revisit only proven overflow in browser testing.

**Scope / rollback:** This is a first visual comparison, not a redesign of the UI or a permanent decree that Unbounded is the only font forever. To roll back, remove the last style import and variable font import, then remove the font dependency when no longer referenced. `tests/regression-unbounded-font.mjs` safeguards the source contract. Complete desktop, tablet, mobile and local production font-load checks before publishing. The PSR Master Book/Docs font standard remains separate from the HGR runtime app and is not modified.

**Tournament handoff:** Return to the documented Chapter 40 Mega Board tournament plan only after verifying the typography-only deployment. Neither bracket engine nor temporary/timed account/guild permission grants are implemented by this font patch.

## Part 30.3 — 4.5.5a Beta typography comparison (19 October 2026)

**Owner priority / order:** Tournament implementation is ON HOLD while real website layout, small-device legibility, inactive cosmetic themes, Control fullscreen, update progress and account-access communications are improved. Target for finished tournament mode: December 2026, conditional on independent acceptance gates. Track small UI fixes under lettered patch identifiers (4.5.5a, 4.5.5b, 4.5.5c...) rather than claiming unrelated changes as one monolithic patch; do not presume these labels are a deployed semantic version until the VERSION/release pipeline supports them.

**Font preference authority:** Drive's 'Font Collection • Approved & Liked — Reader Edition', dated 19 Oct, distinguishes active PSR approval from liked optional families. HGR Beta trial specifically compares the five owner-liked website candidates: Unbounded, Righteous, Alata, Fredoka and Varela Round. Righteous is a display font but is included as a deliberately experimental website preview, not approved permanent body typography. These Google Fonts OFL-1.1 family packages are bundled as @fontsource dependencies, locally hosted in client assets; no Microsoft Aptos binary is redistributed. This change does not change the canonical H shape, icon colours, symbols or board geometry.

**Beta-only preview:** Admin/Owner Test Lab includes five labeled, directly selectable font previews, showing actual site-wide text styles in the session, while keeping specialist Mega Board property and deed microtext intact. Beta choice uses sessionStorage, not permanent cosmetic preferences/account settings. Leaving Beta or signing out immediately restores normal typography; reloading a still-active Beta tab restores the selected preview. Normal accounts keep Unbounded for now. Reduce the baseline Unbounded root font 16px → 15px, and to 14px for widths up to 360px; check explicit pixel-sized controls as individual follow-up refinements rather than shrinking hit targets or using global CSS zoom.

**Validation:** Client TypeScript and production build passed; five locally hosted families were loaded via actual Chromium network font requests and computed font-family tests at 320, 360, 390, 820 and 1440px. No global horizontal overflow in the test fixture; specialist Mega Board microtext retained its narrow font. Source regression checks assert Beta eligibility/session isolation and the complete package/font catalog. Owner still needs a signed-in 320px phone visual comparison before selecting one final default.

**Outstanding separate mini-patches (NOT fixed by 4.5.5a):** 4.5.5b replace faux spinning PNG/update-card with thin dismissible progress/completion news ribbon; do not keep movement after complete, and support reduced motion. 4.5.5c verify actual applied Mega Board/poker table style changes in a real game, with platform theme ambient accents across games, including tasteful PS2 face-button colour accents within Emotional Midnight without adopting copyrighted artwork or replacing approved H. 4.5.5d preserve fullscreen when entering Control from fullscreen website; eliminate overlarge 'waiting to roll' flavour text and tighten narrow-phone navigation. Distinguish source tests from owner acceptance.

**Later access groundwork, separate from tournament:** Account grants with finite access durations 1 day, 5 days, 7 days, 1 month, 2 months or 3 months; after expiry keep account ID, history, guild records, stats and achievements without deleting them. Server-authoritative expiry must invalidate active permissions and sockets; a renewed grant recovers the same account record. Use a top-edge narrow, independently dismissible news ticker displaying remaining access and updates; X hides presentation only, not account expiry enforcement or release process. No timed-access backend, countdown access ribbon or tournament engine is deployed in this font batch.

## Part 30.4 — 4.5.5b update news ribbon (19 October 2026)

**Owner direction:** Replace the crude fixed notification/spinning icon in update/restart flow with a thin news-ticker ribbon across the very top of HGR. The banner should have an explicit X, not a dropdown; no spinning after completion; reduced-motion honoured. Keep a shared presentation vocabulary for future countdown-to-expiry notices (the latter are a separate account-grant backend project).

**Scoped code:** PlatformMaintenanceBanner.tsx retains server maintenance socket handling, release fingerprint polling, cache-busted replacement navigation, manual Refresh fallback, countdown and reconnection. Only markup/presentation changed: top-of-window status ribbon, explicit scheduled / restarting / complete UI states, compact status label, long-message marquee, countdown/status text and X dismissal. Dismissal stores notice ID in component state but never cancels background update or release navigation; a new notice ID may appear again. No rotating glyph, PNG spinner, or uncontrolled success-state animation. In CSS, use a flat top border treatment, safe-area padding, narrow 320px layout, reduced-motion override, a subtle active dot pulse and text scrolling only for long in-progress messages; completed and refresh-required states remain still.

**Verification:** Client TypeScript and production build succeeded. Targeted new browser regression verified no horizontal overflow, ribbon anchored to window top and no animation in reduced-motion mode at widths 320, 360, 390, 820 and 1440px. Source regression verifies release navigation/poll preservation, dismissibility and spinner removal. Change is presentational only; beta fonts from 4.5.5a remain untouched. No temporary-account access API or account-expiry ticker is provided by 4.5.5b.

**Open before owner acceptance:** Confirm how the banner feels during one real end-to-end HGR Update and on Brave-installed PWA/iPad, especially whether it obstructs any top-right controls during a live game. Do not claim temporary access expiry or Control fullscreen is fixed by this update.

**4.5.5b CI recovery correction:** The first release-identity workflow blocked this patch because existing tests correctly require live-game recovery-key/room-code advice during maintenance. Preserve that advice in the same compact scrolling ticker as part of the update text, and expose the full text via aria-label/title even when clipped visually on 320px phones. No restored large dropdown card, no resurrected rotating spinner, and no changes to server restart/release-navigation logic. Existing regression-control-agent.mjs and new regression-update-ribbon.mjs both verify this. The failed candidate must not be deployed; only the passing corrected revision may be released.

## Part 30.5 - 4.5.5c role-based typography (19 October 2026)

**Owner assessment (HGR, not a change to PSR's documentation design):** Unbounded remains a strong display face for bold headings/subheadings but was too broad and large when used everywhere. Righteous is liked for mid-sized text, some short emphasis and labels. Alata is especially good for small, dense reading. Varela Round is a **very strong general UI and in-game text candidate** (including Mega Board); it was initially hard to find but was subsequently verified in the live font preview and positively evaluated by the owner. Do **not** use it as the main oversized home headline. Fredoka is rejected as an HGR recommendation; keep the existing optional Test Lab comparison for traceability only. No replacement canonical H geometry or icon geometry is permitted.

**Scope of patch 4.5.5c:** A new, last-imported `client/src/styles/hgr-4.5.5c-type-hierarchy.css` implements the selected **Balanced HGR** roles for ordinary website sessions: Unbounded variable for h1/h2/hero, Righteous for medium h3/h4 emphasis, Varela Round for general site UI and gameplay instructions, Alata for compact small/eyebrow information. The existing licensed, self-hosted Google Fonts packages are reused; no additional binary font redistributions and no network Google Fonts dependency. Narrow-phone home and catalogue headline sizes are reduced, the old two-line clipping limit is removed, and Mega Board turn narration uses readable compact Varela. Tiny property-square labels, deeds, dice, and approved HGR identity remain on specialist fonts.

**Test Lab:** Add a sixth `Balanced HGR` option as the first/default Beta typography preview, preserving all five single-font comparisons. Beta choice remains session-local and role-gated; exit Beta restores the default mixed treatment. Normal players see the balanced baseline (this is an owner-directed candidate rollout, not permanent sign-off). Source and Chromium tests must check mixed computed families, all five narrow/wide viewport sizes, hero full text, unchanged small board labels, real locally served font files and single-font override, including a 320px phone.

**Audit boundaries:** This typography patch does not resolve table-skin appearance, cross-game ambient theme tinting, Control fullscreen handoff, temporary accounts, account-expiry ribbon backend, or tournaments. Those are separately tracked and must not be presented as completed. Rollback by removing only the last CSS import and restoring Beta selection fallback/option without editing the approved H artwork, existing theme variables, gameplay, or 4.5.5b update ribbon. Record GitHub commit, passing test evidence, deployment fingerprint and owner-device acceptance separately after validation.

## Part 30.6 — 4.5.5d: retire HGR Control Tailscale client (19 October 2026)

**Owner instruction:** The private Tailscale-backed Control client is obsolete because current Control is accessible at https://halieus.remotewire.net/control/. Do not remove the authenticated local Control Agent, outbound Cloud bridge, signed website Control artwork, working updater or six canonical owner launchers. Unrelated legacy game-host Funnel (:3000) and private Oracle administration are separate concerns.

**Root cause:** scripts/windows/start-control.ps1 still required Tailscale CLI, MagicDNS and a private Serve route on :8443 before it would start the agent that Cloud Control independently uses on loopback. A valid Cloud website did not remove this hidden startup dependency.

**Scoped 4.5.5d fix:** New Tailscale-free background bootstrap keeps a 256-bit rotating bearer token, 127.0.0.1:43127 only, PID ownership checks, authenticated /api/ping and schema-2 lifecycle state pointing to /control/ with httpsPort=0. The canonical Start HGR Control launcher starts local agent and outbound Cloud bridge; old Mobile launchers are Cloud-only compatibility aliases. Stop revokes the local credential; it retires Serve :8443 only for an old schema-1 lifecycle record, never for new Cloud-only state. The guarded Windows updater continues to snapshot/restart the owned agent, verify token rotation and preserve the Cloud bridge without passing a legacy private port. The old tailnet QR client is historical, no longer a live route.

**Actual owner PC migration:** A verified legacy agent was stopped with no active operation; old Control Serve route was deactivated. A new schema-2 local-only agent was started, listened exclusively on 127.0.0.1:43127, returned an authenticated /api/status, and used a rotated token. The outbound Cloud bridge PID/process identity was preserved, and the public /control/ page returned HTTP 200. Tailscale Serve status showed only the unrelated legacy game-host Funnel, not private Control :8443. The Tailscale Windows application was not uninstalled globally. Source contract, agent/PWA/launcher, updater recovery and the entire HGR regression suite passed.

**Boundaries:** This owner-PC migration is already active. GitHub commit/source release and owner phone/tablet UI operation checks are separate evidence. The 4.5.5c mixed-font beta patch remains an independent uncommitted candidate. Tournament and timed account grants are not touched. See docs/HGR_CONTROL_TAILSCALE_RETIREMENT.md for detailed operational record.

## Part 30.7 — 4.5.5e Daily Word anti-farming and Ayo audit escalation (19 October 2026)

**Exploit (owner-confirmed):** A player can complete the fixed five-letter Daily Word puzzle, learn the answer, start further daily rooms and immediately answer correctly to farm high scores, wins and achievement counters. Previous Daily leaderboard code already deduplicated the earliest finalized day, but **general progression and personal stats counted multiple completed Word Game archives**, so a cosmetic leaderboard deduplication was not enough. Some record matching also trusted typed player names, permitting impersonation of an account in the daily summary without authenticated session provenance.

**Server-side fix candidate 4.5.5e:** New durable atomic daily-attempt ledger under the existing *durable account data root*, keyed by authenticated account ID hash and UTC puzzle date. First **valid** submitted guess reserves the attempt with an exclusive `wx` create; a reconnect to the original room may continue, but other rooms/devices on the same account/day cannot claim another scored attempt. Unreadable/corrupt storage fails closed. Guests and Beta sessions remain playable **but unranked**; signing in after starting a guest room does not retroactively turn it into a ranked attempt. A daily match is forcibly one round, irrespective of client-supplied target score. Same-room Play Again and extra-round requests are blocked, and the daily Results page no longer advertises Play Again. Failed input validation cannot consume the attempt. When the UTC day turns over, a fresh account/day key is eligible; a legitimately claimed puzzle already in progress may finish its previous day.

**Authoritative scoring:** `server/src/platform/progression.ts` now ignores all Word Game Practice archives and duplicates of the same UTC Daily Puzzle for that account (including old archives), and requires server-captured account identity plus a successful daily claim on all new daily records. `server/src/platform/accounts.ts` applies the same claim/account-id policy and day deduplication to Daily leaderboards and general personal played/win stats, preserving older legacy archive history only in its historical format. A fake typed display name is never authoritative for newly recorded daily results. This is retrospective at **calculation/rebuild time**; it does not delete old match archives or account data.

**Automated tests:** `tests/runtime-daily-word-ledger-4.5.5e.mjs` checks same-account/day exclusivity, reconnect idempotence, independent accounts, next-day rollover and corrupt ledger fail-closed behaviour. `tests/runtime-daily-word-fair-play-4.5.5e.mjs` starts a real isolated HGR server with authenticated sockets and temporary owner account, tests guest name spoof rejection, invalid-guess no-claim, parallel daily rooms, forced target score 1, solved Daily and second-room rejection, blocked same-room replay/next-round, Practice remains playable, all three scoring surfaces, synthetic duplicate/practice archive rebuild and persisted claim after server restart. The owner’s real server/account data is not modified by tests. The release workflow runs the integration test **after the production build**; the cheap claim test is in the ordinary regression chain.

**Important remaining corner case:** Once a first valid guess reserves the account's daily attempt, a full server restart or loss of an unrecoverable room does not currently resurrect Word Game rooms from the working archive, so the account may be unable to finish that day's puzzle; the ledger intentionally prevents a second scored attempt. Proper in-flight Word Game room rehydration is a separate resilience improvement, not something to silently bypass the fairness gate.

**Status discipline:** Source patch and isolated tests may be complete before CI and Oracle deployment; do not state the exploit is fixed on the public website until the deployed release fingerprint and real runtime behaviour are verified. Preserve uncommitted 4.5.5c mixed-font work in a different patch. Tournament mode remains ON HOLD.

**ASTERISK / HIGH PRIORITY — AYO (also verbally reported as 'Io'):** On 19 October 2026 the owner reported Ayo as **extremely buggy and broken**, with a screenshot in the project conversation. Exact mechanics/root causes are not yet verified, so do NOT mislabel this as just mobile optimization or assert an untested fix. Separate GitHub issue [#112](https://github.com/elijahama/halieus-game-room/issues/112) tracks a full server-authoritative game rules, seed/capture/turn, reconnect, mobile touch layout and deterministic playtest audit. This is **P1**, to be investigated in its own small batch following the scoring hotfix. No Ayo source code is changed by 4.5.5e.

## Part 30.7 — 4.5.5f Control mobile terminal-operation panel (19 October 2026)

**Evidence:** Owner supplied a Chrome screenshot at narrow-phone dimensions: Operations action cards were covered by an expanded persistent Update card. A rejected Git safety gate displayed a long multi-line reason in the headline and still misleadingly showed 1% progress even though Update never started. Source gate in server/src/control-agent.ts rightly rejects tracked edits; do not disable or weaken it, and do not discard outstanding 4.5.5c font work.

**4.5.5f scope:** In client/public/control/control.js, retain the existing live operation receiver, details, Cloud audit, full failure reason, and progress data. On phones, when a new operation reaches succeeded/failed/rejected state, automatically present it as a small draggable/minimizable chip above fixed bottom navigation. On a single tap the chip opens expanded details with the entire reason and operation ID; when expanded, the details are bounded to a short internally-scrollable area. Completed/failed/rejected glyphs remain still. A rejected, never-started Update now shows a dash instead of false 1% and a short header 'Not started · tap for reason'. Rejected status remains non-destructive and dismissible; failed running updates still show truthful last progress. This transition does not change the saved user layout preference, modify Cloud operation execution, or hide a running job. The real reason remains fully accessible inside expanded diagnostic details. Only control.css/control.js/index.html query-identity and browser regression are touched.

**QA:** Chromium control fixture exercises simulated running/succeeded/failed/rejected transitions, progress numbers, action availability, mobile bottom-nav non-overlap, one-tap diagnostics, no rejected 1% and dismissal at narrow phone, tablet, short desktop and desktop viewports. Font/canonical icon art, Tailscale-free Control agent, updater source protection, player games and tournament mode are untouched.

**Batching/deployment:** This is an independent Control UI correction after the locally committed 4.5.5c typography pass. Keep separate source commit and release evidence. The owner-device screenshot is evidence of the previous bug, not proof that the repaired live site is accepted. Do not label Control update live until a confirmed release fingerprint/HTTP health check is recorded.

## Part 30.8 — 4.5.5g cross-platform release identity portability (19 October 2026)

**Blocker after 4.5.5c/f CI:** GitHub's Linux release-identity job passed and committed a fingerprint, but Lagz's clean Windows checkout calculated a different hash from the same Git source. Thus remote Update or Oracle packaging could see a mismatched manifest despite a clean Git tree. This is not a reason to disable Control's tracked-change safety check.

**Audited root cause:** All 503 tracked release-identity paths existed. Owner-PC worktree bytes differed from committed Git blobs for 37 files, **every difference was line-ending-only**. These comprised CMD launchers, PowerShell PS1 helpers and workflow YAML. No source logic or protected binary artwork differed. Previously the release algorithm hashed raw disk bytes, making Windows and Linux fingerprints platform-dependent.

**Scoped change:** In scripts/release-integrity.mjs only explicit UTF-8 text families are normalized from CRLF to LF *for hashing*. Windows CMD/PowerShell scripts stay CRLF on disk and run unchanged. PNG, ICO, font and other binary assets remain byte-exact. Both --write and --verify compute the same canonical hash. Source-path hashing, actual changed-file rejection, and VERSION authority remain intact. tests/regression-release-identity.mjs checks LF/CRLF fixture equivalence for the owner Control starter, desktop launcher and CI workflow, plus byte-exact PNG corruption rejection and prior consumer corruption tests.

**Release acceptance:** Publish 4.5.5g independently after typography 4.5.5c and mobile Control 4.5.5f. Rebuild source and repeat targeted plus full regression checks. Wait for Linux CI fingerprint generation, verify the identical fingerprint on Windows without rewriting tracked artifacts, then deploy Oracle and verify production Control assets/health. Do not claim deploy before those steps. The archived stash of previous Windows-generated release metadata remains until the fingerprint is reconciled. Ayo remains a high-priority separate rules/turn-flow audit; tournament remains on hold.

## Part 30.9 — 4.5.5h Friends, 4.5.5i Emotion Midnight, 4.5.5j achievement lettering — owner-reviewed mini-patches (19 October 2026)

**Scope and owner requirements.** Replace public-facing Players with a privacy-first Friends list: only accepted friends and shared-guild peers. Add friends by exact @username, request acceptance required. The ordinary account directory must enforce social visibility on the server, not just via frontend filters. Preserve global ranked/verified scoring, but protect direct individual stats from unrelated profile enumeration. Add an authenticated Owner/Admin-only full-player diagnostic in Beta tools. Keep guild relationships separately reversible: unfriending does not remove someone's guild membership. Keep canonical HGR launcher artwork unchanged.

**4.5.5h implementation:** Persist relationship requests in the existing accounts.json account store (backward-compatible empty friendRequests), with pending/accepted/declined, case-insensitive exact @handle lookup, anti-self and duplicate guards, basic request rate limits, recipient-only acceptance, and accepted friendship removal. GET /accounts/directory now filters to accepted friends + CURRENT shared-guild membership for all roles, including owner. GET /admin/directory is authenticated separately and requires owner/admin. GET /accounts/players/:accountId/stats is scoped to self/friend/shared guild peers, with hidden profiles remaining protected. Existing ranked/gamer-score leaderboard computations retain explicitly global scope. Friends UI replaces general Players navigation, has add-by-handle, pending and received requests, acceptance and decline, and live member-status filtering. Owner/Admin Test Lab has an explicitly labelled full-directory utility. The new UI is compact at narrow portrait widths.

**Privacy acceptance:** On an isolated real socket/server and temporary account/guild stores, tests exercised four accounts, empty starting directory, unauthorized admin-directory 403, exact-handle-only requests, unknown handles, sender/recipient role restrictions, duplicate/replay rejection, visibility only AFTER acceptance, persistence in the account store, removal, current shared-guild visibility and stats profile denial for strangers. Test: tests/runtime-friends-guild-4.5.5h.mjs. Existing Players presence and old controlled-account tests adjusted to match the new privacy rule.

**4.5.5i theme micro-patch:** Profile id is ps2-midnight, display name 'Emotion Midnight'. The glyphs were already the profile's approved △, ○, ×, □, repeated, plus ✦: NO new design geometry needed. A final narrowly scoped CSS layer restores muted green triangle, rose circle, blue cross, violet square, neutral ninth sparkle, keeping ambient opacity and pointer-events:none, preserving all other themes and motion-reduction rules. Test: tests/browser-emotion-midnight-4.5.5i.mjs at 320, 390, 820 and 1440px verifies computed colours and non-interactive glyphs. It is the subtle PS2 face-button accent treatment, NOT a PlayStation logo.

**4.5.5j achievement text owner feedback:** Owner dislikes the current 'Gamer Score' label and the adjacent next-milestone 'Getting Settled' heading with its explanation. The fix is a SCOPED font/scale refinement to the AchievementBar, not a global rejection of Righteous. Use compact Alata for Gamer Score label and the small '3 / 5 • Complete 5 verified matches • +20 GS' supporting line, restrained Varela Round for the milestone title; mirror those font roles inside expanded achievement details. Keep the numeric score prominent. At portrait widths <=380px, tighten padding and individual text sizes, not full-site zoom. Single-face Beta font previews must remain real single-face trials and are exempt. Test: tests/browser-achievement-type-4.5.5j.mjs verified computed families, no bar overflow and Beta switching at 320, 360, 390, 430, 820, 1440px.

**Typography inventory (current 4.5.5c baseline):** Unbounded Variable = high-level h1/h2 headings; Righteous = middle h3/h4; Varela Round = buttons/navigation/body/game narration; Alata = small UI, game descriptions, metadata; tiny Mega Board board-space/deed labels remain specialist Segoe UI. Other liked font families on the owner Font Collection Reader reference are Comfortaa, Alfa Slab One, Changa One; Fjalla One was liked in a heading trial, Nunito is historical, Fredoka was rejected for this website. Do not equate 'optional liked' with 'site-wide approved'. Separate typography comparison page to test all samples, not blanket-insert fonts into game code.

**Portrait rule proposed for dedicated future audit:** Audit modern 2022+ phone geometry 320/360/375/390/412/430 CSS px with representative ~667–932px heights. Scale text, spacing, card dimensions and game panels proportionately. Preserve touch target sizes, full safe-area insets, fixed bottom nav, scroll containment, live board surfaces, text wrapping, accessibility zoom and reduced-motion. Avoid whole-app CSS zoom or shrinking functional buttons below usable sizes. Verify each game independently; this proposal is not evidence all game portraits are fixed.

**Release and acceptance:** h/i/j are small independent local patches with build + fixture tests. Until source CI, signed release identity and Oracle deployment are explicitly verified, do not label live. Owner visual review is needed. Ayo full gameplay P1 audit remains separate. Tournament development remains on hold.

**4.5.5h follow-up label audit:** The desktop navigation and Players page were already renamed Friends, but the separate five-item phone bottom navigation still said Players, and Guilds had a return link labelled Players. Align both with Friends; keep internal view route identifier 'players' stable to avoid breaking navigation. The home section's empty friends/peers text must also match the relationship-filtered directory, not imply the whole network is offline. Local runtime feedback-directory data must be ignored in .gitignore (server/data/feedback/) rather than exposed or deleted. This only corrects remaining labels and private runtime source protection, not game visibility or relationship rules.

## Part 30.10 — HGR 4.5.5l Choose Your Game: Tiles / List (20 October 2026)

**Owner requirement:** The Choose Your Game catalogue needs an explicit Tiles / List toggle. It must work on modern portrait phones as well as tablet/desktop, without losing any playable games, their category organisation, existing canonical game icons, statuses, or room-creation actions. This is a display preference, not a new game mode.

**4.5.5l implementation:** A visible, accessible two-button Tiles/List segmented switch sits beside the Games heading. Both buttons expose `aria-pressed`; state changes the `data-game-layout` attribute on the catalogue page. The same `GAME_GROUPS` / `GAMES` data and identical `openCreate(game.id)` handler render in both modes, preserving all game-specific room setup and reconnect functionality. The default is Tiles; the per-device choice is saved under `halieus-game-library-layout-v1` and restored after navigation/reload, with safe fallback when browser storage is unavailable. Categories and noninteractive Coming Next roadmap are unaffected.

**Layout behaviour:** On desktop Tiles retain the approved multi-column catalogue. Portrait Tiles use two compact columns with fitted artwork, readable titles/subtitles, status badges and the same Create room affordance (no sideways shelf). List uses one full-width, reduced-height horizontal row per game on all widths; its icon, title/subtitle, status and Create room indication remain visible. The style is scoped to `.view-games[data-game-layout]`, so Home, Guilds, rankings, themes and active game boards are not restyled. Both options respect fixed navigation, 44px touch targets, reduced-motion settings and the original approved HGR launcher-family H.

**Tests:** The client typecheck and production build passed. Browser layout checks at 320, 360, 390, 430, 820 and 1440 CSS pixels verified two-column Tiles, one-column List, no page overflow, unchanged game actions/categories and working click states. A stronger Playwright run exercised the actual HGR application with an isolated signed-in owner session, all 14 active games in 3 categories, Tiles ↔ List changes, persistence after a full reload, intact Create Room dialog and List absence of horizontal scrolling at all six widths. New regression tests: `tests/regression-game-library-toggle-4.5.5l.mjs`, `tests/browser-game-library-4.5.5l.mjs`; npm scripts register them. This is separate from the 4.5.5k Friends navigation/feedback ignore cleanup.

**Release discipline:** Tested local source is not evidence of public deployment. Before declaring live, publish audited commits after existing h/i/j and k work, run release identity/CI, and confirm Oracle's public release fingerprint and owner-device portrait behaviour. No tournament changes; Ayo P1 rules audit and broader portrait/game optimizations remain separate.

## Part 30.10 — 4.5.5l Game library Tiles/List toggle (20 October 2026)

**Owner decision:** Under the Choose Your Game heading, allow players to switch the game catalogue between Tiles and List. This is a presentation preference, not a progression perk or Beta-only setting.

**Implementation:** HomeScreen maintains a single authoritative GameLibraryLayout ("tiles" | "list") and stores it under the versioned device-local key "halieus-game-library-layout-v1" in localStorage, with safe in-session fallback if storage is blocked. Tiles is the default for first-time visitors. A two-option, labelled and keyboard-focusable switch shows aria-pressed and visually indicates the current selection. The layout is expressed by data-game-layout on the Games section; only a scoped, last-loaded hgr-4.5.5l-library-view.css changes presentation. The existing fourteen game entries, category order, approved branded game icons, Beta badges and openCreate(game.id) room creation action are identical in both views. The in-development roadmap is not made clickable. Other screens, board themes, canonical launcher H geometry and Gamer Score logic remain unchanged.

**Responsive treatment:** On phones <=720 CSS px, Tiles uses a compact two-column card grid instead of horizontal carousel shelves, improving discovery in portrait without global zoom; List is one full-width, vertically stacked row per game, with compact art, title, subtitle, Beta/Available status and the same Create Room action. Desktop and tablet also provide Tiles and full-width List. Button hit areas are >=42 CSS px and card rows are >=78 CSS px, with extra narrow-phone handling <=350 px and reduced-motion inheritance.

**Test / audit:** A real Playwright browser against a fully isolated HGR server and a temporary owner account verifies default Tiles, visual switch, category integrity (three), preservation of all 14 games, no list horizontal overflow, true row flow, setting persistence through reload, reverting to Tiles, and opening the same room-creation modal in both modes at 320, 360, 390, 430, 820 and 1440 CSS px. Source contract test tests/regression-game-library-toggle-4.5.5l.mjs checks a single source-of-truth state and existing game action. Browser test tests/browser-game-library-4.5.5l.mjs. Do not claim live deployment from local QA.

**Batch isolation:** Following preceding 4.5.5h/i/j source commits, 4.5.5k covers Friends/mobile navigation naming and ignoring private runtime feedback data. 4.5.5l exclusively covers this game-library toggle. Release, GitHub source push, Oracle activation, fingerprints and owner phone validation must be recorded separately. Ayo P1 gameplay audit and full-site portrait reflow remain separate unfinished items. Tournament implementation remains on hold.

## Part 30.11 — 4.5.5m: Lagz online, Control Agent disconnected, and 98% finalizer regression (20 October 2026)

**Owner evidence:** A phone screenshot of Control's HGR network showed HGR Cloud online and Public Game Room online, but the Owner PC row said 'Agent offline' and the old Update badge said failed at 98%. The owner correctly clarified that the physical PC was NOT offline. A direct authorized Remote Desktop Commander session verified Lagz online, latest HGR public health online, and an outbound Cloud bridge process alive. However, `server/data/runtime/hgr-control-mobile-state.json` and `.hgr-control-token` were missing and no authenticated Control Agent was listening on `127.0.0.1:43127`. The old update marker was conclusively terminal: `state=failed`, `progress=98`, `phase=Update finalization failed` (19 Oct 2026). The website was not actively updating.

**Root cause reproduced:** `scripts/windows/refresh-control-after-update.ps1` invoked the genuine `stop-control.ps1`, which performs successful native PowerShell cmdlets without necessarily invoking a native executable or setting `$LASTEXITCODE`. The caller then executed `if ($LASTEXITCODE -ne 0) throw`. In a new PowerShell finalizer process, `$LASTEXITCODE` can remain `$null`; **`$null -ne 0` is true**, so the handoff falsely reported failure immediately after gracefully stopping the agent, *before calling the start helper*. The finalizer wrote a failed marker at 98% and left the bridge alive with no local Control Agent. The issue was independently reproduced in an isolated PowerShell command, not guessed from the screenshot.

**Immediate recovery on Lagz (performed):** Before recovery, verified the previous operation had terminal state failed and no owner update was running, with no listener or lifecycle state. Ran the canonical local-only `scripts/windows/start-control.ps1`, generating a fresh credential and schema-2 lifecycle record. Verified actual listener `127.0.0.1:43127` owned by the recorded PID and authenticated `GET /api/status` returning `ok=true`, `activeOperation=false`. Preserved the existing outbound Cloud bridge process and website. No Tailscale client was reintroduced, no game/server restart occurred, and no archived update result was rewritten as succeeded.

**4.5.5m source fix:** In the post-update PowerShell refresh helper, capture and verify PowerShell's `$?` script-invocation success flag immediately after each `& $stopHelper` and `& $startHelper` invocation, instead of testing potentially absent/stale `$LASTEXITCODE`. Apply the same check to the outbound Cloud helper. Continue to require a new lifecycle file, rotated credential and matching loopback listener before completion can be reported. The isolated `tests/runtime-control-update.ps1` fixture now explicitly models *PowerShell-only successful scripts that do not touch `$LASTEXITCODE`* and presets `$LASTEXITCODE=$null` before its finalizer handoff, so this failure cannot silently return. The existing actual Control agent auth/lifecycle and Cloud Update tests remain active.

**Truthful Control UI status:** The website's device.online and localControlOnline fields describe the **Cloud bridge heartbeat** and **local Control Agent**, not the actual power state of the Windows PC. The owner row now distinguishes `Bridge disconnected` from `Control disconnected`, and explicitly avoids `Owner PC must be online` copy. The Update button remains disabled until BOTH links and admin approval are valid. A cache-busted Control JS asset query triggers refreshed deployed UI. A Playwright browser test covers connected, agent-disconnected and bridge-disconnected transitions and the existing mobile operations panel at 320/390/820/1280/1440px.

**Release honesty:** Local runtime recovery is active immediately, regardless of website UI deployment. The 4.5.5m code and wording are initially local source changes. HGR local main already contains 4.5.5h/i/j/k/l social/theme/type/library commits ahead of GitHub plus generated release files, so do NOT run Cloud Update against a dirty tree or silently deploy all those unrelated changes merely to change status wording. Stage source, publish after independent validation and explicitly verify CI, Oracle fingerprint and owner-device acceptance before calling 4.5.5m live. The old failed 98% history remains truthful and dismissible.

## Part 30.12 — 4.5.5n Cloud Oracle credential preflight / 88% timeout (20 October 2026)

**Owner evidence:** On portrait Chrome at approximately 03:05 London local time, Operations showed Cloud Update ready and a completed failed update at **88%**, with phase "Update status timed out" and reason "The cloud bridge stopped receiving a final result from the approved owner-PC updater." This was a distinct new attempt from the earlier 98% finalizer bug. It had begun on 20 October at 01:04:58 UTC and failed at the bridge timeout around 01:49:58 UTC. Public /health was still online on hgr-4.5.5-d1bb4a17b3bb4dea; the new source had not deployed.

**Audited execution trail:** Windows hgr-control-update.out.log records source, typecheck, build, regressions and GitHub repush passing; the 4.5.5m commit was actually pushed to GitHub. Release manifest hgr-4.5.5-3e91aa423b2dd835 verified locally. Update stopped printing output immediately after STEP 9 entered the *owner website updater* and printed "Checking Windows OpenSSH/ssh-agent and likely Oracle key locations..." at 88%. The owner config at %LOCALAPPDATA%/Halieus Game Room/owner-update.json *exists* and points to an accessible OpenSSH/PEM private key, but the legacy ignored owner-only update-website.ps1 implementation enumerates all of .ssh, Downloads, Desktop, Documents and several project ancestor directories inside Get-PrivateKeyCandidates before testing **any** candidate, even the saved one. That unbounded synchronous discovery is a plausible cause of the stall; it was not separately profiled while hung. The authenticated Control Agent, outbound bridge and public game server stayed online. The local updater marker could remain stale at running/88 after the separate cloud operation timed out.

**Tracked fix, independent Batch 4.5.5n:** Owner-private update-website.ps1 is intentionally hidden and ignored by GitHub and was NOT modified or published. Instead tracked Update HGR GitHub.cmd now explicitly detects HGR_UPDATE_NONINTERACTIVE=1 and routes the Cloud STEP 9 to scripts/windows/cloud-oracle-deploy.ps1 using the canonical tracked and just-refreshed dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1 helper. The fixed Cloud helper requires BOTH HGR_UPDATE_NONINTERACTIVE=1 and HGR_CONTROL_DEFER_REFRESH=1; it uses only HALIEUS_ORACLE_KEY or the owner-provided saved JSON KeyPath and verifies the private-key file header without printing it. No recursive file search, file picker, owner credential copying or arbitrary remote command route. If the owner key is missing/invalid, the cloud update fails promptly with instructions to configure it using the interactive/manual website updater. The existing interactive manual updater is unchanged. The cloud helper uses the normal trusted Oracle deployer's server fingerprint, package and health checks.

**Regression:** tests/runtime-cloud-oracle-4.5.5n.ps1 builds a fully isolated local fixture with a synthetic NONFUNCTIONAL SSH-key-shaped file, a fake deployment helper, and an isolated LOCALAPPDATA config. It checks saved-key forwarding, successful fixture execution, no key-path logging, refusal on nonexistent key, and rejection of non-cloud invocation. No real owner keys and no network calls. tests/regression-cloud-oracle-4.5.5n.mjs asserts CMD cloud-before-private routing, preserved manual route, tracked-helper-only execution, absence of file picker and brute-force enumeration; Windows CI additionally executes the isolated PowerShell fixture. Registered in npm test:regression. Real Oracle release activation is a separate unverified step, not claimed by the unit test.

## Part 30.13 — 4.5.5o expanded phone operations status no longer overlays buttons

**Owner evidence:** On the same 20 October Chrome screenshot, the terminal 88% update card was expanded across the two lower Operations action tiles and immediately above fixed bottom navigation. The prior 4.5.5f terminal-chip fix kept the collapsed state compact, but tapping it switched back to an expanded fixed-position overlay, which still obscured the owner's controls.

**Scoped 4.5.5o fix:** Keep the collapsed status as a compact, draggable global chip when switching between Home, Live, Games, Stats and Ops. When it is expanded on mobile (<=720 CSS px), dynamically move only the same status component to ordinary document flow immediately AFTER .operation-grid inside the Operations panel; if needed navigate to the Ops tab and scroll to its report. The expanded report uses position:relative, 100% available width, no fixed overlay, and bounded internally scrolling details. Switching away minimizes the report back to its global chip; a new terminal event also auto-minimizes on mobile. The same operation identity, original reason, exact percent (failed 88 stays 88), honest history and dismiss action remain accessible. Desktop presentation and status polling remain unchanged. No game UI, branding geometry or client theme style is affected. Both control.js and control.css use 4.5.5o cache-busted URLs.

**QA:** Existing tests/browser-control-polish.mjs simulates running, success, failed 88%, rejected, mobile minimized/reexpanded, reloaded and navigation transitions. It now explicitly asserts CSS position relative on the expanded phone report, Operations-panel parent, and a report top edge BELOW the action-card grid; independent Control source-contract and 320px browser checks pass. Additional 390px/tablet/desktop and full regressions should be run before publication.

**Shipping state:** n/o initially exist only in the developer source on Lagz, ahead of the last publicly serving hgr-4.5.5-d1bb4a17b3bb4dea. The old cloud failure must NOT be relabelled successful. No new remote Update should be triggered until the source is committed, protected release metadata reconciled, CI passes and the owner chooses to deploy/verify. Continue small audited release batches; Ayo and broader portrait-game audit remain separate, tournaments paused.

## Part 30.12 — 4.5.5p social-list refinement (20 October 2026) — OWNER PROVISIONAL REVIEW

**Owner feedback, not a final information-architecture decision:** Friendships must remain separate from guild membership. The owner wanted a meaningful browseable list under Friends, with a way to access Guilds, not a Friends tab that merely redirects to Guilds. They considered broader grouped navigation and tournament placement aloud but explicitly did NOT approve any tournament integration or navigation rearrangement. Preserve independent Friends and Guilds pages, full mobile bottom-nav, guild functions and the exact-@handle friend request/acceptance flow.

**Small scoped UI batch:** The existing /accounts/directory is already server-filtered to accepted friends OR current shared-guild peers. Previously these mixed together on one generic Friends grid, suggesting guild membership implied friendship. The Friends page now has a two-choice, accessible pressed-button switch: 'Friends' (default, accepted friendship IDs only) and 'Guild contacts' (other people returned through shared guild membership, excluding accepted friends). Both are compact vertical player lists with the existing profile, status and invite actions, scoped search and online/in-game/offline filters. The existing separate 'Guilds →' page link and sidebar/mobile Guilds navigation remain. When switching groups, clear the search/status filter to avoid accidentally showing a misleading empty result. Accepted friends who also share a guild are listed in Friends only, not double-counted. The UI explicitly explains that a guild contact is not a friend by default.

**Consistency/error handling:** Social friendship status now loads independently of statistics, live-room and invitation requests, so failure of one unrelated endpoint cannot silently misclassify accepted friends as guild contacts. Until friend status is confirmed, show a loading state rather than guessing the relationship. On transient refresh errors, retain previously confirmed categories and display a small refresh warning. Reset the previous account's roster and friendship state on account change. Backend friendship/guild/privacy contracts and data storage are unchanged; no new automatic friend acceptance, profile exposure, or guild linkage was created.

**Portrait/touch constraints:** New last-imported stylesheet client/src/styles/hgr-4.5.5p-social-lists.css scopes all styling under the Friends page; it uses compact full-width list rows, 44px-minimum two-segment controls, balanced width at 320–430 CSS px, readable captions and no whole-site zoom. Approved canonical HGR branding, font hierarchy, ambient glyph themes, player colours and active games are untouched.

**QA evidence:** tests/regression-social-lists-4.5.5p.mjs covers the actual React source grouping, fetch independence and explicit Guilds navigation, alongside the pre-existing server privacy and friend acceptance checks. tests/browser-social-lists-4.5.5p.mjs exercises computed CSS, no horizontal overflow, usable switch heights and full-width rows at 320, 360, 375, 390, 412, 430, 820 and 1440px; all passed. Existing Friends navigation and real isolated-server guild/friend privacy tests passed, and client TypeScript and production build succeeded. These browser specimens validate styling; owner acceptance of the actual authenticated page is still pending.

**Release boundary:** Candidate is LOCAL SOURCE ONLY pending separate release/CI/deployment validation and owner sign-off. Do not automatically publish solely because the owner was brainstorming. Tournament mode remains expressly on hold. Do not mistake the group toggle for changing the user's real guild permissions or friend list backend logic.

## Part 30.13 — 4.5.5q: private feedback excluded from release identity and Oracle ZIP (20 October 2026)

**Blocker discovered during authorised 4.5.5p publication:** HGR 4.5.5p passed the entire local suite and GitHub CI, and the release bot generated Linux fingerprint hgr-4.5.5-9b25262871f94bae (508 inputs). Lagz's verified identical Git tree calculated hgr-4.5.5-4265e64a22816555 (509 inputs). A path-by-path comparison of the Linux release manifest against Lagz's locally regenerated manifest found exactly ONE extra Windows release input: server/data/feedback/feedback.json, a PRIVATE LOCAL PLAYER-FEEDBACK RUNTIME FILE. Its contents were never disclosed or copied to GitHub. It was ignored by Git but accidentally included by the release-integrity scanner because the entire server/data/feedback directory wasn't excluded. The Oracle Windows packager uses the integrity manifest as a whitelist for server/data, so accidental inclusion was also a potential player-feedback data leak. DEPLOYMENT WAS HELD.

**4.5.5q scoped correction:** Explicitly exclude server/data/feedback (whole directory) from scripts/release-integrity.mjs, alongside existing legacy feedback.json/feedback.ndjson paths. Add an independent fail-closed exclusion in the canonical tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1 packaging loop for server/data/feedback files, regardless of any mistaken future release manifest. The working dev-tools mirrored helper must remain identical to the canonical source. New release regression fixture creates a synthetic private-feedback sentinel and confirms that it is absent from the manifest, never changes the hash, and that the protected branding/artwork still fails release integrity on corruption. Test the actual -PackageOnly Oracle ZIP locally and verify no feedback records are included.

**Guardrails:** Preserve the actual private feedback store untouched on Lagz and Oracle; do not read, print, upload, delete, or add it to Git. Keep server runtime game/sessions/guilds private; release payload should only contain intended shipped source/static assets. No user-facing Friends, games, fonts, glyphs, Tailscale-free Control or launchers are changed by this release privacy fix. Release after standalone tests and full regression/production build; publish as a separate 4.5.5q commit and wait for Linux CI-generated release identity to agree with clean Windows before Oracle activation. Mark 4.5.5p live only after confirmed public /health fingerprint and actual Friends assets match. Tournament mode remains on hold.

## Part 30.13 — HGR 4.5.5r: game-request and room-invite notification dropdown (20 October 2026)

**Owner request:** A game invitation sent within HGR should generate a small drop-down notification in the app/PWA, showing the sender and game with Accept/Join, Decline, Later, and Inbox. Players should not have to manually open the Inbox to learn a friend/guild contact invited them. User also requests PWA notifications when there are messages or invitations; true closed-app Web Push requires a separate server-side delivery design.

**Existing baseline audited:** HGR already implements authenticated game requests, active-room invitations, recipient-only response/dismiss endpoints, a persistent game/guild Inbox, player-profile request/invite actions, ten-second lobby social polling and an opt-in notification permission control. The current service worker handles generic push events and notification clicks, but no verified device subscription/VAPID-based delivery pipeline exists. Thus it was incorrect to infer a reliable notification when the PWA is fully closed merely from the service worker.

**Scoped 4.5.5r frontend candidate:** Added a distinct, top-of-screen safe-area-aware GameInviteDropdown with Accept, Join room, Decline, Later, and Inbox controls. A shared eligibility selector checks pending/unexpired recipient-owned game requests and unexpired active-room invitations, newest first. A game request Accept/Decline reuses the existing recipient-authorized server response, including the generated room code on acceptance. A room invitation Join opens the existing live-room join dialog using the exact game and code, still subject to server room/seat checks; Decline calls the recipient-only dismiss route. Later only closes the transient alert, leaving the invitation in the Inbox. Account/channel-isolated, bounded seen-ID caches prevent ten-second polling spam. The first foreground alert covers the newest unseen item, while all invites remain durable and actionable in the Inbox. The dialog is hidden while existing room/create/Inbox modal overlays are open. The in-app notification does not require or request OS notification permission.

**Reliability and PWA-open path:** Two invitation APIs now refresh independently of the statistics, presence, quick-play and guild-invitation calls, so peripheral errors no longer prevent invitation delivery. Existing ten-second poll cadence remains unchanged. With explicit Notification permission and an open/backgrounded page, a single deduplicated system notification can show a game request or active-room invite. Notification click deep-links into the authenticated HGR Inbox via /?inbox=1. No claim of push while the PWA/browser is fully terminated, no claim that separate chat-message notifications or in-game HUD notifications exist yet.

**Design constraints:** Reuse approved game icon assets rather than drawing H geometry or modifying any launcher art. Use the approved Balanced HGR font roles; minimum 44px action buttons, bounded panel scroll, safe-area placement below the fixed phone header, no bottom-nav obstruction and reduced-motion handling. Keep social friend/guild membership independence, server authorization, game rules, Gamer Score, tournament mode and Tailscale-free Control unchanged.

**QA:** unit test tests/runtime-game-invite-notifications-4.5.5r.mjs passed for recipient status, expiry, sorting and dedup; browser test tests/browser-game-invite-dropdown-4.5.5r.mjs passed for actual React actions (Accept/Join/Decline/Later/Inbox) at 320/360/390/430/820/1440px. tests/regression-game-invite-dropdown-4.5.5r.mjs passed and is integrated into the HGR regression suite. The full HGR suite, release fingerprint, GitHub CI, Oracle deployment and owner PWA acceptance must be recorded separately before declaring the feature live. For full architectural boundaries see docs/HGR_GAME_INVITE_NOTIFICATIONS.md.

## Part 30.13 — 4.5.5s/t notification mini-batches — 20 October 2026

Owner requests: keep all notifications and messages within downloaded HGR PWA; let players invite friends/guild members to HGR games inside the website/PWA, producing a top dropdown with Accept/Decline. Implement mini batches, preserving fixes and publisher receipts.

Prior 4.5.5r game-invite dropdown is already in source and published to GitHub. It polls HGR's existing recipient-only game request and room invite endpoints; foreground top dropdown offers Accept, Decline, Later, Inbox and uses canonical game artwork. No new tournament mode.

Batch 4.5.5s adds authenticated guild-message-notification feed, filtered by current guild membership, joinedAt and age (max 14 days/60 messages), excluding own/system messages. Existing HGR Inbox now includes unread guild chats and friend requests, with appropriate in-app action buttons. Background independent 10-second polling cannot be blocked by unrelated game stats. In-app chat dropdown can open the correct guild and remains separate from incoming game-invite dropdown. Unread state persists account-scoped in local storage. Chat contents never become a public directory. Source tests plus isolated real-account sender/member/stranger privacy test pass; browser layout check pending final pass.

Batch 4.5.5t adds genuine Web Push infrastructure (not page polling sold as background delivery): durable private VAPID signing key, authenticated per-device topic subscriptions, opt-in/out button, trusted HTTPS browser push endpoint validation, account switch rebinding, max five devices/account, removal of expired endpoints, and server events for game/room/friend/guild invitations and new guild messages. Push notifications disclose no private chat text on the lock screen and click through to HGR's authenticated Inbox or a specific guild. Devices with active push subscriptions avoid double browser notifications. Real-account subscription safety tests pass including 401/400 checks, SSRF blocking, private-key non-disclosure and opt-out. Actual OS delivery when the app is closed requires live deployment, explicit permission and device verification; no false success claim.

Detailed durable design and QA gates: docs/HGR_PWA_NOTIFICATIONS.md. Keep branding/launcher H unchanged; Ayo bug and full portrait optimization separate; tournaments on hold. Local work must be committed and cross-platform release-tested before declaring live.

## Part 30.14 — 4.5.5u Vite 7.3.7 audit-gate security maintenance — 20 October 2026

**CI security gate blocked 4.5.5s/t publication to Oracle, as intended:** GitHub HGR release-identity Linux CI run 39510952320 passed workspace installation, canonical identity generation, typecheck, full HGR regressions, and Windows deferred-Control update tests, but failed the enforced `npm audit --audit-level=high` step. This is NOT evidence notification feature tests failed. Diagnosed exact advisory through a local audit (one high risk in **Vite 7.3.6**, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, Windows editor shell handling). Npm reports 7.3.7 as nonbreaking patched version.

**Scoped remedy:** Update the exact pinned `client/package.json` Vite dependency from 7.3.6 to **7.3.7** and refresh the shared lockfile. No relaxation of CI npm audit, no modifications to icon geometry, typography roles, Control launcher or games. Local `npm ls vite` confirms both client/Vite plugin deduped 7.3.7 and `npm audit --audit-level=high` reports zero vulnerabilities. Run full regression, build and browser checks; publish this as 4.5.5u separate from S/T; only deploy Oracle after GitHub CI green, and verify exact fingerprint live. Preserve production data and durable notification private credentials.

The requirement to validate actual closed PWA push delivery on the user's phone after explicit opt-in remains a separate acceptance gate. No tournament changes.

**Part 31.1 local validation — 21 October 2026:** Repaired two active regression expectations (`tests/regression-3.6.8b.mjs` package and lockfile pin, plus `tests/regression-3.6.8c.mjs` package pin) to require patched Vite 7.3.7 rather than the vulnerable 7.3.6. Historical copies under `tests/tests/` and `tests/client/` were not rewritten. On Lagz, `npm audit --audit-level=high` reported **0 vulnerabilities**, `npm run typecheck` passed, the complete `npm run test:regression` chain passed, production `npm run build` passed, and browser tests for 4.5.5p Friends/Guild contacts, 4.5.5r invitation dropdown, and 4.5.5s guild-message notices passed across their scripted device widths. Regenerate and verify release identity after this Masterbook entry. These are LOCAL checks only; no GitHub CI rerun, Oracle deployment or real closed-PWA push delivery is claimed. Preserve staged/unstaged working changes and avoid pushing or triggering Cloud Update from a dirty repository.

## Part 31.4 — 4.5.5v: browser push-provider failure recovery (22 October 2026)

**Owner acceptance evidence:** The live HGR PWA's **Enable PWA alerts** control displayed the raw browser exception `Registration failed - push service error`. The source flow reaches `registration.pushManager.subscribe(...)` *before* HGR POSTs a subscription to the account backend. Thus a push-provider registration exception must not be mislabelled as successful HGR subscription, server dispatch failure or a granted device enrollment. Neither device brand nor OS was established by the screenshot.

**Root-cause boundary:** This specific Chromium error can occur when the browser's external push messaging service is unavailable; Brave desktop has a documented opt-in **Use Google services for push messaging** option at `brave://settings/privacy`, which has resolved this exact exception for other Brave users. It is a plausible device-side cause, NOT verified as this owner's setting or proof that HGR server is broken. Enabling third-party push remains the owner's privacy choice. Ordinary on-page invitation dropdowns and Inbox notifications do not depend on a successful OS push subscription.

**Scoped HGR response:** Change only `client/src/platform/components/NotificationPermissionButton.tsx`: map exact provider-registration exceptions to an accurate, readable error, offer Brave desktop recovery steps and general browser/OS/network guidance for phone/other browsers, retain an explicit retry button and preserve clear disabled/enabled status. Do not auto-change browser settings, accept fake subscriptions, bypass browser permission, log provider secrets or modify guild/game auth or canonical H artwork. Existing registration and account-scoped server checks remain authoritative.

**QA:** New real React/Playwright harness `tests/browser-push-enrollment-4.5.5v.mjs` simulates a push-provider rejection and then a successful explicit retry at 360px and 820px. It verifies the failure shows recovery, does not POST a missing browser subscription to HGR, leaves Enable usable, does not cause horizontal overflow, and submits once on the successful retry. The test is included in Linux release CI's built-release browser stage. Source/typecheck, full regressions, build, release fingerprint, CI, production and **real device delivery** are separate gates; do not mark a real PWA push delivery success until reproduced on an actual supported device after owner opt-in. Issue #114 tracks device acceptance; issue #113 tracks the separate unresolved invite-origin hostname.

## Part 31.5 — 4.5.5w: Add guild members as friends (22 October 2026)

**Owner requirement:** Guild peers who are not already accepted friends must have a direct, visible **+ Add friend** control within **Guilds → Members**. Friends and guilds remain separate relationships; no forced/automatic friendship.

**Implementation:** The existing authenticated `GET /accounts/friends` friend IDs and pending requests are polled independently by `GuildsPanel`, not inferred from guild membership or directory visibility. The guild member row offers **+ Add friend** only when the authenticated viewer is neither the member nor already friends and no pending request exists. The control submits the member's exact verified `@username` to the existing rate-limited, account-authorized `POST /accounts/friends/requests` endpoint; the recipient must accept. Success is reflected immediately as **Pending**, with automatic 10-second friend-state refresh. Already accepted peers show **Friends**; outgoing requests show **Pending**; incoming requests show **Review request** and navigate to the actual Friends request list, clearing a previously selected player profile. Unknown/unavailable friend state disables the button rather than guessing. All membership, rank, guild moderation, friend privacy, sign-in requirements, sender anti-spam and Inbox notification contracts are unchanged.

**UI:** Reuse the existing `PlayerIdentityCard` trailing slot and HGR theme tokens; keep role management/removal separate. Direct friend buttons have 44px minimum tap targets; small-screen member row trailing controls wrap without clipping. No new brand artwork or H geometry.

**QA:** `tests/browser-guild-add-friend-4.5.5w.mjs` mounts the real React GuildsPanel with mocked authenticated social endpoints at 320px, 390px and 820px. Covers own account exclusion, accepted-friend protection, incoming/outgoing pending separation, exact member handle POST once, immediate Pending state and 44px/no-clipping action. Wired into Linux release browser checks. Full regression and build plus release CI, deployment fingerprint and real account acceptance remain separate gates. The unrelated Brave push-registration issue remains tracked under issue #114 and must not be conflated with this guild UX update.

## Part 31 — 4.5.5x: Mega Board spectator vertical priority (22 October 2026)

**Owner visual requirement:** In live Mega Board spectator mode, the **Spectating** state must be obvious above gameplay, the board must occupy the first main content position, and the complete roster must be directly visible **below** it instead of disappearing into desktop side rails or a mobile drawer. This also covers viewers whose player seat is bankrupt and therefore read-only. The participant experience must not change.

**Implementation:** `client/src/App.tsx` adds `mega-spectator-mode` and `mega-spectator-layout` only when `viewerIsSpectator` is true. It renders a status banner immediately above the game area and one authoritative `PlayerRail` with all nonbankrupt active players followed by the existing bankrupt/room spectator section. On spectators only, remove duplicate split side rails and the drawer trigger. Keep the board, read-only mode, player-details inspection, game menu, room chat and existing trade/action panel plumbing. No gameplay event/permission, account, guild, theme or branded artwork contract changes.

**Containment:** The existing desktop Mega Board CSS gives the board a size-contained parent whose automatic row can collapse and lift the square board behind the header/roster. The spectator-only override in `client/src/index.css` uses a one-column, scrollable, intrinsic square board frame followed by a compact responsive roster. It preserves square board dimensions, scroll access to property chips, safe-area spacing and screen-reader labels. The earlier active-player desktop grid and mobile drawer rules stay intact.

**QA:** New `tests/browser-mega-spectator-layout-4.5.5x.mjs` loads the actual full CSS and asserts bar-above-board-above-roster, five player cards, visible first player without overlap, square canvas and no horizontal overflow at 360x780, 390x844, 820x900 and 1536x900. Browser test also checks the actual App spectator-only branch and active-player preservation. It caught and corrected a real legacy desktop containment conflict. The new test is wired to Linux release CI. CI validation, production deployment, and actual owner spectator device acceptance must each be recorded separately. Other Part 31 asks (PWA alert dismissal, font match to Control, Control phone/tablet fullscreen and Guild contacts action) remain distinct, pending scoped follow-up work; they are not completed by this spectator layout batch.

## Part 31.6 — Owner PowerShell learning record and ChatGPT Remote Desktop background task (22–23 October 2026)

**Teaching goal:** In parallel with HGR development, teach PowerShell using the owner's preferred **algebra → program condition → evaluated output** sequence, not rote syntax. Learning progress, exercises, false starts and exact technical rules are recorded in `docs/HGR_POWERSHELL_CODING_LESSON.md`. Explain symbols before exercises; offer a natural lesson stopping point while HGR development continues.

**Owner laptop automation:** The ChatGPT-connected `@wonderwhy-er/desktop-commander@0.3.1 remote` agent is **not** RustDesk or HGR Control. Lagz has a manual Windows Start/Desktop shortcut and a user-logon Task Scheduler entry `ChatGPT Remote Desktop (Lagz)`. The script under `%LOCALAPPDATA%\ChatGPT Remote Desktop\Start-Desktop-Commander-Background.ps1` checks existing Node.js Desktop Commander processes and supervises/retries with a 30-second delay. Tested the script's PowerShell parse, `-CheckOnly`, task registration and **Running** state, and observed the background log while preserving an existing connector process. **Not yet tested after an actual Windows restart/logon**; process presence is not equivalent to remote service connectivity. Owner laptop must be on, signed in, awake and online for ChatGPT agent; the Oracle-hosted HGR website itself stays independent. No credentials, launch H-artwork or Oracle deployment changes.

**Logic learning checkpoint:** `¬(x<6 ∨ x>10)` transforms through De Morgan's law to `x≥6 ∧ x≤10`. Within `S={2,4,6,8,10,12}`, the answer is `{6,8,10}`; `x≠6 ∧ x≠10` is **not** a valid transformation because it would incorrectly exclude the boundary elements. Follow up with inequality negation and the second De Morgan law before moving to actual supervisor conditions.

**QA and publishing:** Documentation-only addition to the HGR project. No shipped website feature, no Oracle deployment or HGR release verification is claimed by this entry.

## Private remote OpenShard integration and instruction journal (25 October 2026)

The owner has created a private **HGR OpenShard Bridge 0.2.0** ChatGPT workflow, using an existing authenticated Remote Desktop Commander device connection, not a new public Control command endpoint. The initial read-only capability check confirmed OpenShard 0.4.7 on the owner PC; available `mcp serve` is read-only local stdio, while `run` is the separate execution path requiring explicit scoped user intent and approvals. The private plugin's creation does not install it or guarantee access to the owner's PC in later chats.

The owner PC now has an invocation-scoped, Git-ignored bridge journal at `.openshard/bridge/prompt-journal.jsonl`. A successful prompt journal append records instruction provenance **but does not** create an OpenShard native execution receipt or automatically capture uninvoked ChatGPT messages. Native receipts require supported execution/capture and separate verification. The plugin can be implicitly selected on applicable HGR requests; coverage remains best-effort and requires the owner PC online. Do not duplicate, invent, or silently backfill messages.

Current limitation: the Control development-monitor PR reports GitHub PR/CI activity, **not live local OpenShard process execution**. An authenticated receipt/heartbeat viewer in Control remains a later, separately audited implementation and must not expose arbitrary PC commands. Protect release deployment, secrets, canonical H, user-owned Git history, and ongoing test sessions. [Details and release boundaries](OPENSHARD.md#private-chatgpt-remote-openshard-workflow-25-october-2026).
