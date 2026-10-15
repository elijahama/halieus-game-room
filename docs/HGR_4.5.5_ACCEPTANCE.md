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

Before 4.5.5 ships, verify on a real phone that Theme Library profiles and Custom colours preserve the same workspace/surface hierarchy for equivalent colours. System, Light and Dark remain the immediate base modes outside the library. Theme Library presents **Core + Unlockables** on the same page. Core must be the promoted former Custom preset set (Studio Graphite through High Contrast), and those Core backgrounds must show the same moving ambient-emblem logic used by Custom when reduced motion is not requested. Custom itself remains one direct RGB/HSL editor rather than a second preset gallery.

Player colour must be visible only when HGR needs an avatar/initials fallback. With a real profile picture present, changing player colour must not change the picture frame, theme outline, navigation selection, card glow, owner tools, guild UI or any other platform chrome.

Control Update must show a visible running state while work is in progress. The running indicator is a real activity ring. The Operations Update tile owns only idle/running state and returns to its ordinary Update glyph after a terminal result; terminal success/failure/rejection appears once in the persistent/global status rather than being duplicated on the tile. Failure keeps neutral card chrome while retaining a semantic failure mark and the captured owner-PC reason. The global status can be minimized and snapped aside on desktop or mobile; mobile bottom positions remain above the fixed navigation.


## 7 October 2026 — Control Update blank-line hotfix

The first Part 28 real-device Cloud Update attempt failed at 3% before Git/build/deploy work because the PowerShell progress parser rejected a blank line emitted by the CMD updater: `Cannot bind argument to parameter 'Line' because it is an empty string.`

The progress parser must explicitly accept empty-string input and immediately ignore blank/whitespace-only lines. Real output still flows through the existing progress-marker matcher and bounded failure capture unchanged. This hotfix does not alter deployment, operation identity, confirmation, recovery or failure-stop rules.

Acceptance remains one fresh website/phone → cloud → owner-PC Update after this fix. It must advance beyond 3% and either complete at 100% or surface the next real bounded failure reason.


## 7 October 2026 — Control visual follow-up

The terminal Control status must not use a coloured/highlighted icon tile for failure or rejection. The semantic glyph may remain coloured, but its icon background is transparent so the failure state does not visually dominate the whole banner.

On mobile, the top-right profile control is avatar-only. Its outer frame must collapse to a square that closely hugs the avatar; desktop chip padding must not remain around a hidden text label.


## 8 October 2026 — Control progress retry and asset refresh

A real owner-PC test showed the approved updater can complete and restart HGR while the website remains visually stuck on an older progress state. Root cause: intermediate cloud progress delivery is best-effort, but the bridge previously advanced its local "last reported" state even when the POST to the website failed during the deployment/restart window. The same progress value then became ineligible for retry.

Durable rule: running and terminal progress are acknowledged locally **only after the cloud confirms receipt**. A dropped running phase remains retryable; succeeded/failed terminal markers are retried rather than silently converted into a later timeout. A locally observed terminal result must never be overwritten by an invented timeout merely because the website was briefly unavailable.

Control status asset URLs also move with this batch so installed/normal browsers cannot keep the pre-Part-28 CSS/JS after a successful update. Only the running CSS ring may animate. Succeeded/failed/rejected glyphs are explicitly static.

Real-device acceptance: trigger one website Update and verify the site advances through multiple truthful percentages/phases, survives the website/Control restart, reaches a terminal result, and shows a non-rotating terminal glyph.


## 8 October 2026 — Custom HSL/contrast controls and logo selection isolation

Custom retains the four canonical palette roles (Workspace, Panels, Primary UI, Secondary UI) and the existing RGB sliders, but each colour also exposes Hue, Saturation and Lightness controls. Saturation may be reduced to zero directly or through a Greyscale action so neutral grey palettes do not require manual RGB matching.

The Custom preview shows numeric contrast ratios for Workspace text, Panel text, Workspace↔Panel separation and Primary↔Panel separation. These are guidance values; they do not silently rewrite the user's palette.

The logo-preset selector's active frame is neutral UI chrome. It must not use player colour. Player colour remains identity fallback data only. If the in-app H tile is recoloured by a theme/logo treatment, its rim must derive from that same tile colour rather than retaining a gold/yellow outline. First-paint and branded loading glows must likewise follow the active theme accent.


## 8 October 2026 — Operation card highlight correction

An enabled/ready Update HGR card must not remain filled bright blue. Readiness uses the normal dark Control card with the existing blue role edge/icon; the strong animated treatment is reserved for a genuinely running operation.


## 8 October 2026 — forced 4.5.5 delivery boundary

Part 28 source fixes were present on `main` but the live client could still identify itself as **4.5.4**, retaining the previous PWA shell/cache identity and older Control asset URLs. The corrective release therefore moves the actual product version to **4.5.5** and refreshes all browser/install identities together.

