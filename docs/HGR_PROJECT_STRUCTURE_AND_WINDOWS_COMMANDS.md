# HGR Project Structure & Windows Command Reference

## Why this cleanup exists

The HGR root is the project's front desk, not its storage cupboard. Files that a person regularly launches stay at the root. Implementation helpers live under `scripts/windows`, branding assets live under `assets/branding`, and runtime/generated data stays in its own folders.

The main rule is: **never move a launcher or helper without updating every path that points to it.**

## Canonical root layout

Keep these user-facing launchers at the root:

- `Start Halieus Game Room.cmd`
- `Restart Halieus Game Room.cmd`
- `Close Halieus Game Room.cmd`
- `Update HGR GitHub.cmd`
- `FIRST RUN - Refresh Halieus Launchers.cmd`

Keep project identity and repository files at the root:

- `VERSION`, `RELEASE.json`, `package.json`, `package-lock.json`
- `README.md`, `ARCHITECTURE.md`, `SECURITY.md`
- `.gitignore`, `.gitattributes`

Implementation helpers belong in:

- `scripts/windows/` — Windows launch, local runtime, Git and admin helpers
- `scripts/` — cross-platform project/release scripts
- `assets/branding/launchers/` — launcher-specific icons
- `client/`, `server/`, `shared/` — application code
- `desktop/`, `deploy/`, `tests/`, `docs/` — their named responsibilities

Private Oracle material remains local and ignored by Git.

## Safe file-moving workflow

1. **Find references before moving.** Search the repository for the exact filename.
2. **Move with Git-aware tools.** Locally, prefer `git mv old new` for tracked files.
3. **Update path resolution.** Batch files commonly use `%~dp0`; PowerShell scripts should prefer `$PSScriptRoot` and `Join-Path`.
4. **Keep stable entrypoints.** HGR's public root `.cmd` launchers stay in place even when their helper scripts move.
5. **Refresh shortcuts.** Run `FIRST RUN - Refresh Halieus Launchers.cmd` after changing launcher paths.
6. **Validate before deploying.** Run `npm run typecheck`, `npm run build`, and `npm run test:regression`.
7. **Inspect Git.** Run `git status` and `git diff --stat` before committing.
8. **Use the unified updater** to finalise `RELEASE.json` and deploy.

## CMD / batch fundamentals

A reliable HGR-style batch file usually starts with:

```bat
@echo off
setlocal EnableExtensions
pushd "%~dp0"
```

Useful pieces:

- `%~dp0` = folder containing the current batch file.
- `pushd` changes directory and remembers the previous one.
- `popd` returns to the previous directory.
- `set "NAME=value"` is the safest normal variable syntax.
- `call "Other Script.cmd"` runs another batch file and returns afterward.
- `if errorlevel 1 (...)` checks whether the previous command failed.
- Always quote paths that may contain spaces.

Example:

```bat
set "HELPER=%~dp0scripts\windows\example.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%HELPER%"
if errorlevel 1 exit /b 1
```

## PowerShell fundamentals

