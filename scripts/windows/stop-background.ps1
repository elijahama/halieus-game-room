param(
    [int]$Port = 3000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RuntimeDirectory = Join-Path $ProjectRoot '.runtime'
$PidFile = Join-Path $RuntimeDirectory 'halieus-game-room.pid'
$LegacyPidFile = Join-Path $RuntimeDirectory 'mega-board.pid'
$ServerEntrySuffix = 'server\dist\server\src\index.js'

function Get-ListeningProcessId {
    param([int]$LocalPort)
    $listener = Get-NetTCPConnection -State Listen -LocalPort $LocalPort -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) { return [int]$listener.OwningProcess }
    return 0
}

function Test-HalieusHealth {
    param([int]$LocalPort)
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$LocalPort/health" -TimeoutSec 2
        return ($health -and $health.name -eq 'Halieus Game Room Server')
    } catch {
        return $false
    }
}

function Test-HalieusProcess {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return $false }
    try {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
        if (-not $process) { return $false }
        $commandLine = [string]$process.CommandLine
        if ([string]::IsNullOrWhiteSpace($commandLine)) { return $false }
        $normalized = $commandLine.Replace('/', '\')
        return ($normalized -like "*$ServerEntrySuffix*")
    } catch {
        return $false
    }
}

function Remove-HalieusPidFiles {
    foreach ($file in @($PidFile, $LegacyPidFile)) {
        Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
    }
}

$listenerPid = Get-ListeningProcessId -LocalPort $Port
$pidHint = 0
if (Test-Path -LiteralPath $PidFile) {
    $raw = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    [void][int]::TryParse([string]$raw, [ref]$pidHint)
}

if ($listenerPid -gt 0) {
    $verified = (Test-HalieusHealth -LocalPort $Port) -or (Test-HalieusProcess -ProcessId $listenerPid)
    if (-not $verified) {
        throw "Port $Port is owned by process $listenerPid, but it is not verified as Halieus Game Room. It will not be terminated automatically."
    }

    Write-Host "Stopping Halieus Game Room process $listenerPid..."
    Stop-Process -Id $listenerPid -Force -ErrorAction Stop
} elseif ($pidHint -gt 0 -and (Test-HalieusProcess -ProcessId $pidHint)) {
    # The listener may already have dropped while the node process is still winding down.
    Write-Host "Stopping Halieus Game Room process $pidHint..."
    Stop-Process -Id $pidHint -Force -ErrorAction Stop
}

$deadline = (Get-Date).AddSeconds(12)
do {
    if ((Get-ListeningProcessId -LocalPort $Port) -eq 0) { break }
    Start-Sleep -Milliseconds 300
} while ((Get-Date) -lt $deadline)

if ((Get-ListeningProcessId -LocalPort $Port) -ne 0) {
    throw "Halieus Game Room did not release port $Port within 12 seconds."
}

Remove-HalieusPidFiles
Write-Host 'Halieus Game Room server stopped.'
