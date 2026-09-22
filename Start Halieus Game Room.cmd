@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem 3.6.3: Start is intentionally launch-only.
rem It only launches the existing website and never changes production.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\launcher-shortcuts.ps1" >nul 2>&1

set "HGR_URL=https://halieus.remotewire.net"
set "HGR_PROFILE=%LOCALAPPDATA%\Halieus Game Room\Website"
set "HGR_EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%HGR_EDGE%" set "HGR_EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%HGR_EDGE%" set "HGR_EDGE=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"

if exist "%HGR_EDGE%" (
  start "" "%HGR_EDGE%" --app="%HGR_URL%" --user-data-dir="%HGR_PROFILE%" --no-first-run
) else (
  start "" "%HGR_URL%"
)
exit /b 0
