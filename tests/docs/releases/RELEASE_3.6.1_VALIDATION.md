# Halieus Game Room 3.6.1 validation record

The 3.6.1 package is gated by `tests/regression-3.6.1.mjs` plus release fingerprint verification.

## Protected hashes

- Ludo screen: `b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f`
- Ludo server handler: `af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786`
- Poker screen: `ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18`
- Poker server handler: `be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be`
- Frozen 3.5.27 rollback ZIP: `a71d846fe68d237b3ba6a82ca30550d1038791efa439cc3bbf83a782f86fd237`

## Static release checks

The regression gate checks:

- all package/version entries are exactly 3.6.1;
- Start/Restart contain no updater, Oracle deploy or SSH path;
- the frozen 3.5.27 ZIP exists and matches its hash;
- approved Ludo/Poker gameplay files match their protected hashes;
- Create/Join use viewport portals;
- profile precedes Home navigation in the sidebar;
- System/Light/Dark theme support is present;
- native game-invite server/client paths exist;
- Mega Board uses measured min(width,height) sizing and no global CSS zoom/scale hack;
- Games, Players, Blackjack, Poker chat, Connect Four chat/markers, WHOT and Owner fixes remain scope-specific;
- the final 3.6 CSS contract does not target Ludo;
- no private `.key`, `.pem`, `.ppk` or `.pub` file is present in the distributable source tree.

## TypeScript syntax gate

All `.ts` and `.tsx` files under `client/src`, `server/src` and `shared` are parsed/transpiled with TypeScript as an additional syntax check before packaging.

## Production build caveat

The packaging environment may not have network access to restore npm dependencies. The Oracle updater therefore remains the authoritative production compilation gate: it performs `npm ci` and `npm run build` in a candidate directory before replacing the live application. A failed candidate build never activates.

## Oracle package completeness gate

Before any SCP/SSH deployment, the Windows updater validates the generated Oracle source ZIP against `RELEASE.json.integrityFiles` and required build configuration files. This specifically prevents the previous `Release integrity input missing: tests/regression-3.6.1.mjs` failure from reaching Oracle.

## Consolidated report validation

- [x] Ludo client/server protected hashes unchanged.
- [x] Poker gameplay client/server protected hashes unchanged.
- [x] Update/deployment protected hashes unchanged.
- [x] Mega Board Autopilot is in-flow beside Status on desktop and cannot create a second metadata row.
- [x] No CSS `zoom` or global `transform: scale()` was introduced.
- [x] Desktop Game Room sidebar remains fixed to `100dvh`.
- [x] Blackjack near-rail seat geometry is constrained above the viewport edge.
- [x] Connect Four / Poker / Blackjack / WHOT Live Room panels are scoped to their game surfaces.
- [x] Ludo selectors are absent from the final report CSS block.
