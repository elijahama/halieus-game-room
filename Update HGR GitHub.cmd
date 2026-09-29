@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Halieus Game Room - Update + Deploy
color 0E
chcp 65001 >nul 2>&1

rem ============================================================
rem Halieus Game Room - GitHub Update
rem Put this CMD file in the ROOT of the HGR project.
rem It works from its own folder, including Start Menu shortcuts.
rem ============================================================

pushd "%~dp0"

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

for /f "delims=" %%F in ('git ls-tree -r --name-only HEAD -- "assets/branding/launchers" "assets/branding/references"') do (
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
echo Your local source changes were uploaded at STEP 7 when a commit was needed.
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
set "TRACKED_ORACLE_DIR=%~dp0tests\dev-tools\Oracle Quick Deploy"
set "LOCAL_ORACLE_DIR=%~dp0dev-tools\Oracle Quick Deploy"
if exist "%TRACKED_ORACLE_DIR%\deploy-from-windows.ps1" (
    if not exist "%LOCAL_ORACLE_DIR%" mkdir "%LOCAL_ORACLE_DIR%" >nul 2>&1
    copy /Y "%TRACKED_ORACLE_DIR%\deploy-from-windows.ps1" "%LOCAL_ORACLE_DIR%\deploy-from-windows.ps1" >nul
    copy /Y "%TRACKED_ORACLE_DIR%\quick-install.sh" "%LOCAL_ORACLE_DIR%\quick-install.sh" >nul
    echo [OK] Local Oracle deploy helper refreshed from the current tracked source.
)

set "PRIVATE_UPDATE_PS1=%~dp0update-website.ps1"
set "ORACLE_DEPLOY_PS1=%LOCAL_ORACLE_DIR%\deploy-from-windows.ps1"

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
echo [OK] GitHub sync, validation and release preparation completed.
echo [INFO] No private Oracle deployment helper was found on this computer.
echo        Nothing is wrong with GitHub; website deployment was skipped.
echo.
goto :PAUSE_SUCCESS

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
echo   9. Existing HGR app window refreshes itself; HGR opens only if it was closed
echo.
goto :REFRESH_AFTER_UPDATE

:PAUSE_SUCCESS
echo.
echo ============================================================
echo                 HGR UPDATE COMPLETE
echo ============================================================
echo.
goto :REFRESH_AFTER_UPDATE

:REFRESH_AFTER_UPDATE
echo.
echo FINAL STEP - Refreshing the HGR client...
echo Existing HGR windows now refresh themselves after the production release changes.
echo A new HGR window is opened only when no dedicated HGR window is already running.
echo.
if not exist "%~dp0scripts\windows\post-update-client.ps1" (
    echo [STOPPED] Update completed, but the post-update HGR client helper is missing:
    echo   %~dp0scripts\windows\post-update-client.ps1
    echo The website deployment is complete. Run Start Halieus Game Room.cmd manually if needed.
    popd
    endlocal
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\post-update-client.ps1"
if errorlevel 1 (
    echo.
    echo [STOPPED] Update/deploy completed, but the HGR client could not be refreshed/opened cleanly.
    echo The website deployment is complete. Use Restart Halieus Game Room.cmd as the recovery fallback.
    popd
    endlocal
    exit /b 1
)

echo [OK] HGR client handoff completed without forcing a new window.
echo.
popd
endlocal
exit 0

:PAUSE_EXIT
echo.
if /i "%HGR_UPDATE_NONINTERACTIVE%"=="1" (
    popd
    endlocal
    exit /b 1
)
pause
popd
endlocal
exit /b 1
