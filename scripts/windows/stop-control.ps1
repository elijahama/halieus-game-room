param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$statePath = Join-Path $runtimeDir "hgr-control-mobile-state.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host "HGR Control background state was not found." -ForegroundColor Yellow
    Write-Host "Nothing was stopped." -ForegroundColor DarkGray
    exit 0
}

try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
} catch {
    throw "HGR Control background state could not be read safely."
}

$localPort = [int]$state.localPort
$httpsPort = if ($state.PSObject.Properties['httpsPort']) { [int]$state.httpsPort } else { 0 }
$legacyPrivateServe = [int]$state.schema -lt 2 -and $httpsPort -gt 0
$listenerPid = [int]$state.listenerPid
$processPid = [int]$state.processPid

$listener = $null
try {
    $listener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction Stop |
        Select-Object -First 1
} catch {}

if ($listener -and [int]$listener.OwningProcess -eq $listenerPid) {
    # Current agents shut down gracefully; old implementations use the bounded fallback.
    if (Test-Path -LiteralPath $tokenPath) {
        try {
            $credential = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
            Invoke-RestMethod -Uri "http://127.0.0.1:$localPort/api/lifecycle/stop" -Method Post -Headers @{ Authorization="Bearer $credential" } -TimeoutSec 3 | Out-Null
        } catch { Write-Host "Using compatibility stop for the previous Control implementation." }
    }
    $deadline = [DateTime]::UtcNow.AddSeconds(3)
    do {
        Start-Sleep -Milliseconds 100
        $remaining = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    } while ($remaining -and [int]$remaining.OwningProcess -eq $listenerPid -and [DateTime]::UtcNow -lt $deadline)
    if ($remaining -and [int]$remaining.OwningProcess -eq $listenerPid) { Stop-Process -Id $listenerPid -Force -ErrorAction Stop }
}

if ($processPid -ne $listenerPid) {
    # A PID from stale state can belong to another application. Check ownership.
    $wrapper = Get-CimInstance Win32_Process -Filter "ProcessId=$processPid" -ErrorAction SilentlyContinue
    if ($wrapper -and $wrapper.CommandLine -and $wrapper.CommandLine.Contains($projectRoot) -and $wrapper.CommandLine -match 'control') {
        Stop-Process -Id $processPid -Force -ErrorAction SilentlyContinue
    }
}

$tailscaleCommand = Get-Command tailscale.exe -ErrorAction SilentlyContinue
if ($tailscaleCommand) {
    $tailscale = $tailscaleCommand.Source
} else {
    $tailscale = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
}

# Only decommission a PRE-MIGRATION private Serve route. The current Cloud
# Control Agent never invokes, installs or requires the Tailscale client.
if ($legacyPrivateServe -and (Test-Path -LiteralPath $tailscale)) {
    try {
        & $tailscale serve "--https=$httpsPort" off | Out-Null
    } catch {
        Write-Warning "The retired private Control Serve route could not be removed automatically."
    }
}

Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "HGR Control stopped." -ForegroundColor Green
Write-Host "The local Control Agent and its runtime credential have been closed." -ForegroundColor DarkGray
if ($legacyPrivateServe) { Write-Host "The retired private Control route was also taken offline when available." -ForegroundColor DarkGray }
