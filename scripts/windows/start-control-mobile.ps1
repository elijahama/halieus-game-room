param(
    [ValidateRange(1, 65535)]
    [int]$HttpsPort = 8443
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"
$localPort = 43127
$serveStarted = $false
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

$existingRaw = & $tailscale serve status --json 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($existingRaw)) {
    try {
        $existing = $existingRaw | ConvertFrom-Json
        $matchingWeb = @($existing.Web.PSObject.Properties | Where-Object { $_.Name -match ":$HttpsPort$" })
        if ($matchingWeb.Count -gt 0) {
            $existingProxy = $null
            foreach ($webEntry in $matchingWeb) {
                $rootHandler = $webEntry.Value.Handlers.PSObject.Properties | Where-Object { $_.Name -eq "/" } | Select-Object -First 1
                if ($rootHandler -and $rootHandler.Value.Proxy) {
                    $existingProxy = [string]$rootHandler.Value.Proxy
                    break
                }
            }

            if ($existingProxy -eq $target) {
                & $tailscale serve "--https=$HttpsPort" off | Out-Null
            } else {
                throw "Tailscale Serve HTTPS port $HttpsPort is already in use by another local service."
            }
        }
    } catch {
        if ($_.Exception.Message -like "Tailscale Serve HTTPS port*") { throw }
        throw "Existing Tailscale Serve configuration could not be inspected safely."
    }
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
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
    Write-Host $serveOutput
    throw "Tailscale Serve could not expose HGR Control. If Tailscale shows an HTTPS approval link, approve it and run this launcher again."
}
$serveStarted = $true
$mobileUrl = "https://${dnsName}:$HttpsPort/"

Write-Host ""
Write-Host "HGR Control Mobile" -ForegroundColor Yellow
Write-Host "Private HTTPS URL (tailnet only):" -ForegroundColor DarkGray
Write-Host "  $mobileUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pairing code (valid for 10 minutes):" -ForegroundColor DarkGray
Write-Host "  $pairCode" -ForegroundColor Green
Write-Host ""
Write-Host "On your phone:" -ForegroundColor Yellow
Write-Host "  1. Connect Tailscale to the same tailnet." -ForegroundColor Gray
Write-Host "  2. Open the private URL above." -ForegroundColor Gray
Write-Host "  3. Enter the 8-digit pairing code." -ForegroundColor Gray
Write-Host "  4. Install HGR Control from the browser if you want the app icon." -ForegroundColor Gray
Write-Host ""
Write-Host "The bearer token is NOT printed. The phone receives only an HttpOnly session cookie after pairing." -ForegroundColor DarkGray
Write-Host "Local CLI remains available:" -ForegroundColor DarkGray
Write-Host "  & '$projectRoot\HGR-Control.cmd' status" -ForegroundColor DarkGray
Write-Host "  & '$projectRoot\HGR-Control.cmd' restart" -ForegroundColor DarkGray
Write-Host "  & '$projectRoot\HGR-Control.cmd' logs" -ForegroundColor DarkGray
Write-Host ""

Push-Location $projectRoot
try {
    & npm run control:dev
    if ($LASTEXITCODE -ne 0) {
        throw "HGR Control agent exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location

    if ($serveStarted) {
        try {
            & $tailscale serve "--https=$HttpsPort" off | Out-Null
            Write-Host "Tailscale Serve mobile route stopped." -ForegroundColor DarkGray
        } catch {
            Write-Warning "Could not automatically stop the HGR Control Tailscale Serve route."
        }
    }

    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_CODE -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PAIR_EXPIRES_AT -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_HOST -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_PORT -ErrorAction SilentlyContinue
    Write-Host "HGR Control temporary credentials removed." -ForegroundColor DarkGray
}
