param([switch]$Capture)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$statePath = Join-Path $runtimeDir "hgr-control-mobile-state.json"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$stopHelper = Join-Path $PSScriptRoot "stop-control.ps1"
$startHelper = Join-Path $PSScriptRoot "start-control.ps1"
$startCloudHelper = Join-Path $PSScriptRoot "start-control-cloud.ps1"
$resultPath = Join-Path $runtimeDir "hgr-control-update-result.json"
$staleCloudUpdateMinutes = 5

function Write-HgrUpdateResult {
    param([Parameter(Mandatory = $true)][hashtable]$Value)
    $json = $Value | ConvertTo-Json
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($resultPath, $json, $utf8)
}

function Resolve-InterruptedCloudUpdateAfterManualRecovery {
    # The dedicated cloud-update finalizer owns its own result marker. Only a
    # later normal/local Update may convert an old orphaned "running" marker
    # into a failed/retryable state so the cloud relay is not blocked forever.
    if ($env:HGR_CONTROL_UPDATE_FINALIZER -eq "1") { return }
    if (-not (Test-Path -LiteralPath $resultPath)) { return }
    try {
        $marker = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
        if ([string]$marker.state -ne "running" -or [string]::IsNullOrWhiteSpace([string]$marker.startedAt)) { return }
        $started = [DateTimeOffset]::Parse([string]$marker.startedAt)
        if ([DateTimeOffset]::UtcNow -lt $started.AddMinutes($staleCloudUpdateMinutes)) { return }
        Write-HgrUpdateResult -Value @{
            state = "failed"
            startedAt = [string]$marker.startedAt
            finishedAt = [DateTimeOffset]::UtcNow.ToString("o")
            exitCode = 1
            reason = "Previous Cloud Update completion handoff was interrupted. A later local update refreshed HGR Control successfully; retry Cloud Update from the website."
        }
        Write-Host "Recovered an older interrupted Cloud Update marker so the website can offer a clean retry." -ForegroundColor Yellow
    } catch {
        Write-Warning "Could not reconcile an older Cloud Update result marker: $($_.Exception.Message)"
    }
}

$snapshotPath = Join-Path $runtimeDir "hgr-control-update-snapshot.json"
if ($Capture) {
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    $running = $false
    $capturedState = $null
    if (Test-Path -LiteralPath $statePath) {
        try {
            $capturedState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
            $capturedListener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort ([int]$capturedState.localPort) -State Listen -ErrorAction Stop | Select-Object -First 1
            $running = [int]$capturedListener.OwningProcess -eq [int]$capturedState.listenerPid
            if ($running) {
                $started = (Get-Process -Id ([int]$capturedState.listenerPid) -ErrorAction Stop).StartTime.ToUniversalTime().Ticks.ToString()
                $capturedState | Add-Member -NotePropertyName processStarted -NotePropertyValue $started -Force
            }
        } catch { $running = $false }
    }
    @{ running=$running; state=$capturedState } | ConvertTo-Json | Set-Content -LiteralPath $snapshotPath -Encoding UTF8
    Write-Host "Recorded Control state before updating source."
    exit 0
}

if ($env:HGR_CONTROL_DEFER_REFRESH -eq "1") {
    # Cloud Update is still running inside the current Control Agent. Stopping
    # that process here used to strand the cloud operation at 88%. Keep the
    # snapshot intact; an independent finalizer will consume it after the core
    # updater and HGR client handoff have returned successfully.
    Write-Host "Cloud Update: Control restart deferred to the independent final handoff process." -ForegroundColor Cyan
    exit 0
}

if (-not (Test-Path -LiteralPath $snapshotPath)) { throw "Control pre-update snapshot is missing; refusing to guess whether it should be started." }
$snapshot = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json
Remove-Item -LiteralPath $snapshotPath -Force
if (-not $snapshot.running) {
    Write-Host "HGR Control was stopped before the update; it remains stopped."
    Resolve-InterruptedCloudUpdateAfterManualRecovery
    exit 0
}

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host "HGR Control was not running before the update; no Control restart is required." -ForegroundColor DarkGray
    Resolve-InterruptedCloudUpdateAfterManualRecovery
    exit 0
}

