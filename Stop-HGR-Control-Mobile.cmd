@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%~dp0Stop HGR Control Mobile.cmd" %*
set "HGR_EXIT=%ERRORLEVEL%"
endlocal & exit /b %HGR_EXIT%
