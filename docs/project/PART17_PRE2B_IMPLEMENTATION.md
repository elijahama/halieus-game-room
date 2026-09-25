# Part 17 pre-2B website identity integration

Branch: part17-pre2b-integration. Parent: 0f330b193aefb65c3a028fa53a31764918559d34 (Stage 2A), whose history includes 410e0af9047041b56b9b5981b245792c6959a000 (Stage 1). This branch is prepared for review; normal main is neither merged nor deployed.

## Change and rationale

Restore the website block H from the approved Sep 22 08_26_37 website reference, corroborated by historical commit 477d352. Path: `M17 15h10v12h10V15h10v34H37V36H27v13H17z`, viewBox 0 0 64 64. The rejected slab-serif geometry belongs to the separate launcher family. Theme colour/contrast, dimensions, game geometry and behavior are retained.

Updated React shared mark (home/sidebar/phone drawer/bar, auth header/hero and intro), inline boot, dynamic platform tab glyph, static platform SVG, PWA/legacy SVG, favicon PNG/ICO, Apple-touch/192/512 PNGs. The website-only generator renders from client/public/halieus-app-icon.svg and never reads/writes protected launcher/reference files. PWA/social/touch URLs receive a website-art revision. The existing fingerprint-keyed service-worker cache separates this source correction from previous cached builds. Canonical version remains 4.5.0; display remains Build 4.5.

Catalogue M/P artwork and contextual routing are unchanged. Installed Windows platform artwork remains separate and unchanged. No server or game-rule implementation changes.

## Evidence and contracts

- PART17_PRE2B_INSPECTION.md: all twelve pre-edit findings and integration rationale.
- PART17_PRE2B_REFERENCES.md: sixteen Drive documents and all artwork comparisons.
- PART17_PRE2B_SCREENSHOT_MATRIX.md: every one of 42 phone and 8 tablet images, with severity and future acceptance.
- tests/fixtures/pre2b-protected-assets.json: complete before-work SHA-256 snapshot for all sixteen protected files; validate after work using regression-protected-brand-assets.mjs. Exact local bytes are required; cross-platform text-only CRLF conversion is handled separately by regression.
- tests/fixtures/pre2b-website-assets.json: website raster output and unchanged contextual M/P hashes.
- regression-4.5-foundation.mjs now protects the block website H rather than the incorrect slab.
- Independent protected-assets and website-identity regressions prevent website/launcher generation coupling.
- browser-website-identity.mjs checks built production output at desktop 1440×900, phone 390×844, tablet 820×1180, light/dark: boot/auth/home, theme, platform H, contextual M/P, errors and home overflow.

## Validation procedure

Run prepare:release, client/server typecheck, production build, full test:regression (includes classic lifecycle), test:release:browser, test:website:browser, existing handoff browser scenarios, and the real Oracle package-only/extraction integrity regression. Browser tests use isolated temporary data and mocked auth status, not production accounts. Local production-bundle emulation is not physical-device or live Oracle acceptance. Final measured results/fingerprint/commit are recorded in the project-root PRE2B_VALIDATION.md to avoid circular self-hashing.

## Deferred scope

No Stage2B or timer changes; no dock/account/auth-layout/theme precedence redesign; no Poker colour/game-layout migrations, achievements or cosmetics changes. Record extra evidence of eight-seat phone Poker crowding and off-viewport menu sheets for reproduction. Preserve Ludo and Mega board geometry. The two protected launcher trees are immutable; observed SVG/ICO differences are recorded, not repaired.

## Eventual integration

Recheck normal main and remote before integrating. Review/merge this complete branch so Stage1 → Stage2A → pre2B ancestry survives. If main still equals approved base, fast-forward is possible; if it advanced, use a reviewed merge and rerun validation. Never cherry-pick duplicates or squash validated commits without necessity. Do not run Update HGR GitHub.cmd merely to inspect this branch: that workflow requires main and also pushes/deploys. Push/deployment need explicit approval. Files under synced sources remain read-only; local notes do not themselves establish cloud sync.

