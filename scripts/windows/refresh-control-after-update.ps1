param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$statePath = Join-Path $runtimeDir "hgr-control-mobile-state.json"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$stopHelper = Join-Path $PSScriptRoot "stop-control-mobile.ps1"
$startHelper = Join-Path $PSScriptRoot "start-control-mobile.ps1"

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
    Write-Host "Stale runtime state will be cleared; Control will remain stopped." -ForegroundColor DarkGray
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    exit 0
}

if (-not (Test-Path -LiteralPath $stopHelper) -or -not (Test-Path -LiteralPath $startHelper)) {
    throw "HGR Control post-update restart helpers are missing."
}

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
