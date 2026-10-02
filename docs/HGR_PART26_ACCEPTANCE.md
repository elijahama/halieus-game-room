# Part 26 implementation and acceptance record

Release remains **4.5.3**, the version already on current main when this repair began. This record supersedes the older batch numbering in the historical repair log. Source changes are committed to main in separate batches; owner-visible acceptance is a distinct step.

## Why a successful update could look unchanged

1. Pulling new source did not replace an already-running Control process. It could continue serving its old in-memory implementation. The updater now captures running state before pulling and restarts only an agent that was running beforehand, checking process identity and fresh credentials.
2. An installed phone PWA could keep an old cached HTML/JavaScript shell. The new worker replaces older Control caches and navigates old clients even if their shell lacks an update listener. Navigation is not awaited inside activation, which would deadlock its own fetch. API requests remain uncached.
3. The earlier icon repair changed a path while the PNG at that path was still the full model sheet. A subsequent square replacement was corrupt. The approved crop is now checked by signature, dimensions, PNG checksums/decompression and artwork identity; runtime export also pins its approved hash.
4. Website SVGs had independently reconstructed a narrow slab-serif H. They now use a single wide, angled-cap trace from the approved no-badge launcher glyph. Favicon revision h6 prevents an old tab icon competing with the new website geometry.

## Reference decisions: Parts 20–26, Git and Drive

The owner authorized these sources as references, not as permission to undo later decisions. Existing game rules, board geometry and server-authoritative gameplay were outside this repair.

| Reference | Retain | Avoid / superseded |
| --- | --- | --- |
| Part 20 | Active personal theme, working timers and approved game-shell composition | Reintroducing fixed colours or changing approved board geometry |
| Part 21 — Mobile Navigation | Fixed top/bottom mobile navigation and upward More tools | Replacing mobile navigation with the older drawer |
| Part 22 — Continuation | Control has its own blue identity | Reusing the main gold H as the Control icon |
| Part 23 — Icon Cleanup | Approved PNG masters, role colours, integrated face depth and darker lower edge | Generic redrawing, floating glass/highlight overlays |
| Parts 24–26 | Canonical Control/Stop names, separate repair batches, phone state recovery and explicit owner acceptance | Treating green CI as proof of the owner's installed experience |
| Current screenshots and owner correction | Wide angled launcher-family H, existing coloured-icon palette, compact appearance and improved desktop navigation | Narrow slab-serif H, stretched Theme column, oversized Join/active navigation treatment |

