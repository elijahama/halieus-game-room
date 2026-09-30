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
$pairingCardPath = Join-Path $runtimeDir "hgr-control-pairing.html"
$pairingQrPath = Join-Path $runtimeDir "hgr-control-pairing.svg"
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

function Test-HgrControlEndpoint {
    param([Parameter(Mandatory = $true)][string]$Url)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get -TimeoutSec 4 -Headers @{
            "Cache-Control" = "no-store"
        }
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Remove-HgrControlEnvironment {
    Remove-Item Env:HGR_CONTROL_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_CODE -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_EXPIRES_AT -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_HOST -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PORT -ErrorAction SilentlyContinue
}

function Copy-HgrControlLink {
    param([Parameter(Mandatory = $true)][string]$Url)

    try {
        $setClipboard = Get-Command Set-Clipboard -ErrorAction SilentlyContinue
        if ($setClipboard) {
            Set-Clipboard -Value $Url
            return $true
        }

        $clip = Get-Command clip.exe -ErrorAction SilentlyContinue
        if ($clip) {
            $Url | & $clip.Source
            return $true
        }
    } catch {}

    return $false
}

function Show-HgrControlPairingCard {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$PairCode
    )

    try {
        $qrcodeCandidates = @(
            (Join-Path $projectRoot "node_modules\qrcode\bin\qrcode"),
            (Join-Path $projectRoot "client\node_modules\qrcode\bin\qrcode")
        )
        $qrcodeCli = $qrcodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if (-not $qrcodeCli) {
            return $false
        }

        & node $qrcodeCli -t svg -o $pairingQrPath $Url | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $pairingQrPath)) {
            return $false
        }

        $safeUrl = [System.Net.WebUtility]::HtmlEncode($Url)
        $safeCode = [System.Net.WebUtility]::HtmlEncode($PairCode)
        $html = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HGR Control Pairing</title>
