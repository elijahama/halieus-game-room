@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\start-control.ps1" %*
set "HGR_EXIT=%ERRORLEVEL%"
if not "%HGR_EXIT%"=="0" goto :DONE
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\start-control-cloud.ps1"
if errorlevel 1 (
    echo [WARNING] Private HGR Control is running, but the outbound Cloud bridge did not start.
    echo           Cloud Update will remain unavailable until the bridge starts successfully.
)
:DONE
endlocal & exit /b %HGR_EXIT%
