@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Halieus Game Room - GitHub Sync
color 0E
chcp 65001 >nul 2>&1

rem ------------------------------------------------------------
rem Halieus Game Room - GitHub Sync
rem Put this file in the ROOT of the Halieus Game Room project.
rem It always works from its own folder, so you can launch it
rem from a Start Menu shortcut without manually using cd.
rem ------------------------------------------------------------

pushd "%~dp0"

set "REPO=Laijee27/halieus-game-room"
set "REMOTE=origin"
set "BRANCH=main"
set "ICON=%~dp0Halieus Game Room.ico"
set "SHORTCUT_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Halieus Game Room"
set "SHORTCUT=%SHORTCUT_DIR%\HGR GitHub Sync.lnk"

:preflight
cls
echo.
echo ============================================================
echo             HALIEUS GAME ROOM - GITHUB SYNC
echo ============================================================
echo.
echo Project folder:
echo   %CD%
echo.
echo Repository:
echo   https://github.com/%REPO%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or is not available in PATH.
    echo.
    echo Install Git for Windows, then run this again.
    goto :pause_exit
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This folder is not currently a Git repository.
    echo.
    echo Make sure this CMD file is inside the ROOT of:
    echo   Halieus Game Room
    echo.
    echo The same folder should contain client, server, shared,
    echo package.json, VERSION, and the hidden .git folder.
    goto :pause_exit
)

for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "ROOT=%%R"
echo Git root:
echo   %ROOT%
echo.

:menu
echo ------------------------------------------------------------
echo  [1] Sync HGR changes TO GitHub
echo  [2] Update HGR FROM GitHub
echo  [3] Show Git status
echo  [4] Show recent commits
echo  [5] Install / refresh Start Menu shortcut
echo  [6] Open HGR GitHub repository
echo  [7] Exit
echo ------------------------------------------------------------
echo.
choice /c 1234567 /n /m "Choose an option [1-7]: "

if errorlevel 7 goto :done
if errorlevel 6 goto :open_github
if errorlevel 5 goto :install_shortcut
if errorlevel 4 goto :history
if errorlevel 3 goto :status
if errorlevel 2 goto :pull
if errorlevel 1 goto :sync

:sync
cls
echo.
echo ============================================================
echo                 SYNC HGR TO GITHUB
echo ============================================================
echo.

echo [1/7] Checking branch...
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "!CURRENT_BRANCH!"=="%BRANCH%" (
    echo [ERROR] Current branch is "!CURRENT_BRANCH!", not "%BRANCH%".
    echo.
    echo No files were staged or pushed.
    goto :pause_menu
)
echo     Branch: !CURRENT_BRANCH!
echo.

echo [2/7] Current changes:
git status --short
echo.

set /p "CONTINUE=Continue with this change set? [Y/N]: "
if /i not "%CONTINUE%"=="Y" (
    echo.
    echo Sync cancelled.
    goto :pause_menu
)

echo.
echo [3/7] Staging tracked, new, and deleted files...
git add -A
if errorlevel 1 (
    echo [ERROR] git add failed.
    goto :unstage_pause
)

rem Safety guard for file names that should never be published.
set "BLOCKED=0"
for /f "delims=" %%F in ('git diff --cached --name-only') do (
    echo %%F | findstr /i /r /c:"Oracle Quick Deploy" /c:"OWNER SETUP CODE" /c:"ACCOUNT MIGRATION" /c:"OWNER BUILD" /c:"\.key$" /c:"\.pem$" /c:"\.pfx$" /c:"\.ppk$" /c:"\.env$" /c:"\.db$" /c:"\.sqlite" /c:"Backups" /c:"server/data/rooms.json" /c:"server/data/feedback.json" /c:"server/data/rankings.json" /c:"update-website.ps1" >nul
    if not errorlevel 1 (
        echo [BLOCKED] %%F
        set "BLOCKED=1"
    )
)

if "!BLOCKED!"=="1" (
    echo.
    echo [STOPPED] Sensitive/private-looking files were staged.
    echo Nothing will be committed or pushed.
    echo.
    git reset >nul 2>&1
    echo The staging area has been cleared.
    goto :pause_menu
)

