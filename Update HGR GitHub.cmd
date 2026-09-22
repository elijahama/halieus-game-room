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

echo Current Git status:
echo ------------------------------------------------------------
git status -sb
echo ------------------------------------------------------------
echo.

echo STEP 1 - Updating LOCAL files from GitHub...
echo.
git pull --rebase --autostash %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Git could not update the local project automatically.
    echo Your files have NOT been force-pushed.
    goto :PAUSE_EXIT
)

echo.
echo [OK] Local project now includes the latest GitHub changes.
echo.
echo STEP 2 - HGR validation...
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
echo [OK] Typecheck, build and regression tests passed.
echo.
echo STEP 3 - Finalising release identity...
echo This keeps VERSION, RELEASE.json and shared/release.ts in sync
echo before a validated HGR change can be committed or deployed.
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

:STAGE
echo STEP 4 - Reviewing local changes...
echo.
git status --short
echo.

git diff --quiet && git diff --cached --quiet
if not errorlevel 1 (
    echo Nothing needs committing.
    echo Your local project is already up to date with GitHub.
    goto :DONE
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

rem Safety check for private/sensitive-looking files.
set "BLOCKED=0"
for /f "delims=" %%F in ('git diff --cached --name-only') do (
    echo %%F | findstr /i /r ^
      /c:"Oracle Quick Deploy" ^
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
git pull --rebase %REMOTE% %BRANCH%
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
echo Your local changes were uploaded at STEP 7 when a commit was needed.
echo.
echo STEP 8 - Final release check before website deployment...
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

set "PRIVATE_UPDATE_PS1=%~dp0update-website.ps1"
set "ORACLE_DEPLOY_PS1=%~dp0dev-tools\Oracle Quick Deploy\deploy-from-windows.ps1"

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
echo   2. Typecheck passed
echo   3. Build passed
echo   4. Regression tests passed
echo   5. Release identity generated and verified
echo   6. Changes committed/pushed when needed
echo   7. Final release identity re-verified
echo   8. Website deployment completed
echo.
pause
popd
endlocal
exit /b 0

:PAUSE_SUCCESS
echo.
echo ============================================================
echo                 HGR UPDATE COMPLETE
echo ============================================================
echo.
pause
popd
endlocal
exit /b 0

:PAUSE_EXIT
echo.
pause
popd
endlocal
exit /b 1
