param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$startLauncher = Join-Path $projectRoot "Start Halieus Game Room.cmd"
$profilePath = Join-Path $env:LOCALAPPDATA "Halieus Game Room\Website"

$existing = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profilePath) } |
    Select-Object -First 1

if ($existing) {
    Write-Output "Existing HGR app window detected. Leaving it open so release-aware reconnect can refresh this window in place."
    exit 0
}

if (-not (Test-Path -LiteralPath $startLauncher)) {
    throw "Start Halieus Game Room.cmd is missing from the HGR repository root."
}

& $startLauncher
if ($LASTEXITCODE -ne 0) {
    throw "Start Halieus Game Room.cmd exited with code $LASTEXITCODE."
}

Write-Output "No existing HGR app window was found, so HGR was opened on the new release."
