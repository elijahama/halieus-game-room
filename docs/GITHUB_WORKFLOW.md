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

HGR 4.5.2 treats `RELEASE.json` and `shared/release.ts` as generated release-identity outputs, not ordinary human-authored source changes.

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
