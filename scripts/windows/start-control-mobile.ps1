param(
    [ValidateRange(1, 65535)]
    [int]$HttpsPort = 8443
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
$target = "http://127.0.0.1:$localPort"

function New-HgrSecret {
    $value = & node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
        throw "Could not generate an HGR Control secret with Node."
    }
    return $value.Trim()
}

function New-HgrPairCode {
    $value = & node -e "process.stdout.write(String(require('node:crypto').randomInt(0,100000000)).padStart(8,'0'))"
    if ($LASTEXITCODE -ne 0 -or $value -notmatch '^\d{8}$') {
        throw "Could not generate an HGR Control pairing code with Node."
    }
    return $value.Trim()
}

function Get-HgrControlListener {
    try {
        return Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $localPort -State Listen -ErrorAction Stop |
            Select-Object -First 1
    } catch {
        return $null
    }
}

function Remove-HgrControlEnvironment {
    Remove-Item Env:HGR_CONTROL_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_CODE -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_EXPIRES_AT -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_HOST -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PORT -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $statePath)) {
    $legacyListener = Get-HgrControlListener
    if ($legacyListener) {
        throw "An HGR Control Agent is already listening on 127.0.0.1:$localPort without background lifecycle state. Close the previous foreground Control window, then run Start HGR Control Mobile again."
    }
}

if (Test-Path -LiteralPath $statePath) {
    try {
        $existingState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $existingPid = [int]$existingState.listenerPid
        $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        $existingListener = Get-HgrControlListener
        if ($existingProcess -and $existingListener -and [int]$existingListener.OwningProcess -eq $existingPid) {
            Write-Host ""
            Write-Host "HGR Control Mobile is already running in the background." -ForegroundColor Green
            Write-Host "Private HTTPS URL (tailnet only):" -ForegroundColor DarkGray
            Write-Host "  $($existingState.mobileUrl)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To create a fresh pairing code, stop Control first and start it again:" -ForegroundColor DarkGray
            Write-Host "  .\Stop-HGR-Control-Mobile.cmd" -ForegroundColor DarkGray
            Write-Host "  .\Start-HGR-Control-Mobile.cmd" -ForegroundColor DarkGray
            exit 0
        }
    } catch {
        # Stale/partial runtime state is safe to replace below.
    }

    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
}

$tailscaleCommand = Get-Command tailscale.exe -ErrorAction SilentlyContinue
if ($tailscaleCommand) {
    $tailscale = $tailscaleCommand.Source
} else {
    $tailscale = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
    if (-not (Test-Path -LiteralPath $tailscale)) {
        throw "Tailscale CLI was not found. Install/start Tailscale on this PC before using HGR Control Mobile."
    }
}

$statusRaw = & $tailscale status --json 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    throw "Tailscale is not ready. Open Tailscale, sign in, and try HGR Control Mobile again."
}
try {
    $tailscaleStatus = $statusRaw | ConvertFrom-Json
} catch {
    throw "Tailscale status could not be read as JSON."
}

$dnsName = [string]$tailscaleStatus.Self.DNSName
if ([string]::IsNullOrWhiteSpace($dnsName)) {
    throw "This Tailscale device has no MagicDNS name. HGR Control Mobile needs the private HTTPS Serve hostname."
}
$dnsName = $dnsName.Trim().TrimEnd('.')
$mobileUrl = "https://" + $dnsName + ":" + $HttpsPort + "/"

$existingRaw = & $tailscale serve status --json 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($existingRaw)) {
    try {
        $existing = $existingRaw | ConvertFrom-Json
        $matchingWeb = @($existing.Web.PSObject.Properties | Where-Object { $_.Name -match ":$HttpsPort$" })
        foreach ($webEntry in $matchingWeb) {
            $rootHandler = $webEntry.Value.Handlers.PSObject.Properties |
                Where-Object { $_.Name -eq "/" } |
                Select-Object -First 1
            if ($rootHandler -and $rootHandler.Value.Proxy) {
                $existingProxy = [string]$rootHandler.Value.Proxy
                if ($existingProxy -ne $target) {
                    throw "Tailscale Serve HTTPS port $HttpsPort is already in use by another local service."
                }
            }
        }
    } catch {
        if ($_.Exception.Message -like "Tailscale Serve HTTPS port*") { throw }
        throw "Existing Tailscale Serve configuration could not be inspected safely."
    }
}

