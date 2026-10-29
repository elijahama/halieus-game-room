# Halieus Game Room Masterbook

> **Living project summary and engineering map.**
>
> This document is the high-level source of truth for understanding Halieus Game Room (HGR). It does not replace detailed implementation docs; it connects them.

## Current Part 26 checkpoint

### Active-game return source batch after 4.6.4

The separate owner-authorized Mega Board active-game notice is a **4.6.5 review candidate** using authenticated persisted seat ownership, the hub notification area and existing recovery tokens. It provides foreground public-decision context and non-forcing same-device return; account-only cross-device reclaim and background game push remain unfinished. Package scripts and Windows/Ubuntu PR CI include the tests and an explicitly source-only App wiring guard; established tooling prepares 4.6.5 identity. See [scope, security review, exact evidence and parent gates](HGR_ACTIVE_GAME_RETURN.md). No 4.6.4 layout changes are replaced; no merge or deployment is claimed.

Final parent evidence: standard full regression, active-match runtime/wiring, active browser, compact browser **52 cases**, history and pause socket regressions passed. Updated in-app ConfirmDialog component tests passed at **390/820px**, including Cancel/Escape, snapshot, one-use guest confirmation and account-switch/logout cancellation; inspected `../hgr-465-confirmation-browser.log` corroborates those PASS lines. Standard build/integrity/browser-release checks passed **before the final dialog correction**; final identity production rebuild and 4.6.5 CI are still pending. Full-App E2E and physical-PWA acceptance remain unperformed. Baseline **4.6.4 PR159 Windows+Ubuntu CI passed at `25429b7`, run `40413060729`**, as reported by parent; this is not candidate CI evidence. Receipt `rcpt_bf69d18797384553936bc243a4c631dd` remains observational capture, not independent attestation.

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


## Control development-activity monitor

**Source-only candidate; pending CI, merge, release preparation, deployment and owner-device verification.**

The HGR Control **Development** view is read-only and displays public GitHub PR and workflow evidence alongside the existing Operations screen for actual owner-PC Start/Restart/Close/Update history. Desktop has a Development rail destination; phone retains the approved five-button bottom bar and reaches it through **Ops → View development batches & GitHub checks**. The server-side endpoint is owner/admin-gated, uses fixed public GitHub URLs, caches for five minutes and explicitly labels unavailable/stale evidence. It does not assign progress percentages to PRs, infer running work from an open branch or claim ChatGPT's internal activity is observable. The full security boundary, implementation map, release gate and rollback are in [Control Development Monitor](HGR_CONTROL_DEVELOPMENT_MONITOR.md).

No changes to canonical HGR launcher art, main platform `VERSION`, Control allow-listed actions, mobile bottom nav, game rules or existing Cloud Update progress are part of this batch.

## Local development timeline viewer (25 October 2026)

**Owner decision:** HGR development history is made of distinct evidence: ChatGPT instructions journaled via the private OpenShard Bridge, native OpenShard coding-session receipts, and separately verified GitHub/CI and deployment states. Do not mark a task complete from a prompt, a reported milestone, a captured session, or an open pull request alone. Keep each source attribution and task ID exact; do not infer a task link.

**First audited implementation batch:** `scripts/hgr-development-timeline.mjs` reads the two private local JSONL stores without modifying them, sorts bounded recent events, hides raw instruction text by default, emits a JSON schema for a later GUI, and reports whether native verification was actually observed. The existing `scripts/windows/OpenShard-HGR.cmd timeline` entry point exposes the view without altering `HGR Update` or the canonical HGR launcher-family artwork. Fixture-driven regression `tests/runtime-development-timeline.mjs` covers missing/corrupted records, source secrecy, task IDs, sorting, verification truth, capped reads and no mutation; included in the `test:regression` chain.

**Release boundary:** Source-only review candidate. It is not merged, deployed, installed into the current owner's main checkout, integrated as an upstream OpenShard TUI tab, or wired to owner-facing HGR Control. An authenticated local-history read bridge, real task-ID propagation from external Codex hooks, and integration with GitHub status remain separate reviewed batches. Keep product `VERSION` unchanged at 4.5.6 until the cohesive release decision.


## Owner-gated HGR Control development timeline (25 October 2026)

The existing Control Development Monitor candidate is extended with an owner-only local evidence panel (desktop and phone/tablet in ordinary page flow) and a protected `GET /control/development-timeline` endpoint. The panel displays sanitized metadata from the two independent sources: Bridge instruction journal and OpenShard native receipts. It never maps one to the other without a real task ID, never treats a prompt as proof of execution, never exposes raw prompts, and never fabricates an agent heartbeat or completion percentage. Owner authorization is required; ordinary admin access is insufficient for the local history endpoint. The mobile bottom bar remains five items with Development reached via Ops.

**Physical host constraint:** HGR Control on Oracle cannot access the owner's laptop files and must show **Local source unavailable**. This source-only candidate is a safe on-machine read path, not yet a remotely authenticated live receipt relay. Bridging owner-PC local records to the cloud needs a separately reviewed outbound sync protocol and privacy safeguards. No new listening port, blanket filesystem access, GitHub upload of the local journal, Update action integration, canonical H change or HGR version bump is approved here. See `docs/HGR_CONTROL_DEVELOPMENT_MONITOR.md` for implementation and test gates.

## Outbound authenticated HGR development evidence relay (25 October 2026)

**Decision:** The existing approved HGR Control Cloud Agent is the only candidate transport for private laptop development metadata. Owner opt-in (`HGR_DEVELOPMENT_TIMELINE_SYNC=1`) is required; new sync is disabled by default and is independent from Update, gameplay, OpenShard's CLI and native TUI. The server accepts bounded metadata only from the already approved, revocable per-device credential over the fixed HGR HTTPS host, stores it privately, rejects schema drift and replayed/stale uploads, and serves it exclusively to the owner in Control. No raw ChatGPT prompts, agent task text, tokens, keys, repo content, or arbitrary filesystem paths may be transmitted.

**Evidence truth:** The local journal records instructions; OpenShard receipts record captured agent activity; a successful verification result is an independent field. Fresh sync means only that a metadata snapshot was received recently, not that an agent is executing. On disconnect, show stale last-known history with explicit age, or unavailable if absent/revoked. The prior five-button mobile Control navigation, approved HGR launcher art, HGR Update process, production code and `VERSION=4.5.6` remain unaffected. This is source-only until integration and device review plus deployment of both server and approved owner PC bridge. See `docs/HGR_CONTROL_DEVELOPMENT_MONITOR.md` for full scope and release gates.

## HGR 4.5.7 — Control development timeline release candidate (25 October 2026)

**Scope and release decision:** Advance the real HGR product version from 4.5.6 to 4.5.7 for the Control Development Monitor, local OpenShard timeline, owner-only evidence view and authenticated outbound relay. This is a minor feature release on the 4.5.x line, not a declaration that separately reviewed 4.6 game-discovery candidates are production-complete. Identity artifacts are regenerated from `VERSION` by the release-integrity authority.

**Release gates:** Full platform regression, client/server typecheck, canonical branding/launcher validation, production dependency security audit, exact release build, cloud lifecycle/owner auth controls, browser/PWA and Oracle exact fingerprint validation must pass before release. The existing owner-PC main working branch and private data are never overwritten. Deploy using the canonical audited Oracle helper with rollback, then verify public/local health. Activate `HGR_DEVELOPMENT_TIMELINE_SYNC=1` only for the approved existing Control Cloud device after server activation, and verify fresh owner-only timeline state without exposing prompts. If network/auth or any gate fails, do not claim live; keep the private sync disabled and document the blocker.

## Cross-platform HGR release fingerprint normalisation (25 October 2026)

**Root cause:** Release 4.5.7 merged source has the same tracked Git blobs on Windows and GitHub Linux, but Windows Git checkout expands CRLF in five additional, UTF-8-lossless text resources: `deploy/oracle/halieus-game-room.service`, `deploy/oracle/halieus.env.example`, both Oracle Nginx `.conf` files and `server/data/word-board/scowl-en-us.dic`. The previous `release-integrity.mjs` text allowlist excluded `.service`, `.example`, `.conf` and `.dic`, so the Windows hashed bytes differed from Linux while the actual Git content matched. Diagnostics compared every tracked release input against canonical Git blobs: exactly these five mismatched; their LF-normalised bytes matched Git exactly.

**Scoped fix:** Treat those extensions as UTF-8 release text when computing the release SHA-256, retaining binary byte-exact hashing (including PNG, ICO, fonts and artwork). No dictionary content, Oracle configuration, key, game logic, source file format, or current product `VERSION=4.5.7` is changed. `tests/regression-release-identity.mjs` now verifies CRLF/LF parity for each real affected fixture and retains binary-corruption rejection. Validate a Windows checkout and a clean canonical-LF Git archive produce the **same fingerprint**, then run the full existing release gates.

**Release boundary:** A matching local fingerprint is not proof of production activation. Do not bypass Oracle authentication or release checks; do not change the owner's active feature checkout. After review/merge, GitHub may regenerate the final release identity for changed Masterbook/test/script bytes; the post-merge exact `main` fingerprint must then be independently verified on Windows before deployment. Record live health separately.

## Cloud Update from an isolated canonical main checkout (25 October 2026)

**Owner requirement:** The HGR Control Cloud Update action must not refuse service merely because the owner's main Windows HGR working checkout is on an unfinished feature branch. It also must **not** switch, reset, rebase, commit, push, remove untracked files from, or silently overwrite that checkout. Manual `Update HGR GitHub.cmd` retains its strict `main` requirement and existing interactive Git safety mechanisms.

**Source-only Control fix:** `scripts/windows/control-update.ps1` detects the local branch. When it is not `main`, its authenticated Cloud Update operation delegates to `scripts/windows/control-update-isolated-main.ps1`. The helper creates a fresh, short-lived independent GitHub `main` checkout under the owner's local application-data folder using the fixed canonical repository URL, disabled Git terminal prompts and a unique validated operation ID. It validates the clone's branch, remote, clean status, `VERSION`, and the **exact published RELEASE.json fingerprint** *before* dependencies or deployment. Only after passing those checks can it run `npm ci`, the high-severity security audit, typecheck, production build, full regression suite, Oracle package preflight and the existing approved noninteractive Oracle deployment helper. All SSH keys remain outside HGR source and are resolved solely through the owner-private credential configuration.

**Control semantics:** The owner's original HGR Control process, local runtime state, launcher targets and unfinished feature branch remain untouched. A successful isolated Oracle release delegates the terminal 100% **website deployment** receipt to the existing independent Control finalizer using a matching process-local flag and operation-owned `handoff=isolated-main` marker. The finalizer never restarts the owner-PC Control for this mode because no owner-PC source has changed; the original main-checkout handoff and finalizer-only success rule are preserved. The owner-PC Cloud Agent code itself may still need a separately approved upgrade before new local agent functionality becomes available. The original Cloud Update workflow for a checkout already on `main` remains unchanged.

