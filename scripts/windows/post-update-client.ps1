param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$startLauncher = Join-Path $projectRoot "Start Halieus Game Room.cmd"
$restartLauncher = Join-Path $projectRoot "Restart Halieus Game Room.cmd"
$profilePath = Join-Path $env:LOCALAPPDATA "Halieus Game Room\Website"
$capabilityRoot = Join-Path $env:LOCALAPPDATA "Halieus Game Room"
$releaseAwareMarker = Join-Path $capabilityRoot "release-aware-refresh.enabled"

$existing = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profilePath) } |
    Select-Object -First 1

New-Item -ItemType Directory -Force -Path $capabilityRoot | Out-Null

if ($existing -and (Test-Path -LiteralPath $releaseAwareMarker)) {
    Write-Output "Existing release-aware HGR app window detected. Leaving it open so Socket.IO reconnect can refresh this window in place."
    exit 0
}

if ($existing) {
    if (-not (Test-Path -LiteralPath $restartLauncher)) {
        throw "Restart Halieus Game Room.cmd is missing; the one-time release-aware client bootstrap cannot complete."
    }

    Write-Output "Existing HGR window predates release-aware refresh. Performing the one-time bootstrap restart."
    & $restartLauncher
    if ($LASTEXITCODE -ne 0) {
        throw "Restart Halieus Game Room.cmd exited with code $LASTEXITCODE during release-aware bootstrap."
    }
    Set-Content -LiteralPath $releaseAwareMarker -Value "enabled" -Encoding ascii
    Write-Output "Release-aware HGR client bootstrap completed. Future successful updates can preserve this window."
    exit 0
}

if (-not (Test-Path -LiteralPath $startLauncher)) {
    throw "Start Halieus Game Room.cmd is missing from the HGR repository root."
}

& $startLauncher
if ($LASTEXITCODE -ne 0) {
    throw "Start Halieus Game Room.cmd exited with code $LASTEXITCODE."
}

Set-Content -LiteralPath $releaseAwareMarker -Value "enabled" -Encoding ascii
Write-Output "No existing HGR app window was found, so HGR was opened on the new release. Future updates can refresh it in place."
