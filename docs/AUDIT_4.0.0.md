# 4.0.0 corrective audit — 16 September 2026

Scope: uploaded Halieus Game Room 4.0.0 source, client/server flows, shared contracts, release tooling, tests and documentation. This is a source and local-runtime audit, not a certification of every game combination or the live Oracle deployment. Version remains exactly 4.0.0; no game rules changed.

## Prioritized findings

| Priority | Finding and evidence | Outcome |
|---|---|---|
| P1 | HalieusIntro.tsx: finishIntro depended on exiting and onEnter; starting the fade changed that callback, causing effect cleanup to cancel the exit timer. Parent one-second clock renders also restarted the auto timer. App.tsx returned only the intro, leaving no destination underneath. | Fixed: stable entry request, separate exit effect, current completion callback, HomeScreen mounted underneath with inert/aria-hidden protection. Added browser regression. |
| P1 | accounts.ts allowAuthAttempt trusted the leftmost raw X-Forwarded-For entry, which callers can prepend through the supplied nginx proxy. | Fixed: use Express request.ip under the configured one-hop trust policy. Tested spoofed prefix attempts share the limit. Direct Node access still must be restricted. |
| P1 | Mega Board replacePlayerId copied records and deleted the old key even when oldId equaled newId. Repeated recovery on an existing connection could erase stats and rejection/bid data. | Fixed: idempotent same-ID guard after reconnecting the player. New runtime test also checks absolute deadline continuity. |
| P1 | Account authorization and room membership use different identities. accounts.ts activeRoomForInvite checks room membership through display-name aliases; game creation accepts a client-supplied name. Socket.IO is intentionally available to guests. | Deferred: a display name is not proof of account ownership. Bind optional authenticated account IDs to game seats and archive records before relying on names for security-sensitive invitations or rankings. This needs coordinated migration and guest-policy decisions; silently requiring login would break intended guest links. |
| P2 | parseCookies used decodeURIComponent without catching malformed percent encodings. | Fixed: malformed cookie values become empty/unusable tokens instead of HTTP 500 errors. Browser/API regression included. |
| P2 | Account routes were registered before privacy middleware and had no explicit no-store header. | Fixed: register after privacy headers and apply no-store to /auth, /accounts and /admin. |
| P2 | Dependency audit reported moderate body-parser/qs advisories inherited through Express. | Fixed: compatible Express/body-parser lockfile updates; qs override 6.16.0. Final npm audit has zero reported vulnerabilities. |
| P2 | Intro eligibility considered paths but not saved seats at the home route. | Fixed: all saved-seat families bypass the presentation gate; direct route parsing remains unchanged. |
| P2 | Fixed intro overflow:hidden could clip content in a short/landscape viewport. | Fixed: scrollable intro with safe centering. Existing theme rules retained. |
| P2 | Vite emitted downloadable source maps containing source text. | Fixed: production source maps disabled. Client JS is still public by design. |
| P2 | No root .gitignore or SECURITY.md; owner-only docs, local shortcuts, historical deployment artifacts and infrastructure references remain in the owner release. | Added ignore rules and a concrete publication checklist. Do not upload the release ZIP wholesale. A fresh sanitized staging tree and owner license decision remain prerequisites. No private-key file was found; the matching PRIVATE KEY text in update-website.ps1 is a key-format detector. This targeted scan is not a complete historical secret scan. |
| P2 | Many historical regression scripts assert obsolete version literals, removed branding/layouts or retired WHOT/AI behavior. The 3.6.4a timer script prints PASS but leaves a process handle alive. | Recorded separately from current gates; no current rules weakened to satisfy historical scripts. The configured current chain and new behavioral tests are the release gates. Full inventory results included in VALIDATION_4.0.0.md. |
| P3 | App.tsx is a large central coordinator and index.css contains accumulated release overrides; production JS remains about 772 KB and CSS about 704 KB uncompressed. | Deferred: split route/game orchestration and bundles incrementally with runtime tests. Build warning retained rather than hiding it. |
| P3 | ARCHITECTURE.md identified 3.6.3b as current; earlier release validation claims could be mistaken for current evidence. | Updated current architecture and linked this audit/validation. Historical release documents remain history. |

## Coverage by area

- Architecture/state: inspected auth/intro/boot gates, route readers, saved-seat families, HomeScreen polling, shared game catalogue and server handler registration. No authority moved to the client.
- Multiplayer/reconnect/timers: reviewed Mega Board reference migration, host/recovery paths, absolute deadlines and public-room projection; inspected Poker viewer filtering. Existing integration suites cover game lifecycle, spectators, chat, trade and Connect Four series. New recovery regression covers repeated same-ID and changed-ID recovery.
- Icons/branding: all 14 catalogue assets and shared GameBrandIcon behavior remain covered by the passing 3.7.0l regression. Artwork and game identities were preserved.
- Responsive/setup/live/results: inspected shared shell/create portals and existing game-scoped styles; browser tests cover desktop/mobile arrival and direct routes. Existing integration tests validate representative result transitions. This audit does not claim visual playthroughs of every game's setup/live/result screen on every device. Ludo/Poker layouts remain unchanged.
- Deployment: reviewed candidate build/fingerprint checks, Start/Restart separation and static dictionary packaging. Final source fingerprint is regenerated before building and verified again after ZIP extraction. No live deployment, reboot, account migration or remote writes performed.
- Privacy/public repository: account cache headers, cookie parsing, dependency audit, targeted secret/file inventory, owner documentation boundaries and source-map policy reviewed. Account/game identity binding remains an explicit open issue.

## Changelog

Reliable automatic/click/skip intro handoff; pre-mounted Game Room; saved-seat bypass; short-viewport scrolling; idempotent reconnect migration; cookie/rate-limit/cache hardening; patched dependency chain; disabled production source maps; added behavioral tests, ignore/security guidance and current architecture/audit documentation. No version bump and no intended game-rule changes.
