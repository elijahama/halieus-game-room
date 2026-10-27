@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ============================================================
rem Halieus Game Room - GitHub Update
rem Run the real update from a TEMP snapshot so Git can safely replace
rem this tracked launcher during fetch/rebase without corrupting the
rem currently executing batch parser/file position.
rem ============================================================
if /i not "%HGR_UPDATE_SNAPSHOT%"=="1" (
    set "HGR_PROJECT_ROOT=%~dp0"
    set "HGR_UPDATE_SNAPSHOT=1"
    set "HGR_UPDATE_SNAPSHOT_PATH=%TEMP%\HGR-Update-%RANDOM%-%RANDOM%.cmd"
    copy /Y "%~f0" "!HGR_UPDATE_SNAPSHOT_PATH!" >nul
    if errorlevel 1 (
        echo [ERROR] Could not create a temporary HGR updater snapshot.
        exit /b 1
    )
    call "!HGR_UPDATE_SNAPSHOT_PATH!"
    set "HGR_UPDATE_EXIT=!ERRORLEVEL!"
    del /Q "!HGR_UPDATE_SNAPSHOT_PATH!" >nul 2>&1
    exit /b !HGR_UPDATE_EXIT!
)

if not defined HGR_PROJECT_ROOT set "HGR_PROJECT_ROOT=%~dp0"

title Halieus Game Room - Update + Deploy
color 0E
chcp 65001 >nul 2>&1

rem ============================================================
rem Halieus Game Room - GitHub Update
rem Put this CMD file in the ROOT of the HGR project.
rem It works from its own folder, including Start Menu shortcuts.
rem ============================================================

pushd "%HGR_PROJECT_ROOT%"

rem Keep a minimal, non-sensitive result record even if an outer shortcut closes.
set "HGR_LAST_RESULT_DIR=%LOCALAPPDATA%\Halieus Game Room"
if not exist "!HGR_LAST_RESULT_DIR!" mkdir "!HGR_LAST_RESULT_DIR!" >nul 2>&1
set "HGR_LAST_RESULT=!HGR_LAST_RESULT_DIR!\last-update-result.txt"
> "!HGR_LAST_RESULT!" echo STATUS=RUNNING - not yet verified or deployed

set "REMOTE=origin"
set "BRANCH=main"

cls
echo.
echo ============================================================
echo        HALIEUS GAME ROOM - UPDATE + DEPLOY
echo ============================================================
echo.
echo Local project:
echo   %CD%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or is not available in PATH.
    goto :PAUSE_EXIT
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This CMD file is not inside the HGR Git repository.
    echo Put it in the root Halieus Game Room folder and try again.
    goto :PAUSE_EXIT
)

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "!CURRENT_BRANCH!"=="%BRANCH%" (
    echo [ERROR] Current branch is "!CURRENT_BRANCH!", not "%BRANCH%".
    echo No pull, commit or push was attempted.
    goto :PAUSE_EXIT
)

