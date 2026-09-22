param(
    [int]$Port = 3000,
    [string]$PublicAppUrl = 'http://localhost:3000'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$StopScript = Join-Path $PSScriptRoot 'stop-background.ps1'
$StartScript = Join-Path $PSScriptRoot 'start-background.ps1'
$VersionFile = Join-Path $ProjectRoot 'VERSION'

$expectedVersion = if (Test-Path -LiteralPath $VersionFile) {
    (Get-Content -LiteralPath $VersionFile -Raw).Trim()
} else {
    'unknown'
}

Write-Host '[1/3] Stopping the current Halieus server...'
& $StopScript -Port $Port

Write-Host '[2/3] Starting Halieus Game Room again...'
& $StartScript -Port $Port -PublicAppUrl $PublicAppUrl

Write-Host '[3/3] Waiting for the restarted site...'
$deadline = (Get-Date).AddSeconds(45)
$healthy = $false
do {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
        if ($health -and $health.name -eq 'Halieus Game Room Server' -and $health.version -eq $expectedVersion) {
            $healthy = $true
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 600
} while ((Get-Date) -lt $deadline)

if (-not $healthy) {
    throw "Halieus Game Room $expectedVersion did not become healthy after restart. Check logs\server-error.log and logs\server.log."
}

$separator = if ($PublicAppUrl.Contains('?')) { '&' } else { '?' }
$launchUrl = "$PublicAppUrl${separator}build=$([uri]::EscapeDataString($expectedVersion))"
Start-Process $launchUrl
Write-Host "Halieus Game Room $expectedVersion restarted successfully."