Acceptance requires:
- browser/server report 4.5.5,
- service-worker cache namespace is `halieus-shell-v4-5-5-<release fingerprint>`,
- Control loads the `4.5.5-force-live-1` CSS/JS revision,
- Part 28 final-authority CSS loads after all prior HGR styles,
- Core + Unlockables, RGB/HSL/Greyscale/contrast controls, neutral logo selection, neutral ready Update cards, static terminal glyphs and retryable website progress are visibly present after update.


## 8 October 2026 — Core preset atmosphere + tonal H rim

Real-device acceptance must confirm all of the following together:

- Core contains Studio Graphite, Soft Light, Deep Blue, Forest, Crimson, Aubergine, Cyan Studio, Warm Amber, Slate Mint, Midnight Violet, Sand and High Contrast.
- Selecting any Core preset produces the moving generic ambient emblems behind the Game Room, using that preset's primary/secondary colours.
- Unlockables remain a separate progression group.
- Custom remains RGB/HSL/Greyscale/contrast editing and does not duplicate the preset gallery.
- A recoloured H tile has a tonal edge derived from its own colour; a cyan/teal H tile must not show a gold/yellow rim.
- The pre-React boot curtain and branded intro must not reintroduce a hard-coded gold ring/glow when another theme accent is active.


## 10 October 2026 — exact Core/Custom atmosphere-engine acceptance

Core is accepted only if it is routed through the **same runtime atmosphere engine as Custom**, not a profile-specific imitation. Source acceptance requires the same Custom symbol generator, the same HomeScreen atmosphere source/engine marker and the same final animation selector for Custom and promoted Core palettes.

Real-device check: select Custom, observe the moving generic symbols; then select Studio Graphite, Cyan Studio and another Core palette. The symbols must remain present and moving with the same motion behaviour while only their palette/theme treatment changes.


## 10 October 2026 — update launch + canonical-H delivery acceptance

After a successful owner-PC Update:
- if no **visible** dedicated HGR app window exists, the updater must open one and verify that a visible window appeared;
- background Edge processes using the HGR profile must not suppress that launch;
- if a visible release-aware HGR window already exists, it may remain open for in-place release refresh.

Main Halieus identity acceptance:
- browser favicon uses the current canonical launcher-family H;
- Apple/PWA install images at 180/192/512 use that same current H;
- website link/share preview (Open Graph/Twitter) uses the current canonical-H main image;
- main desktop/Electron/package PNG/ICO identity uses that same current H;
- `HGR Main.png` is regenerated from the canonical current-H main vector;
- Start/Restart/Close/Update/PowerShell/OpenShard/HGR Control retain their separately approved role-specific artwork.

Real-device/browser acceptance may require removing a previously installed PWA/app or clearing an OS/browser icon cache before judging a newly generated install icon, because installed shell artwork can be retained by the operating system independently of website cache invalidation.

## 12 October 2026 — PWA logo update rejected

Brave proposed a logo update showing the retired play-cut H; the installed logo on the left was also an older block-H variant. GitHub's current canonical PWA 192/512 raster art was inspected and does not contain the play cutout. This is an unresolved deployment/PWA-cache acceptance issue, not a request to invent a new logo. Part 29 advances the install manifest/favicon/social/worker URL revision to `install-h6` while preserving the approved canonical H and all role-specific masters. The Oracle deploy gate must verify the *served* image bytes, not just `/health`.

Owner acceptance after deployment: Brave's logo-review prompt must show the current canonical flared H without the play triangle; both actual 192px and 512px manifest icons must match the committed current-H rasters. Verify on the public URL and installed-app surface separately; neither CI success nor an Oracle-only content check establishes public browser acceptance.

## 13 October 2026 — manual Update opens both surfaces (pending owner acceptance)

After running the canonical `Update HGR GitHub.cmd` on the owner PC, the newly rebuilt `HGR - Update Site.lnk` must target that canonical updater (not the ignored private deploy-only wrapper). A successful interactive Update must restore/focus the dedicated website window and open/renew HGR Control pairing via `Start HGR Control.cmd`; if Control launch fails, report PARTIAL with a nonzero result. Confirm the persistent `%LOCALAPPDATA%\\Halieus Game Room\\last-update-result.txt` receipt, even if the CMD closes. Cloud-triggered updates remain noninteractive, preserve stopped-Control state, and must not force foreground launch. Oracle and public website release identity, real PWA art, and owner-visible Control remain separately pending.

## 13 October 2026 — Cloud Update 38% test fixture regression (pending device retry)