rem The repository owner changed from Laijee27 to elijahama.
rem GitHub redirects the old URL, but the PC should not keep advertising it.
rem Migrate ONLY the verified old HGR origin URL; preserve all other remotes.
set "HGR_ORIGIN_URL="
for /f "delims=" %%U in ('git config --get remote.origin.url') do set "HGR_ORIGIN_URL=%%U"
set "HGR_CANONICAL_ORIGIN="
if /i "!HGR_ORIGIN_URL!"=="https://github.com/Laijee27/halieus-game-room" set "HGR_CANONICAL_ORIGIN=https://github.com/elijahama/halieus-game-room.git"
if /i "!HGR_ORIGIN_URL!"=="https://github.com/Laijee27/halieus-game-room.git" set "HGR_CANONICAL_ORIGIN=https://github.com/elijahama/halieus-game-room.git"
if /i "!HGR_ORIGIN_URL!"=="git@github.com:Laijee27/halieus-game-room" set "HGR_CANONICAL_ORIGIN=git@github.com:elijahama/halieus-game-room.git"
if /i "!HGR_ORIGIN_URL!"=="git@github.com:Laijee27/halieus-game-room.git" set "HGR_CANONICAL_ORIGIN=git@github.com:elijahama/halieus-game-room.git"
if /i "!HGR_ORIGIN_URL!"=="ssh://git@github.com/Laijee27/halieus-game-room" set "HGR_CANONICAL_ORIGIN=ssh://git@github.com/elijahama/halieus-game-room.git"
if /i "!HGR_ORIGIN_URL!"=="ssh://git@github.com/Laijee27/halieus-game-room.git" set "HGR_CANONICAL_ORIGIN=ssh://git@github.com/elijahama/halieus-game-room.git"
if defined HGR_CANONICAL_ORIGIN (
    echo [SYNC] Migrating the known old HGR origin to its canonical GitHub owner...
    git remote set-url %REMOTE% "!HGR_CANONICAL_ORIGIN!"
    if errorlevel 1 (
        echo [STOPPED] The original GitHub remote could not be updated.
        goto :PAUSE_EXIT
    )
    echo [OK] origin now uses !HGR_CANONICAL_ORIGIN!
)
echo [SYNC] GitHub origin currently configured as:
git remote get-url %REMOTE%
if errorlevel 1 (
    echo [STOPPED] The HGR origin could not be read after migration.
    goto :PAUSE_EXIT
)

rem RELEASE.json and shared/release.ts are generated release-identity files.
rem A copied ZIP can preserve stale unmerged index entries for those two files.
rem Recover ONLY those generated conflicts automatically; never auto-resolve source conflicts.
set "HGR_UNMERGED="
set "HGR_UNSAFE_CONFLICT="
for /f "delims=" %%F in ('git diff --name-only --diff-filter^=U 2^>nul') do (
    set "HGR_UNMERGED=1"
    if /i not "%%F"=="RELEASE.json" if /i not "%%F"=="shared/release.ts" set "HGR_UNSAFE_CONFLICT=1"
)
if defined HGR_UNMERGED (
    if defined HGR_UNSAFE_CONFLICT (
        echo [STOPPED] Git has a real source-file conflict that Update will not guess at.
        git status --short
        goto :PAUSE_EXIT
    )
    echo [RECOVERY] Clearing stale generated release-file conflict state...
    git restore --source=HEAD --staged --worktree -- RELEASE.json shared/release.ts
    if errorlevel 1 (
        echo [STOPPED] Could not clear the generated release-file conflict state.
        goto :PAUSE_EXIT
    )
    echo [OK] Generated release-file conflict state cleared safely.
)

rem Generated release identity is disposable before a pull; STEP 2 recreates it
rem from the source tree. Clearing local drift here prevents repeat pull conflicts.
git restore --staged --worktree -- RELEASE.json shared/release.ts >nul 2>&1

echo Current Git status:
echo ------------------------------------------------------------
git status -sb
echo ------------------------------------------------------------
echo.

rem Capture running/stopped state before any source changes.
powershell -NoProfile -ExecutionPolicy Bypass -File "%HGR_PROJECT_ROOT%scripts\windows\refresh-control-after-update.ps1" -Capture
if errorlevel 1 goto :PAUSE_EXIT

echo STEP 1 - Updating LOCAL files from GitHub...
echo.
git fetch %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Git could not fetch the latest %BRANCH% from %REMOTE%.
    echo Your files have NOT been force-pushed.
    goto :PAUSE_EXIT
)
git rebase --autostash %REMOTE%/%BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Git could not rebase the local project onto %REMOTE%/%BRANCH%.
    echo Your files have NOT been force-pushed.
    echo Resolve the reported conflict, then run the updater again.
    goto :PAUSE_EXIT
)

echo.
echo [OK] Local project now includes the latest GitHub changes.
echo.