For scripts that may move into subfolders, do not assume the current working directory.

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ServerRoot = Join-Path $ProjectRoot 'server'
```

Useful pieces:

- `$PSScriptRoot` = folder containing the running PowerShell script.
- `Join-Path` safely builds paths.
- `Test-Path` checks whether a file/folder exists.
- `& "path with spaces.cmd"` invokes a command whose path contains spaces.
- `$LASTEXITCODE` is the exit code from many native programs.
- `try { } catch { }` handles PowerShell exceptions.

From PowerShell, a local command with spaces should be run like:

```powershell
& ".\FIRST RUN - Refresh Halieus Launchers.cmd"
```

Typing only `FIRST RUN - ...` makes PowerShell think `FIRST` is the command.

## Git mental model

- `git pull`: GitHub → local computer.
- `git add`: choose local changes for the next commit.
- `git commit`: create a local saved checkpoint.
- `git push`: local commits → GitHub.

Typical local change flow:

```text
edit → git status → git add → git commit → git pull --rebase → git push
```

Typical "ChatGPT changed GitHub" flow:

```text
GitHub changed → git pull → local files update
```

## HGR one-button update/deploy flow

The unified updater is `Update HGR GitHub.cmd`. It:

1. pulls GitHub;
2. typechecks;
3. builds;
4. runs regression tests;
5. regenerates/verifies release identity;
6. commits/pushes any generated release changes when needed;
7. re-verifies release identity;
8. hands off to the private Oracle website updater.

The private Oracle script and keys remain local and are not committed.

## What can safely move?

Usually safe after reference updates:

- helper PowerShell scripts;
- admin utilities;
- icons/assets;
- documentation.

Treat these as stable entrypoints unless deliberately redesigning launch behaviour:

- root Start/Restart/Close launchers;
- root unified update launcher;
- `VERSION`;
- `package.json`;
- canonical `client/server/shared` directories.

## Troubleshooting after a move

If a launcher stops working:

1. run it from a terminal so the error stays visible;
2. check the referenced path exists;
3. print `%CD%` in CMD or `$PWD` in PowerShell;
4. print `%~dp0` or `$PSScriptRoot`;
5. check `git status`;
6. run typecheck/build/regression;
7. refresh the launch shortcuts.

Avoid "fixing" it by copying duplicate scripts back into the root. Fix the path instead.


## Branding asset map

The project root should not carry launcher artwork. The canonical Windows branding paths are:

- `assets/branding/Halieus Game Room.ico` — primary HGR/folder identity
- `assets/branding/launchers/matte/Start Halieus Game Room.ico`
- `assets/branding/launchers/matte/Restart Halieus Game Room.ico`
- `assets/branding/launchers/matte/Close Halieus Game Room.ico`
- `assets/branding/launchers/matte/Update Halieus Website.ico`
- `assets/branding/launchers/matte/HGR PowerShell.ico`

The launcher refresh script owns the Start Menu shortcuts. Changing an icon should normally mean replacing the icon asset at its canonical path and refreshing launchers, not changing the launcher command itself.

## Start GitHub on day one for future projects

For a normal programming project, connecting Git at the beginning is the preferred default. It avoids repeatedly passing ZIP files around and gives you a permanent history of what changed.

A sensible bootstrap is:

```text
create project folder
→ create/clone GitHub repository
→ add .gitignore before secrets, dependencies or runtime data appear
→ make the first small commit
→ push regularly
```

If the folder already exists locally:

```powershell
git init
git branch -M main
git remote add origin <repository-url>
git add .
git commit -m "Initial project structure"
git push -u origin main
```

If the GitHub repository already exists, cloning it is usually cleaner:

```powershell
git clone <repository-url>
```

Then work inside the cloned folder.

Do **not** use GitHub as a dumping ground for everything. Keep secrets, `.env` files, private keys, runtime databases, generated builds, dependency folders and personal/private deployment material out through `.gitignore`.

For future AI-assisted projects, the useful pattern is:

```text
GitHub is the shared source of truth
→ AI/code changes can land in the repository
→ git pull brings them to your computer
→ your local commits use git push to send them back
```

ZIPs still have a place for frozen backups, external handoffs or release archives, but they should not be the normal development transport.


## Generated launcher icons

The five Windows utility icons are generated by:

`scripts/windows/generate-launcher-icons.ps1`

Running:

`FIRST RUN - Refresh Halieus Launchers.cmd`

first deletes previous launcher-art experiments, then recreates one clean folder:

`assets/branding/launchers/matte/`

The current family is intentionally restrained:

- Start — matte green
- Restart — matte amber
- Close — matte red
- Update — matte blue
- HGR PowerShell — matte slate with a small `>_` badge

There is no glass treatment, neon glow, lens flare or reflective highlight. The artwork uses a low-contrast vertical tone shift, one outer border and one subtle inner line.

The generated PNG and ICO files are local build artefacts and are ignored by Git. The source of truth is the PowerShell drawing recipe.

If Windows still shows an older pinned image, unpin the old Start item and pin the newly refreshed shortcut.

## Design-system reference

Shared product design rules live in:

`docs/HGR_DESIGN_SYSTEM.md`

The website token layer is:

`client/src/styles/hgr-theme.css`

Launcher artwork is kept separate from gameplay/layout code so changing shortcut visuals cannot change launcher behaviour or game rules.