**Verified safe failure:** On Lagz, the isolated `-AuditOnly` test cloned exact public `main`, observed 4.5.7, and **correctly refused deployment** on the pre-existing Windows-versus-GitHub release fingerprint mismatch. The owner's branch, local status, artwork and private notifications were unchanged; the ephemeral checkout was removed. The audit does not prove an Oracle release is live. The historical 4.5.7 fingerprint mismatch was resolved separately by the cross-platform hashing fix in PR #142. Remote Oracle SSH authentication remains a distinct release gate; do not bypass it.

## Owner Control local-listener source split — feature-branch Update failure (25 October 2026)

**Observed incident:** After Oracle website release 4.5.7 and the updated outbound bridge were installed, a fresh owner Cloud Update attempt at 08:46 still failed at 3%, stating `Current branch is "feat/part32-coming-soon-queue", not "main"`. The failure was genuine, not a stale UI message. Process inspection established that the outbound `control-cloud-agent.ts` ran from a clean dedicated 4.5.7 worktree, but the loopback `127.0.0.1:43127` **Control listener** still ran from the owner's original 4.5.6 feature checkout. The bridge obtains a one-shot Update confirmation from that listener and calls `/api/actions/update`; the older listener launched its own older `scripts/windows/control-update.ps1`, which rejected the feature branch.

**Approved scoped design:** Preserve the existing authenticated one-time confirmation, local operation ID, Control audit log, finalizer-only success, approved-device Cloud bridge and owner game checkout. Launch the local Control listener itself from the dedicated Control worktree, but set the **local-only** `HGR_CONTROL_GAME_ROOT` environment variable to the owner's original HGR checkout. Validate that root contains the full expected HGR repo anchors. In `server/src/control-agent.ts`, only game lifecycle launchers and `Start/Restart/Close` bridges, plus the displayed game branch/version/commit state, resolve against the owner game root. The Update bridge, independent isolated-main helper, Control UI and private audit/runtime paths remain bound to the dedicated Control source root. Thus the existing game commands continue targeting the original checkout while only Update uses the reviewed release path. No arbitrary Cloud command, remote request-selected path, new public port, cloned private key or gameplay/launcher-art change is introduced.

**Audit:** A genuine synthetic owner-game Git checkout, independent source listener and test-only loopback port verify reporting of the game version/branch, strict Update confirmation and action separation without executing the updater. Include the fixture in full regressions. After local release/typecheck/test gates pass, transition only the trusted existing loopback Control listener; preserve the owner-private Cloud device, journal and data through their ignored NTFS junctions, and verify the outbound bridge recovers with its rotated token. The already failed historical 08:46 operation is immutable evidence and must not be relabelled success. A clean `-AuditOnly` source check is not a real Control-originated Cloud Update, nor proof of Windows reboot persistence.

**Release boundary:** The current Oracle public website remains the independently verified 4.5.7 fingerprint `hgr-4.5.7-57992174eb52e8a3`. Adding tracked Control code and Masterbook notes requires a new release identity if merged into GitHub; review this code separately before a future website deployment. Avoid overlaying tracked scripts onto the owner's unfinished feature checkout, and do not redeploy the same Oracle release merely to clear its failed operation card.

## Control Cloud Update 38% launcher-test path failure (25 October 2026)

**Observed real failure:** After repairing Control's earlier non-main branch check, owner Cloud Update reached 38% then failed in the *Windows launcher export regression* (`tests/regression-part26-control-launcher-hardening.mjs`). Its nested fixture under the temporary isolated-main release checkout generated a fake Start Menu path exceeding legacy Windows Shell COM path limits. The log contains `System.IO.PathTooLongException` in `launcher-shortcuts.ps1` during shortcut creation. The approved HGR Control PNG-to-ICO generator itself had printed a successful export and **was not found defective**.

**Decision:** Keep canonical approved launcher-family H geometry, role colours, protected PNG/ICO bytes, Stop Control's explicit stop badge, icon/shortcut assertions, runtime cleanup, and the actual owner Windows Start Menu unchanged. Change *only test infrastructure*: `tests/runtime-launcher-exports.ps1` builds its randomized disposable COM/launcher fixture directly below `[IO.Path]::GetTempPath()` instead of nesting it below `server/data/runtime` inside a deep isolated Git checkout. A strict maximum simulated shortcut-path length guard rejects unexpectedly long temp roots; cleanup remains constrained to the unique child of the canonical OS temp root. The regression harness asserts that the short-fixture guard remains in place.

**Release/operations:** The failed 09:49 Cloud Update operation is true immutable history; it must not be repainted as a success. No brand redraw, actual shortcut regeneration, repo reset, production deployment or key handling is required to fix the test. Validate the real Windows COM test from an equivalently long isolated checkout and rerun full HGR regressions before integrating the change. The live HGR 4.5.7 fingerprint and owner feature branch must remain untouched until a separately audited new release.

## Mega Board phone auction containment and truthful roll instruction (25 October 2026)

**Screenshot evidence:** In an eight-seat Mega Board match on a narrow phone, an auction is visibly trapped within the square board, pushing the timer/heading and some player details outside the visible active area while +£10/+£50/+£100 and Withdraw remain near the board bottom. The board centre also displays a contradictory "Waiting for [owner] to roll" while the same owner is the active player with a Roll Dice button. The horizontally scrollable status rail, 52-space board tile readability, responsive property sheet and toast copy are independently identified review items rather than silently redesigned here.

**Narrow repair:** On phone/tablet widths up to 900 CSS px, render only the mandatory auction presentation in a viewport-level React portal (`document.fullscreenElement ?? document.body`) instead of the 1:1 square board's containing block. Leave other decisions, the desktop auction, game state, eight-player participation, bid increments, timer and owner/spectator cash-visibility rules unchanged. The viewport sheet caps its height and scrolls **only the player roster**, so its title, timer, current bid, bid buttons and Withdraw remain reachable. Keep the approved Mega Board visual identity and launcher-family H untouched. In the absence of a current-turn dice roll, show the active player's "Roll dice to begin your turn" prompt only in the roll phase, display opponent-waiting text only for other players, and avoid implying a new roll is due in non-roll phases.

**Validation and release:** A new source regression belongs to `npm run test:regression`; dedicated headless Chromium layout fixtures validate 320×568, 360×740, 390×844, 430×932 and 820×780 viewports, including eight bidders, action visibility and scroll reachability. Run typecheck, full regressions and production build before publishing a review branch. This is a source-only candidate: it does not retroactively change active match screenshots, apply to the public website, trigger Control Update, rotate keys or merge into production until the release gate is audited. Existing failures in the 09:51 Cloud Update screenshot are older history; the actual later 10:56 local Update receipt was `succeeded` at 100%, and the public 4.5.7 fingerprint matched `hgr-4.5.7-b76d92251c710d65` when checked.

### Auction React component browser acceptance — 25 October 2026

PR #147 merged the mobile sheet and roll prompt to `main` before its additional real-component acceptance test was included. This independent test-only batch adds `tests/fixtures/mega-mobile-auction-real.tsx` and `tests/browser-mega-auction-real-react.mjs`, mounting the real `AuctionPanel` using React DOM and production CSS inside the mobile portal. At 320×568, 360×740, 390×844, 430×932 and 820×780 the browser checks all eight bidders, viewer-only cash visibility, the highest bidder, roster reachability, action geometry and the actual +£10/Withdraw callbacks. The five-device-size checks passed locally on Lagz. The test now runs in `npm run test:browser:mega-auction` and GitHub's final built-release browser stage. This is rendered React validation, not signed-in live owner phone acceptance. The source-only mobile feature and game rules/approved launcher artwork remain unchanged; do not claim live Oracle activation until post-merge CI, release identity and deployment verification pass.

## Mobile Test Lab status and Mega Board waiting-room containment (25 October 2026)

**Evidence:** Owner mobile screenshots show that the Owner/Admin Test Lab status badge renders "OFF" or "ACTIVE" one character per line next to its description, and Mega Board's private-room header reserves too much vertical space on phone/tablet. The lobby also shows a persistent floating room-chat launcher close to the End room button, and the Players sheet has an independently scrollable roster with a spectators footer. This batch fixes the first two verified defects without changing beta entitlements, gameplay state or the roster sheet. A separate mobile players/chat interaction audit is still required.

**Root causes:** Shared CSS intentionally allows all status/role badges to wrap anywhere for general account-list containment; applying it to the 3–6-letter Test Lab badge shrinks that badge until its letters stack vertically. Shared card/Poker responsive CSS gives headers 64px of reserved top padding and the Mega Board lobby adds 20–34px of top margin; at phone/tablet sizes the waiting-room information is pushed down below considerable unnecessary spacing.

**Narrow implementation:** In `client/src/index.css`, scope a max-content, one-line `account-status-badge` plus min-width-safe two-column heading **only** to `.account-test-lab`. Scope the waiting-room header and shell spacing **only** to `.mega-lobby-poker-standard` through 980 CSS px: remove the unnecessary 64px header padding, reduce the room-to-header gap to 10px, allow the tall room/players content to scroll naturally and retain 72px safe-area-aware clearance after the player roster for the floating chat launcher. Use stronger selector specificity because Mega lobby and design CSS are imported after `index.css`. Do not modify actual player records, the beta-mode unlock override, room recovery credentials, canonical HGR H icon/branding, game timers, board geometry or the live site in this source batch.

**QA:** `tests/browser-mobile-lobby-testlab-layout.mjs` loads the full imported production CSS sequence into Chromium and checks both ACTIVE and OFF are horizontally legible and unclipped, alongside the Mega waiting-room header top-padding, lobby gap, roster containment and vertical scrolling, at 320×568, 360×740, 390×844, 430×932 and 820×900. The test caught the later-imported Mega CSS overriding an initial margin fix and also caught the original phone-only breakpoint failing at 820px. It is wired to `npm run test:browser:mobile-lobby` and the GitHub Linux release browser stage. Live device confirmation of the chat dock and Players sheet remain separate acceptance gates.

## Mega Board Players drawer, notification precedence and floating Room dock (25 October 2026)

**Phone screenshot evidence:** With a live eight-seat Mega Board, transient property-purchase notices visibly cover the Players sheet header while the fixed Room chat launcher can overlap modal/lobby actions. The player roster scrolls underneath a persistent spectators summary, and all eight seats must be accessible without replacing the board or changing hidden-cash rules. Separate draft PR #149 addresses the Test Lab status and Mega lobby spacing; this batch must remain independent.

**Root cause:** The Players drawer is mounted inside the Mega game page with `z-index:300`, whereas in-board transient notices use `1400` and the floating chat dock uses `1450`. The drawer consequently loses modal precedence despite `aria-modal=true`. The global fixed chat dock also overlaps End room near the waiting-room bottom and the Trade send action.

