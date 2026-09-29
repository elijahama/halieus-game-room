@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%~dp0Start HGR Control.cmd"
set "HGR_EXIT=%ERRORLEVEL%"
endlocal & exit /b %HGR_EXIT%
