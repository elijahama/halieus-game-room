@echo off
setlocal EnableExtensions
title Install Halieus Website Update Shortcut
color 0E
chcp 65001 >nul 2>&1

rem ============================================================
rem Halieus Game Room - GitHub Shortcut Installer
rem
rem Put this file in the SAME folder as:
rem   Update HGR GitHub.cmd
rem   Halieus Game Room.ico
rem
rem It creates a Start Menu shortcut that can be pinned to Start.
rem ============================================================

for %%I in ("%~dp0\..\..") do set "PROJECT=%%~fI\"
set "TARGET=%PROJECT%Update HGR GitHub.cmd"
set "ICON=%PROJECT%Halieus Game Room.ico"
set "STARTDIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Halieus Game Room"
set "SHORTCUT=%STARTDIR%\Update Halieus Website.lnk"
set "OLD_SHORTCUT=%STARTDIR%\HGR GitHub Update.lnk"
set "OLD_SHORTCUT_2=%STARTDIR%\Update Halieus Game Room.lnk"

cls
echo.
echo ============================================================
echo        HALIEUS GAME ROOM - UPDATE SHORTCUT INSTALLER
echo ============================================================
echo.

if not exist "%TARGET%" (
    echo [ERROR] Update HGR GitHub.cmd was not found beside this installer.
    echo.
    echo Put both files in the root Halieus Game Room folder, then run again.
    echo.
    pause
    exit /b 1
)

if not exist "%STARTDIR%" mkdir "%STARTDIR%" >nul 2>&1
if exist "%OLD_SHORTCUT%" del /q "%OLD_SHORTCUT%" >nul 2>&1
if exist "%OLD_SHORTCUT_2%" del /q "%OLD_SHORTCUT_2%" >nul 2>&1

set "ICONLOCATION=%SystemRoot%\System32\shell32.dll,167"
if exist "%ICON%" set "ICONLOCATION=%ICON%,0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT%'); " ^
  "$s.TargetPath = '%TARGET%'; " ^
  "$s.WorkingDirectory = '%PROJECT%'; " ^
  "$s.IconLocation = '%ICONLOCATION%'; " ^
  "$s.Description = 'Validate, sync to GitHub, and deploy the Halieus website'; " ^
  "$s.WindowStyle = 1; " ^
  "$s.Save()"

if errorlevel 1 (
    echo [ERROR] Windows could not create the shortcut.
    echo.
    pause
    exit /b 1
)

echo [OK] Shortcut created:
echo.
echo   Update Halieus Website
echo.
echo Start Menu folder:
echo   %STARTDIR%
echo.

if exist "%ICON%" (
    echo Using icon:
    echo   Halieus Game Room.ico
) else (
    echo HGR icon was not found, so Windows used a fallback icon.
)

echo.
echo NEXT:
echo   1. Press the Windows key.
echo   2. Search for: Update Halieus Website
echo   3. Right-click it.
echo   4. Choose "Pin to Start".
echo.
echo Opening the shortcut folder now...
start "" explorer.exe "%STARTDIR%"
echo.
pause
endlocal
exit /b 0
