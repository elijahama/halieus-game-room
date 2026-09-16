param(
    [int]$Port = 3000,
    [string]$PublicAppUrl = "https://play-halieus.tailab13d9.ts.net"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerRoot = Join-Path $ProjectRoot "server"
$ServerEntry = Join-Path $ServerRoot "dist\server\src\index.js"
$ClientRoot = Join-Path $ProjectRoot "client"
$ClientIndex = Join-Path $ClientRoot "dist\index.html"
$RuntimeDirectory = Join-Path $ProjectRoot ".runtime"
$LogDirectory = Join-Path $ProjectRoot "logs"
$PidFile = Join-Path $RuntimeDirectory "halieus-game-room.pid"
$ClientBuildMarker = Join-Path $ClientRoot "dist\.halieus-game-room-version"
$StdoutLog = Join-Path $LogDirectory "server.log"
$StderrLog = Join-Path $LogDirectory "server-error.log"
$BuildLog = Join-Path $LogDirectory "build.log"
$VersionFile = Join-Path $ProjectRoot "VERSION"

New-Item -ItemType Directory -Force -Path $RuntimeDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $LogDirectory | Out-Null

$expectedVersion = if (Test-Path $VersionFile) {
    (Get-Content -LiteralPath $VersionFile -Raw).Trim()
} else {
    "unknown"
}

# Release ZIPs carry the source tree and Windows-native build dependencies. If
# the client bundle was produced by an older release (or is missing), compile it
# once on this Windows machine, then reuse it on later launches.
$clientBuildVersion = if (Test-Path $ClientBuildMarker) {
    (Get-Content -LiteralPath $ClientBuildMarker -Raw).Trim()
} else {
    ""
}
$clientNeedsBuild = (-not (Test-Path $ClientIndex)) -or ($clientBuildVersion -ne $expectedVersion)

# Guard against partially-overwritten release folders. This previously produced
# confusing TypeScript errors when a new launcher was combined with stale client source.
$clientPackageFile = Join-Path $ClientRoot "package.json"
if (Test-Path $clientPackageFile) {
    $clientPackageVersion = ((Get-Content -LiteralPath $clientPackageFile -Raw | ConvertFrom-Json).version)
    if ($clientPackageVersion -ne $expectedVersion) {
        throw "Mixed Halieus Game Room release detected: VERSION is $expectedVersion but client is $clientPackageVersion. Re-extract the repair update into the project folder and overwrite existing files."
    }
}

if ($clientNeedsBuild) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction Stop
    }

    Write-Host "Preparing Halieus Game Room client for release $expectedVersion (one-time build)..."
    Push-Location $ProjectRoot
    try {
        & $npmCommand.Source --workspace client run build *>&1 | Tee-Object -FilePath $BuildLog
        if ($LASTEXITCODE -ne 0) {
            throw "Client build failed with exit code $LASTEXITCODE. See $BuildLog"
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-Path $ClientIndex)) {
        throw "The client build completed without producing client\dist\index.html. See $BuildLog"
    }
    Set-Content -LiteralPath $ClientBuildMarker -Value $expectedVersion -Encoding ascii
}

if (-not (Test-Path $ServerEntry)) {
    throw "The server has not been built. Run npm --workspace server run build first."
}

$existing = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Port $Port is already listening. The existing server will be reused."
    exit 0
}

$nodeCommand = Get-Command node -ErrorAction Stop
$nodePath = $nodeCommand.Source

# Child processes inherit these values from this PowerShell process.
$env:PORT = [string]$Port
$env:SERVE_CLIENT = "true"
$env:PUBLIC_APP_URL = $PublicAppUrl
$env:CLIENT_ORIGINS = @(
    $PublicAppUrl,
    "http://localhost:$Port",
    "http://127.0.0.1:$Port"
) -join ","

$process = Start-Process `
    -FilePath $nodePath `
    -ArgumentList @("`"$ServerEntry`"") `
    -WorkingDirectory $ServerRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $StdoutLog `
    -RedirectStandardError $StderrLog `
    -PassThru

Set-Content -LiteralPath $PidFile -Value ([string]$process.Id) -Encoding ascii
Write-Host "Halieus Game Room background server started with PID $($process.Id)."
Write-Host "Logs: $StdoutLog"
Write-Host "Errors: $StderrLog"
