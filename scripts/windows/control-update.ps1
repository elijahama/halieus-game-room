param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$updateLauncher = Join-Path $projectRoot "Update HGR GitHub.cmd"
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$resultPath = Join-Path $runtimeDir "hgr-control-update-result.json"

function Write-HgrUpdateResult {
    param([Parameter(Mandatory = $true)][hashtable]$Value)
    $json = $Value | ConvertTo-Json
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($resultPath, $json, $utf8)
}

if (-not (Test-Path -LiteralPath $updateLauncher)) {
    throw "Update HGR GitHub.cmd is missing from the HGR repository root."
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$startedAt = [DateTimeOffset]::UtcNow.ToString("o")
Write-HgrUpdateResult -Value @{
    state = "running"
    startedAt = $startedAt
    finishedAt = $null
    exitCode = $null
    reason = $null
}

$previousMode = $env:HGR_UPDATE_NONINTERACTIVE
$exitCode = 1
$failureReason = $null
try {
    $env:HGR_UPDATE_NONINTERACTIVE = "1"
    & $updateLauncher
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $failureReason = "Update HGR GitHub.cmd exited with code $exitCode."
    }
} catch {
    $exitCode = 1
    $failureReason = $_.Exception.Message
} finally {
    if ($null -eq $previousMode) {
        Remove-Item Env:HGR_UPDATE_NONINTERACTIVE -ErrorAction SilentlyContinue
    } else {
        $env:HGR_UPDATE_NONINTERACTIVE = $previousMode
    }

    Write-HgrUpdateResult -Value @{
        state = if ($exitCode -eq 0 -and [string]::IsNullOrWhiteSpace($failureReason)) { "succeeded" } else { "failed" }
        startedAt = $startedAt
        finishedAt = [DateTimeOffset]::UtcNow.ToString("o")
        exitCode = $exitCode
        reason = $failureReason
    }
}

if (-not [string]::IsNullOrWhiteSpace($failureReason)) {
    throw $failureReason
}
if ($exitCode -ne 0) {
    throw "Update HGR GitHub.cmd exited with code $exitCode."
}

Write-Output "HGR update launcher completed."
