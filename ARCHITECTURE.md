# Halieus Game Room architecture — 4.0.0

## Runtime structure

React/TypeScript renders a shared platform shell and isolated game screens. App.tsx coordinates authentication, route detection, saved-seat recovery and Socket.IO subscriptions. The shared directory holds transport and game-state contracts. Express owns account/admin HTTP routes; Socket.IO dispatches game actions to each server module. Servers validate membership, turn and phase before broadcasting viewer-specific state. Clients render authoritative results.

The game catalogue contains 14 active entries. Mega Board has separated handlers, state, AI and rule utilities. Most other games use larger handler modules. Blackjack and WHOT register their rebuild modules; older implementations in the documentation archive are historical references.

## Arrival and recovery

index.html applies the persisted theme and displays a boot curtain before React loads. Auth resolution reveals either the account portal or a usable application screen. Signed-in home visits mount HomeScreen underneath a once-per-session intro. Its automatic timer requests an exit; a separate effect owns the fade-completion timer. Parent clock/socket renders cannot cancel completion. The home subtree is inert while covered.

Direct joins, game links, spectators and saved-seat recovery bypass the intro. Marking the intro seen is best-effort session storage; React state completes the current transition without reloading. Theme ownership remains in the existing document/app theme flow.

Reconnect tokens identify seats. Mega Board migrates socket-dependent player references while retaining absolute timer deadlines. Other games define their own public projections and reconnect lifecycle. Account identities and game display names are not yet a unified identity system; see the audit before expanding authorization features.

## Release and deployment

VERSION and all workspace versions remain 4.0.0. RELEASE.json records a source fingerprint, generated into shared/release.ts and exposed by /health. Start and Restart launch the app; Update is the explicit deployment operation. The updater builds a candidate and checks its release identity before activation. Provisioning remains separate. Runtime data must live outside the application release tree.

Run npm ci, npm run typecheck, npm run test:regression, npm run prepare:release, npm run build, and npm run test:browser. Install the test browser with npx playwright install chromium. Regenerate release identity before the final build. Historical tests may assert retired versions and layouts; they are not all current release gates.

## Layout and maintenance boundaries

Game icons come from the shared catalogue and GameBrandIcon fallback. Create/join overlays use portals so fullscreen and transformed ancestors do not trap them. Ludo and Poker retain their existing protected layouts. Mega Board observes its available frame rather than applying a global zoom override.

App.tsx and the accumulated stylesheet remain large. Split orchestration and game bundles incrementally under behavioral tests; a bulk rewrite is outside this corrective release. See docs/AUDIT_4.0.0.md for prioritized findings and deferred work.