echo.
echo [4/7] Staged summary:
git diff --cached --stat
echo.

git diff --cached --quiet
if not errorlevel 1 (
    echo No changes need committing.
    echo.
    echo Pulling GitHub anyway so the laptop stays current...
    git pull --rebase %REMOTE% %BRANCH%
    goto :pause_menu
)

:message
echo.
set "MSG="
set /p "MSG=Commit message: "
if "%MSG%"=="" (
    echo Please enter a meaningful commit message.
    goto :message
)

echo.
echo [5/7] Creating commit...
git commit -m "%MSG%"
if errorlevel 1 (
    echo [ERROR] Commit failed. Nothing has been pushed.
    goto :pause_menu
)

echo.
echo [6/7] Bringing in any newer GitHub commits...
git pull --rebase %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [STOPPED] Git could not complete the rebase automatically.
    echo Your local commit is safe, but it has NOT been pushed.
    echo Resolve the Git conflict before pushing.
    echo.
    echo Do NOT use git push --force.
    goto :pause_menu
)

echo.
echo [7/7] Pushing to GitHub...
git push %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. Your local commit is still safe.
    goto :pause_menu
)

echo.
echo ============================================================
echo SUCCESS - HGR IS SYNCED TO GITHUB
echo ============================================================
echo.
git status -sb
goto :pause_menu

:pull
cls
echo.
echo ============================================================
echo                UPDATE HGR FROM GITHUB
echo ============================================================
echo.

echo Current local changes:
git status --short
echo.

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "!CURRENT_BRANCH!"=="%BRANCH%" (
    echo [ERROR] Current branch is "!CURRENT_BRANCH!", not "%BRANCH%".
    goto :pause_menu
)

echo Pulling and rebasing from %REMOTE%/%BRANCH%...
echo.
git pull --rebase --autostash %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo [ERROR] Update could not complete automatically.
    echo Review the Git message above before continuing.
    goto :pause_menu
)

echo.
echo ============================================================
echo SUCCESS - LAPTOP HGR IS UP TO DATE
echo ============================================================
echo.
git status -sb
goto :pause_menu

:status
cls
echo.
echo ============================================================
echo                        GIT STATUS
echo ============================================================
echo.
git status -sb
echo.
git status --short
goto :pause_menu

:history
cls
echo.
echo ============================================================
echo                     RECENT COMMITS
echo ============================================================
echo.
git --no-pager log --oneline --decorate -15
goto :pause_menu

:install_shortcut
cls
echo.
echo ============================================================
echo                INSTALL START MENU SHORTCUT
echo ============================================================
echo.

if not exist "%SHORTCUT_DIR%" mkdir "%SHORTCUT_DIR%" >nul 2>&1

set "ICON_ARG=%SystemRoot%\System32\shell32.dll,167"
if exist "%ICON%" set "ICON_ARG=%ICON%,0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT%'); " ^
  "$s.TargetPath = '%~f0'; " ^
  "$s.WorkingDirectory = '%~dp0'; " ^
  "$s.IconLocation = '%ICON_ARG%'; " ^
  "$s.Description = 'Sync Halieus Game Room with GitHub'; " ^
  "$s.Save()"

if errorlevel 1 (
    echo [ERROR] Could not create the Start Menu shortcut.
    goto :pause_menu
)

echo Start Menu shortcut created:
echo   %SHORTCUT%
echo.
if exist "%ICON%" (
    echo Icon:
    echo   %ICON%
) else (
    echo Halieus Game Room.ico was not found beside this CMD,
    echo so Windows used a fallback icon.
)
echo.
echo Open Start, search "HGR GitHub Sync", then right-click it
echo and choose "Pin to Start" if you want it pinned.
echo.
set /p "OPENSTART=Open the Start Menu Programs folder now? [Y/N]: "
if /i "%OPENSTART%"=="Y" explorer.exe "%SHORTCUT_DIR%"
goto :pause_menu

:open_github
start "" "https://github.com/%REPO%"
goto :menu

:unstage_pause
git reset >nul 2>&1
echo Staging area cleared.

:pause_menu
echo.
pause
goto :preflight

:pause_exit
echo.
pause

:done
popd
endlocal
exit /b 0
