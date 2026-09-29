param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$closeLauncher = Join-Path $projectRoot "Close Halieus Game Room.cmd"

if (-not (Test-Path -LiteralPath $closeLauncher)) {
    throw "Close Halieus Game Room.cmd is missing from the HGR repository root."
}

& $closeLauncher
if ($LASTEXITCODE -ne 0) {
    throw "Close Halieus Game Room.cmd exited with code $LASTEXITCODE."
}

Write-Output "HGR close launcher completed."
