param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$statePath = Join-Path $runtimeDir "hgr-control-mobile-state.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host "HGR Control Mobile background state was not found." -ForegroundColor Yellow
    Write-Host "Nothing was stopped." -ForegroundColor DarkGray
    exit 0
}

try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
} catch {
    throw "HGR Control Mobile background state could not be read safely."
}

$localPort = [int]$state.localPort
$httpsPort = [int]$state.httpsPort
$listenerPid = [int]$state.listenerPid
$processPid = [int]$state.processPid

$listener = $null
try {
    $listener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction Stop |
        Select-Object -First 1
} catch {}

if ($listener -and [int]$listener.OwningProcess -eq $listenerPid) {
    Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
}

if ($processPid -ne $listenerPid) {
    Stop-Process -Id $processPid -Force -ErrorAction SilentlyContinue
}

$tailscaleCommand = Get-Command tailscale.exe -ErrorAction SilentlyContinue
if ($tailscaleCommand) {
    $tailscale = $tailscaleCommand.Source
} else {
    $tailscale = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
}

if (Test-Path -LiteralPath $tailscale) {
    try {
        & $tailscale serve "--https=$httpsPort" off | Out-Null
    } catch {
        Write-Warning "Could not automatically remove the HGR Control Tailscale Serve route."
    }
}

Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "HGR Control Mobile stopped." -ForegroundColor Green
Write-Host "The background agent, private Serve route and runtime credential have been closed." -ForegroundColor DarkGray
