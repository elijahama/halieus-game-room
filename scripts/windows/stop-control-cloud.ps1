param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$statePath = Join-Path $runtimeDir "hgr-control-cloud-bridge-state.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host "HGR Control Cloud bridge is already stopped." -ForegroundColor DarkGray
    exit 0
}

try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $pidValue = [int]$state.pid
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
        $started = $process.StartTime.ToUniversalTime().Ticks.ToString()
        if ($started -eq [string]$state.processStarted) {
            Stop-Process -Id $pidValue -Force -ErrorAction Stop
            try { Wait-Process -Id $pidValue -Timeout 5 -ErrorAction SilentlyContinue } catch {}
        } else {
            Write-Warning "Cloud bridge PID was reused by another process; it was not stopped."
        }
    }
} finally {
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

Write-Host "HGR Control Cloud bridge stopped." -ForegroundColor Green
exit 0
