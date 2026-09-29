param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$startLauncher = Join-Path $projectRoot "Start Halieus Game Room.cmd"

if (-not (Test-Path -LiteralPath $startLauncher)) {
    throw "Start Halieus Game Room.cmd is missing from the HGR repository root."
}

& $startLauncher
if ($LASTEXITCODE -ne 0) {
    throw "Start Halieus Game Room.cmd exited with code $LASTEXITCODE."
}

Write-Output "HGR start launcher completed."
