param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$resultPath = Join-Path $runtimeDir "hgr-control-update-result.json"
$refreshHelper = Join-Path $PSScriptRoot "refresh-control-after-update.ps1"

function Read-HgrUpdateResult {
    if (-not (Test-Path -LiteralPath $resultPath)) { return $null }
    try { return Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json }
    catch { return $null }
}

function Write-HgrUpdateResult {
    param([Parameter(Mandatory = $true)][hashtable]$Value)
    $json = $Value | ConvertTo-Json
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($resultPath, $json, $utf8)
}

if (-not (Test-Path -LiteralPath $refreshHelper)) {
    throw "HGR Control post-update refresh helper is missing."
}

$existing = Read-HgrUpdateResult
if (-not $existing -or [string]$existing.state -ne "running" -or [string]::IsNullOrWhiteSpace([string]$existing.startedAt)) {
    throw "No running Cloud Update result marker is available for finalization."
}
$startedAt = [string]$existing.startedAt
$previousFinalizer = $env:HGR_CONTROL_UPDATE_FINALIZER
$previousDeferRefresh = $env:HGR_CONTROL_DEFER_REFRESH
$exitCode = 1
$failureReason = $null
try {
    $env:HGR_CONTROL_UPDATE_FINALIZER = "1"
    Remove-Item Env:HGR_CONTROL_DEFER_REFRESH -ErrorAction SilentlyContinue
    & $refreshHelper
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $failureReason = "HGR Control post-update restart exited with code $exitCode."
    }
} catch {
    $exitCode = 1
    $failureReason = $_.Exception.Message
} finally {
    if ($null -eq $previousFinalizer) {
        Remove-Item Env:HGR_CONTROL_UPDATE_FINALIZER -ErrorAction SilentlyContinue
    } else {
        $env:HGR_CONTROL_UPDATE_FINALIZER = $previousFinalizer
    }
    if ($null -eq $previousDeferRefresh) {
        Remove-Item Env:HGR_CONTROL_DEFER_REFRESH -ErrorAction SilentlyContinue
    } else {
        $env:HGR_CONTROL_DEFER_REFRESH = $previousDeferRefresh
    }
}

if ($exitCode -eq 0 -and [string]::IsNullOrWhiteSpace($failureReason)) {
    Write-HgrUpdateResult -Value @{
        state = "succeeded"
        startedAt = $startedAt
        finishedAt = [DateTimeOffset]::UtcNow.ToString("o")
        exitCode = 0
        reason = $null
    }
    Write-Output "HGR Control final handoff completed; Cloud Update may report 100%."
    exit 0
}

Write-HgrUpdateResult -Value @{
    state = "failed"
    startedAt = $startedAt
    finishedAt = [DateTimeOffset]::UtcNow.ToString("o")
    exitCode = $exitCode
    reason = if ($failureReason) { $failureReason } else { "HGR Control post-update finalization failed." }
}
throw (if ($failureReason) { $failureReason } else { "HGR Control post-update finalization failed." })
