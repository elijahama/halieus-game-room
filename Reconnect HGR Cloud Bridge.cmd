@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\recover-control-cloud.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (echo HGR Cloud bridge recovery completed.) else (echo HGR Cloud bridge recovery requires attention. Exit code: %EXIT_CODE%)
echo Open https://halieus.remotewire.net/control/ to verify the Owner PC connection.
echo.
endlocal & exit /b %EXIT_CODE%
