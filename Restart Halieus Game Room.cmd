@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem 3.6.3: Restart is intentionally browser/session restart only.
rem It only launches the existing website and never changes production.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\launcher-shortcuts.ps1" >nul 2>&1

set "HGR_VERSION=3.6.4"
if exist "VERSION" set /p HGR_VERSION=<"VERSION"
set "HGR_PROFILE=%LOCALAPPDATA%\Halieus Game Room\Website"
set "HGR_EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%HGR_EDGE%" set "HGR_EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%HGR_EDGE%" set "HGR_EDGE=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$profile=$env:LOCALAPPDATA+'\Halieus Game Room\Website'; Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profile) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

set "HGR_URL=https://halieus.remotewire.net/?build=%HGR_VERSION%&refresh=%RANDOM%%RANDOM%"
if exist "%HGR_EDGE%" (
  start "" "%HGR_EDGE%" --app="%HGR_URL%" --user-data-dir="%HGR_PROFILE%" --no-first-run
) else (
  start "" "%HGR_URL%"
)
exit /b 0
