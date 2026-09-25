# HGR 4.5 — Part 17 validation and changelog

25 September 2026. Internal version 4.5.0; visible Build 4.5.

Implementation commits: fe7437c (full implementation) and 2b29c59 (final Poker spacing). Both are integrated by fast-forward into the normal local main checkout, preserving the reviewed Stage 1 / Stage 2A / website-H history. Production deployment and a GitHub push were not performed.

Exact release: hgr-4.5.0-790a1b1cfb14109c (386 integrity inputs).

## Changelog

- Themes preview across the app, persist only on Apply, and roll back on cancel/close. Player colour stays on identity elements. Appearance owns shared text/density settings; contextual settings own cosmetics.
- Shared create-room framing for all 14 games; centered, fullscreen-aware menus and confirmations; background scroll locking and keyboard focus restoration.
- Mega pregame host timer enforced and locked on the server after start; clearer decks/centre text and unified mode controls. Approved board geometry is retained.
- Poker material/position colours restored, eight-seat phone layout and community cards contained, short Actions panel no longer reserves empty space. Existing tabs/Autopilot preserved.
- Ludo has four visible status rows and saved-seat refresh recovery. Ayo, Word Game and Connect Four receive the requested layout/layering changes. Hidden Dictator receives only the safe shared changes explicitly requested.
- Home recovery cards use canonical icons, theme-coloured Continue actions and full available width. Mobile header/drawer, badges, account records and room-dock containment improved.
- Account-bound server progression, GamerScore and earned cosmetics; cumulative Kass/trade/active-time achievements and verified game feats. Cancelled/Test Lab/spoofed sessions cannot earn awards. Private attribution is removed from public states.
- Atomic, idempotent archive finalization; distinct rematch records; host-closed games excluded from completion credit. Classic-table valid completion/recovery regressions retained.

## Validation evidence

| Check | Result |
|---|---|
| Normal project client/server typecheck and production build | PASS |
| Full configured regression chain, including classic-table lifecycle | PASS |
| Part 17 runtime: timer authorization/lock/deadline, cumulative achievements, duplicate/concurrent replay, private identity, cancellation/beta exclusions, immutable rematches, evaluated Poker royal flush and four-home Ludo feat | PASS |
| Built Part 17 browser: 1440x900, 1280x600, 820x1180, 390x844, 360x640 | PASS |
| All 14 create dialogs at five sizes; seven live/recovery game families at desktop, short desktop, phone and tablet | PASS |
| Theme preview/Apply/Escape/custom rollback, text-size measurement, nested Build Info close, body scroll lock, menu containment | PASS |
| Real authenticated Connect Four completion: score, ownership, locked/unlocked cosmetic APIs, host-close exclusion | PASS |
| Intro automatic/Enter/Skip/reduced-motion/mobile/landscape; 16 direct routes and saved recovery | PASS |
| Browser/server/version/cache identity and website H/M/P across desktop/phone/tablet, light/dark | PASS |
| Actual Oracle packer in PackageOnly mode; .gitignore/SECURITY.md required; extracted integrity; no SSH/SCP | PASS |
| Full source ZIP extracted release verification and 16 protected asset byte hashes | PASS |

The new tests are available as `npm run test:part17` (also included in `test:regression`) and `npm run test:part17:browser`. The screenshot acceptance matrix and original 22-section traceability are in PART17_IMPLEMENTATION_CHECKLIST.md and PART17_PRE2B_SCREENSHOT_MATRIX.md.

## Practical limits

Responsive tests use Chromium emulation, not physical Android/iOS touch hardware. Hidden Dictator's deeper voting/policy redesign remains outside the original requested scope. The existing large-client-chunk build warning remains a performance follow-up. Legacy name-only records do not retrospectively award verified achievements. Archive-derived progression currently scans finalized history; retain private account/session backups. The package excludes credentials, runtime data, dependencies, generated builds and stale nested source copies; install dependencies and build normally before running it.

The normal project folder contains these changes. The production website will change only when its separate deployment workflow runs. Historical stage-only documents do not describe the current implementation status.
