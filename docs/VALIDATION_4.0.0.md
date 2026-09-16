# 4.0.0 validation — 16 September 2026

Source: the uploaded 4.0.0 ZIP, extracted to a separate working tree. Node 22.23.2 on Windows. Original upload remains untouched.

## Current release gates

- Dependency installation: passed using a workspace-local npm cache.
- Client and server TypeScript checks: passed.
- Production client and server builds: passed. Vite reports the existing large-chunk warning (~772 KB JS, ~704 KB CSS, uncompressed). Filesystem sandbox restrictions initially prevented Vite resolving its config; approved execution outside that sandbox completed successfully.
- Configured regression chain: all 21 scripts passed. Override assertions were extended to include the new qs security pin; existing pins retained.
- Existing integration suite rerun after the server/dependency fixes: 15/15 passed, including accounts, spectators, trade/timer, Ludo, Poker telemetry, Hidden Dictator and Connect Four lifecycle/series.
- New browser regression: automatic entry, Enter, Skip, reduced motion, desktop/mobile/landscape, dark/light continuity, refresh, 16 direct-route forms and saved-seat bypass. Samples require the destination on every animation frame, and no frame with both surfaces fully transparent. No reload during handoff; no horizontal overflow or uncaught page errors. Auth status is mocked for signed-in UI cases; real API calls test private headers, malformed cookies and forwarded-address limiter bypass.
- New reconnect runtime test: repeated same-socket recovery preserves records; new-socket recovery preserves statistics and absolute deadline.
- npm audit: zero reported vulnerabilities after compatible updates and qs 6.16.0 pin (point-in-time advisory check).
- Release identity: regenerated at 4.0.0; verified on source and extracted final ZIP. Final build compiles the regenerated fingerprint.

## Exhaustive historical inventory run

All 130 pre-existing .mjs tests were attempted individually with isolated runtime data and a 45-second per-script timeout: 61 exited successfully, 68 failed assertions, and one printed PASS but timed out on a lingering handle. These are not 69 newly discovered gameplay failures. Most failing static tests hard-code earlier versions or removed UI structures. Three old Word Arena runtime tests stop at obsolete version assertions; the AI test also targets intentionally retired AI behavior. They remain visible below, not silently treated as passes.

The current chain and all 15 integration tests were separately rerun after final fixes. The timer test's assertions passed, but its harness still needs cleanup. Coverage does not establish that every current game edge case or every historical non-version assertion is correct.

