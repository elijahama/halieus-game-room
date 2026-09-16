@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Close Halieus Game Room

REM Keep Halieus shortcuts in sync if this command is run directly.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\launcher-shortcuts.ps1" >nul 2>&1

echo Stopping Halieus Game Room background server...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$pidFiles = @((Join-Path (Get-Location) '.runtime\halieus-game-room.pid'), (Join-Path (Get-Location) '.runtime\mega-board.pid'));" ^
  "$stopped = $false;" ^
  "foreach ($pidFile in $pidFiles) {" ^
  "  if (Test-Path $pidFile) {" ^
  "    $serverPid = [int](Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1);" ^
  "    if ($serverPid -gt 0) {" ^
  "      $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue;" ^
  "      if ($process) { Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue; $stopped = $true }" ^
  "    }" ^
  "    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "  }" ^
  "}" ^
  "if (-not $stopped) {" ^
  "  $connections = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue;" ^
  "  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique;" ^
  "  foreach ($processId in $pids) { if ($processId -and $processId -ne $PID) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } }" ^
  "}"

echo Halieus Game Room server stopped.
echo Tailscale Funnel configuration has been left enabled for the next launch.
timeout /t 2 /nobreak >nul
exit /b 0
