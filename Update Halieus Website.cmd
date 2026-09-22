@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Friendly owner-facing entry point. The real workflow lives in
rem Update HGR GitHub.cmd so there is only one update implementation.
if not exist "%~dp0Update HGR GitHub.cmd" (
    echo [ERROR] Update HGR GitHub.cmd is missing from the project root.
    echo Run git pull or restore the repository before trying again.
    echo.
    pause
    exit /b 1
)

call "%~dp0Update HGR GitHub.cmd"
set "HGR_UPDATE_EXIT=%ERRORLEVEL%"

endlocal & exit /b %HGR_UPDATE_EXIT%