| Historical script | Inventory result |
|---|---|
| integration-3.5.14-trade-turn-timer.mjs | PASS |
| integration-rc-3.3.37-live-trade.mjs | PASS |
| integration-rc-3.3.38-whot-ranked.mjs | PASS |
| integration-rc-3.3.39-whot-autopilot.mjs | PASS |
| integration-rc-3.3.40-ludo-lifecycle.mjs | PASS |
| integration-rc-3.3.41-modes-tokens.mjs | PASS |
| integration-rc-3.3.42-spectator-tokens.mjs | PASS |
| integration-rc-3.3.43-chat-ludo-order.mjs | PASS |
| integration-rc-3.3.44-global-finish.mjs | PASS |
| integration-rc-3.3.46-mega-background-results.mjs | PASS |
| integration-rc-3.3.47-poker-telemetry.mjs | PASS |
| integration-rc-3.4.0-accounts.mjs | PASS |
| integration-rc-3.4.3-connect-four-lifecycle.mjs | PASS |
| integration-rc-3.4.3-hidden-dictator-lifecycle.mjs | PASS |
| integration-rc-3.4.4-connect-four-series.mjs | PASS |
| regression-3.5.0.mjs | FAIL — historical assertion |
| regression-3.5.1.mjs | FAIL — historical assertion |
| regression-3.5.10.mjs | FAIL — historical assertion |
| regression-3.5.11.mjs | FAIL — historical assertion |
| regression-3.5.12.mjs | FAIL — historical assertion |
| regression-3.5.13.mjs | FAIL — historical assertion |
| regression-3.5.14.mjs | FAIL — historical assertion |
| regression-3.5.15.mjs | FAIL — historical assertion |
| regression-3.5.16.mjs | FAIL — historical assertion |
| regression-3.5.17.mjs | FAIL — historical assertion |
| regression-3.5.18.mjs | FAIL — historical assertion |
| regression-3.5.19.mjs | FAIL — historical assertion |
| regression-3.5.2.mjs | FAIL — historical assertion |
| regression-3.5.20.mjs | FAIL — historical assertion |
| regression-3.5.21.mjs | FAIL — historical assertion |
| regression-3.5.22.mjs | FAIL — historical assertion |
| regression-3.5.23.mjs | FAIL — historical assertion |
| regression-3.5.24.mjs | FAIL — historical assertion |
| regression-3.5.25.mjs | FAIL — historical assertion |
| regression-3.5.26.mjs | FAIL — historical assertion |
| regression-3.5.27.mjs | FAIL — historical assertion |
| regression-3.5.3.mjs | FAIL — historical assertion |
| regression-3.5.4.mjs | FAIL — historical assertion |
| regression-3.5.5.mjs | FAIL — historical assertion |
| regression-3.5.6.mjs | FAIL — historical assertion |
| regression-3.5.7.mjs | FAIL — historical assertion |
| regression-3.5.8.mjs | FAIL — historical assertion |
| regression-3.5.9.mjs | FAIL — historical assertion |
| regression-3.6.0.mjs | FAIL — historical assertion |
| regression-3.6.1.mjs | FAIL — historical assertion |
| regression-3.6.3.mjs | FAIL — historical assertion |
| regression-3.6.3b.mjs | FAIL — historical assertion |
| regression-3.6.4.mjs | FAIL — historical assertion |
| regression-3.6.4a.mjs | FAIL — historical assertion |
| regression-3.6.4b.mjs | FAIL — historical assertion |
| regression-3.6.5.mjs | FAIL — historical assertion |
| regression-3.6.6.mjs | FAIL — historical assertion |
| regression-3.6.7.mjs | FAIL — historical assertion |
| regression-3.6.8.mjs | PASS |
| regression-3.6.8a.mjs | PASS |
| regression-3.6.8b.mjs | PASS |
| regression-3.6.8c.mjs | PASS |
| regression-3.6.8d.mjs | PASS |
| regression-3.6.8e.mjs | PASS |
| regression-3.7.0.mjs | PASS |
| regression-3.7.0a.mjs | PASS |
| regression-3.7.0b.mjs | PASS |
| regression-3.7.0c.mjs | PASS |
| regression-3.7.0d.mjs | PASS |
| regression-3.7.0e.mjs | PASS |
| regression-3.7.0f.mjs | PASS |
| regression-3.7.0g.mjs | PASS |
| regression-3.7.0h.mjs | PASS |
| regression-3.7.0i.mjs | PASS |
| regression-3.7.0j.mjs | PASS |
| regression-3.7.0k.mjs | PASS |
| regression-3.7.0l.mjs | PASS |
| regression-4.0.0.mjs | PASS |
| regression-launcher-no-autodeploy-3.5.26.mjs | PASS |
| regression-launcher-no-autodeploy-3.5.27.mjs | PASS |
| regression-launcher-restart.mjs | PASS |
| regression-rc-3.3.12.mjs | PASS |
| regression-rc-3.3.19.mjs | PASS |
| regression-rc-3.3.20.mjs | PASS |
| regression-rc-3.3.20a.mjs | PASS |
| regression-rc-3.3.20b.mjs | PASS |
| regression-rc-3.3.20c.mjs | PASS |
| regression-rc-3.3.20d.mjs | PASS |
| regression-rc-3.3.20e.mjs | FAIL — historical assertion |
| regression-rc-3.3.20f.mjs | PASS |
| regression-rc-3.3.20g.mjs | FAIL — historical assertion |
| regression-rc-3.3.21.mjs | FAIL — historical assertion |
| regression-rc-3.3.22.mjs | PASS |
| regression-rc-3.3.23.mjs | PASS |
| regression-rc-3.3.24.mjs | PASS |
| regression-rc-3.3.25.mjs | FAIL — historical assertion |
| regression-rc-3.3.26.mjs | FAIL — historical assertion |
| regression-rc-3.3.27.mjs | PASS |
| regression-rc-3.3.28.mjs | FAIL — historical assertion |
| regression-rc-3.3.29.mjs | FAIL — historical assertion |
| regression-rc-3.3.30.mjs | FAIL — historical assertion |
| regression-rc-3.3.31.mjs | PASS |
| regression-rc-3.3.32.mjs | PASS |
| regression-rc-3.3.33.mjs | PASS |
| regression-rc-3.3.34.mjs | FAIL — historical assertion |
| regression-rc-3.3.35.mjs | FAIL — historical assertion |
| regression-rc-3.3.37.mjs | FAIL — historical assertion |
| regression-rc-3.3.38.mjs | FAIL — historical assertion |
| regression-rc-3.3.39.mjs | FAIL — historical assertion |
| regression-rc-3.3.40.mjs | FAIL — historical assertion |
| regression-rc-3.3.41.mjs | FAIL — historical assertion |
| regression-rc-3.3.42.mjs | FAIL — historical assertion |
| regression-rc-3.3.43.mjs | FAIL — historical assertion |
| regression-rc-3.3.44.mjs | FAIL — historical assertion |
| regression-rc-3.3.45.mjs | FAIL — historical assertion |
| regression-rc-3.3.46.mjs | FAIL — historical assertion |
| regression-rc-3.3.47.mjs | FAIL — historical assertion |
| regression-rc-3.3.48.mjs | PASS |
| regression-rc-3.3.48a.mjs | PASS |
| regression-rc-3.4.0.mjs | PASS |
| regression-rc-3.4.0a.mjs | PASS |
| regression-rc-3.4.1.mjs | FAIL — historical assertion |
| regression-rc-3.4.1a.mjs | FAIL — historical assertion |
| regression-rc-3.4.1b.mjs | PASS |
| regression-rc-3.4.2.mjs | PASS |
| regression-rc-3.4.2a.mjs | PASS |
| regression-rc-3.4.2b.mjs | FAIL — historical assertion |
| regression-rc-3.4.3.mjs | FAIL — historical assertion |
| regression-rc-3.4.4.mjs | FAIL — historical assertion |
| regression-rc-3.4.4a.mjs | FAIL — historical assertion |
| regression-rc-3.4.4b.mjs | PASS |
| runtime-mega-roll-timer-3.6.4a.mjs | TIMEOUT (printed PASS) |
| runtime-word-arena-3.6.4.mjs | FAIL — historical assertion |
| runtime-word-arena-ai-3.6.5.mjs | FAIL — historical assertion |
| runtime-word-game-daily-3.6.6.mjs | FAIL — historical assertion |

## Limits and packaging

No live Oracle deployment or real-account migration was performed. Desktop installer packaging, physical iOS/Android devices and exhaustive visual playthroughs of all 14 games were not tested. Historical owner/deployment documentation remains in this owner source release; public GitHub publication needs the staging review described in SECURITY.md.

The deliverable is a source ZIP, matching the original release model: excludes node_modules, generated dist, runtime data, caches, private-key extensions and machine-specific .lnk/desktop.ini files. Production outputs were rebuilt for testing; deployments rebuild from the included lockfile. The release integrity verifier is run again on the extracted package.

## Oracle deployment archive follow-up

The first corrected ZIP passed source-ZIP integrity but the separate Oracle packing path omitted two root manifest files. The user's deployment stopped locally before upload. See [deployment correction](DEPLOYMENT_FIX_4.0.0.md). The replacement was tested with the actual packer under Windows PowerShell 5.1: all 392 integrity inputs included, credential/build-output exclusions checked, extracted deployment archive integrity passed, and no SSH/SCP executed. The 21-script current regression chain passed again.
