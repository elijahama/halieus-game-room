# Compatibility entry point for pre-Part-26 integrations.
& (Join-Path $PSScriptRoot "stop-control.ps1")
if (-not $?) { exit 1 }
