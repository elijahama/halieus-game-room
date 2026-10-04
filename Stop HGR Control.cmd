@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "HGR_EXIT=0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\stop-control-cloud.ps1"
if errorlevel 1 set "HGR_EXIT=%ERRORLEVEL%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\stop-control.ps1" %*
if errorlevel 1 set "HGR_EXIT=%ERRORLEVEL%"
endlocal & exit /b %HGR_EXIT%
