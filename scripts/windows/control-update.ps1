param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$updateLauncher = Join-Path $projectRoot "Update HGR GitHub.cmd"

if (-not (Test-Path -LiteralPath $updateLauncher)) {
    throw "Update HGR GitHub.cmd is missing from the HGR repository root."
}

$previousMode = $env:HGR_UPDATE_NONINTERACTIVE
try {
    $env:HGR_UPDATE_NONINTERACTIVE = "1"
    & $updateLauncher
    $exitCode = $LASTEXITCODE
} finally {
    if ($null -eq $previousMode) {
        Remove-Item Env:HGR_UPDATE_NONINTERACTIVE -ErrorAction SilentlyContinue
    } else {
        $env:HGR_UPDATE_NONINTERACTIVE = $previousMode
    }
}

if ($exitCode -ne 0) {
    throw "Update HGR GitHub.cmd exited with code $exitCode."
}

Write-Output "HGR update launcher completed."
