# HGR 4.5.5d — local-only Control Agent bootstrap for browser Cloud Control.
# No Tailscale installation, sign-in, DNS, Serve port or private pairing needed.
param(
    # Retained only so older signed CMD wrappers cannot break on named -HttpsPort.
    [ValidateRange(0,65535)][int]$HttpsPort = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$statePath = Join-Path $runtimeDir "hgr-control-mobile-state.json"
$stdoutPath = Join-Path $runtimeDir "hgr-control-mobile.out.log"
$stderrPath = Join-Path $runtimeDir "hgr-control-mobile.err.log"
$localPort = 43127
$localTarget = "http://127.0.0.1:$localPort"
$websiteUrl = "https://halieus.remotewire.net/control/"

function Get-HgrControlListener {
    try {
        Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction Stop |
            Select-Object -First 1
    } catch { $null }
}
function Test-HgrControlEndpoint {
    param([Parameter(Mandatory=$true)][string]$Url)
    try {
        $ping = Invoke-RestMethod -Uri $Url -TimeoutSec 4 -Headers @{"Cache-Control"="no-store"}
        return $ping.service -eq "hgr-control"
    } catch { return $false }
}
function Clear-HgrControlEnvironment {
    Remove-Item Env:HGR_CONTROL_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_CODE -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_EXPIRES_AT -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_HOST -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PORT -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if ($HttpsPort -gt 0) {
    Write-Host "The old private HTTPS port argument is retired. Control uses the website and a local-only agent." -ForegroundColor DarkGray
}

# Refuse to hijack an unknown listener and never delete a live Control token.
$listener = Get-HgrControlListener
if (Test-Path -LiteralPath $statePath) {
    try {
        $existing = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    } catch {
        if ($listener) { throw "Unparseable Control lifecycle state with an active listener: manual recovery required." }
        $existing = $null
    }
    if ($existing -and $listener -and [int]$listener.OwningProcess -eq [int]$existing.listenerPid) {
        if (-not (Test-HgrControlEndpoint -Url "$localTarget/api/ping")) {
            throw "Existing Control port is live but did not identify as HGR Control."
        }
        if ([int]$existing.schema -lt 2) {
            Write-Warning "A legacy Tailscale-backed Control Agent is active. Preserve it until a guarded stop/restart migration; do not silently disrupt Cloud Update."
        } else {
            Write-Host "HGR Control local agent is already running. Cloud Control: $websiteUrl" -ForegroundColor Green
        }
        exit 0
    }
    if ($listener) {
        throw "A listener exists on the Control port with a different PID. Refusing to replace another process."
    }
    # No listener: the saved background state is stale.
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
} elseif ($listener) {
    throw "An HGR Control Agent is already listening on 127.0.0.1:$localPort without background lifecycle state. Close the previous foreground Control window, then run Start HGR Control again."
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw "Node.js is required to run the local HGR Control Agent." }
$tsxCandidates = @(
    (Join-Path $projectRoot "node_modules\tsx\dist\cli.mjs"),
    (Join-Path $projectRoot "server\node_modules\tsx\dist\cli.mjs")
)
$tsxCli = $tsxCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $tsxCli) { throw "The local tsx runtime is missing. Run npm install before starting HGR Control." }
$agentSource = Join-Path $projectRoot "server\src\control-agent.ts"
if (-not (Test-Path -LiteralPath $agentSource)) { throw "The HGR Control Agent source is missing." }

$token = & node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
    throw "Unable to generate an HGR Control runtime credential."
}
Set-Content -LiteralPath $tokenPath -Value $token.Trim() -Encoding Ascii -NoNewline
$env:HGR_CONTROL_TOKEN = $token.Trim()
$env:HGR_CONTROL_HOST = "127.0.0.1"
$env:HGR_CONTROL_PORT = "$localPort"
# This credential never leaves the PC. The outbound cloud bridge reads it only
# for authenticated requests to 127.0.0.1; no public local port is opened.
Remove-Item Env:HGR_CONTROL_PAIR_CODE -ErrorAction SilentlyContinue
Remove-Item Env:HGR_CONTROL_PAIR_EXPIRES_AT -ErrorAction SilentlyContinue

$background = $null
try {
    Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    $background = Start-Process -FilePath $nodeCommand.Source -ArgumentList @("`"$tsxCli`"", "`"$agentSource`"") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    $listener = $null
    while ([DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 250
        if ($background.HasExited) { break }
        $listener = Get-HgrControlListener
        if ($listener) { break }
    }
    if (-not $listener) { throw "HGR Control Agent did not start listening on 127.0.0.1:$localPort." }
    if (-not (Test-HgrControlEndpoint -Url "$localTarget/api/ping")) {
        throw "Control Agent started but did not pass the local /api/ping health check."
    }
    $newState = [ordered]@{
        schema = 2
        startedAt = [DateTimeOffset]::UtcNow.ToString("o")
        mobileUrl = $websiteUrl
        httpsPort = 0
        localPort = $localPort
        processPid = [int]$background.Id
        listenerPid = [int]$listener.OwningProcess
        stdoutPath = $stdoutPath
        stderrPath = $stderrPath
    }
    $newState | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
} catch {
    if ($background -and -not $background.HasExited) {
        Stop-Process -Id $background.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    throw
} finally { Clear-HgrControlEnvironment }

Write-Host ""
Write-Host "HGR Control" -ForegroundColor Yellow
Write-Host "  Local agent: running on 127.0.0.1:$localPort (background)" -ForegroundColor Green
Write-Host "  Cloud Control: $websiteUrl" -ForegroundColor Cyan
Write-Host "  No Tailscale client, private Serve route or pairing QR is required." -ForegroundColor Green
Write-Host "  Start HGR Control.cmd also starts the outbound Cloud bridge." -ForegroundColor DarkGray
Write-Host "You can close this window. HGR Control will keep running." -ForegroundColor Green