**Narrow implementation:** Render the existing Players drawer DOM through `createPortal` to `document.fullscreenElement ?? document.body`, preserving its existing child `PlayerRail`, click-to-inspect handler, owner visibility rules, spectators summary and close/backdrop functions. Make its phone/tablet layer `z-index:2000` and constrain the drawer to viewport with min-height-safe flex, independently scrollable roster and fixed spectators footer. At mobile widths reserve a 64px right gutter for the destructive `End room` button while keeping its minimum useful width. While an optional Trade/Properties game panel is shown, visually suppress only that match's floating Room chat dock, restoring it on panel close; chat remains mounted so its messages and subscriptions continue. Do not suppress announcement events, hide the spectators summary, rewrite gameplay/server state, or change canonical artwork.

**QA and release boundaries:** Browser acceptance loads HGR's full actual CSS import order and the **real React PlayerRail component** in the modal portal, with eight synthetic seats. At 320×568, 360×740, 390×844, 430×932, and 820×900, verify the close hit target is unobscured, drawer fits the viewport, all eight rows scroll to the final seat, spectator footer stays accessible, the player-select/close callbacks work, and the drawer layer beats chat and notifications. A separate full-CSS browser fixture at 320/360/390/430 checks End room/chat nonintersection and temporary chat invisibility during Trade, with visibility restored on close. Run full regressions, typecheck, production build, security audit and verified 533-file release identity before review. This is an isolated source-review batch, not an owner signed-in real-device interaction, a merge or a deployment. Existing private recovery key screenshot must not be embedded in tests/docs.

## Mobile UI integration and 4.5.8 release audit (25 October 2026)

PR #149 (5a3cb88) corrects the Test Lab status wrapping and Mega waiting-room spacing. PR #150 (9598de8) raises the Players drawer above notices, separates roster scrolling from the spectators footer, and clears floating chat from End room and action panels. Integration preserves both append-only CSS batches in production import order, both browser scripts and both documentation entries. Local integration merge: d108958. VERSION advances from 4.5.7 to 4.5.8 using prepare:release; this functional production correction must have its own release identity.

Additional integration findings: a portal target evaluated only during unrelated renders does not reliably follow fullscreen entry/exit while the drawer remains open. PlayersDrawer now owns the existing markup and subscribes to fullscreenchange. Browser acceptance mounts that actual production component, rather than a duplicate modal shell. CSS-hidden open chat could continue clearing incoming messages as read. The existing chat now receives modal-obscured state, retains its mounted message/draft state and tracks unread messages while concealed on compact layouts. Other games retain the default unobscured behaviour.

New real-component acceptance mounts LobbyScreen, PlayersDrawer/PlayerRail, GameSidebar with actual Properties and Trade panels, and RoomChatPanel with production CSS import order. Synthetic local data and a test-only socket transport exercise eight seats, actual End room and mortgage callbacks, chat send/receive/unread state, spectators, panel dismissal, real Chromium fullscreen entry/exit and viewport rotation. These are browser-emulated checks, not authenticated owner-device acceptance or proof of server multiplayer behaviour. The existing full regression suite remains required independently.

CI gap: the previous release workflow ran only after main pushes. A read-only pull-request workflow now runs Windows and Linux typechecks, complete regressions, production builds, security gate, mobile browser acceptance, auction acceptance and release identity checks before integration can ship. It does not push generated files or deploy. The normal main release workflow additionally runs the new integration test.

Owner-PC audit: all registered worktrees were inspected. The active feature checkout, private untracked artwork and notifications, and pre-existing generated identity drift in two other worktrees were preserved. OpenShard Bridge instruction journal receipt bdf8d888-29d0-4df5-b754-76fdaa130ee2 is private local evidence; no native OpenShard run is claimed. Initial public health: 4.5.7 / hgr-4.5.7-9109a84f3b9f0487, no active rooms. Deployment, final merge SHAs and final fingerprint remain pending until independently verified. No canonical H artwork is modified.

### Activation safety and local validation

The canonical Oracle installer now refuses activation if loopback health cannot establish zero rooms, including newly added game room counters. It checks after candidate build and again after the maintenance grace period immediately before service stop. A failed second check clears the scheduled maintenance notice and leaves production running. The check has no bypass flag; separate provisioning/recovery remains separate. Fixture tests cover active Mega/Poker/new-game rooms, malformed/missing counts and offline health.

Lagz local gates passed: complete HGR regression chain, client/server TypeScript, production client/server build, canonical launcher/PWA asset checks and npm audit (zero vulnerabilities). Combined production CSS tests passed at all five requested sizes. Real-component browser coverage also includes the actual GameBoard and Roll Dice callback after panels close. Final branch CI, merge and deployment evidence are recorded separately below; the initial local passes do not imply publication.


## HGR Part 33 — Mega Board desktop spectator containment and turn-clock visibility (25 October 2026)

**Owner device feedback:** Real desktop spectator screenshots confirm the Part 31 board-above-players composition is welcome, but header text is not centred, the whole page scrolls, and the turn timer is missing while a player resolves debt. Preserve the canonical launcher H, board spaces, gameplay authority, current active-seat three-lane layout, existing role/privacy rules and mobile scrolling. Do not treat a spectator's viewing privileges as participation.

**Cause / scoped correction:** The Part 31 spectator CSS explicitly sets `height:auto`, `min-height:100dvh`, `overflow-y:auto` and an unbounded board-and-roster stack, overruling the earlier desktop viewport lock. For desktop widths from 1181 CSS px, constrain **only spectator mode** to the viewport, place the square board in the remaining flexible first row, and reserve an internally scrollable roster below. Property strips continue scrolling internally, and the spectator heading, banner, and header metadata values are centred. On phone/tablet, retain natural vertical scrolling and the previously verified Players drawer, notifications, floating chat and auction behavior.

The header previously rendered only a human roll-phase deadline and replaced it with a wall clock in other phases. The server already exposes `turnRollDeadline`, `turnRollDeadlinePlayerId` and `optionalActionDeadline`; the shared read-only presentation helper formats those deadlines for both active and spectator users. Show **Turn timer** in every phase: countdown for matching roll or optional-actions deadline, **Auto** for automated rolls, **Paused** for blocking/debt/trade phases without a running deadline, and an em dash if no authoritative timer is active yet. Never synthesize a countdown or change server timer semantics. The Game menu retains the existing timer configuration.

**Tests:** The production CSS-order spectator browser fixture now covers eight player cards at 360×780, 390×844, 820×900, 1280×720, 1408×900 and 1536×900, checks a square board, no horizontal overflow, no desktop document/page scrolling, centred header values and accessible roster. A focused runtime test covers roll expiry, optional-actions countdown, overdue/stale deadlines, AI/autopilot, paused debt/trade phases and missing player. The runtime check is in the full regression chain and the CSS browser test in PR validation. These checks are synthetic local browser/runtime checks, **not signed-in owner acceptance**.

**Local validation evidence:** Client/server typechecks **PASS**; complete existing HGR regression chain plus timer-specific runtime tests **PASS**; spectator browser acceptance at all six listed sizes **PASS**; real mobile Lobby/Players/Properties/Trade/chat/fullscreen acceptance and waiting-room tests **PASS**; mobile auction and Players/chat-overlap tests **PASS**; canonical launcher/PWA build check **PASS**; security audit: **0 vulnerabilities**. Build must still be repeated after the final release-manifest refresh and its built-server fingerprint checked before review.

**Release boundary:** Part 33 is prepared as a scoped 4.5.9 candidate. Do not merge/deploy while live active room safety, release identity, CI or final review gates are unresolved; no production deployment is implied by the source changes.


## Part 34 — Saved Games, Recent Replay and Copyable Move Notation (25 October 2026)

**Origin and scope:** Owner requested site-wide saved games and game replay, then specifically a chess.com-style *move list that can be copied/pasted alongside Game Reports*. GitHub issue #153 tracks the longer cross-game program. Part 34 introduces a deliberately bounded **Mega Board pilot** only, developed in its own 4.5.10 branch after PR #152. Preserve all active gameplay, real-time timers, owner Part 32 work, launcher-family artwork and untouched game modes.

### Server checkpoints (pilot, not full suspension)

- Host-only socket commands `game:saves-list`, `game:save-slot` and `game:restore-slot` access three durable files, each atomically written under the canonical HGR game data root's private `saved-games` subdirectory. Room identifiers become SHA-256 directory names. A reused room code with a new match identity or changed private recovery-token seats cannot see or restore the previous match's checkpoints; such stale slots appear empty, while malformed save files fail closed. Save payloads include complete server room/reconnect/deck state and **must never be served directly to clients**, exposed through a static web root, attached to a report, or sent to a paste destination; socket replies contain *metadata only*.
- Snapshots are allowed for **Casual/Custom, active matches** in `roll` or `optional-actions` phase **without pending purchases, auctions, trades, cards, debts, jail or Speed Die choices**. Ranked rollback is prohibited. These checkpoints are *not* a pause function: live timers and other players continue playing while a checkpoint is written.
- A restore is host-only, requires the original match identity and compatible player recovery tokens, **no CPU players**, no other human currently online, no unresolved decision, and an unranked match. Recheck these conditions after asynchronous disk reads to avoid a race. Reject restores when player-seat membership, forfeiture status or bankruptcy outcome changed since the checkpoint; never resurrect an eliminated player. Rebind old socket IDs to current room players, clear stale turn deadlines and allow existing server logic to start a new deadline when the restored state is emitted. No rollback if a gate fails. This is a limited safety-oriented checkpoint pilot, *not* the final cross-device save/resume design.
- Existing automatic crash/restart room recovery remains the production authority. Do not use checkpoints to pretend there are no active rooms when determining deployment safety.

### Recent Replay (pilot)

- On server-confirmed state emission, store at most **240 bounded, deduplicated public-safe presentation frames**: turn, phase, board positions, token colours, owned property IDs, mortgage/build state, cash, jackpot and dice, with the last recorded activity ID. These frames **exclude** room recovery secrets, decks, hidden draw order, server credentials and private chat. Do not use replay frames to restore real gameplay.
- Game menu exposes **Recent Replay** with a board state overview, per-player standings, playback speed, pause, scrubbing, previous/next and exact-checkpoint selection. The viewer never emits gameplay commands. Older games cannot be reconstructed: replay coverage starts when recording first exists and only retained frames are navigable. This is a visual **checkpoint playback**, not verified deterministic full-history replay or external video.

### Chess-inspired, paste-ready move notation