try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $listenerPid = [int]$state.listenerPid
    $localPort = [int]$state.localPort
    $httpsPort = [int]$state.httpsPort
} catch {
    Write-Warning "HGR Control state was stale or unreadable. Clearing stale runtime state without starting Control."
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    Resolve-InterruptedCloudUpdateAfterManualRecovery
    exit 0
}

$listener = $null
try {
    $listener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction Stop |
        Select-Object -First 1
} catch {}

if (-not $listener -or [int]$listener.OwningProcess -ne $listenerPid) {
    Write-Host "HGR Control runtime state existed, but no matching live Control listener was found." -ForegroundColor Yellow
    Write-Host "Leaving runtime state untouched: another process may now own this port." -ForegroundColor DarkGray
    Resolve-InterruptedCloudUpdateAfterManualRecovery
    exit 0
}

if (-not (Test-Path -LiteralPath $stopHelper) -or -not (Test-Path -LiteralPath $startHelper)) {
    throw "HGR Control post-update restart helpers are missing."
}

$currentStart = (Get-Process -Id $listenerPid -ErrorAction Stop).StartTime.ToUniversalTime().Ticks.ToString()
if ($listenerPid -ne [int]$snapshot.state.listenerPid -or $currentStart -ne $snapshot.state.processStarted) {
    Write-Host "Control was replaced during the update; preserving the owner's newer process."
    Resolve-InterruptedCloudUpdateAfterManualRecovery
    exit 0
}
$oldToken = if (Test-Path -LiteralPath $tokenPath) { Get-Content -LiteralPath $tokenPath -Raw } else { "" }

Write-Host ""
Write-Host "HGR Control was running before this update." -ForegroundColor Cyan
Write-Host "Restarting it from the newly updated source with fresh credentials..." -ForegroundColor DarkGray

& $stopHelper
if ($LASTEXITCODE -ne 0) {
    throw "HGR Control could not be stopped cleanly after the update."
}

Start-Sleep -Milliseconds 300

& $startHelper -HttpsPort $httpsPort
if ($LASTEXITCODE -ne 0) {
    throw "HGR Control could not be restarted from the updated source."
}

if (-not (Test-Path -LiteralPath $statePath)) {
    throw "HGR Control restart did not recreate background lifecycle state."
}

$newState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$newToken = Get-Content -LiteralPath $tokenPath -Raw
if ([string]::IsNullOrWhiteSpace($newToken) -or $newToken -eq $oldToken) { throw "Control restart did not rotate its runtime credential." }
$newListenerPid = [int]$newState.listenerPid
$newLocalPort = [int]$newState.localPort
$newListener = $null
try {
    $newListener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $newLocalPort -State Listen -ErrorAction Stop |
        Select-Object -First 1
} catch {}

if (-not $newListener -or [int]$newListener.OwningProcess -ne $newListenerPid) {
    throw "HGR Control restart completed without a verified listener."
}

Write-Host "HGR Control restarted from the updated source." -ForegroundColor Green
Write-Host "A fresh private pairing code/session boundary is now active." -ForegroundColor DarkGray

# Cloud Control is deliberately a separate outbound process. Starting it here
# bootstraps the first cloud-capable release automatically when private Control
# was already running. An existing bridge is preserved by its idempotent start
# helper so an in-flight cloud Update is not killed during its own deployment.
if (Test-Path -LiteralPath $startCloudHelper) {
    try {
        & $startCloudHelper
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "HGR Control restarted, but the outbound Cloud bridge did not start. Private/Tailscale Control remains available."
        }
    } catch {
        Write-Warning "HGR Control restarted, but the outbound Cloud bridge could not start: $($_.Exception.Message)"
    }
}

Resolve-InterruptedCloudUpdateAfterManualRecovery
exit 0