$token = New-HgrSecret
$pairCode = New-HgrPairCode
$pairExpires = [DateTimeOffset]::UtcNow.AddMinutes(10).ToUnixTimeMilliseconds().ToString()

Set-Content -Path $tokenPath -Value $token -Encoding Ascii -NoNewline
$env:HGR_CONTROL_TOKEN = $token
$env:HGR_CONTROL_PAIR_CODE = $pairCode
$env:HGR_CONTROL_PAIR_EXPIRES_AT = $pairExpires
$env:HGR_CONTROL_HOST = "127.0.0.1"
$env:HGR_CONTROL_PORT = "$localPort"

$serveOutput = & $tailscale serve --bg "--https=$HttpsPort" $target 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Remove-HgrControlEnvironment
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    Write-Host $serveOutput
    throw "Tailscale Serve could not expose HGR Control. If Tailscale shows an HTTPS approval link, approve it and run this launcher again."
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    & $tailscale serve "--https=$HttpsPort" off | Out-Null
    Remove-HgrControlEnvironment
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    throw "Node.js was not found in PATH."
}

$tsxCandidates = @(
    (Join-Path $projectRoot "node_modules\tsx\dist\cli.mjs"),
    (Join-Path $projectRoot "server\node_modules\tsx\dist\cli.mjs")
)
$tsxCli = $tsxCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $tsxCli) {
    & $tailscale serve "--https=$HttpsPort" off | Out-Null
    Remove-HgrControlEnvironment
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    throw "The local tsx runtime is missing. Run npm install before starting HGR Control Mobile."
}

Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue

$agentSource = Join-Path $projectRoot "server\src\control-agent.ts"
$background = $null
try {
    $background = Start-Process -FilePath $nodeCommand.Source -ArgumentList @("`"$tsxCli`"", "`"$agentSource`"") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru

    $listener = $null
    $deadline = [DateTime]::UtcNow.AddSeconds(12)
    while ([DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 250
        if ($background.HasExited) { break }
        $listener = Get-HgrControlListener
        if ($listener) { break }
    }

    if (-not $listener) {
        if ($background -and -not $background.HasExited) {
            Stop-Process -Id $background.Id -Force -ErrorAction SilentlyContinue
        }
        & $tailscale serve "--https=$HttpsPort" off | Out-Null
        Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue

        $errorTail = ""
        if (Test-Path -LiteralPath $stderrPath) {
            $errorTail = (Get-Content -LiteralPath $stderrPath -Tail 20 | Out-String).Trim()
        }
        if ($errorTail) {
            Write-Host $errorTail -ForegroundColor Red
        }
        throw "HGR Control Agent did not start listening on 127.0.0.1:$localPort."
    }

    $state = [ordered]@{
        schema = 1
        startedAt = [DateTimeOffset]::UtcNow.ToString("o")
        mobileUrl = $mobileUrl
        httpsPort = $HttpsPort
        localPort = $localPort
        processPid = [int]$background.Id
        listenerPid = [int]$listener.OwningProcess
        stdoutPath = $stdoutPath
        stderrPath = $stderrPath
    }
    $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
} catch {
    Remove-HgrControlEnvironment
    throw
}

Remove-HgrControlEnvironment

Write-Host ""
Write-Host "HGR Control Mobile" -ForegroundColor Yellow
Write-Host "Status:" -ForegroundColor DarkGray
Write-Host "  Running in the background" -ForegroundColor Green
Write-Host "Private HTTPS URL (tailnet only):" -ForegroundColor DarkGray
Write-Host "  $mobileUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pairing code (valid for 10 minutes):" -ForegroundColor DarkGray
Write-Host "  $pairCode" -ForegroundColor Green
Write-Host ""
Write-Host "You can close this window. HGR Control will keep running." -ForegroundColor Green
Write-Host "To stop the background controller explicitly:" -ForegroundColor DarkGray
Write-Host "  .\Stop-HGR-Control-Mobile.cmd" -ForegroundColor DarkGray
Write-Host ""
Write-Host "The bearer token is NOT printed. The phone receives only an HttpOnly session cookie after pairing." -ForegroundColor DarkGray
exit 0