- The move list uses every retained server `activityLog` entry in order, with numbered action, turn, actor, type and exact recorded message (for example, `001. | T1 | Ava | ROLL | Ava rolled 2 + 3`). **Do not label it PGN**; Mega Board does not use chess notation.
- Click a move to jump only when an **exact retained replay activity ID** exists. An older logged action without a checkpoint remains visible and copyable, but its replay jump is disabled. Do not invent missing dice rolls or frame-to-event links.
- Provide **Copy move list** (clipboard), **Download moves .txt** and **Copy Match Report** controls. Embed exactly the same notation in the existing downloadable Game Report under `MOVE-BY-MOVE RECORD — COPY / PASTE` while preserving original full match activity and diagnostic sections. Neither action uploads to Pastebin or another service; users control where they paste. Shared content must exclude recovery credentials. Existing report recipients may see full finances; public sharing/privacy configuration is a later design step.

### Acceptance / scope boundary

Runtime tests must cover durable save/load, slots, rollback and deadlines, ranked/CPU/opponent denial, 240-frame cap, duplicate suppression and no credential leakage in replay. Include a real Socket.IO host-versus-stranger test confirming private metadata, blocked traversal/invalid slots, online-opponent restore denial and acknowledgement only after room persistence. Move text tests must verify numbered ordering, actors, normalized lines and inclusion in the Game Report. Real React browser fixtures must validate copy/download, move jumping, unavailable old frames and layouts at 390, 820 and 1408 CSS px. CI must also run full HGR regressions, typechecks, security audit, production build, release fingerprint and protected canonical artwork tests.

**Not yet delivered:** true suspend/resume with player consent and preserved timer offsets, permanent replay archives for completed games, deterministic full-game replay, shareable signed URLs, privacy-aware post-match card/role reveals, and adapters for Poker, WHOT, Ludo and other games. These remain in issue #153. Do not claim Part 34 is live before reviewed CI, merged release identity, an actual zero-active-room Oracle deployment and public health/device checks.


## Part 35 — Mega Board Server Pause/Resume Pilot (26 October 2026)

**Context:** Follows the production-verified HGR 4.5.10 release (fingerprint hgr-4.5.10-699611db6241a817) and the scoped Save/Recent Replay pilot. Implemented in a **separate Part 35 worktree**; never mix with owner's Part 32 working files, runtime notification data or canonical launcher branding.

**Capability, intentionally narrow:**

- Casual/custom **human-only** Mega Board rooms may be suspended by the connected host only, when the turn is at a safe roll / optional-actions boundary **and every other player has disconnected**. Ranked, CPU, autopilot, outstanding purchases, trades, auctions, cards, debts, speed-die decisions and other blocking phases are excluded. While opponents are online, host pause is refused; their active turns are never silently frozen.
- The game:pause-room Socket.IO command saves a server-owned paused state containing only the original turn/phase, pause timestamp and **remaining timer durations** (not wall-clock deadlines). It atomically persists with the existing room snapshot, broadcasts the status to clients and clears roll and optional-action timers. The game:state timer synchronisers and optional-action expiry callback respect the paused status. On service recovery, a paused room remains paused instead of giving out expired turns.
- A Socket.IO inbound middleware registered **before all gameplay handlers** refuses Mega Board gameplay/action packets for a paused room, even from stale or modified clients; it replies with ok:false when an ACK exists. Safe recovery, observer access, save-slot metadata, explicit room closure and host resume remain allowed. Leaving/forfeiting is blocked while paused because that would mutate the board and invalidate the saved roster.
- The game:resume-room command is host-only and requires **every still-active human player reconnected** (previously eliminated/forfeited seats are not incorrectly required to rejoin), unchanged match identity, turn/phase and roster and no automation. It reconstructs the remaining roll or optional-action deadline from the resume timestamp, emits a fresh state and flushes room persistence before success acknowledgement. Repeat pause/resume and invalid requests fail without changes.
- A paused room **still counts as an active room for deployment safety**. The host reconnect grace extends from 90 seconds to **24 hours for paused rooms** so an intentional short session suspension survives disconnect/restart without instant closure. After 24 hours, existing server cleanup applies; this is *not* permanent suspended game storage or a user-managed offline game library.
- Game menu labels its primary action View paused board when suspended, shows Pause or Resume host control and a visible paused-state description; the live Mega Board screen has a paused banner. This is still a pilot: no consent mechanism for pausing multiple connected opponents, no CPU pause, no automatic resumable session tile, no other game adapter, no preserved session beyond grace expiry.

**Acceptance:** Unit tests check exact residual timer offsets, phase/automation/ranked/player guards, paused middleware allow/deny list, and grace period. A real isolated Socket.IO server test proves host-only pause, live-opponent denial, rejected gameplay packets from another client, crash-safe JSON persistence, host-only resume, connected-player requirement, resumption with retained deadline and ranked denial. All five save/pause/restore handler acknowledgements must be present before a request may mutate the room; malformed no-ACK requests are ignored without throwing. Also run complete HGR regressions, TS checks, release identity/build, existing mobile, spectator and auction browser tests, protected artwork checks and security audit. Any PR must pass Windows/Ubuntu CI before merge and deployment; production fingerprint must be independently verified and zero active room gate honoured.

**Roadmap:** Issue #153 remains open for consent-based co-operative pause, deterministic replay archives across all HGR games, permission-controlled sharing, CPU handling, and persistent saved-game gallery.


## Part 36 — Owner-approved spectator-style Mega Board phone portrait (26 October 2026)

**Owner design acceptance:** The existing **live spectator portrait** arrangement is the new reference standard for **actively playing Mega Board on a phone in portrait orientation**. It is not a request to turn players into spectators or remove controls. Preserve the same clear visual order: game identity/status at the top, a large square full-width board, then the complete, directly accessible player roster underneath. Avoid a separate full-screen Players drawer as the *only* route to that roster on phone portrait. Keep player money privacy: the active player sees their own cash; opponents remain masked unless the game already authorizes disclosure.

**Scoped implementation:** The participant branch of the live `App.tsx` adds a distinct `mega-mobile-participant-mode` and `mega-mobile-participant-layout` marker. It reuses the existing real `PlayerRail` for the in-page active-roster list rather than cloning cards. Player details remain clickable with the current event handlers; the spectator/forfeit footer still comes from the same PlayerRail logic. Existing GameBoard roll, purchase, auction, jail, bus-ticket, trade, mortgage, debt, property and turn-action handlers remain unchanged. Floating Room Chat and Game Menu remain mounted. CSS under **max-width 600px AND portrait orientation only** hides the duplicate split desktop side rails and the drawer trigger, and gives the playing page the approved spectator square-board-first / natural-scroll roster geometry. The existing sidebar action panel remains available when opened; the closed GameSidebar renders no overlay. Spectator, landscape, tablet and desktop arrangements are untouched.

**Acceptance:** `tests/browser-mega-player-portrait-part36.mjs` reads the full actual HGR style stack and tests 320x568, 360x780, 390x844, 430x932 and 600x960 portrait, plus 844x390 landscape, 820x900 tablet and 1440x900 desktop. It verifies a square unclipped board, first player below the board within the initial viewport, all eight player cards scroll-reachable, no horizontal overflow, no duplicate visible side rails/drawer, roll and player card clickability, and no layout opt-in for other screen classes. CI should run it alongside the existing spectator and mobile integration tests. Preserve canonical launcher-family H and all approved branding/reference assets. Complete HGR regressions, typecheck, build, security and release fingerprint tests, GitHub CI and actual owner phone acceptance are separate release gates. Never mark a source-only change as deployed.

**Branch/discipline:** Part 36 uses an isolated clean worktree on the verified 4.5.11 main baseline; the owner's ongoing Part 32 checkout and unrelated untracked notifications/openshard branding reference must remain untouched. This is a layout-only change; no game-state, role authorization or server logic changes.


## Mega Board Tournament architecture — Owner-approved independent continuity (26 October 2026)

**Decision status: DESIGN APPROVED, NOT IMPLEMENTED.** Owner clarified the Mega Board tournament hierarchy after considering Formula 1 team standings and fighting-game winners/losers brackets. This is **Mega Board only**, not a Grand Prix across different HGR games. Cross-game championships are an unrelated idea explicitly held for future consideration.

**Core gameplay invariant:** Every tournament board is an ordinary, individually played Mega Board game, including full standard property rent and bankruptcy obligations **even between two teammates**, standard player-specific cash/assets/turns, auctions, construction, trades and existing gameplay authority. Guildmates may cooperate through actions already legal for any player, but there are no teammate rent exemptions, shared wallets, pooled properties, automatic team trading, or other altered Monopoly mechanics. A two-Guild fixture may contain two simultaneous independent four-player boards, for example A1/A2/B1/B2 and A3/A4/B3/B4, and their results feed one Guild fixture. Number of boards and team lineups remain configurable design questions; the games' economic states are never merged.

**Separate tournament continuity — strict owner requirement:**

- **Tournament rankings, ratings, statistics, match results, histories and team standings have their own namespace/ledger, storage and UI.** Ordinary casual and regular Ranked Mega Board ratings, game counts, wins, awards, stats and leaderboards do not change because someone participates in a tournament. Tournament play does not contaminate or overwrite normal statistics; normal matches do not feed tournament rankings.
- Reuse the **calculation rules** already implemented for ordinary Ranked (rating-relative individual finish-position contribution, performance bonuses and earned match awards), but run them against **tournament-only prior ratings and tournament-only match results**. A player's regular Ranked rating must never be read as the initial/expected rating or used as an update destination for a tournament match; start tournament rating continuity independently, with its own record creation and progression policy.
- Every tournament participant plays as an **individual** with an independent finishing position and tournament-rating change. Guild membership links that result to a tournament fixture's team side but does not change how the game calculates rents, trade legality, game completion or personal scoring. Guild fixture outcome is derived from its participating members' **tournament-scoped** match results, not from their accumulated lifetime regular Ranked rating.
- Store permanent, deduplicated IDs for `tournamentId`, `fixtureId`, `boardMatchId`, `accountId` and `guildId` (or explicit independent team identity where eventually approved). Authenticate score writes server-side at verified board completion. Protect against repeated finish events, disconnects, rematches, name changes and replay/restore double-counting. No client-provided score overrides.
- The tournament screen should clearly distinguish **My Tournament Rating**, **Tournament Stats**, **Tournament Standings**, **Guild Fixture Results** and **Regular Ranked**. Lifetime tournament statistics and any season-specific standings should be explicitly labelled to avoid accidental blending. Never silently cross-promote results between separate ranking continuities.

**Unresolved design decisions, NOT approved as implemented:** How to combine the members' tournament rating changes into the **Guild fixture winner** (straight total versus another normalization), tie-breaks when boards split or totals tie, seeding and reserve-player substitution, guild versus independent team permissions, solo-event versus guild-event rating pooling, per-season reset rules, tournament no-show/forfeit handling, prizes, bracket progression and anti-collusion treatment. Do not invent a fixed 5-3-1-0 or 6-3-1-0 placement-points system: owner expressly chose the existing Ranked **calculation method**, applied in an isolated tournament environment.

