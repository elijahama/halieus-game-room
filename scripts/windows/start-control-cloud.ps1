param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$statePath = Join-Path $runtimeDir "hgr-control-cloud-bridge-state.json"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$stdoutPath = Join-Path $runtimeDir "hgr-control-cloud.out.log"
$stderrPath = Join-Path $runtimeDir "hgr-control-cloud.err.log"
$localPort = 43127

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $tokenPath)) {
    throw "The local HGR Control Agent is not ready. Start HGR Control before starting its cloud bridge."
}

$listener = $null
try {
    $listener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction Stop | Select-Object -First 1
} catch {}
if (-not $listener) {
    throw "The local HGR Control Agent is not listening on 127.0.0.1:$localPort."
}

if (Test-Path -LiteralPath $statePath) {
    try {
        $existing = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $existingProcess = Get-Process -Id ([int]$existing.pid) -ErrorAction SilentlyContinue
        if ($existingProcess) {
            $started = $existingProcess.StartTime.ToUniversalTime().Ticks.ToString()
            if ($started -eq [string]$existing.processStarted) {
                Write-Host "HGR Control Cloud bridge is already running." -ForegroundColor Green
                exit 0
            }
        }
    } catch {}
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw "Node.js was not found in PATH." }

$tsxCandidates = @(
    (Join-Path $projectRoot "node_modules\tsx\dist\cli.mjs"),
    (Join-Path $projectRoot "server\node_modules\tsx\dist\cli.mjs")
)
$tsxCli = $tsxCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $tsxCli) { throw "The local tsx runtime is missing. Run npm install before starting HGR Control." }

$agentSource = Join-Path $projectRoot "server\src\control-cloud-agent.ts"
if (-not (Test-Path -LiteralPath $agentSource)) { throw "HGR Control Cloud bridge source is missing." }

Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue

$process = Start-Process -FilePath $nodeCommand.Source -ArgumentList @("`"$tsxCli`"", "`"$agentSource`"") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
Start-Sleep -Milliseconds 900
if ($process.HasExited) {
    $errorTail = if (Test-Path -LiteralPath $stderrPath) { (Get-Content -LiteralPath $stderrPath -Tail 20 | Out-String).Trim() } else { "" }
    if ($errorTail) { Write-Host $errorTail -ForegroundColor Red }
    throw "HGR Control Cloud bridge exited during startup."
}

$started = $process.StartTime.ToUniversalTime().Ticks.ToString()
@{
    pid = $process.Id
    processStarted = $started
    startedAt = [DateTimeOffset]::UtcNow.ToString("o")
    cloudUrl = if ($env:HGR_CONTROL_CLOUD_URL) { $env:HGR_CONTROL_CLOUD_URL } else { "https://halieus.remotewire.net" }
} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

Write-Host "HGR Control Cloud bridge started in the background." -ForegroundColor Green
Write-Host "The owner PC now connects outward to HGR Cloud; no public Windows port was opened." -ForegroundColor DarkGray
exit 0