<style>
:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#080d18;color:#f5f7ff}
body{min-height:100vh;margin:0;display:grid;place-items:center;background:radial-gradient(circle at 50% 0,#18264d 0,#080d18 55%)}
main{width:min(92vw,520px);padding:30px;border:1px solid #2b3a5c;border-radius:28px;background:linear-gradient(180deg,#121a2c,#0c121f);box-shadow:0 28px 80px #0008}
.eyebrow{margin:0 0 6px;color:#82a2ff;font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
h1{margin:0 0 8px;font-size:32px}.muted{color:#aab4c8;line-height:1.5}
.qr{display:grid;place-items:center;margin:22px auto;width:250px;height:250px;border-radius:22px;background:#fff;box-shadow:inset 0 1px #fff,0 12px 30px #0008}
.qr img{width:220px;height:220px}.code{font-size:32px;font-weight:950;letter-spacing:.18em;text-align:center;color:#6fe29c}
.url{margin:14px 0;padding:12px;border:1px solid #2b3a5c;border-radius:14px;background:#0a1020;word-break:break-all;color:#dce5ff}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{min-height:46px;border:1px solid #4168d8;border-radius:14px;background:linear-gradient(180deg,#5c82ff,#3559bf);color:#fff;font-weight:850;cursor:pointer;box-shadow:inset 0 1px #ffffff55,inset 0 -2px #0004,0 10px 20px #0005}
button:active{transform:translateY(1px)}
</style>
</head>
<body>
<main>
<p class="eyebrow">Halieus Game Room</p>
<h1>HGR Control</h1>
<p class="muted">Scan this QR with your phone while it is on the same tailnet, then enter the pairing code.</p>
<div class="qr"><img src="hgr-control-pairing.svg" alt="QR code for HGR Control"></div>
<div class="code">$safeCode</div>
<div class="url" id="url">$safeUrl</div>
<div class="actions">
<button onclick="navigator.clipboard.writeText(document.getElementById('url').textContent)">Copy phone link</button>
<button onclick="navigator.clipboard.writeText('$safeCode')">Copy pairing code</button>
</div>
</main>
</body>
</html>
"@
        Set-Content -LiteralPath $pairingCardPath -Value $html -Encoding UTF8
        Start-Process -FilePath $pairingCardPath | Out-Null
        return $true
    } catch {
        return $false
    }
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $statePath)) {
    $legacyListener = Get-HgrControlListener
    if ($legacyListener) {
        throw "An HGR Control Agent is already listening on 127.0.0.1:$localPort without background lifecycle state. Close the previous foreground Control window, then run Start HGR Control again."
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
            Write-Host "HGR Control is already running in the background." -ForegroundColor Green
            Write-Host "Private HTTPS URL (tailnet only):" -ForegroundColor DarkGray
            Write-Host "  $($existingState.mobileUrl)" -ForegroundColor Cyan
            if (Copy-HgrControlLink -Url ([string]$existingState.mobileUrl)) {
                Write-Host "  Phone link copied to clipboard." -ForegroundColor Green
            }
            Write-Host ""
            Write-Host "To create a fresh pairing code, stop Control first and start it again:" -ForegroundColor DarkGray
            Write-Host "  .\Stop HGR Control Mobile.cmd" -ForegroundColor DarkGray
            Write-Host "  .\Start-HGR-Control.cmd" -ForegroundColor DarkGray
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
        throw "Tailscale CLI was not found. Install/start Tailscale on this PC before using HGR Control."
    }
}

$statusRaw = & $tailscale status --json 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    throw "Tailscale is not ready. Open Tailscale, sign in, and try HGR Control again."
}
try {
    $tailscaleStatus = $statusRaw | ConvertFrom-Json
} catch {
    throw "Tailscale status could not be read as JSON."
}

$dnsName = [string]$tailscaleStatus.Self.DNSName
if ([string]::IsNullOrWhiteSpace($dnsName)) {
    throw "This Tailscale device has no MagicDNS name. HGR Control needs the private HTTPS Serve hostname."
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
    throw "The local tsx runtime is missing. Run npm install before starting HGR Control."
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

    $localPingUrl = "$target/api/ping"
    $mobilePingUrl = $mobileUrl + "api/ping"

    $localReady = $false
    for ($attempt = 0; $attempt -lt 8 -and -not $localReady; $attempt++) {
        $localReady = Test-HgrControlEndpoint -Url $localPingUrl
        if (-not $localReady) { Start-Sleep -Milliseconds 250 }
    }
    if (-not $localReady) {
        throw "HGR Control Agent opened its listener but the local API health check failed."
    }

    $mobileReady = $false
    for ($attempt = 0; $attempt -lt 12 -and -not $mobileReady; $attempt++) {
        $mobileReady = Test-HgrControlEndpoint -Url $mobilePingUrl
        if (-not $mobileReady) { Start-Sleep -Milliseconds 500 }
    }
    if (-not $mobileReady) {
        throw "HGR Control started locally, but the private Tailscale HTTPS route could not reach /api/ping. The pairing QR was not opened because the phone route is not live."
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
Write-Host "HGR Control" -ForegroundColor Yellow
Write-Host "Status:" -ForegroundColor DarkGray
Write-Host "  Running in the background" -ForegroundColor Green
Write-Host "Private HTTPS URL (tailnet only):" -ForegroundColor DarkGray
Write-Host "  $mobileUrl" -ForegroundColor Cyan
if (Copy-HgrControlLink -Url $mobileUrl) {
    Write-Host "  Phone link copied to clipboard." -ForegroundColor Green
}
Write-Host ""
Write-Host "Pairing code (valid for 10 minutes):" -ForegroundColor DarkGray
Write-Host "  $pairCode" -ForegroundColor Green
if (Show-HgrControlPairingCard -Url $mobileUrl -PairCode $pairCode) {
    Write-Host "  Pairing card opened with QR code and copy buttons." -ForegroundColor Green
} else {
    Write-Host "  QR card unavailable; use the copied link and pairing code above." -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "You can close this window. HGR Control will keep running." -ForegroundColor Green
Write-Host "To stop the background controller explicitly:" -ForegroundColor DarkGray
Write-Host "  .\Stop HGR Control Mobile.cmd" -ForegroundColor DarkGray
Write-Host ""
Write-Host "The bearer token is NOT printed. The phone receives only an HttpOnly session cookie after pairing." -ForegroundColor DarkGray
exit 0