rem Rebase --autostash can reapply local deletions after GitHub restored
rem tracked branding. Rehydrate ONLY missing protected branding files that the
rem current HEAD still owns. Existing modified artwork is never overwritten.
rem This covers the canonical base assets plus the approved launcher/reference
rem inventories used by the regression and shortcut systems.
set "HGR_REPAIRED_PROTECTED_ASSET="

for %%F in ("assets/branding/Halieus Game Room.ico" "assets/branding/Halieus Game Room.png") do (
    if not exist "%%~F" (
        git cat-file -e "HEAD:%%~F" >nul 2>&1
        if not errorlevel 1 (
            echo [RECOVERY] Restoring missing protected branding asset from current HEAD:
            echo   %%~F
            git restore --source=HEAD --staged --worktree -- "%%~F"
            if errorlevel 1 (
                echo [STOPPED] Could not restore required tracked branding asset:
                echo   %%~F
                goto :PAUSE_EXIT
            )
            set "HGR_REPAIRED_PROTECTED_ASSET=1"
        )
    )
)

for /f "delims=" %%F in ('git ls-tree -r --name-only HEAD -- "assets/branding/references"') do (
    if not exist "%%F" (
        echo [RECOVERY] Restoring missing protected branding asset from current HEAD:
        echo   %%F
        git restore --source=HEAD --staged --worktree -- "%%F"
        if errorlevel 1 (
            echo [STOPPED] Could not restore required tracked branding asset:
            echo   %%F
            goto :PAUSE_EXIT
        )
        set "HGR_REPAIRED_PROTECTED_ASSET=1"
    )
)

if defined HGR_REPAIRED_PROTECTED_ASSET (
    echo [OK] Missing protected branding assets restored from current GitHub-backed HEAD.
    echo.
)

rem A clean isolated main checkout is a Git worktree, not an npm installation.
rem Update used to fail with "'tsc' is not recognized" at STEP 3 because
rem node_modules is intentionally untracked and absent in a new worktree.
rem Install only when the local dependency tree is missing or incomplete.
rem Never alter dependencies in another checkout, install global tools, or
rem continue into GitHub push/Oracle deployment after a failed npm install.
echo STEP 1B - Verifying LOCAL release build dependencies...
set "HGR_RELEASE_DEPS_MISSING="
if not exist "node_modules\.bin\tsc.cmd" set "HGR_RELEASE_DEPS_MISSING=1"
if not exist "node_modules\.bin\vite.cmd" set "HGR_RELEASE_DEPS_MISSING=1"
if not exist "node_modules\tsx\package.json" set "HGR_RELEASE_DEPS_MISSING=1"
if not defined HGR_RELEASE_DEPS_MISSING (
    call npm ls --depth=0 --silent >nul 2>&1
    if errorlevel 1 set "HGR_RELEASE_DEPS_MISSING=1"
)
if defined HGR_RELEASE_DEPS_MISSING (
    echo [SYNC] Installing lockfile-approved build tools into THIS checkout...
    call npm ci --include=dev --no-audit --no-fund
    if errorlevel 1 (
        echo [STOPPED] Local dependency installation failed. No commit, push or deployment was attempted.
        echo Retry after resolving the npm error; no other checkout was changed.
        goto :PAUSE_EXIT
    )
)
if not exist "node_modules\.bin\tsc.cmd" (
    echo [STOPPED] TypeScript is still unavailable after dependency verification. No deployment was attempted.
    goto :PAUSE_EXIT
)
if not exist "node_modules\.bin\vite.cmd" (
    echo [STOPPED] Vite is still unavailable after dependency verification. No deployment was attempted.
    goto :PAUSE_EXIT
)
if not exist "node_modules\tsx\package.json" (
    echo [STOPPED] TSX is still unavailable after dependency verification. No deployment was attempted.
    goto :PAUSE_EXIT
)
echo [OK] Local build tools are available before typecheck.
echo.

