@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "HGR_VERSION=unknown"
if exist "VERSION" set /p HGR_VERSION=<"VERSION"
title Halieus Game Room %HGR_VERSION% - First Run

echo =============================================================
echo  Halieus Game Room %HGR_VERSION% - First Run
echo  Folder: %CD%
echo =============================================================
echo.
echo Regenerating the current Halieus launcher icon family and refreshing shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\launcher-shortcuts.ps1" -UnhideScripts
if errorlevel 1 (
  echo.
  echo Launcher refresh failed. Read the error above.
  pause
  exit /b 1
)

echo.
echo Shortcuts refreshed successfully with the current Halieus icon family.
echo.
echo Project launchers: "%CD%\HGR Launchers"
echo Start Menu group:  Halieus Game Room
echo.
echo Use "HGR - Update Site" for the full GitHub + validation + deploy workflow.
echo.
pause
exit /b 0
