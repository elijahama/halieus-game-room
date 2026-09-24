@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".\scripts\windows\OpenShard-HGR.cmd" (
  echo.
  echo HGR OpenShard helper is missing:
  echo   %CD%\scripts\windows\OpenShard-HGR.cmd
  echo.
  echo Pull the current HGR developer repository, then try again.
  echo.
  pause
  exit /b 1
)

call ".\scripts\windows\OpenShard-HGR.cmd" tui
set "HGR_EXIT=%ERRORLEVEL%"

if not "%HGR_EXIT%"=="0" (
  echo.
  echo OpenShard TUI exited with code %HGR_EXIT%.
  echo.
  echo For receipt-only commands that do not require an AI API key, run:
  echo   scripts\windows\OpenShard-HGR.cmd last
  echo   scripts\windows\OpenShard-HGR.cmd history
  echo   scripts\windows\OpenShard-HGR.cmd stats
  echo.
  pause
)

exit /b %HGR_EXIT%
