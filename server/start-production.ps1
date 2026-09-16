param(
    [int]$Port = 3000,
    [string]$PublicAppUrl = "https://play-halieus.tailab13d9.ts.net"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot =
    Split-Path -Parent $MyInvocation.MyCommand.Path

$ServerRoot =
    Join-Path $ProjectRoot "server"

$ServerEntry =
    Join-Path `
        $ServerRoot `
        "dist\server\src\index.js"

$ClientIndex =
    Join-Path `
        $ProjectRoot `
        "client\dist\index.html"

if (-not (Test-Path $ServerEntry)) {
    throw "The server has not been built. Run npm run build first."
}

if (-not (Test-Path $ClientIndex)) {
    throw "The client has not been built. Run npm run build first."
}

$env:PORT = [string]$Port
$env:SERVE_CLIENT = "true"
$env:PUBLIC_APP_URL = $PublicAppUrl

$env:CLIENT_ORIGINS =
    @(
        $PublicAppUrl,
        "http://localhost:$Port",
        "http://127.0.0.1:$Port"
    ) -join ","

Set-Location $ServerRoot

Write-Host "Starting Halieus Game Room production mode..."
Write-Host ""
Write-Host "Local:"
Write-Host "http://localhost:$Port"
Write-Host ""
Write-Host "Public:"
Write-Host $PublicAppUrl
Write-Host ""
Write-Host "Press Ctrl+C to stop."

node "dist/server/src/index.js"