**Release boundary:** This entry is an architectural decision record only. Existing tournament functionality remains not implemented; no API, rank ledger, room, Guild membership, database migration, UI, launcher artwork, theme or live Oracle deployment is changed by documenting the rule. Production release manifests and versioned fingerprints must be updated in an audited future implementation batch, not silently invalidated by a speculative deployment.


## 4.6.0 — Mega Board Tournament rating ledger and HGR-wide replay foundation (26 October 2026)

**Owner implementation authorization:** Begin small audited batches now. Mega Board tournaments remain **individual normal rules inside independently operating boards**, with team collaboration permitted through standard trades/actions but with no special teammate rent exemptions, property pooling or shared money. **Tournament ratings, ranks, player statistics and histories are separate from all regular Mega Board Ranked and casual continuity.** Apply the existing Ranked formula (opponent-relative individual finish, performance and awards) to a wholly independent persistent tournament account-ID ledger. A Guild fixture may combine two concurrent boards under one fixture ID; fixture scoring formula, solo vs Guild tournament rating sharing, tie-breaks, lineups and bracket progression are not yet final and must not be invented as already approved.

**New global owner requirement:** **Game replays and downloadable completed-game archives must work for ALL HGR games, not only tournaments or Mega Board.** Follow Chess.com's game-history/review/sharing/download *interaction principles*, adapted to each HGR game's mechanics and privacy, not chess PGN. Tournament fixtures link to the same HGR-wide game archives as ordinary matches. HGR-wide canonical archive format is `hgr-game-replay` v1 with game-specific replay tracks, read-only export and permission-controlled history. See [HGR_GAME_REPLAY_ARCHIVE.md](HGR_GAME_REPLAY_ARCHIVE.md) for the 14-game catalog, adapters, restrictions and implementation gates.

**Foundation implementation boundary:** Add standalone tournament-only rating persistence plus completed Mega Board result computation, account identity consistency, duplicate-finish/restart protection and tests. Add universal 14-game replay schema, native Mega Board archive converter, timeline adapter, immutable atomic per-game replay store and tests. **No server route, live match hookup, Guild fixture outcome engine, game history/download UI or non-Mega-Board visual playback adapter is implemented in this first batch.** The new modules must not affect live ordinary rooms, ranking persistence, active Guild records, existing archive files, deployment, source owner's uncommitted changes or protected launcher imagery.

**Version milestone owner correction:** The active **4.6.x** development release family builds tournament and replay foundations. Move to **4.7.x** for actual Guild fixtures, **4.8.x** for tournaments/brackets, **4.9.x** for integration and launch QA. **5.0.0 is reserved for fully actualized Mega Board Tournament Mode**, with end-to-end approved flows and owner QA; never declare 5.0.0 for a backend prototype. Read [HGR_VERSION_ROADMAP.md](HGR_VERSION_ROADMAP.md) before assigning any new feature milestone. The foundation starts candidate **4.6.0** from the last verified GitHub 4.5.12 source lineage; do not claim a new public release until independently verified.

**QA/release:** Run targeted tournament and replay tests, full HGR regression, TS, build, brand-asset regression, Windows+Ubuntu PR CI and exact signed release identity before any merge/release consideration. Keep the PR draft and source-only if gates cannot be cleared. Production deployment is separate and must be verified via live release fingerprint and zero active rooms. Do not label unreleased foundations as feature-complete.

## 4.6.1 — Mega Board personal history and report import (26 October 2026)

Candidate 4.6.1 extends PR #157's 4.6.0 foundation. This completed record supersedes provisional conversation-based labels. The existing isolated directory is retained to preserve working source.

**Implemented:** Real finished-state emission captures the final checkpoint then archives through the independent universal replay store. Private server-only room-seat account IDs are bound from the canonical authenticated join cookie, retained across socket recovery and username changes, and never looked up by display name. Legacy/guest seats are not retroactively assigned. Authenticated GET /game-history supports paged selection; GET /game-history/:id authorizes owner membership before JSON, readable text or viewer access. Room codes cannot retrieve an archive. Private ownership receipts under replays/_ownership are excluded from exports. Duplicate completion/restart cannot overwrite archives or grant additional owners. Atomic no-overwrite file linking protects independent store instances. Startup retries recovered finished rooms.

**UI:** Account panel → Game History → completed match → existing MegaReplayViewer. First/Previous/Next/Last, Play/Pause and speed controls; match outcome, duration/action/checkpoint summary; JSON/text downloads. Missing early checkpoints are explicitly labelled. Paste report and Upload .txt report support read-only review for any game, limited to 1 MB, rendered as escaped text. Imported reports are unverified, memory-only, never posted to ranking/history endpoints and cannot synthesize visual replay.

**Targeted evidence:** TypeScript passed; completion/ownership/deduplication/restart/HTTP authorization/download tests passed; real canonical account cookies + Socket.IO join tests passed (forged account payload and display name rejected, renamed account retains access, logout revokes reads). Browser tests passed at 390×844, 820×900 and 1440×900 for match selection, playback, downloads, paste/upload, script-as-text and overflow. Existing Mega Board viewer browser regressions passed. Final full regression/build/release/CI outcomes are recorded below when actually available.

**Limits and follow-on:** The retained 240-checkpoint journal is not full historical coverage. No historical ownership inference, public sharing, non-Mega adapter, bracket or Guild fixture activation. The history list scans private receipts and needs an indexed account directory before large-scale rollout. Storage errors are logged and retried on a later finished-state emission or startup recovery; persistent storage failure is not hidden as success. No public deployment claimed. Regular/tournament rating code is unchanged. Admin unanswered-feedback notification is a separately requested following batch. 4.7.x still owns playable Guild fixtures and requires owner-approved aggregation/tie-break decisions.

**4.6.1 local validation completed:** Full test:regression, typecheck, test:history (including real session cookies), test:replays:all, production client/server build, built-browser release identity and validate:release all passed on Lagz. New history browser and existing replay browser suites passed all configured phone/tablet/desktop widths. npm ci audit reported zero vulnerabilities. Production build retains the pre-existing large-bundle warning. Windows/Ubuntu PR CI is a separate pending gate until checked on the pushed commit. No deployment performed.

## 4.6.2 — Admin unanswered-feedback notification

Owner requested a visible notification when feedback has not been answered. The HGR hub now shows an owner/admin-only notification with a pending count and Review feedback action. It opens the real AccountPanel Feedback inbox and focuses the relevant item. Open and reviewing items count as awaiting action; reply marks answered and clears it, answered/closed items do not count, and reopening restores the reminder. The admin inbox prioritizes pending entries so linked items remain reachable.

The server authorizes GET /admin/feedback/notifications through the canonical account/admin resolvers and returns only count + one feedback ID, with no-store headers. No feedback body or submitter information is broadcast. The in-app hub polls every 30 seconds while visible and refreshes on focus/visibility and successful reply/status updates. A failed refresh labels a previously shown count as stale. This is an in-app hub notification, not operating-system/background push or a new gameplay overlay. Existing feedback persistence is authoritative, so reminders survive sign-in and server restarts. Notification deep links and response handling are independently tested.

Runtime checks cover nonadmin denial, metadata privacy, both submission sources, reviewing/answered/closed/reopen transitions and reload. TypeScript passed before final release validation. Browser/full-regression/build/CI evidence is recorded after completion. 4.6.1 replay ownership and export logic remains unchanged; no tournament milestone advancement or deployment.

**4.6.2 local validation completed:** Targeted feedback authorization/persistence tests and real AccountPanel browser tests passed at 390, 820 and 1440 px; inbox focus and reply-driven notification clearing verified. TypeScript, full HGR regression, production builds, rendered release fingerprint/cache/favicon checks, release integrity and diff checks passed. Replay/history/security/import tests were rerun successfully with this batch. Normal account opening still defaults to Profile; explicit feedback links select the inbox. Final pushed-commit CI remains a separate gate; no deployment performed.

## 4.6.3 — Portrait discovery hotfix

Owner screenshot showed Featured / Most Played / Recommended / Recently Played / Friends Are Playing wrapping into two rows. The cause was a later discovery CSS rule forcing wrap and visible overflow. A portrait-only override (up to 900 CSS px) now keeps the options in one horizontally scrollable row with unbroken labels, 44 px touch targets and no page overflow. Phone/tablet portrait changes only; landscape and desktop retain their existing layout. No branding or gameplay changes. The new full-style-stack browser regression checks 320/390/430/820 portrait plus 844 landscape and 1440 desktop, including horizontal scroll access to the final option. Release is source-only on PR #157; Control/main does not include an unmerged draft.

**Portrait QA:** Full CSS-stack browser checks passed at 320x568, 390x844, 430x932 and 820x1180 portrait; all five labels remain on one row, horizontal scrolling exposes the last option, and there is no document overflow. 844x390 landscape and 1440x900 desktop retain wrapping. Final TypeScript/regression/build/release checks are required before commit; no live deployment.

**4.6.3 validation completed:** TypeScript, full regression, production client/server builds, built-browser fingerprint/cache/favicon checks, release integrity and diff checks passed on Lagz. The portrait layout test passed all six viewports. Windows/Ubuntu CI will run on the pushed hotfix. No deployment or merge performed.

## 4.6.4 candidate — compact mobile Mega Board (26 October 2026)

Owner-authorized source batch on `fix/mega-mobile-compact-layout`, based on `222d1640a732e5b29cbf24c94fb936ebe1a4e8da`. Parent completed the fresh fetch/branch setup outside native capture; this Codex run verified a clean branch before editing. No commit, push, merge or deployment. No other worktree, runtime records or artwork was edited.

Shared roster CSS now uses two min-width-safe columns for spectator and participant phone cards (320/360/390/430 CSS px), wrapping full player/property names rather than clipping them. Portrait participant board-first composition extends to tablets through 1180px; landscape and desktop participant composition remains unchanged. Actual PlayerRail property-detail keyboard activation and player-only Roll, Properties/mortgage, build, Trade and debt payment callbacks remain usable. This does not grant participants spectator cash visibility.

Mobile auctions use intrinsic height capped by the viewport, with a non-growing, shrinkable roster that scrolls only when necessary. Spectators now see "Spectating" instead of "You have withdrawn"; withdrawn participants retain their own footer. Timer, bid increments/rules and withdrawal controls remain. At heights <=450px, if fixed content exceeds the available space the entire sheet may scroll, with its roster capped at 100px; controls are reachable, not guaranteed pinned in these short landscapes. A new real GameBoard fullscreen test caught an existing stale portal target: GameBoard now subscribes to fullscreenchange so an already open auction follows entry/exit reliably. Routine `.is-single-line` notices no longer reserve 42px and wrap natural text; major announcement styles are untouched.

