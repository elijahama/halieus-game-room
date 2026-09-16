@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Start Halieus Game Room

REM Refresh polished Halieus launch shortcuts for this extracted folder.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\launcher-shortcuts.ps1" >nul 2>&1

echo ==============================================
echo             HALIEUS GAME ROOM
echo ==============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js or restart Windows if it was installed recently.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  echo.
  pause
  exit /b 1
)

set "TAILSCALE_EXE=tailscale"
where tailscale >nul 2>&1
if errorlevel 1 (
  if exist "C:\Program Files\Tailscale\tailscale.exe" (
    set "TAILSCALE_EXE=C:\Program Files\Tailscale\tailscale.exe"
  ) else (
    echo [WARNING] Tailscale CLI was not found.
    echo The local server can still start, but the public link may not work.
    goto :start_server
  )
)

echo [1/3] Checking Tailscale Funnel...
"%TAILSCALE_EXE%" funnel status 2>nul | findstr /I /C:"play-halieus" /C:"127.0.0.1:3000" >nul
if errorlevel 1 (
  echo       Starting Funnel in the background...
  "%TAILSCALE_EXE%" funnel --bg 3000 >nul 2>&1
  if errorlevel 1 (
    echo [WARNING] Tailscale Funnel could not be started automatically.
    echo You can run: tailscale funnel --bg 3000
  ) else (
    echo       Funnel started.
  )
) else (
  echo       Funnel is already configured.
)

:start_server
echo [2/3] Checking Halieus Game Room server...
powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo       Starting production server...
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\start-background.ps1"
  if errorlevel 1 (
    echo [ERROR] The background server could not be started.
    echo Check logs\server-error.log for details.
    echo.
    pause
    exit /b 1
  )
) else (
  echo       Port 3000 is already online. Reusing the running server.
)

echo [3/3] Waiting for the site...
powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(45); do { try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch {}; Start-Sleep -Milliseconds 750 } while ((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if errorlevel 1 (
  echo.
  echo [WARNING] The server did not respond within 45 seconds.
  echo Check logs\server-error.log and logs\server.log for details.
  echo.
  pause
  exit /b 1
)

echo       Opening Halieus Game Room...
start "" "https://play-halieus.tailab13d9.ts.net/"

echo.
echo Halieus Game Room is online.
echo The server is running in the background. This launcher can close safely.
timeout /t 3 /nobreak >nul
exit /b 0
