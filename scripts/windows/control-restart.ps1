param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$restartLauncher = Join-Path $projectRoot "Restart Halieus Game Room.cmd"

if (-not (Test-Path -LiteralPath $restartLauncher)) {
    throw "Restart Halieus Game Room.cmd is missing from the HGR repository root."
}

& $restartLauncher
if ($LASTEXITCODE -ne 0) {
    throw "Restart Halieus Game Room.cmd exited with code $LASTEXITCODE."
}

Write-Output "HGR restart launcher completed."