**Captured local evidence:**
- Client/server `npm run typecheck`: PASS after implementation and fullscreen correction.
- New `test:browser:mega-compact`: 20 real-component roster cases (two roles, six/eight seats, 320x568, 360x740, 390x844, 430x932, 820x1180); long names/properties, board-before-roster, two columns, containment, keyboard property access, short/long notice geometry, participant roll/build/mortgage/Trade/debt callbacks: PASS. Thirty auction cases (active/spectator/withdrawn, six/eight seats, 320x568, 390x844, 430x932, 820x1180, 844x390), including long names, bounded sheet, no grown empty roster, final-bidder reachability, bid/withdraw handlers and rules: PASS. Actual GameBoard open-auction fullscreen entry/exit at 390x844 and 844x390: PASS after the portal fix. Wired into PR and release browser workflows.
- Existing spectator CSS browser suite: PASS all six phone/tablet/desktop sizes. Participant suite: PASS eight portrait/landscape/tablet/desktop cases, updated to expect board-first portrait tablets. Auction CSS suite: PASS five sizes. Existing real AuctionPanel suite: PASS five sizes. Real mobile integration: PASS five sizes for Lobby/Players/Properties/Trade/chat/unread/fullscreen/rotation.
- Source auction/portal regression, board portfolio/compact liquidation regression, and protected brand-assets regression (45 references): PASS.
- Targeted pause/resume, save/replay, move ledger and authoritative turn-timer gameplay regressions: PASS using a temporary TypeScript transpile loader.

**Original sandbox execution qualifications (subsequently resolved by standard parent verification below):** Standard esbuild fixture bundling failed here while scanning denied ancestor directories. The real-component results above used temporary copies of the same browser scripts with a Node filesystem/module-resolution esbuild plugin, automatic JSX and the existing local test socket stub; production components, production CSS and assertions were unchanged. Temporary harness files are not release source. Standard `npm run test:regression` stopped before the first test because tsx's `os.userInfo()` failed with `uv_os_get_passwd ENOMEM`; that sandbox attempt did not establish a full-suite pass. The targeted gameplay fallback used TypeScript transpilation instead of tsx and is not equivalent to full socket/server regression acceptance. Normal `npm run build` reached Vite but its default config bundler hit the ancestor-directory denial. Production client bundling succeeded with the supported `npm --workspace client exec -- vite build --configLoader runner`; server build passed normally. The pre-existing >500kB bundle warning remains. Parent subsequently completed those standard commands successfully outside the Codex sandbox, as recorded below; these sandbox failures are no longer open local verification gates. These are emulated Chromium/synthetic-state checks, not signed-in live multiplayer or physical-device acceptance.

Release tooling prepares VERSION 4.6.4 and generated identity/cache/package consumers. Final integrity and built-browser identity outcomes are recorded below after the documentation refresh. Native receipt `rcpt_fc27b6506bfc45d3826cdbaa860b5d4a` is observational Codex hook capture, **not independent test attestation**. Git setup and the standard parent-run tests were performed through Desktop Commander outside native capture; neither a receipt nor this reported evidence replaces parent review, CI or owner acceptance.

**Separate already owner-authorized batch — pending implementation, not awaiting new permission:** active-match notification and reconnect behavior remains separately audited work, with requirements and tests for foreground/background delivery, missed notices, reconnect reconciliation, stale-state handling and player privacy. No notification transport, reconnect logic, runtime state or server gameplay rules change in this layout patch.

**4.6.4 release validation:** Established prepare:release/validate:release tooling PASS with 562 integrity files. Production client build using Vite's runner config loader and normal server TypeScript build PASS. Built-release Chromium identity check PASS: rendered Build 4.6.4, matching browser/server fingerprint, versioned service-worker cache, favicon identity and no page errors. Final artifact fingerprint is authoritative in RELEASE.json (not copied here because this document participates in its hash). Standard parent verification below resolves the earlier local regression/default-build/fixture-bundler limitations. CI and physical-device acceptance remain distinct from local verification; no publication is claimed.


**Standard parent verification completed (outside native capture):** Parent reports exit 0 for `npm run typecheck`, full `npm run test:regression`, `npm run test:browser:mega-compact` (all 52 cases PASS), standard `npm run build`, `npm run validate:release` and `npm run test:release:browser`, executed through Desktop Commander outside the Codex sandbox. This documentation-only follow-up corroborated bounded tails of `C:/Users/elija/AppData/Local/Temp/hgr-464-{typecheck,regression,compact,build,integrity,release-browser}.log`: client/server typecheck commands, final gameplay regression PASS output, compact auction/fullscreen PASS output, completed client build and server build commands, verified 562-file integrity, and matching built-browser/server/cache/favicon identity. Exit codes and the complete 52-case count are parent-reported; bounded tails are supporting evidence, not independent exit-code attestation. The standard verification used fingerprint `hgr-4.6.4-21f44222f08936f4` and resolves the original sandbox-only failures. No tests were repeated in this follow-up. Documentation changes require prepare:release to generate a new final identity; parent will rebuild that generated identity. The earlier built-browser result must not be represented as a test of that subsequent documentation-derived fingerprint.


## 4.6.6 — Owner-approved gallery-first adaptive mobile layout for all games

**Approved term:** The owner's "tiled" mobile request means **gallery-first adaptive mobile view**, not a rigid list of shrunken tiles. Use compact adjacent responsive cards for **players, properties/assets, teams, seats and supporting game information**, with two-up phone galleries and usually three-up tablet galleries when the containing panel supports it. Reduce unnecessary page scrolling, preserve expansion/legibility/touch targets and keep physical boards, card hands, hidden information and critical action controls correctly structured. Applies to **ALL 14 catalog games**, current or added later, not just Mega Board. On 26 October the source was at GitHub 4.6.5 main; propose **4.6.6** as a coherent cross-game mobile presentation patch.

**Source foundation:** Shared responsive rules in `client/src/index.css` apply directly to existing React-rendered collections: Mega player/spectator and property galleries; Poker, Blackjack, WHOT, Ludo, Hidden Dictator, Connect Four, Word Game, Password, Anagrams Race, Cheat, Dominoes, Ayo and Word Board. Existing Word Game metrics preserve their two-column gallery. No new fabricated art, replaced canonical H, new permissions or gameplay-rule changes. Game-specific board/turn geometry stays independent. `tests/browser-gallery-all-games-4.6.6.mjs` checks authoritative catalog coverage, five phone/tablet viewports, player actions, two-up owned-property views and no horizontal overflow. See [HGR_MOBILE_GALLERY_FIRST.md](HGR_MOBILE_GALLERY_FIRST.md) for the detailed design contract and remaining real-gameplay acceptance.

**Gate:** Source browser smoke-tests are not evidence that every real game has been fully played end-to-end on mobile. Require typechecks, full regression, Windows/Linux CI, branded assets, release identity and real-device review before marking broadly accepted or deployed. All work done in an isolated Git worktree; previous #158 Connect Four PR and owner's untracked materials remain protected.


## 27 October 2026 — GitHub public naming and owner-PC release checkout separation

**Owner decision:** Chat conversation installment numbers are internal coordination metadata. New public branches, pull-request titles, release notes, commit subjects and documentation headings should use meaningful HGR features and semantic versions instead of numerical conversation identifiers. See [HGR_PUBLIC_GITHUB_NAMING.md](HGR_PUBLIC_GITHUB_NAMING.md). New PRs are checked by the pull-request validation workflow; existing open PRs and historic references are preserved rather than force-deleted or rewritten.

**PC update repair:** Lagz's primary checkout still belongs to an active development feature branch at an older version and contains untracked approved branding-reference and private notification files. On 27 October a separate clean `main` worktree was created at `%LOCALAPPDATA%\Halieus Game Room\Release Checkout`, safely fast-forwarded to 4.6.6. Only the owner Start Menu `HGR - Update` shortcut was repointed to the clean checkout, with its prior .lnk backed up in `%LOCALAPPDATA%\Halieus Game Room\shortcut-backups`. The original development checkout, branch, untracked data, running HGR games, Control bridge and credentials were not changed; the updater/deployer was **not run**. The Control cloud agent still reports the old development installation until a separate audited agent update/refresh, which must not be conflated with the clean release checkout version.

**Scope boundary:** Historic Git branch names, old PR URLs, immutable commits and technical files referring to past conversation installments still exist. Renaming/deleting them is not required for this safe policy batch and must be individually reviewed for open PRs/worktrees, downstream references and release fingerprints. Documentation-only source changes require regeneration and verification of the signed HGR release identity and successful Windows/Ubuntu CI before merging; do not deploy for a naming-only PR.


## 4.6.6 operational maintenance — Windows release checkout dependency bootstrap (27 October 2026)

**Owner incident:** The newly isolated Windows HGR release checkout on `main` successfully generated/verifed the signed release fingerprint, but the next `npm run typecheck` failed because `tsc` was not recognized. A Git worktree includes tracked source files **but not ignored node_modules**, so the existing updater incorrectly assumed dependency installation was shared with the owner's original development checkout.

**Verified immediate recovery:** `%LOCALAPPDATA%\Halieus Game Room\Release Checkout` was audited on `main` with absent `node_modules\.bin\tsc.cmd`, `node_modules\.bin\vite.cmd` and `node_modules\tsx\package.json`. Installed lockfile-approved dependencies with `npm ci --include=dev --no-audit --no-fund` **only** in that release worktree. Both client/server TypeScript checks and signed 4.6.6 release-integrity validation passed; Git was clean. No owner game, Control bridge or development worktree was touched and Update+Deploy was **not** restarted automatically.

**Durable updater fix:** Immediately after the current updater has fetched/synced `main` and restored any missing tracked protected assets, `Update HGR GitHub.cmd` now performs `STEP 1B`. It checks for TypeScript, Vite, TSX and the installed npm dependency tree; where incomplete, it runs reproducible `npm ci --include=dev --no-audit --no-fund` locally before release identity/typecheck/build. Installation failure or missing tools stop the updater before any commit, push or Oracle deployment. It never installs global tools, touches another checkout, overwrites artwork or bypasses release validation.

**Regression evidence:** `tests/runtime-windows-update-dependency-bootstrap.mjs` statically checks updater ordering and, on Windows, exercises the actual extracted CMD gate with a mocked local npm executable. It verifies five states: fresh checkout, already installed tree, stale installed tree, install failure and partial install. It is imported by the established Cloud Update regression suite so both Windows and Ubuntu CI cover policy and Windows executes the real command-prompt fixture. Follow with typecheck, full regressions, branding checks, build, signed release fingerprint and both CI systems before merge.

**Release boundary:** This is a **4.6.6 operational repair to the updater**, not a new gameplay feature and not the separately planned 4.6.7 Join/Control fullscreen patch. No website deployment is implied by merging the updater guard. The corrected updater will be available locally once the clean release checkout fast-forwards to the approved merged code; the existing manual dependency recovery already eliminates the immediate `tsc` blocker.


## 4.6.6 operational maintenance — Manual Oracle SSH key selection (27 October 2026)

