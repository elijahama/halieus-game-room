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
echo Creating fresh launchers for THIS extracted folder...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\launcher-shortcuts.ps1" -UnhideScripts
if errorlevel 1 (
  echo.
  echo Launcher refresh failed. Read the error above.
  pause
  exit /b 1
)

echo.
echo Launchers refreshed successfully.
echo Use the "Update Halieus Website" Start Menu shortcut for the full GitHub + validation + deploy workflow.
echo.
pause
exit /b 0
