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
