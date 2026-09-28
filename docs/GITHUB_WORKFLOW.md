# GitHub Workflow

Halieus Game Room uses **one canonical project folder**.

The same laptop folder is used for development, Git history and release preparation. GitHub tracks only safe source/documentation, while Oracle deployment packaging selects only production-required files.

## Daily workflow

```text
edit HGR
  ↓
test locally
  ↓
git status / git diff
  ↓
commit meaningful change
  ↓
push to GitHub
  ↓
deploy to Oracle separately when ready
```

Useful commands:

```bash
git status
git diff
git add .
git commit -m "Describe the change"
git push
git pull
git log --oneline
```

## Safety rule

Do not commit secrets first and try to hide them later. `.gitignore` prevents new untracked files from being added, but it does not erase files that were already committed.

## Repository role

GitHub is for:

- source code;
- engineering history;
- commits and branches;
- technical documentation;
- portfolio presentation.

Google Drive remains the deeper internal source of truth for long-form project decisions and continuity.

Oracle remains the production runtime/deployment target.


## Generated release identity

HGR 4.5.x treats `RELEASE.json` and `shared/release.ts` as generated release-identity outputs, not ordinary human-authored source changes.

The root `Update HGR GitHub.cmd` workflow therefore:

1. clears stale generated release-file conflicts or local drift before the initial fetch/rebase;
2. runs `npm run prepare:release` before validation/build so the build uses the current source fingerprint;
3. keeps `RELEASE.json` and `shared/release.ts` out of the human source commit;
4. commits and pushes only meaningful source/documentation changes;
5. fetches/rebases again before push rather than force-pushing;
6. regenerates the final release identity from the synced source tree;
7. runs `npm run validate:release` before handing the candidate to the private Oracle deployment path.

If only generated release identity changed, no human source commit is required.

This prevents generated fingerprint files from becoming routine rebase-conflict ownership and keeps source history focused on intentional code/documentation changes.


## Why stale version assertion failures happen

`VERSION` is the sole patch-level release authority. `npm run prepare:release` derives the package versions, lockfile versions, `shared/version.ts`, browser cache/version references, `RELEASE.json`, and `shared/release.ts` from that file.

The failure seen during the 4.5.2 -> 4.5.3 transition came from a regression test that also hard-coded the exact patch number. That created a second version authority:

```text
VERSION                           4.5.3
regression-release-identity.mjs   expected 4.5.2
```

The updater correctly generated 4.5.3 artifacts first, then reached the regression suite and stopped on the stale 4.5.2 assertion. Because the updater is fail-safe, it did not continue to the source commit/push stage. The GitHub release workflow behaves the same way: it prepares the new identity, runs regressions, and only commits generated identity files after the checks pass. If the regression gate is stale, the workflow stops before that generated-file commit.

That is why this error can appear to repeat. Retrying the updater does not change the stale assertion, so each run reconstructs the same valid new release identity and then hits the same obsolete test expectation.

### 4.5.3 prevention rule

The release-identity regression now approves the deliberate `4.5.x` release family instead of duplicating one patch number such as `4.5.2`. Exact patch consistency is still enforced by the release-integrity checks, which require every generated consumer to match `VERSION`.

This preserves both protections:

- an accidental rollback to an older release family such as 4.1.1 still fails;
- normal corrective patch bumps such as 4.5.2 -> 4.5.3 do not require a second hard-coded version edit.

When moving HGR to a new release family, update the family gate deliberately. For ordinary patch bumps inside 4.5.x, change `VERSION` and let `npm run prepare:release` regenerate the consumers. Do not hand-edit `RELEASE.json` or `shared/release.ts`.
