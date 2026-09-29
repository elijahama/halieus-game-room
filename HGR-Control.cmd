@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\hgr-control-client.ps1" %*
set "HGR_EXIT=%ERRORLEVEL%"
endlocal & exit /b %HGR_EXIT%