**Owner incident:** HGR Update correctly synced source, prepared the signed 4.6.6 release and produced a complete 572-input Oracle deployment package, but its manual fallback executed the tracked helper with `-UseDefaultSshAuth`. On Lagz, Windows `ssh-agent` is disabled and has no loaded identities, so Oracle refused `scp` with `ubuntu@145.241.205.106: Permission denied (publickey)`. The source upload failed and no deployment was completed. The extra package lines indicating stale/untracked test files were defensive skipping messages, not the SSH authorization failure.

**Root cause confirmed without disclosing credentials:** The owner-only `%LOCALAPPDATA%\Halieus Game Room\owner-update.json` stores a key path, and that key is present under the owner's existing Windows SSH storage **outside the HGR Git worktrees**. A read-only `ssh -i [saved key] -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes ... 'printf HGR_ORACLE_AUTH_OK'` returned success (exit 0) against the existing Oracle host. No key bytes, path or owner-only JSON were committed, copied into HGR, or printed. Do **not** enable/reconfigure ssh-agent or generate another key to solve this incident.

**Durable source fix:** `Update HGR GitHub.cmd` manual fallback now invokes `scripts/windows/manual-oracle-deploy.ps1`, which uses the same explicit environment override and owner-approved private `owner-update.json` key-location policy as the authenticated Cloud Update helper. It validates private-key file presence and a supported OpenSSH/PEM header, delegates `-KeyPath` to the existing, verified tracked Oracle deploy helper, and propagates failure. It refuses Cloud/non-interactive callers, never scans folders, opens an interactive picker, logs private key values, alters ssh-agent, or changes real deployment gating. The preferred owner-private `update-website.ps1` remains untouched and takes precedence when actually present; the Cloud Update branch is unchanged.

**Verification:** `tests/runtime-manual-oracle-credentials-4.6.6.mjs` tests the actual PowerShell resolver with a strictly local mock deployment helper, covering saved credential, environment override, missing/inaccessible key, malformed key header, corrupt config, rejection of Cloud mode and helper failure propagation. There is no real SCP, SSH upload or deployment in those tests. This new suite is integrated with `tests/regression-cloud-oracle-4.5.5n.mjs` and will run on Windows+Ubuntu, followed by full regression, typecheck, build, browser release identity and signed integrity. **Owner's published HGR still requires explicit controlled deployment and zero-live-game safety checks; merging the fix alone does not deploy the site.**

**Release identity:** This is a maintenance repair within existing **4.6.6**, not a new gameplay milestone. **4.6.7** remains the separately proposed flat Join button + Control fullscreen patch. Keep HGR GitHub public naming version/feature-based and do not reference conversation installment numbers in branch names or PR titles.


## 4.6.7 — Control window-action clarity, Update spinner isolation and immediate earned-access refresh

**Owner-reported defects:** Start and Restart operations on Lagz incorrectly triggered the Update tile's spinner even though no updater ran. Control's generic "Close HGR" wording misleadingly suggested the Oracle domain would become unavailable. The user's verified Gamer Score and unlockable Themes/Cosmetics sometimes stayed locked or stale after reaching their requirements.

**Actual launcher authority (source audit):** `Start Halieus Game Room.cmd` opens the *public* HGR website in a dedicated Microsoft Edge app profile. `Restart Halieus Game Room.cmd` closes and reopens that local Edge profile with a cache-busting URL. `Close Halieus Game Room.cmd` terminates only matching local Edge profile processes and exits successfully even if no matching window was running. NONE of those launchers starts, stops or restarts the Oracle server; the Control Agent's fixed commands call those launchers. The user-visible Control cards/confirmation now say **Open HGR Window**, **Restart HGR Window**, **Close HGR Window**, and explicitly state the public domain remains online. Never claim a Close command has closed the domain.

**Visual operation bug:** Shared operation tracking must disable conflicting actions for safety, but Update's spinning icon and "Update in progress" status now activate only for an actual Update request or a server-verified running operation whose `action === "update"`. Start/Restart/Close keep their own status/history and never impersonate Update. This does not alter privileged lifecycle routes or execute any process during tests.

**Unlockable refresh:** Verified Theme entitlement and Cosmetic entitlement views now refresh when opened, on app focus/visibility, and in a bounded set of follow-up checks (0.4/1.5/4/8 seconds) after a received game-finished notification. Account Gamer Score likewise updates while its account panel is mounted. The finished-game event still cannot grant awards by itself; all unlock decisions remain solely with the authenticated server's completed-session progression and (where applicable) live Ranked ratings. One temporary fetch failure does not silently wipe previously displayed earned access. Explicit **Refresh earned themes/cosmetics** controls provide a manual recovery path. The game-finished activity event now dispatches even if localStorage is unavailable. This does not change achievement thresholds, beta exemptions, account ownership or any game rules.

**Separate owner proposal — NOT implemented or approved as downtime:** A future **Close Public Game Room / Reopen Public Game Room** cloud maintenance mode may show a visitor maintenance message while preserving authenticated Control. It needs a distinct owner-only control, server-authoritative mode state, live-room protection, rollback/reopen, cache/PWA treatment and an operations audit. Do not conflate this with local window Close or silently stop the Oracle process. No production downtime was initiated in this batch.

**Validation:** Focused progression and browser Control-spinner checks plus full typecheck, HGR regression, Windows/Ubuntu CI, built browser release fingerprint and canonical artwork/integrity gates are required before merge. The first isolated candidate uses version **4.6.7** and a descriptive GitHub branch without chat installment identifiers. Do not claim live deployment from a local source-only PR.


## 4.6.8 — HGR notification delivery parity and activity roadmap (28 October 2026)

The owner approved learning from the independently hosted **Logic & Philo** v1.3.0 notification experience, especially its opt-in reminders, test button, inbox and service-worker deep links. HGR has a different multi-account, multi-game use case: **friend online**, **friend joined game**, **room invitation**, **your turn** and event-based notifications. HGR already supports opt-in per-account VAPID push for invitations and guild messages, but lacks a user-triggered delivery test and dedicated account-safe presence and turn alert classes.

First, introduce a **Test notification** button in existing HGR device settings and a 30-second-limited, authenticated test route that can target only the current signed-in account's registered push endpoint; never copy Logic & Philo keys, storage, users or timing. The test only confirms acceptance by the browser gateway, not actual device display.

Follow-up work must use authoritative identity/room membership with privacy and deduplication: don't identify account holders from nonunique player display names, don't alert for hidden/unknown friends, don't announce historical online state on startup, and don't leak private chat/roles in lock-screen notifications. Preserve current 14-game rules. See [HGR_NOTIFICATION_DELIVERY_PARITY.md](HGR_NOTIFICATION_DELIVERY_PARITY.md). This is a deliberately isolated first batch; public gameplay and production deploy remain unchanged until audited acceptance.


## 4.6.9 — Account-verified social activity and notifications

The HGR Game Room now has an authenticated `/accounts/social/activity` source for **friends and shared-guild contacts** across all 14 games. Every game room's server-side summary can carry verified account IDs resolved from the authenticated connected player's socket; guests, AI, Beta sessions and disconnected players cannot impersonate social contacts. The public `/accounts/live-games` response expressly strips the internal ID list. The social activity endpoint restricts results to the existing social-directory visibility/hidden-profile policy, with no private cards, secret roles or reconnect tokens.

The mobile-friendly HGR Inbox gets per-account recent friend-online and friend-entered-game notices, unread counts, mark-read and clear actions, and Join/Watch buttons only when the current live room permits. The Friends tab's "In game" filter, actionable player cards and Friends-are-playing discovery shelf use the verified account-to-room mapping rather than same-name guesses. The first poll establishes a baseline; stable polling, renames, offline transitions and unrelated rooms do not fabricate notices. Presence refreshes on focus and every ten seconds while the page is visible. The view is **in-app**, not yet a background lock-screen friend-status subscription.

This follows the existing Logic & Philo opt-in notification experience's useful Inbox and delivery-verification conventions without importing its separate credentials, data, VAPID keys or subscriptions. HGR's signed-in device push test was independently merged in 4.6.8. A future separate owner-approved maintenance control may show a public visitor-closed screen without stopping Control; **the owner-PC Close command still closes only its isolated browser window**.

See [HGR_SOCIAL_ACTIVITY_NOTIFICATIONS.md](HGR_SOCIAL_ACTIVITY_NOTIFICATIONS.md) and `tests/runtime-social-activity-notifications-4.6.9.mjs`. Source-only candidate; release and device acceptance require audited typecheck, tests, Windows/Ubuntu CI and separate safe deployment. No active public rooms were closed by this change.

## 4.6.10 — Owner-confirmed public visitor maintenance mode

A separate public website closure/reopen control has been designed and implemented independently of the existing Open/Restart/Close **HGR Window** buttons. Closing changes the Oracle server's **visitor gate** to an uncached HTTP 503 maintenance page and rejects new public game sockets, without stopping the server or authenticated owner Control. The service refuses closure when any of the 14 game types has an active room. The owner can log in via the maintenance page and reopen from Control; private persisted state survives process restarts. Typed confirmation, same-origin JSON, owner-only authentication, audit and private data storage are required. No live site closure is performed in source development.

See [HGR_PUBLIC_MAINTENANCE.md](HGR_PUBLIC_MAINTENANCE.md). The public gate must be audited and accepted after Windows/Ubuntu CI and real mobile/desktop testing, and must not replace or contradict the existing transient deploy/restart maintenance notification mechanism.

## 4.7.0 — Invited non-scoring Beta tournament practice (29 October 2026)

Owner-approved Beta Test Lab now has a source candidate for authenticated
owner/admin-created Mega Board practice games with real non-admin invitees
and AI opponents. An ordinary account can accept an existing HGR Inbox
invitation without gaining Beta/admin privileges; uninvited entry is
rejected by the server. The entire room is labelled test-only, with no
Ranked/Tournament result, Gamer Score, achievements, normal personal stats,
Guild result projection or permanent match replay. Recoveries require the
original signed-in account plus the seat token; test results stay private
to participants. This is **not** an official Guild fixture, bracket or live
tournament release. See
[Beta Tournament Practice acceptance](HGR_BETA_TOURNAMENT_PRACTICE.md).

## 4.7.0 — Immutable real-match Guild results (29 October 2026)

The existing two-board Guild candidate now captures actual completed Mega
Board outcomes, not merely lobby bindings: verified winner account/Guild,
finish positions and immutable one-time receipts persisted for both boards.
The combined fixture status becomes completed and exposes each Guild's
verified board-win count. A 1–1 split is intentionally unresolved pending
an approved tiebreaker; no tournament F1 or Elo rewards are triggered.
Server identity and duplicate-finish safeguards have integration tests.
This is not yet a released version; Guild-facing approval/binding UI,
end-to-end owner acceptance and deployment are pending. See
[4.7 Guild fixture documentation](HGR_GUILD_FIXTURES_4_7.md).

