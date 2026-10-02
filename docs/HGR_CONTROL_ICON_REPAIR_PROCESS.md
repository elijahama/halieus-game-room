# HGR Control + Launcher/Icon Repair Process
Version line: 4.5.3

This document records the repair in deliberately small batches so launcher, Control, pairing and branding changes are not mixed together.

## Rules

- Complete one batch before starting the next.
- Run HGR validation/CI after each batch.
- Do not tell the owner to run Update HGR until the relevant GitHub workflow is green.
- `assets/branding/references/` is the launcher-art authority.
- Approved launcher PNGs are used as artwork, not redrawn.
- HGR Control runs in the background.
- The generated launcher set exposes one Control start entry and one explicit Stop entry.
- HGR Control cloud status must be stated accurately: private/Tailscale path is current; cloud relay is not yet a live deployment.

## Batch 1 — Control launcher simplification and documentation

**Goal:** remove launcher ambiguity before touching networking or artwork.

Status: **source complete and CI-verified; owner-PC acceptance pending**

Expected launcher set:

- `HGR - Control`
- `HGR - Stop Control`

Required behaviour:

- `HGR - Control` starts `scripts/windows/start-control.ps1`.
- Control Agent runs hidden/in the background.
- private Tailscale HTTPS route is created;
- phone URL is copied;
- pairing card/QR is opened;
- closing the launcher/pairing card does not stop Control;
- `HGR - Stop Control` explicitly stops the agent and Tailscale route;
- `HGR - Control Mobile` is removed from generated launcher folders as redundant.

Documentation:

- root README contains a dedicated HGR Control section;
- README distinguishes private Control from future cloud Control.

Implementation record:

- `740d159e0d` — collapsed the generated launcher set to one Control entry;
- `92900b32b0` — made the canonical HGR Control launcher start the background phone-capable service;
- `d644dbb102` — added the first-class HGR Control section to the public GitHub README;
- `47203440fb` — unified HGR Control product naming;
- `64fd1edbe4` and follow-up regressions — protected background-capable canonical launcher behaviour;
- latest documented repository workflow before this acceptance update: **green**.

Owner-PC acceptance for Batch 1:

1. run Update HGR once after this batch is green;
2. open `HGR Launchers`;
3. confirm there is **no** `HGR - Control Mobile`;
4. confirm `HGR - Control` and `HGR - Stop Control` both exist;
5. click `HGR - Control`, close the visible pairing card/launcher window, and confirm Control remains running in the background;
6. use `HGR - Stop Control` to stop it.

Do not evaluate icon artwork in this batch; launcher artwork is Batch 3.

## Batch 1.1 — Oracle package repair after launcher/PWA authority change

**Goal:** keep the approved `HGR Main.png` available inside the exact Oracle deployment source archive.

Status: **source complete and CI-verified; owner Oracle retry pending**

Observed owner-PC failure:

```text
ENOENT: assets/branding/references/HGR Main.png
client prebuild -> scripts/copy-approved-pwa-icon.mjs
Oracle candidate build aborted; live production remained untouched
```

Root cause:

- `scripts/copy-approved-pwa-icon.mjs` correctly changed to consume `assets/branding/references/HGR Main.png`;
- release integrity still signed the old timestamped reference PNG;
- the Oracle packer deliberately excludes unsigned `assets/branding/*` files;
- therefore `HGR Main.png` existed in GitHub/owner source but was absent from the Oracle ZIP.

Repair contract:

- `HGR Main.png` is a signed release-integrity input;
- the Oracle package regression explicitly requires `assets/branding/references/HGR Main.png`;
- the old timestamped PNG is no longer the PWA/install source authority;
- no production data is replaced when candidate packaging/build fails.

Acceptance:

1. GitHub release workflow green — **verified** on workflow run `36860697887`;
2. real package-only regression confirms `HGR Main.png` is inside the ZIP — **verified by the regression chain**;
3. exact fix commit: `7733de1a29` — `fix: include approved HGR Main PNG in Oracle release package`;
4. generated release identity: `8bcd0451bb`;
5. owner retries Update HGR — **pending**;
6. Oracle candidate must pass the client prebuild instead of failing with ENOENT.

## Batch 2 — Pairing/API reliability

**Goal:** fix the phone state where the Control shell loads but pairing reports `Failed to fetch`.

Status: **Batch 2 source landed and workflow #758 passed; owner update still showed stale visible behaviour, so Dev 24 adds an explicit post-update Control restart/cache handoff before real-device acceptance**

Implementation contract:

1. the pairing form stays hidden until the live Control Agent answers the unauthenticated `GET /api/ping` capability check;
2. an unreachable owner PC renders a dedicated **Owner PC unavailable** state instead of a usable-looking pairing form;
3. the offline state has an explicit **Retry connection** action;
4. an expired pairing code leaves the Agent reachable but disables code entry until **HGR - Control** creates a fresh code;
5. authenticated `GET /api/status` still selects the dashboard directly;
6. network loss during status/log/action requests moves the PWA into the same explicit offline state;
7. player-facing copy uses the canonical **HGR - Control** name rather than the retired **Start HGR Control Mobile** wording;
8. Control shell assets are revisioned and the service-worker cache is bumped so a newly activated worker reloads stale Control UI;
9. API traffic remains outside the service-worker cache and keeps `no-store` behaviour.

Real-device acceptance:

1. stop HGR Control and open the previously installed PWA — it must show **Owner PC unavailable**, not the pairing form;
2. start **HGR - Control** and tap **Retry connection** — pairing should become available without clearing browser data;
3. pair with the fresh eight-digit code and confirm the dashboard loads;
4. stop Control again and confirm the paired dashboard transitions to the offline state on the next API check;
5. restart Control after the ten-minute code expires and verify stale codes cannot be submitted;
6. verify the old **Start HGR Control Mobile** wording no longer appears in the live PWA.

No icon/folder cleanup belongs in this batch.

### Dev 24 visible-handoff correction

The first Batch 2 update proved an important process gap: **green GitHub validation did not guarantee the already-running owner Control Agent or installed Control PWA had moved onto the new source**. The owner could complete Update HGR successfully and still see the old phone state.

Dev 24 therefore adds these acceptance-critical handoffs:

- if HGR Control is genuinely running when Update HGR completes, stop it cleanly and restart it from the newly pulled source;
- reuse the same private HTTPS port but issue fresh runtime credentials and a fresh pairing code;
- serve Control shell JS/CSS/service-worker assets with `no-store`;
- register the service worker with `updateViaCache: "none"`;
- retry the API when the phone comes back online;
- advance the Control shell/service-worker revision so a stale installed PWA cannot silently remain on the previous shell.

A stopped Control service must remain stopped after Update HGR.

## Batch 3 — Reference-PNG launcher artwork

**Goal:** stop all launcher redraw drift.

Authority:

- normal launcher roles: approved rendered PNGs in `assets/branding/references/`;
- HGR Control: dedicated square `server/control-ui/control-icon.png`.

The tracked `assets/branding/references/HGR Control.png` is a full reference/model sheet and is **not** a shortcut source. That incorrect mapping caused the owner-visible Control icon failure.

Rules:

- map approved square artwork directly to launcher roles;
- only resize/export/convert source artwork to Windows delivery formats;
- never redraw the approved H geometry, sheen, shadows or rims;
- Stop Control may add only its explicit stop badge to the approved Control source so Start/Stop are visually distinguishable;
- clear stale runtime PNG/ICO exports before regeneration;
- verify the actual `.lnk` `IconLocation` for Control and Stop Control after shortcut creation;
- refresh the Windows icon cache;
- role base colours remain documented in `HGR_ICON_PALETTE.md`.

Required roles:

- Main HGR
- Start
- Restart
- Close
- Update
- PowerShell
- OpenShard
- Control

Control uses royal blue `#4F7BFE`.

### Dev 24 website-logo alignment

Owner visual QA also selected the launcher-family H over the temporary block-only website H. The website now uses the same straight-stem, centred-bridge H with restrained flared end caps, while preserving separate themeable website treatments and fixed launcher artwork.

The Personal logo panel is expanded into three groups so the large empty area is used meaningfully:

- Core styles: Theme, Mono light, Mono dark, White glyph;
- Launcher styles: Black glyph, Light tile, Blue tile, Gold launcher;
- Additional options: Adaptive, Launcher default.

Visible acceptance requires checking the website panel itself; CI alone does not close this batch.

## Batch 4 — Icon-folder cleanup

**Goal:** remove duplicate/obsolete icon families only after Batch 3 has proven the live launcher pipeline.

Candidates to review/remove:

- `assets/branding/icon-sets/alternate-work-generated/`
- `assets/branding/icon-sets/reference-faithful/`
- obsolete launcher copies in legacy/runtime source locations

Keep:

- approved references;
- functional website glyphs actually used at runtime;
- any legacy assets still required by packaging/regressions.

No folder is deleted until code search/regressions prove it is unused.

## Batch 5 — Control cloud implementation

Current status: **not deployed**

Already present:

- private Tailscale-backed PWA;
- allow-listed Control actions;
- cloud protocol foundation/documentation.

Still required for real cloud Control:

- owner-PC outbound relay client;
- cloud device registration/revocation;
- relay presence/status;
- hosted Control PWA;
- authenticated routing of allow-listed actions;
- real-device QA.

Private/Tailscale Control remains the fallback even after cloud mode exists.

## Acceptance record

For each batch record:

- commit SHA;
- workflow result;
- owner-PC result;
- phone result where applicable;
- screenshots/observations;
- any follow-up regression created from failures.


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