echo STEP 2 - Preparing release identity BEFORE the browser build...
echo This regenerates RELEASE.json and shared/release.ts from the canonical VERSION file
echo so the compiled website cannot embed an older build fingerprint.
echo.
call npm run prepare:release
if errorlevel 1 (
    echo.
    echo [STOPPED] Release preparation failed.
    echo Nothing has been committed or pushed by this script.
    goto :PAUSE_EXIT
)
echo [OK] Release manifest/fingerprint generated and verified.
echo.
echo STEP 3 - HGR validation and CURRENT release build...
echo.

call npm run typecheck
if errorlevel 1 (
    echo.
    echo [STOPPED] Typecheck failed.
    echo Nothing has been committed or pushed by this script.
    goto :PAUSE_EXIT
)

call npm run build
if errorlevel 1 (
    echo.
    echo [STOPPED] Build failed.
    echo Nothing has been committed or pushed by this script.
    goto :PAUSE_EXIT
)

call npm run test:regression
if errorlevel 1 (
    echo.
    echo [STOPPED] Regression tests failed.
    echo Nothing has been committed or pushed by this script.
    goto :PAUSE_EXIT
)

echo.
echo STEP 3B - Validating the real Oracle deployment package locally...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tests\package-oracle-4.0.0.ps1"
if errorlevel 1 (
    echo.
    echo [STOPPED] Oracle package preflight failed.
    echo Nothing has been committed, pushed or deployed by this run.
    goto :PAUSE_EXIT
)

echo.
echo [OK] Typecheck, current-release build, regressions and Oracle package preflight passed.
echo.

:STAGE
echo STEP 4 - Reviewing local SOURCE changes...
echo.

rem RELEASE.json and shared/release.ts are generated outputs, not source edits.
rem STEP 2 already validated them; never turn them into a user-authored Git commit.
git restore --staged --worktree -- RELEASE.json shared/release.ts >nul 2>&1

git status --short
echo.

git diff --quiet && git diff --cached --quiet
if not errorlevel 1 (
    echo Nothing needs committing.
    echo Your local project is already up to date with GitHub.
    goto :DONE
)

if /i "%HGR_UPDATE_NONINTERACTIVE%"=="1" (
    echo [STOPPED] Remote/non-interactive Update found local source changes.
    echo Review and commit or discard those edits from the owner PC before retrying.
    goto :PAUSE_EXIT
)

choice /c YN /n /m "Stage these changes for GitHub? [Y/N]: "
if errorlevel 2 (
    echo.
    echo Cancelled. No commit or push was made.
    goto :PAUSE_EXIT
)

git add -A
if errorlevel 1 (
    echo.
    echo [STOPPED] Could not stage the changes.
    goto :PAUSE_EXIT
)

rem Generated release identity is owned by prepare:release / the release bot.
rem Keep it out of the human source commit so final rebases cannot conflict on it.
git reset -- RELEASE.json shared/release.ts >nul 2>&1

git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo [OK] Only generated release identity changed; no source commit is required.
    goto :DONE
)

rem Safety check for private/sensitive-looking files.
set "BLOCKED=0"
for /f "delims=" %%F in ('git diff --cached --name-only') do (
    echo %%F | findstr /i /r ^
      /c:"^dev-tools/Oracle Quick Deploy/" ^
      /c:"OWNER SETUP CODE" ^
      /c:"ACCOUNT MIGRATION" ^
      /c:"OWNER BUILD" ^
      /c:"\.key$" ^
      /c:"\.pem$" ^
      /c:"\.pfx$" ^
      /c:"\.ppk$" ^
      /c:"\.env$" ^
      /c:"\.sqlite" ^
      /c:"\.db$" ^
      /c:"server/data/rooms.json" ^
      /c:"server/data/feedback.json" ^
      /c:"server/data/rankings.json" ^
      /c:"update-website.ps1" >nul

    if not errorlevel 1 (
        echo [BLOCKED] %%F
        set "BLOCKED=1"
    )
)

