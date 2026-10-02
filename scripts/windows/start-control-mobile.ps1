# Compatibility entry point for pre-Part-26 integrations.
param([ValidateRange(1,65535)][int]$HttpsPort = 8443)
& (Join-Path $PSScriptRoot "start-control.ps1") -HttpsPort $HttpsPort
if (-not $?) { exit 1 }
