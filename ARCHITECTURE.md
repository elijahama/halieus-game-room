# Halieus Game Room architecture — 4.5.2

## Runtime structure

React/TypeScript renders a shared platform shell and isolated game screens. App.tsx coordinates authentication, route detection, saved-seat recovery and Socket.IO subscriptions. The shared directory holds transport and game-state contracts. Express owns account/admin HTTP routes; Socket.IO dispatches game actions to each server module. Servers validate membership, turn and phase before broadcasting viewer-specific state. Clients render authoritative results.

The game catalogue contains 14 active entries. Mega Board has separated handlers, state, AI and rule utilities. Most other games use larger handler modules. Blackjack and WHOT register their rebuild modules; older implementations in the documentation archive are historical references.


## Guilds and persistent social state

Guilds is a platform subsystem rather than a game module. Persistent guild state is exposed through authenticated Express routes and stored under the durable Halieus data root. It contains membership, roles, one persistent chat, room reservations, guild room history and the internal guild leaderboard.

Guild permissions are server-validated. The browser can hide or show controls, but owner/admin/moderator/member authority is decided by the Guild service using the authenticated HGR account.

Guild-created rooms do not introduce a second game server. A Guild reservation allocates a normal HGR room code and the client opens the existing game setup using that code. Socket.IO game modules remain authoritative once the room is created.

Completed games reach Guilds through the canonical session archive. After the final session archive is safely written, a matching game + room-code reservation can be projected into guild history. A failure in that social projection must not invalidate the canonical game result.

Guild data follows the runtime-data rule:

```text
HALIEUS_DATA_DIR/
└── guilds/
    └── guilds.json
```

Local development falls back to `server/data/guilds/guilds.json`.

## Arrival and recovery

index.html applies the persisted theme and displays a boot curtain before React loads. Auth resolution reveals either the account portal or a usable application screen. Signed-in home visits mount HomeScreen underneath a once-per-session intro. Its automatic timer requests an exit; a separate effect owns the fade-completion timer. Parent clock/socket renders cannot cancel completion. The home subtree is inert while covered.

Direct joins, game links, spectators and saved-seat recovery bypass the intro. Marking the intro seen is best-effort session storage; React state completes the current transition without reloading. Theme ownership remains in the existing document/app theme flow.

Reconnect tokens identify seats. Mega Board migrates socket-dependent player references while retaining absolute timer deadlines. Other games define their own public projections and reconnect lifecycle. HGR account identity is authoritative for persistent social systems such as Guilds; live game seats still retain their existing game-specific reconnect/display-name lifecycle.

## Platform navigation, progression and identity

The desktop shell and signed-in mobile shell share the same platform destination hierarchy: Home, Games, Players, Rankings, Guilds and Inbox. Join Game remains a global action rather than a page-navigation destination. Mobile uses a six-destination bottom bar, while Join stays reachable from the fixed top bar and the existing navigation drawer.

Appearance state has separate responsibilities. The active colour theme owns platform chrome and game atmosphere tokens; player profile colour remains an identity concern. Logo style is persisted independently so changing theme does not overwrite an explicit Halieus logo choice.

Achievements and Gamer Score are account-wide progression systems separate from competitive rating. Gamer Score is derived from verified completed achievement values. Ranked competition remains game-native rather than being collapsed into one universal Elo model: Connect Four uses human-vs-human ranked series, Ludo uses human-only placement-aware ranked comparison, and Ayo uses human-only ranked duels with captured-seed differential retained as a secondary statistic. Standings are rebuilt from finalized verified Ranked session archives and exclude Beta play.

The standard HGR browser tab, shortcut favicon and installed PWA/Apple-touch identity use the approved rendered reference PNG. Supported game contexts may temporarily switch the tab identity to the current game's icon. The live in-app H remains canonical themeable vector geometry. Regression coverage prevents generated/simple favicon fallbacks or runtime redraws from replacing the approved reference artwork.

Apple touch devices use a guarded fullscreen policy rather than assuming desktop fullscreen behavior. Touch presentation also reduces expensive backdrop/animation work where needed for responsiveness.

## Release and deployment

VERSION and all workspace versions identify the current 4.5.2 release line. RELEASE.json records a source fingerprint, generated into shared/release.ts and exposed by /health. Start and Restart launch the app; Update is the explicit deployment operation. The updater builds a candidate and checks its release identity before activation. Provisioning remains separate. Runtime data must live outside the application release tree.

Run npm ci, npm run typecheck, npm run test:regression, npm run prepare:release, npm run build, and npm run test:browser. Install the test browser with npx playwright install chromium. Regenerate release identity before the final build. Historical tests may assert retired versions and layouts; they are not all current release gates.

## Layout and maintenance boundaries

Game icons come from the shared catalogue and GameBrandIcon fallback. Create/join overlays use portals so fullscreen and transformed ancestors do not trap them. Ludo and Poker retain their existing protected layouts. Mega Board observes its available frame rather than applying a global zoom override.

App.tsx and the accumulated stylesheet remain large. Split orchestration and game bundles incrementally under behavioral tests rather than through an unbounded rewrite. The 4.0.0 audit remains useful historical context; 4.1.0 extends the shared platform with persistent social state.