Conversation references: [Part 20](chatgpt-conversation://6ab75615-75c0-83ed-b7d8-8cc7cf7d3acf), [Part 21](chatgpt-conversation://6abac812-fd6c-83eb-a546-334ddfbf03fd), [Part 22](chatgpt-conversation://6abb85c0-5d14-83eb-94f8-466b234bb366), [Part 23](chatgpt-conversation://6abc6482-92f8-83eb-8afb-b436086276d5), [Part 24](chatgpt-conversation://6abe5237-3a38-83eb-86d1-8a04e6e3296a), [Part 25](chatgpt-conversation://6abe8fcc-c908-83ed-91bc-a09900a23893), [Part 26](chatgpt-conversation://6abf70cf-fa78-83eb-83f7-cc93c2ac976f).

Drive references read: [MasterBook LIVE](https://docs.google.com/document/d/1ta6bKApFrZPUK7cZxRTvT14k-7ZJwfcQPoihsCexj2Y/edit), [Shared UX & Systems Standard LIVE](https://docs.google.com/document/d/1VMuTqbQMrONH0PXtHGZUgFOzhp2HFN6GK7kqsU7KF7A/edit), [Decision & Timeline Log LIVE](https://docs.google.com/document/d/1aIXEfcQVQ1S4lJCfUNpleDr3GL64U9pjXF_13KJ6_10/edit). Their older vector-led icon decision is superseded for launchers by the later approved-PNG rule. The shared recolourable website SVG remains appropriate and derives its geometry from the launcher reference. Drive documents and synced project sources were read only.

Artwork authorities: `assets/branding/references/HGR_CONTROL_LAUNCHER_SOURCE.md`, `control-artwork.json`, and `ChatGPT Image 25 Sept 2026, 18_26_58-6.png`. The Control crop selected by the owner is retained. Existing other launcher PNGs were not darkened or redrawn. Website preset treatments follow the existing palette, with an integrated face gradient and no floating gloss overlay.

## Commits and validation

| Batch | Exact source commit | Workflow |
| --- | --- | --- |
| 1 | `4714d1758e4f1057376e2eb68376e88774dd1db6` | [CI run 37064062685](https://github.com/elijahama/halieus-game-room/actions/runs/37064062685) |
| 2 | `a84ad347cd98a34993c57d10573c2f4d347fd4d4` | [CI run 37066007790](https://github.com/elijahama/halieus-game-room/actions/runs/37066007790) |
| 2 follow-up | `be0e52dfcf73810e5f0781397b136c7639f1f2dc` | [CI run 37066007790](https://github.com/elijahama/halieus-game-room/actions/runs/37066007790) |
| 3 | `3fe28ef1e8e01e5eafb606abb931bde26b464963` | [CI run 37067888616](https://github.com/elijahama/halieus-game-room/actions/runs/37067888616) |
| 4 | `421c7a7b7bb78eba2b59917ec175aadbc327c59c` | [CI run 37068821931](https://github.com/elijahama/halieus-game-room/actions/runs/37068821931) |
| 5 | `dcfb93461a970a296b564a9659fab155d030a30f` | [CI run 37069142632](https://github.com/elijahama/halieus-game-room/actions/runs/37069142632) |
| 6 | `a20efad5c9b6121d0e8522a4df3d0962a13e7ce2` | [CI run 37069915267](https://github.com/elijahama/halieus-game-room/actions/runs/37069915267) |

| 7 | `65de3b24d80cec8e0293a459d95aee11a0a2e665` | [CI run 37070261258](https://github.com/elijahama/halieus-game-room/actions/runs/37070261258) |

Batches 1–7: linked workflows green. The package follow-up is identifiable by `part26: include canonical Stop and artwork approval in verified packages` in Git history; its workflow verifies the final release identity.

Automated/local evidence:

- Typecheck, full existing regression chain and production build passed after each implementation batch. Build retains its existing large-chunk advisory; no build error.
- Release browser validation passed with matching browser/server version, fingerprint, service-worker cache and favicon identity.
- Website browser validation passed desktop 1440×900, short desktop 1280×600, tablet 820×1180 and phone 390×844 in light and dark modes. Checks cover boot/auth/home H, no horizontal overflow, all ten logo choices, compact Theme row and independence of theme/logo selection. Screenshots were inspected locally.
- Control browser fixture installs a genuinely old worker/shell, updates it without clearing data, then verifies offline → retry → fresh → expired/disabled → re-pair → dashboard → disconnected. API data is not cached.
- Real isolated Control process test rejects anonymous/wrong-token shutdown and accepts authenticated graceful shutdown. Mocked Windows update lifecycle covers stopped/running/stale state, saved HTTPS port and token rotation failure.
- Windows PowerShell 5 runtime test decodes real PNG/ICO exports, verifies all 16 actual COM shortcuts in an isolated fake Start Menu, tests a path containing commas, and rejects corruption, wrong artwork, wrong icon index/target and cache refresh failure. It runs on Windows in the regression chain; Linux CI reports the Windows runtime limitation explicitly.
- Dependency audit reported zero vulnerabilities on 2 October 2026.

## Owner-PC and phone acceptance still required

No production deployment or owner Control process was started by this repair. The normal owner checkout was not overwritten; its pre-existing local release-file changes remain intact. Windows test shortcuts were confined to temporary fixture folders.

After final CI is green:

1. Run the normal updater in the owner checkout. Verify the two Control shortcuts and distinct blue gear/red Stop treatments, with no Control Mobile duplicate. Check the actual desktop/Start Menu appearance after cache refresh.
2. With Control running before update, confirm its old PID exits, the new process serves current code on the same private HTTPS port, a fresh pairing code appears and the phone re-pairs. Repeat with Control stopped; it must remain stopped.
3. On an already-installed Chrome/Brave phone PWA, update without clearing app data. With the PC unavailable, verify the dedicated unavailable screen and Retry connection. Restore PC availability, pair, let a code expire, confirm disabled entry, then reopen Control to renew and retry. No usable form may display a generic Failed to fetch error.
4. Confirm desktop and installed-site H geometry and palette visually, all ten personal logo choices, compact Theme row, light/dark readability, and the revised desktop sidebar. Fixed mobile navigation must remain as approved.

Live Tailscale connectivity, actual installed phone behaviour and final artwork acceptance cannot be established by CI or isolated browser fixtures. Report any mismatch against this checklist, not by silently substituting older reference decisions.

## Exact files changed by source batch

### Batch 1: 4714d17

- `assets/branding/references/HGR Control Launcher.png`
- `assets/branding/references/HGR Control Launcher.svg`
- `assets/branding/references/HGR_CONTROL_LAUNCHER_SOURCE.md`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`
- `server/control-ui/control-icon.png`
- `tests/regression-part26-control-launcher-hardening.mjs`

### Batch 2: a84ad34

- `Update HGR GitHub.cmd`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`
- `package.json`
- `scripts/windows/refresh-control-after-update.ps1`
- `scripts/windows/stop-control-mobile.ps1`
- `server/src/control-agent.ts`
- `tests/runtime-control-lifecycle.mjs`
- `tests/runtime-control-update.ps1`

### Batch 2 follow-up: be0e52d

- `scripts/windows/refresh-control-after-update.ps1`

### Batch 3: 3fe28ef

- `.github/workflows/release-identity.yml`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`
- `scripts/windows/start-control-mobile.ps1`
- `server/control-ui/control.js`
- `server/control-ui/index.html`
- `server/control-ui/manifest.webmanifest`
- `server/control-ui/offline.html`
- `server/control-ui/sw.js`
- `tests/browser-control-state.mjs`
- `tests/regression-control-agent.mjs`

### Batch 4: 421c7a7

- `assets/branding/icon-sets/glyphs/hgr-h-black.svg`
- `assets/branding/icon-sets/glyphs/hgr-h-white.svg`
- `assets/branding/icon-sets/glyphs/hgr-h.svg`
- `client/index.html`
- `client/public/app-icon.svg`
- `client/public/brand/flat/brand-default.png`
- `client/public/brand/flat/brand-default.svg`
- `client/public/brand/flat/inverted.png`
- `client/public/brand/flat/inverted.svg`
- `client/public/brand/flat/light-mode.png`
- `client/public/brand/flat/light-mode.svg`
- `client/public/brand/flat/mono-dark.png`
- `client/public/brand/flat/mono-dark.svg`
- `client/public/brand/flat/mono-gold.png`
- `client/public/brand/flat/mono-gold.svg`
- `client/public/brand/flat/mono-light.png`
- `client/public/brand/flat/mono-light.svg`
- `client/public/brand/flat/outline.png`
- `client/public/brand/flat/outline.svg`
- `client/public/brand/glyphs/H-black.png`
- `client/public/brand/glyphs/H-black.svg`
- `client/public/brand/glyphs/H-gold.png`
- `client/public/brand/glyphs/H-gold.svg`
- `client/public/brand/glyphs/H-white.png`
- `client/public/brand/glyphs/H-white.svg`
- `client/public/brand/glyphs/H.svg`
- `client/public/halieus-app-icon.svg`
- `client/public/halieus-mark.svg`
- `client/src/App.tsx`
- `client/src/platform/components/HalieusBrandMark.tsx`
- `client/src/styles/hgr-4.5.1.css`
- `client/src/styles/hgr-design-v1.css`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`
- `shared/platform/brand.ts`
- `tests/browser-release-identity.mjs`
- `tests/browser-website-identity.mjs`
- `tests/regression-4.5-foundation.mjs`
- `tests/regression-brand-theme-launcher-coherence.mjs`
- `tests/regression-part17-theme-foundation.mjs`
- `tests/regression-website-identity.mjs`

### Batch 5: dcfb934

- `.github/workflows/release-identity.yml`
- `Start HGR Control Mobile.cmd`
- `Start HGR Control.cmd`
- `Stop HGR Control Mobile.cmd`
- `Stop HGR Control.cmd`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`
- `scripts/release-integrity.mjs`
- `scripts/windows/refresh-control-after-update.ps1`
- `scripts/windows/start-control-mobile.ps1`
- `scripts/windows/start-control.ps1`
- `scripts/windows/stop-control-mobile.ps1`
- `scripts/windows/stop-control.ps1`
- `tests/package-oracle-4.0.0.ps1`
- `tests/regression-control-agent.mjs`
- `tests/regression-part26-control-launcher-hardening.mjs`
- `tests/runtime-control-update.ps1`

### Batch 6: a20efad

- `assets/branding/references/control-artwork.json`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`
- `scripts/windows/generate-launcher-icons.ps1`
- `scripts/windows/launcher-shortcuts.ps1`
- `tests/regression-part26-control-launcher-hardening.mjs`
- `tests/runtime-launcher-exports.ps1`

## Final package integration check

The real archive inventory exposed one inherited gap after the canonical-helper cleanup: Stop HGR Control.cmd was not among root package files, though the legacy Mobile wrapper was. The packer and release manifest now require the canonical Stop entry point, the approved Control authority PNG and approval record. Acceptance/process docs are also signed. The package regression checks these files and verifies an extracted archive with SSH/SCP blocked. This packaging follow-up does not change gameplay or version.

### Batch 7: 65de3b2

- `docs/HGR_PART26_ACCEPTANCE.md`
- `docs/HGR_CONTROL_ICON_REPAIR_PROCESS.md`
- `docs/HGR_MASTERBOOK.md`

### Package follow-up

- `scripts/release-integrity.mjs`
- `tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1`
- `tests/package-oracle-4.0.0.ps1`
- `tests/regression-control-agent.mjs`
- `docs/HGR_PART26_ACCEPTANCE.md`

Local package-only validation passed: extracted archive verified every signed release input, including `.gitignore`, `SECURITY.md`, canonical Control/Stop and artwork approval. SSH/SCP were blocked by the test. Typecheck, the full regression chain and production build also passed for this follow-up.
