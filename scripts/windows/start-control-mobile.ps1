# Compatibility alias for the retired private mobile launcher.
# Use the same loopback-only agent + outbound Cloud bridge as HGR Control.
param([ValidateRange(0,65535)][int]$HttpsPort=0)
& (Join-Path $PSScriptRoot "start-control.ps1") -HttpsPort $HttpsPort
if ($LASTEXITCODE -ne 0 -or -not $?) { exit 1 }
& (Join-Path $PSScriptRoot "start-control-cloud.ps1")
if ($LASTEXITCODE -ne 0 -or -not $?) { exit 1 }
Write-Host "HGR browser Control: https://halieus.remotewire.net/control/"
exit 0
