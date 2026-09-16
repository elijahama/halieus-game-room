# Halieus Game Room 3.5.3

Release date: 2026-08-30

## Owner-facing launch controls

- `Start Halieus Game Room` opens the secure production website at `https://halieus.remotewire.net` in the dedicated persistent Halieus website window.
- `Restart Halieus Game Room` closes that dedicated Halieus website window and reopens a fresh HTTPS copy with cache-busting. It does not restart Oracle.
- `Close Halieus Game Room` closes only the dedicated Halieus website window.
- The maintained workspace no longer includes the old `dev-tools/Local Development` launcher set. No owner-facing launcher starts or navigates to localhost.

## Reload / first-paint correction

The remaining hard-reload flash was traced to content becoming visible before the final app/account state and bundled theme styles were ready. The saved palette and a minimal document/root background are now applied inline before the application bundle paints. The normal authentication-status bridge is visually empty, so the actual intro/account page is the first visible application UI. A retry surface is shown only for a genuine account-loading error.

The coordinated 820 ms dark/light transition from 3.5.2 remains in place for the document background and application surfaces.

## Packaging

This release uses one normal Halieus Game Room workspace ZIP. Dependency trees, generated builds, workstation runtime/server data, private keys and retired local-development launchers are excluded. Oracle remains authoritative for production accounts and game data.

## Validation

- Client TypeScript: PASS
- Server TypeScript/build: PASS through the full regression command
- Complete historical regression/integration chain: PASS
- Dedicated 3.5.3 website-only/no-flash regression: PASS

Live Windows launcher behavior and the post-deployment visual reload remain owner acceptance checks.
