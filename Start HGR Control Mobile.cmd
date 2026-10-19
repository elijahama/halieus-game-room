@echo off
rem Compatibility entrypoint: private phone Control/Tailscale is retired.
rem The live phone/tablet Control UI is https://halieus.remotewire.net/control/
call "%~dp0Start HGR Control.cmd" %*
exit /b %ERRORLEVEL%