Owner Cloud Update showed 38%, error AssertionError. Full log confirms typecheck/build were successful; regression `tests/runtime-control-update.ps1` expected two simulated lifecycle calls but inherited `HGR_CONTROL_DEFER_REFRESH=1` from the live Cloud Update and skipped them. `1 !== 0` was the wrapper failure. No deployment was attempted. Correction scopes environment cleanup to the *test-only subprocess*, validates the deferred branch independently and reproduces the owner inherited-flag context in CI. Real Control deferral and finalizer stay intact. Verify Cloud Update progresses past 38% on the PC and reaches the genuine Oracle release fingerprint and finalizer. The canonical GitHub origin is now `elijahama/halieus-game-room`; only the old known URL is migrated.

## 13 October 2026 — CMD parse and old GitHub URL at 62%

Owner Cloud Update showed `ahead was unexpected at this time` and old `Laijee27` redirected fetch. STEP 7B echo inside parenthesized CMD IF now avoids `commit(s)`, and a Windows real-CMD smoke job covers both branch outcomes and safe legacy-origin migration. Accept only when PC reports current `elijahama` remote, passes STEP 7B, deploys Oracle and verifies Control handoff.

## 13 October 2026 — Cloud Update 88% desktop-session handoff

Owner screenshot: deployment reportedly completed, but Cloud Update failed at 88% because `post-update-client.ps1` could not confirm a desktop window from the noninteractive updater. Owner observed HGR open on laptop. Source correction: Cloud Update no longer calls the desktop helper; it still requires verified Oracle deploy and independent Control finalizer before 100%. Manual updates continue to restore/verify laptop HGR. Windows CMD smoke must prove Cloud branch does not start a GUI even if no window exists; manual branch still uses `-ShowWindow`. Receipt must truthfully report `SKIPPED_BACKGROUND_ONLY` vs `VERIFIED`. User-device 100% success remains pending.

## 13 October 2026 — Update launcher required, Control icon retired from laptop launcher set

Owner has six desktop utility links but Update is missing while private Control is present. Required accepted group after local shortcut refresh: Start, Restart, Close, Update, PowerShell and OpenShard (exactly six in `HGR Launchers` and Start Menu), with `HGR - Update.lnk` targeting `Update HGR GitHub.cmd`, using approved light-blue artwork. Remove the old Control/Stop Control and Update Site shortcuts from these managed groups without stopping the Control Agent or changing approved web Control artwork. If Update CMD is missing, the generator must reject before clearing existing links. Tailscale-independent Control agent startup requires a separate later migration; website Cloud Update continues using the current owner-PC bridge until that is validated. Owner PC shortcut acceptance pending.

## 13 October 2026 — Browser-verified themed background symbol acceptance

Core Theme Library presets and Custom must show the same generic animated glyphs with usable visibility and palette-specific primary/secondary tints, including light and touch/mobile palettes. The production browser test checks actual movement, computed opacity, mode parity and reduced-motion behavior; System/Light/Dark retain game-specific symbols. Source success alone does not prove the deployed PWA has refreshed. Confirm on the owner's website, installed laptop, phone and tablet after deployment.

## 14 October 2026 — Beta unlockable theme ambience must visually differ

Owner reports console themes in Beta still have no meaningful changing backdrop after the Core/Custom fixes. Fixed shared-console-symbol fallback and CSS profile-engine visibility gap. All progression profiles must have *their own* nine-glyph background, run the shared ambient animation on desktop/touch with correct opacity/z-index and theme palette, and remain selectable in Beta without changing their permanent entitlement metadata. Validate via the real Beta theme-picker UI and all actual rendered profiles; local device deployment/persistence needs final acceptance.

## 14 October 2026 — Beta theme session-only state

Beta Apply must not persist locked profile choices into the normal `halieus-game-room-theme` / theme-profile / custom-theme localStorage keys. Test Lab theme choices survive a refresh only within the active session, then restore the normal saved appearance on Exit Test Lab and account sign-out. Source UI tests and real browser tests verify this without altering actual entitlement metadata. Live-owner device acceptance pending.

## 15 October 2026 — Theme atmosphere must be visible IN the page, not only in computed styles

Owner reported no visual change despite repeated theme fixes. Live public desktop/mobile screenshot audit confirmed Core/Custom and Beta console glyph nodes animated but were hidden behind opaque `.halieus-main` (`z-index:2`) because the motif layer was below it (`z-index:0`). The paint-order correction promotes only the noninteractive symbols above content (`z-index:3`), while making the promoted canvas transparent and removing its gradient overlay. Do not dim the page, block controls, change Standard game atmosphere or alter approved HGR artwork.

Local acceptance: typecheck, full regressions, production build and Playwright screen-pixel visibility tests on both desktop and mobile pass, including Core Soft Light and a progression theme. Remote live acceptance: after a safely scheduled owner-PC deployment, confirm exact public `/health` release fingerprint, visible pixel-changing backgrounds on the public built assets on desktop/mobile, clickable navigation and honest deployment receipt. Owner's installed Edge/Brave PWA cache may require the normal release-aware refresh; never erase account/game data to repair cosmetics.