## 4.7.0 — Real two-board Guild fixture binding (29 October 2026)

Second staged source batch: authenticated Guild manager binds an approved
two-board fixture to **two real populated Mega Board lobbies**. Server checks
actual signed-in account seats against frozen lineups, rejects extra/AI seats,
requires ordinary unrated non-Blitz games and captures separate room identity,
creation timestamp and boardMatchId. Standard Mega Board join, AI-add and
host-start handlers enforce the locked roster; both boards can start as
independent normal games with ordinary teammate rent/property rules. The
Guild fixture still has no settled team result, fixture finish ingester,
automatic tournament rating award, mobile launcher/status UI or production
acceptance; therefore this is not a finished 4.7.0 release. See
[Guild fixture progression](HGR_GUILD_FIXTURES_4_7.md).

## 4.7.0 milestone development — authenticated two-board Guild fixture proposals (28 October 2026)

The first isolated **4.7.0 candidate batch** adds a durable Guild-v-Guild
Mega Board fixture proposal and two-board roster locking service, using the
existing Guild membership authority. A Guild owner/admin submits its own
lineups; the opposing Guild owner/admin must separately authenticate and
approve its own members. Duplicate people, cross-team overlap, invalid Guilds
and over-capacity boards are refused. Either Guild manager can cancel before
actual board launch. The fixture file is separate from normal Guild messages,
sessions, and all Ranked/tournament scoring stores. It is source-only and
does **not** create a live game or claim a 4.7.0 public release.

The **4.7.0 advancement gate remains unchanged**: two independent real
Mega Board matches per locked Guild fixture, trusted seat and game IDs,
normal rent/property rules, verified outcomes, team scoring and tie policy,
safe reconnect/cancellation, usable Guild UI, full regression and
owner/physical-device acceptance. The repository VERSION remains 4.6.10
during this staged work. See [4.7 fixture implementation](HGR_GUILD_FIXTURES_4_7.md)
and [version roadmap](HGR_VERSION_ROADMAP.md).
## Control 4.6.11 candidate — Portrait fullscreen and off-app Update progress (29 October 2026)

Separate focused 4.6.11 VERSION candidate from the draft 4.7.0
tournament branch. Merged main remains 4.6.10 pending validation.
Control must expose its Full Screen action in portrait on Android, even when
opened as an installed PWA and the Fullscreen API exists. Unsupported
devices keep an honest disabled explanation. Owner/admins can optionally
enable Control-scoped Android/browser Web Push alerts from Operations,
reporting actual owner-PC update progress milestones and terminal outcomes
after switching apps. This requires permission, a valid account-bound device
subscription, and authenticated agent reports; there is no fabricated
background polling or continuously running OS progress indicator. The
persistent Control operation status/history remains authoritative.
The push title/body omit local paths, credentials and failure diagnostics;
an unprivileged player cannot subscribe. Control art, launcher H, unrelated
games and 4.7.0 Guild fixture work are untouched. See
[Control portrait and off-app update acceptance](HGR_CONTROL_BACKGROUND_UPDATES.md).

## 29 October 2026 — Unified 4.7.0 release candidate (supersedes staged-slice status)

The previously separately reviewed Control PR #170 passed Windows and Ubuntu CI
and was merged to main at 453c4fe. Its portrait Full Screen and opt-in
server-sent Update notifications are retained in the combined 4.7.0 branch.
The VERSION file now reads 4.7.0, and the signed build includes both.

Guilds now exposes a mobile-responsive Tournaments tab. Guild managers can
copy/share their Guild ID, propose two human Mega Board lineups (one Guild
member per board in the initial UI), approve an opposing challenge, bind two
existing ordinary Mega Board lobbies, open the boards, and read immutable
per-board winners and team board-win counts after they finish. The server
permits richer 2–8-seat boards, but the initial UI deliberately uses one
participant from each Guild per board. Guild ties (1–1) remain unresolved.
Regular Ranked and tournament rating stores are never modified by a fixture;
F1 standings, brackets, automatic matchmaking, forfeit resolution and wider
team compositions remain later-milestone decisions. Owner Beta practice
allows invited ordinary players and AI without changing official progression.

This is an audited 4.7.0 SOURCE RELEASE CANDIDATE, not a confirmation that
Oracle is updated or that the owner has playtested the Android PWA. The final
gate is complete regressions, signed release/build/browser identity, Windows
and Ubuntu CI, then safe owner-controlled deployment and on-device checks.
All HGR launcher artwork retains its reference geometry; no public-Game-Room
service interruption or automatic deployment is authorised by this document.
## 4.7.0 - Control lifecycle versus Update presentation isolation (29 October 2026)

Owner confirmed that Open, Restart and Close owner-PC window controls were
still showing deployment-style updating progress. The unified 4.7.0 candidate
now gives every operation its own authoritative action identity:
only action=update displays software deployment percentage, pulsing progress
track or Update tile spinner. Open, Restart and Close retain their real
lifecycle receipts and show static action-specific glyphs, no updater bar
and no guessed download/deployment progress. Unknown operation actions cannot
silently default to Update. The display uses server-reported action/status;
the actual commands, remote window semantics and Oracle website remain
unchanged. Cache-busting of Control JS/CSS forces the corrected user interface
to be fetched on the next deployment. The new runtime UI test exercises
start/restart/close/update/unknown states and runs on both CI platforms.
This does not mean the public site has been deployed or phone-tested.
## 4.7.0 — Public maintenance control usability and verified visitor closure (29 October 2026)

The owner confirmed that typing a maintenance reason into Android's separate
browser confirmation prompt silently prevented closing public visitor access.
Control previously required the exact literal `CLOSE PUBLIC GAME ROOM` in
that prompt despite showing an independent **Reason shown to visitors** field.
The 4.7.0 correction removes the misleading prompt: the reason remains in the
textarea, and the owner performs one explicit confirm dialog. The secure
owner-only server endpoint retains its exact action confirmation token, the
same-origin mutation guard, live-room refusal, persisted closure and reopen
semantics; neither button runs a software Update or closes the laptop window.
After the server acknowledges closing, Control performs a fresh same-origin
HTML request and requires an actual HTTP 503 maintenance response before
presenting the closure as verified. Reopen likewise checks for ordinary HTTP
success. Probe discrepancies and server 409 failures remain visible after
status refresh; the app does not claim that visitors are blocked if the public
proxy still serves a normal game page. Source tests exercise a real click
sequence and a local HTTP/Socket.IO server, not Oracle production. Deployment,
owner/mobile acceptance and restoration of public access remain explicit steps.

## 4.7.1 — Control typography parity and operation-scope design (29 October 2026)

Owner accepted the live 4.7.0 visitor maintenance gate after confirming the
distinct public closure page in a separate browser window. The next patch is
a restrained **Control Operations presentation** refinement, not an artwork
replacement, action semantics rewrite, new release manager or change to the
physical HGR launcher icon family. It keeps the approved current HGR
typography roles: **Unbounded Variable** = major headings, **Righteous** =
secondary headings, **Varela Round** = body, controls, forms and navigation,
**Alata** = small captions, effect explanations and compact metadata.
Control self-hosts these same already-licensed font faces at its scoped
`/control/fonts/` paths. The font selection and type hierarchy come directly
from the existing 4.5.5c Balanced HGR website role policy, not an invented
Control-only branding design.

Within Control → Operations, actions are now separated into three honest
surfaces: (1) **Laptop · Lagz**, for Open/Restart/Close of that device's
dedicated browser window; (2) **Software update**, for the existing approved
deployment and its own progress/notification controls; and (3) **Public
website access**, for the visitor-facing HTTP 503 maintenance gate and
Reopen. Each laptop action has an immutable plain-language effect statement
and a separately dynamic bridge-readiness line. These preserve all four
`data-operation` IDs and original backend authentication, owner approvals,
mutual exclusion, server-authoritative receipts, update spinner isolation,
zero-live-room public maintenance guard and Control reachability during
closure. The three-window group has responsive 3/2/1-column layout at desktop,
tablet and mobile sizes; the updater remains a separate full-width surface.
At 320px, labels and buttons must stay readable and tappable without
horizontal clipping. No canonical H or launcher artwork was changed.

**Acceptance:** Playwright renders Control Operations at 320, 390, 820 and
1440px to verify four exact action IDs, separate update control, real font
families and no overflow. Existing 4.7.0 Control action/maintenance tests,
typechecks, full regressions, browser identity, signed release integrity
and Windows/Ubuntu CI must remain green before a controlled 4.7.1 Oracle
deployment. Physical Android PWA layout and owner confirmation remain a
separate final user acceptance step.

## 4.7.2 — Control Overview source-version honesty and first activity sample (29 October 2026)

**Observed by the owner after deploying 4.7.1:** Control → Overview showed
**Owner PC: Lagz · HGR 4.5.6** as Online alongside **Public Game Room:
Version 4.7.1**. The values are not necessarily competing release
identities: the outbound Control bridge reports `device.hgrVersion`
from the original, independently maintained owner-local game/source checkout
(`HGR_CONTROL_GAME_ROOT` in `server/src/control-agent.ts`, `buildStatus()`),
while the website version comes from Oracle `/health`. The dedicated
Windows **Release Checkout** had separately fast-forwarded and verified
against GitHub `main` at 4.7.1. The older game/source checkout was
deliberately preserved to avoid damaging its development changes.

**Scoped UI correction:** Keep all three infrastructure states and their
actual health signals unchanged. The Owner PC's first line now says
**Lagz · Control bridge**, and an explicit second line labels the distinct
**Local development source: 4.5.6 · not the public release** (or the
current agent-reported version). The Public Game Room row continues to
use independently fetched, authoritative `/health.version`. Do not
silently report the Oracle version as a local source version, change
`HGR_CONTROL_GAME_ROOT`, overwrite the owner's older working tree, or
treat a green bridge as evidence of local/website release parity.

**Chart correction:** The rolling activity graph only drew `polyline`
elements, which are visually empty with exactly one data point. Show
real samples as coloured data-point markers even before a second
observation; show a neutral "Collecting activity history" label until a
trend is possible and "Awaiting first live sample" when truly empty.
Once two or more observations exist, draw the actual existing
connections/players/rooms polylines with latest-point markers. No
dummy zero samples, fabricated history, or back-end metrics are added.
Preserve the current two-second live collection and the 31-sample cap.

**Acceptance:** Isolated runtime test executes the real chart renderer,
checks empty/one/two real samples, and audits truthful independent
version semantics. Existing Control, PWA, fonts, artwork, Guild,
tournament and maintenance fixes remain protected. Run complete
regressions, production build, release integrity, browser identity and
both operating-system CI jobs before declaring 4.7.2 ready. This
documentation describes a development candidate until merged/deployed
and independently verified on the public website.
