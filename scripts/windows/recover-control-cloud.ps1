# Reconnect the existing local-only HGR Control Agent and approved outbound Cloud bridge.
# Never performs a game Start/Restart/Close/Update, resets a device secret or opens a port.
param([switch]$Automatic)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$runtime = Join-Path $root 'server/data/runtime'
$statePath = Join-Path $runtime 'hgr-control-cloud-bridge-state.json'
$healthPath = Join-Path $runtime 'hgr-control-cloud-health.json'
$localToken = Join-Path $runtime '.hgr-control-token'
$localStart = Join-Path $PSScriptRoot 'start-control.ps1'
$cloudStart = Join-Path $PSScriptRoot 'start-control-cloud.ps1'
$cloudStop = Join-Path $PSScriptRoot 'stop-control-cloud.ps1'
$psExe = Join-Path $PSHOME 'powershell.exe'
function Show([string]$message) { if (-not $Automatic) { Write-Host $message } }
function Get-LocalStatus {
    if (-not (Test-Path -LiteralPath $localToken)) { return $null }
    try {
        $token = (Get-Content -LiteralPath $localToken -Raw).Trim()
        if (-not $token) { return $null }
        return Invoke-RestMethod -Uri 'http://127.0.0.1:43127/api/status' -Headers @{Authorization=('Bearer ' + $token)} -TimeoutSec 4
    } catch { return $null }
}
function Get-BridgeProcess {
    if (-not (Test-Path -LiteralPath $statePath)) { return $null }
    try {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $p = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
        if ($p -and $p.StartTime.ToUniversalTime().Ticks.ToString() -eq [string]$state.processStarted) { return $p }
    } catch {}
    return $null
}
function Get-Health {
    if (-not (Test-Path -LiteralPath $healthPath)) { return $null }
    try { return (Get-Content -LiteralPath $healthPath -Raw | ConvertFrom-Json) }
    catch { return $null }
}
function Is-UpdateBusy($local) {
    if ($local -and $local.activeOperation) { return $true }
    $pendingPath = Join-Path $runtime 'hgr-control-cloud-pending.json'
    if (Test-Path -LiteralPath $pendingPath) {
        try {
            $pending = Get-Content -LiteralPath $pendingPath -Raw | ConvertFrom-Json
            if ([double]$pending.deadline -gt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) { return $true }
        } catch { return $true }
    }
    $markerPath = Join-Path $runtime 'hgr-control-update-result.json'
    if (Test-Path -LiteralPath $markerPath) {
        try {
            $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
            if ($marker.state -eq 'running') {
                $age = ([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse([string]$marker.startedAt)).TotalMinutes
                if ($age -lt 0 -or $age -lt 60) { return $true }
            }
        } catch { return $true }
    }
    return $false
}
function Run-Helper([string]$script) {
    if (-not (Test-Path -LiteralPath $script)) { throw "Missing HGR approved helper: $script" }
    & $psExe -NoProfile -ExecutionPolicy Bypass -File $script
    if ($LASTEXITCODE -ne 0) { throw "Approved HGR helper failed: $script (exit $LASTEXITCODE)" }
}
try {
    $local = Get-LocalStatus
    if (Is-UpdateBusy $local) {
        Show 'A Control operation is running. The bridge will not be disturbed.'
        exit 3
    }
    if (-not $local) {
        Show 'Local Control Agent disconnected. Starting the canonical loopback-only Agent.'
        Run-Helper $localStart
        $local = Get-LocalStatus
        if (-not $local) { throw 'The local Control Agent did not pass authenticated /api/status.' }
    }
    Show 'Local Control Agent: connected.'
    $bridge = Get-BridgeProcess
    $health = Get-Health
    $age = [double]::PositiveInfinity
    if ($health) {
        try { $age = ([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse([string]$health.updatedAt)).TotalSeconds } catch {}
    }
    if ($bridge -and $health -and $health.state -eq 'connected' -and $age -ge 0 -and $age -lt 65) {
        Show 'Cloud bridge: connected and heartbeating.'
        exit 0
    }
    if ($bridge -and $health -and ($health.state -eq 'pending' -or $health.state -eq 'revoked') -and $age -lt 65) {
        Show ('Cloud device is ' + $health.state + '. Approve/re-enrol it in HGR Control. The credential has not been changed.')
        exit 4
    }
    # Older checkouts have no health marker. A manual invocation still repairs;
    # the scheduled watchdog does not kill a possibly healthy old bridge.
    if ($bridge -and $Automatic -and -not $health) { exit 0 }
    if ($bridge) {
        Show 'Cloud heartbeat is stale. Stopping ONLY the PID-verified outbound bridge.'
        Run-Helper $cloudStop
    }
    Show 'Starting HGR Control Cloud bridge...'
    Run-Helper $cloudStart
    $result = 'starting'
    for ($i=0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 600
        $status = Get-Health
        if ($status) {
            try {
                $fresh = ([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse([string]$status.updatedAt)).TotalSeconds
                if ($fresh -ge 0 -and $fresh -lt 20) {
                    if ($status.state -eq 'connected') { $result = 'connected'; break }
                    if ($status.state -eq 'pending' -or $status.state -eq 'revoked') { $result = [string]$status.state; break }
                }
            } catch {}
        }
        if (-not (Get-BridgeProcess)) { throw 'The Cloud bridge process exited; inspect its local .err.log.' }
    }
    if ($result -eq 'connected') { Show 'HGR Cloud bridge CONNECTED: https://halieus.remotewire.net/control/'; exit 0 }
    if ($result -eq 'pending' -or $result -eq 'revoked') { Show ("Device $result: approve it on the HGR Control website."); exit 4 }
    Show 'Bridge process started. On older versions, check the Control website for its first heartbeat.'
    exit 0
} catch {
    Write-Error ('HGR Cloud recovery failed: ' + $_.Exception.Message)
    exit 1
}
