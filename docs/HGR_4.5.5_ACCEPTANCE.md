# HGR 4.5.5 release gate

Canonical VERSION remains 4.5.4. The 4.5.4.13–20 labels identify stabilisation batches, not shipped version changes. Do not mark device checks passed from CI alone.

## Source batches

- .13: canonical board labels — PR #70.
- .14: Control enabled/disabled states — PR #71.
- .15: truthful live progress — PR #72.
- .16: fullscreen navigation recovery — PR #73; asynchronous browser-test correction #75.
- .17: canonical account photos — PR #74.
- .18: portrait return and containment — PR #76.
- .19: scoped Cloud Control installation/offline identity — PR #77.
- .20: in-flow admin utility placement — current batch.

Each implementation batch requires typecheck, full regression chain, release integrity and production build before merge. Control browser coverage checks desktop 1440×900, short desktop 1280×600, tablet 820×1180 and phone 390×844. Browser simulations verify behavior, not OS-installed icon acceptance.

## Required owner-device evidence — pending

Record device/browser, exact deployed fingerprint, date, observed result and any failure details for each check:

- Fresh Mega Board creation enters lobby. Lost/slow acknowledgement retry does not duplicate the host. Cross-connection recovery still requires saved credentials.
- iPad Safari fresh load leaves boot curtain; background/resume, BFCache/history and network return recover. Repeat in installed HGR where available.
- Main HGR favicon and installed phone identity use the canonical H.
- Cloud/private Control favicon and installed phone icon show approved blue H/cog artwork.
- One fresh phone → cloud → owner-PC update reaches explicit terminal 100% / Update complete; failure details remain usable if it fails; Control returns online after restart.
- Fullscreen HGR → Control → Game Room offers explicit resume on supported browsers; Apple touch safety restriction remains. Check applicable installed-app paths separately.
- Uploaded profile picture renders in Control header/player list.
- Portrait Game Room return works and utility access does not obstruct page content.

Tailscale remains the fallback. No owner-phone/iPad or fresh production update acceptance has been established by this source batch.

## Release only after that gate passes

Change only canonical VERSION to 4.5.5 and run canonical preparation. Re-run typecheck, full regressions (including Mega Board, Cloud Control and iPad recovery), high/critical security gate, production client/server build, integrity verification and browser identity/PWA checks. Record final fingerprint and release notes, deploy to Oracle, then perform final owner-device acceptance. Do not edit generated version consumers manually.

## Deferred to 4.5.5.x

Cloud Start/Restart/Close (fixed allow-listed actions and appropriate confirmation); owner-PC telemetry; advanced heartbeat/stall/retry/cancellation recovery; expanded player administration; broader Control visual unification; measured bundle/code-splitting work; Tailscale retirement only after proven cloud parity/reliability. Do not suppress chunk-size warnings merely by raising their threshold.


## 5 October 2026 — stranded Control update correction

Owner confirms new rooms can be created and the earlier room remains active. Apple-device sign-in/boot acceptance is still pending; no release version bump.

The 4 October 23:57 Cloud Update remained at 3% after its bridge restarted: the cloud retained Running, but the local marker already recorded a failed interrupted handoff. The bridge previously retained its request association only in memory. Persist the request/local-operation/baseline/deadline while observing an update, resume observation after restart without repeating Update, and retain the journal until a terminal report is acknowledged. Cloud operations with no report for 55 minutes become explicitly unconfirmed failures; this never kills an updater or claims success. Late reports cannot reopen terminal operations. Local Control still enforces its active-operation guard on retries.

Operation cards retain role colour (blue Update, green Start, orange Restart, red Close) and readable unavailable reasons. Only Update is presently supported by the cloud bridge. Start/Restart/Close remain owner-PC actions, explicitly labelled rather than misleadingly enabled. A running Update explains its busy state.

Source validation is separate from production acceptance. A fresh cloud update reaching a verified terminal result and owner-PC/phone visual checks remain required.

Live correction: the existing approved bridge credential successfully reported the exact stranded cloud request `6e60d251-4adb-4cf1-b2ac-23011f05cefa` / local request `354a30fa-ee1b-42b0-9cef-77668737cc57` as failed using its recorded interrupted-handoff reason (HTTP 200, accepted). Before reporting, local authenticated status confirmed no active operation and the marker start matched 4 October 22:57:11 UTC. No update, restart, room mutation or success claim was made. New recovery code/button styling still require rollout and device acceptance.


## 7 October 2026 — Control Update operation-identity hardening

A new Cloud Update must carry the local Control operation ID into the durable owner-PC update marker. The PowerShell bridge writes that ID with every running/failed checkpoint; the detached finalizer preserves it through the Control restart and terminal 100%/failed marker. The cloud bridge accepts a marker as authoritative when its operation ID matches the local operation it dispatched, with the older started-at comparison retained only as backward compatibility for pre-hardening markers.

This closes a remaining ambiguity where a stale runtime marker could be mistaken for the current update after a Control process replacement. The release gate is unchanged: one fresh phone → cloud → owner-PC update must visibly advance beyond 3%, survive the Control handoff, and finish at an explicit terminal result before 4.5.5 is released.


## 7 October 2026 — palette / player-colour / operation-icon acceptance

Before 4.5.5 ships, verify on a real phone that progression Theme Library profiles and Custom colours preserve the same workspace/surface hierarchy for equivalent colours. System, Light and Dark remain the immediate base modes outside the library. Theme Library now presents progression Unlockables only: the Core palette gallery, Starting/custom preset gallery and duplicate saved Workspace palette tile are deliberately removed. Custom is one four-part RGB-slider editor for Workspace, Panels, Primary UI and Secondary UI, with a compact main-site preview/legend below it.

Player colour must be visible only when HGR needs an avatar/initials fallback. With a real profile picture present, changing player colour must not change the picture frame, theme outline, navigation selection, card glow, owner tools, guild UI or any other platform chrome.

Control Update must show a visible running state while work is in progress. The running indicator is a real activity ring. The Operations Update tile owns only idle/running state and returns to its ordinary Update glyph after a terminal result; terminal success/failure/rejection appears once in the persistent/global status rather than being duplicated on the tile. Failure keeps neutral card chrome while retaining a semantic failure mark and the captured owner-PC reason. The global status can be minimized and snapped aside on desktop or mobile; mobile bottom positions remain above the fixed navigation.
