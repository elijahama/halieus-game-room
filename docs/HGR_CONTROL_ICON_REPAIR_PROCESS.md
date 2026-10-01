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

- `HGR - Control` starts `scripts/windows/start-control-mobile.ps1`.
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

Status: **source repair implemented on `fix/control-pairing-offline-state`; CI and real-device acceptance pending**

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

## Batch 3 — Reference-PNG launcher artwork

**Goal:** stop all launcher redraw drift.

Authority:

`assets/branding/references/`

Rules:

- map approved PNGs directly to launcher roles;
- only resize/export/convert PNG → ICO;
- never redraw H geometry, action badges, sheen, shadows or rims;
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
