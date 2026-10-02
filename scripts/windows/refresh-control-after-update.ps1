param([switch]$Capture)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$statePath = Join-Path $runtimeDir "hgr-control-mobile-state.json"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$stopHelper = Join-Path $PSScriptRoot "stop-control.ps1"
$startHelper = Join-Path $PSScriptRoot "start-control.ps1"

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
if (-not (Test-Path -LiteralPath $snapshotPath)) { throw "Control pre-update snapshot is missing; refusing to guess whether it should be started." }
$snapshot = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json
Remove-Item -LiteralPath $snapshotPath -Force
if (-not $snapshot.running) {
    Write-Host "HGR Control was stopped before the update; it remains stopped."
    exit 0
}

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host "HGR Control was not running before the update; no Control restart is required." -ForegroundColor DarkGray
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
    exit 0
}

if (-not (Test-Path -LiteralPath $stopHelper) -or -not (Test-Path -LiteralPath $startHelper)) {
    throw "HGR Control post-update restart helpers are missing."
}

$currentStart = (Get-Process -Id $listenerPid -ErrorAction Stop).StartTime.ToUniversalTime().Ticks.ToString()
if ($listenerPid -ne [int]$snapshot.state.listenerPid -or $currentStart -ne $snapshot.state.processStarted) {
    Write-Host "Control was replaced during the update; preserving the owner's newer process."
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
exit 0