if "!BLOCKED!"=="1" (
    echo.
    echo [STOPPED] Private/sensitive-looking files were staged.
    echo The staging area will be cleared. Your actual files are untouched.
    git reset >nul 2>&1
    goto :PAUSE_EXIT
)

echo.
echo Staged summary:
echo ------------------------------------------------------------
git diff --cached --stat
echo ------------------------------------------------------------
echo.

:COMMIT_MESSAGE
set "MSG="
set /p "MSG=Commit message: "
if "%MSG%"=="" (
    echo Please enter a useful commit message.
    goto :COMMIT_MESSAGE
)

echo.
echo STEP 5 - Creating local Git commit...
git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo [STOPPED] Commit failed. Nothing was pushed.
    goto :PAUSE_EXIT
)

echo.
echo STEP 6 - Final remote check before push...
git fetch %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Git could not fetch the final remote state before push.
    echo Your local commit is safe, but it has NOT been pushed.
    goto :PAUSE_EXIT
)
git rebase %REMOTE%/%BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] A newer GitHub change caused a rebase conflict.
    echo Your local commit is safe, but it has NOT been pushed.
    echo Do NOT use git push --force.
    goto :PAUSE_EXIT
)

echo.
echo STEP 7 - Pushing LOCAL changes to GitHub...
git push %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Push failed.
    echo Your local commit is still safe on this computer.
    goto :PAUSE_EXIT
)

:DONE
echo.
echo STEP 7B - Safe re-push check...
echo Verifying whether validated local commits still need uploading to GitHub.
echo.

git fetch %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Could not refresh %REMOTE%/%BRANCH% before the re-push check.
    echo No force push was attempted.
    goto :PAUSE_EXIT
)

git merge-base --is-ancestor %REMOTE%/%BRANCH% HEAD
if errorlevel 1 (
    echo.
    echo [STOPPED] GitHub changed again or local history no longer cleanly contains %REMOTE%/%BRANCH%.
    echo No force push was attempted.
    echo Run the updater again so STEP 1 can safely rebase onto the newest GitHub state.
    goto :PAUSE_EXIT
)

set "HGR_AHEAD_COUNT=0"
for /f "delims=" %%A in ('git rev-list --count %REMOTE%/%BRANCH%..HEAD') do set "HGR_AHEAD_COUNT=%%A"

if not "!HGR_AHEAD_COUNT!"=="0" (
    rem Parentheses inside this CMD IF block previously broke parsing.
    echo [SYNC] Local %BRANCH% is !HGR_AHEAD_COUNT! commits ahead of GitHub.
    echo [SYNC] Re-pushing validated local commits...
    git push %REMOTE% %BRANCH%
    if errorlevel 1 (
        echo.
        echo [STOPPED] Safe re-push failed.
        echo Your local commits are still safe on this computer.
        echo No force push was attempted.
        goto :PAUSE_EXIT
    )
    echo [OK] Pending local commits were pushed to GitHub.
) else (
    echo [OK] No pending local commits need re-pushing.
)

echo.
echo ============================================================
echo                    HGR SYNC COMPLETE
echo ============================================================
echo.
git status -sb
echo.
echo LOCAL  ^<-- git pull --  GITHUB
echo LOCAL  -- git push --^>  GITHUB
echo.
echo Your local files were updated at STEP 1.
echo STEP 7 pushes newly created commits; STEP 7B safely re-pushes any validated commits already ahead of GitHub.
echo.
echo STEP 8 - Regenerating final release identity after sync...
echo.
call npm run prepare:release
if errorlevel 1 (
    echo.
    echo [STOPPED] Final release preparation failed, so Oracle deployment was not started.
    goto :PAUSE_EXIT
)
echo [OK] Final release identity regenerated from the synced source tree.
echo.
echo STEP 8B - Final release check before website deployment...
echo.
call npm run validate:release
if errorlevel 1 (
    echo.
    echo [STOPPED] Release identity is not valid, so Oracle deployment was not started.
    echo Run this updater again after reviewing the release error above.
    goto :PAUSE_EXIT
)
echo [OK] RELEASE.json, VERSION and the source fingerprint match.
echo.
echo STEP 9 - Publishing the validated HGR release to the website...
echo.

