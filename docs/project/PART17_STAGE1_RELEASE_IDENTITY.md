# Part 17 Stage 1 — canonical release identity

Scope: release identity only. Canonical internal version is `VERSION` (4.5.0 for this stage); the human label is derived by removing a zero patch, giving **Build 4.5**. Historical notes and archived test fixtures are not current release consumers.

## Flow

1. Edit VERSION deliberately when advancing a release and update the release-intent test.
2. Run `npm run prepare:release`. The existing release-integrity tool generates root/workspace/desktop package versions, root lock metadata, shared APP_VERSION, the derived APP_RELEASE_LABEL, favicon query identifiers, service-worker version prefix and the current README milestone line.
3. Only after those artifacts exist, hash source inputs. Generate RELEASE.json and shared/release.ts from that hash and canonical version. These two fingerprint outputs are excluded from their own input set, avoiding a cycle.
4. Run `npm run build`. Its prebuild verification rejects stale identity; browser and server compile the same shared version and fingerprint.
5. Run `npm run test:release:browser` against the production build. It opens the real Home Build Info, checks HTML diagnostics, server health, favicon queries and the installed worker/cache. Test account responses and data are isolated.
6. Run the real local Oracle package preflight (`tests/package-oracle-4.0.0.ps1`). It extracts the deployment ZIP and executes the same read-only verifier there. Packaging does not connect to Oracle.

The worker registration URL carries RELEASE_FINGERPRINT. Cache names combine the generated semantic-version prefix with that fingerprint, so same-version corrective builds are distinguishable without making the worker source depend on its own source hash. Normal application registration always supplies the fingerprint; manual unversioned worker registration has an explicit fallback cache suffix.

Server health, browser data attributes and exported diagnostic reports retain the full internal version. Only the two existing Build Info headings use APP_RELEASE_LABEL. Feedback entries retain the version originally submitted, including historical releases.

## Protection

The release regression asserts the approved 4.5.0 milestone independently of generated files, rejects nine corrupted package/consumer cases, verifies same-version corrective fingerprints and checks idempotent generation. Existing 4.1 feature tests remain active but no longer force the entire application to stay on 4.1.1. The built-browser test also asserts release intent, preventing all consumers from silently agreeing on an older milestone.

CI prepares version artifacts before checks and builds, runs the rendered identity test, and includes all generated artifacts in its existing release-bot commit. No second version authority is introduced. Source-only identity validation remains usable on deployment hosts without a browser.

Archived `tests/package*.json`, `tests/scripts/*` and the legacy `server/package-lock.json` are not used by the root npm workspace install/build. They are not promoted into release authorities. Historical stylesheet comments, changelogs and regression filenames remain unchanged.

## Validation procedure

Run preparation, release verification, typecheck, production build, full regression chain, built-browser identity check and local Oracle package preflight. Compare protected launcher/reference hashes and review the diff for changes outside Stage 1. Record exact execution results and fingerprint in the task's validation report; do not insert a fingerprint into hashed source documentation (which would create a self-reference).

No Stage 2 fixes, merge or deployment are included.