rem Refresh the local owner deploy helper from the tracked canonical copy so
rem ignored/private dev-tools cannot silently remain on an older release.
set "TRACKED_ORACLE_DIR=%HGR_PROJECT_ROOT%tests\dev-tools\Oracle Quick Deploy"
set "LOCAL_ORACLE_DIR=%HGR_PROJECT_ROOT%dev-tools\Oracle Quick Deploy"
if exist "%TRACKED_ORACLE_DIR%\deploy-from-windows.ps1" (
    if not exist "%LOCAL_ORACLE_DIR%" mkdir "%LOCAL_ORACLE_DIR%" >nul 2>&1
    copy /Y "%TRACKED_ORACLE_DIR%\deploy-from-windows.ps1" "%LOCAL_ORACLE_DIR%\deploy-from-windows.ps1" >nul
    copy /Y "%TRACKED_ORACLE_DIR%\quick-install.sh" "%LOCAL_ORACLE_DIR%\quick-install.sh" >nul
    echo [OK] Local Oracle deploy helper refreshed from the current tracked source.
)

set "PRIVATE_UPDATE_PS1=%HGR_PROJECT_ROOT%update-website.ps1"
set "ORACLE_DEPLOY_PS1=%LOCAL_ORACLE_DIR%\deploy-from-windows.ps1"

rem Cloud updates are non-interactive. Bypass the owner-private updater's
rem recursive key search and GUI picker; use the saved, validated key path
rem with the canonical tracked Oracle helper. Manual Update is unchanged.
if /i "%HGR_UPDATE_NONINTERACTIVE%"=="1" (
    echo [CLOUD] Using the approved unattended Oracle deployment path.
    powershell -NoProfile -ExecutionPolicy Bypass -File "%HGR_PROJECT_ROOT%scripts\windows\cloud-oracle-deploy.ps1"
    if errorlevel 1 (
        echo [STOPPED] The owner-PC Oracle deploy helper could not complete.
        echo Cloud Update will not open a hidden picker or guess an SSH key.
        goto :PAUSE_EXIT
    )
    goto :DEPLOY_DONE
)

if exist "%PRIVATE_UPDATE_PS1%" (
    echo Using owner website updater:
    echo   %PRIVATE_UPDATE_PS1%
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PRIVATE_UPDATE_PS1%"
    if errorlevel 1 (
        echo.
        echo [STOPPED] GitHub sync succeeded, but the private website updater failed.
        echo Review the updater output above. Your GitHub commit remains safe.
        goto :PAUSE_EXIT
    )
    goto :DEPLOY_DONE
)

if exist "%ORACLE_DEPLOY_PS1%" (
    echo Owner wrapper was not found. Falling back to the Oracle deployment helper:
    echo   %ORACLE_DEPLOY_PS1%
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ORACLE_DEPLOY_PS1%" -UseDefaultSshAuth
    if errorlevel 1 (
        echo.
        echo [STOPPED] GitHub sync succeeded, but Oracle deployment could not complete.
        echo If your Oracle key is not loaded in ssh-agent, restore the private
        echo update-website.ps1 owner helper and run this updater again.
        goto :PAUSE_EXIT
    )
    goto :DEPLOY_DONE
)

echo.
echo [STOPPED] GitHub sync and build completed, but WEBSITE DEPLOYMENT DID NOT RUN.
echo Neither update-website.ps1 nor the local Oracle deploy helper is available.
echo The website has NOT been updated by this run. This is not a successful Update.
echo Restore the owner deployment credentials/helper, then retry.
echo.
goto :PAUSE_EXIT

:DEPLOY_DONE

echo.
echo ============================================================
echo              HGR UPDATE + WEBSITE DEPLOY COMPLETE
echo ============================================================
echo.
echo One-button workflow finished successfully:
echo   1. GitHub pulled
echo   2. Release identity generated before build
echo   3. Typecheck passed
echo   4. Browser/server build used the current release identity
echo   5. Regression tests passed
echo   6. Source changes committed/pushed when needed
echo   7. Final release identity regenerated and re-verified
echo   8. Website deployment completed
echo   9. HGR Launchers refreshed and verified
echo  10. Existing HGR Control state refreshed safely
echo  11. Manual website window verified or Cloud GUI check skipped
echo  12. Manual Update opens Control; Cloud finalizer verifies service handoff
echo.
goto :REFRESH_AFTER_UPDATE

:REFRESH_AFTER_UPDATE
echo.
echo FINAL STEP 1 - Refreshing HGR Launchers...
echo Rebuilding the project HGR Launchers folder and Start Menu group from the current source.
echo.
if not exist "%HGR_PROJECT_ROOT%scripts\windows\launcher-shortcuts.ps1" (
    echo [STOPPED] Update completed, but the HGR launcher refresh helper is missing:
    echo   %HGR_PROJECT_ROOT%scripts\windows\launcher-shortcuts.ps1
    popd
    endlocal
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HGR_PROJECT_ROOT%scripts\windows\launcher-shortcuts.ps1"
if errorlevel 1 (
    echo.
    echo [STOPPED] Update/deploy completed, but HGR Launchers could not be refreshed.
    echo Run "FIRST RUN - Refresh Halieus Launchers.cmd" as the recovery fallback.
    popd
    endlocal
    exit /b 1
)
echo [OK] Six HGR Launchers refreshed, including mandatory HGR - Update; private Control launchers retired.
echo.
echo FINAL STEP 2 - Refreshing HGR Control if it was already running...
echo This restarts only an existing live Control Agent, using the newly updated source
echo and fresh credentials. A stopped Control service stays stopped.
echo.
if not exist "%HGR_PROJECT_ROOT%scripts\windows\refresh-control-after-update.ps1" (
    echo [STOPPED] Update completed, but the HGR Control refresh helper is missing:
    echo   %HGR_PROJECT_ROOT%scripts\windows\refresh-control-after-update.ps1
    echo The website deployment is complete. Start HGR - Control manually if needed.
    popd
    endlocal
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HGR_PROJECT_ROOT%scripts\windows\refresh-control-after-update.ps1"
if errorlevel 1 (
    echo.
    echo [STOPPED] Update/deploy completed, but a running HGR Control could not be refreshed.
    echo The website deployment is complete. Use HGR - Stop Control, then HGR - Control.
    popd
    endlocal
    exit /b 1
)
echo [OK] HGR Control post-update handoff completed.
echo.
echo FINAL STEP 3 - Refreshing the HGR client...
echo Manual Update brings the existing website window forward or opens one if absent.
echo Cloud Update uses verified server deployment and a separate background Control finalizer.
echo.
set "HGR_WINDOW_RESULT=SKIPPED_BACKGROUND_ONLY"
if /i "%HGR_UPDATE_NONINTERACTIVE%"=="1" goto :CLOUD_CLIENT_HANDOFF
if not exist "%HGR_PROJECT_ROOT%scripts\windows\post-update-client.ps1" (
    echo [STOPPED] Update completed, but the manual HGR window helper is missing:
    echo   %HGR_PROJECT_ROOT%scripts\windows\post-update-client.ps1
    echo The website deployment is complete. Run Start Halieus Game Room.cmd manually if needed.
    popd
    endlocal
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HGR_PROJECT_ROOT%scripts\windows\post-update-client.ps1" -ShowWindow
if errorlevel 1 (
    echo.
    echo [STOPPED] Update/deploy completed, but the manual HGR client could not be refreshed/opened cleanly.
    echo The website deployment is complete. Use Restart Halieus Game Room.cmd as the recovery fallback.
    popd
    endlocal
    exit /b 1
)
set "HGR_WINDOW_RESULT=VERIFIED"
echo [OK] Manual HGR website window handoff completed.
goto :CLIENT_HANDOFF_DONE

:CLOUD_CLIENT_HANDOFF
echo [CLOUD] Skipping interactive Windows window detection and launch.
echo [CLOUD] Oracle deployment has already been verified; Control restart is deferred to its independent finalizer.

:CLIENT_HANDOFF_DONE
echo.
set "HGR_CONTROL_RESULT=DEFERRED_TO_CLOUD_FINALIZER"
set "HGR_OWNER_EXIT=0"
if /i not "%HGR_UPDATE_NONINTERACTIVE%"=="1" (
    echo FINAL STEP 4 - Starting or opening HGR Control for the owner...
    echo The private Control agent remains background-based; its pairing card should open.
    set "HGR_CONTROL_RESULT=FAILED"
    if exist "%HGR_PROJECT_ROOT%Start HGR Control.cmd" (
        call "%HGR_PROJECT_ROOT%Start HGR Control.cmd"
        if errorlevel 1 (
            echo [PARTIAL] HGR was deployed and the website window opened, but Control did not start.
            echo Try the HGR - Control shortcut and review its error before retrying Update.
            set "HGR_OWNER_EXIT=1"
        ) else (
            set "HGR_CONTROL_RESULT=STARTED_OR_RUNNING"
            echo [OK] HGR Control launched/verified through its canonical launcher.
        )
    ) else (
        echo [PARTIAL] The Start HGR Control.cmd launcher is missing.
        set "HGR_OWNER_EXIT=1"
    )
)

echo.
echo ============================================================
echo             HGR UPDATE FINISHED - CHECK RESULT
echo ============================================================
echo GitHub sync, local validation and Oracle deployment returned success.
echo HGR website: Oracle deployment helper returned success.
echo Owner-PC desktop window: !HGR_WINDOW_RESULT!
echo HGR Control: !HGR_CONTROL_RESULT!
echo This is the SOURCE release identity; Brave/phone install artwork still needs device acceptance:
node -e "const m=require('./RELEASE.json'); console.log(m.fingerprint)"
echo.
if not "!HGR_OWNER_EXIT!"=="0" (
    echo [PARTIAL] Website updated, but the manual Control launch requires attention.
) else (
    echo [OK] Update handoff completed.
)
(
    echo STATUS=DEPLOYED
    echo HGR_WINDOW=!HGR_WINDOW_RESULT!
    echo CONTROL=!HGR_CONTROL_RESULT!
    echo SOURCE_FINGERPRINT:
) > "!HGR_LAST_RESULT!"
node -e "const m=require('./RELEASE.json'); console.log(m.fingerprint)" >> "!HGR_LAST_RESULT!" 2>nul
echo Last update receipt: !HGR_LAST_RESULT!
echo.
if /i not "%HGR_UPDATE_NONINTERACTIVE%"=="1" (
    echo.
    pause
)
set "HGR_RETURN_CODE=!HGR_OWNER_EXIT!"
popd
endlocal & exit /b %HGR_RETURN_CODE%

:PAUSE_EXIT
echo.
if defined HGR_LAST_RESULT (
    > "!HGR_LAST_RESULT!" echo STATUS=STOPPED_OR_INCOMPLETE - read last console error
    echo Update result recorded in: !HGR_LAST_RESULT!
)
rem A failed validation/build must not leave generated release identity dirty.
rem These files are regenerated from canonical source on every update attempt.
git restore --staged --worktree -- RELEASE.json shared/release.ts >nul 2>&1
if /i "%HGR_UPDATE_NONINTERACTIVE%"=="1" (
    popd
    endlocal
    exit /b 1
)
pause
popd
endlocal
exit /b 1
