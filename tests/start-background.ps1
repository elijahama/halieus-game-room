param(
    [int]$Port = 3000,
    [string]$PublicAppUrl = "http://localhost:3000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-HalieusVersionToNpm([string]$Version) {
    $match = [regex]::Match(([string]$Version).Trim(), '^(\d+\.\d+\.\d+)([A-Za-z])?$')
    if (-not $match.Success) { throw "Invalid Halieus VERSION: $Version" }
    if ($match.Groups[2].Success) { return "$($match.Groups[1].Value)-$($match.Groups[2].Value.ToLowerInvariant())" }
    return $match.Groups[1].Value
}

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerRoot = Join-Path $ProjectRoot "server"
$ServerEntry = Join-Path $ServerRoot "dist\server\src\index.js"
$ClientRoot = Join-Path $ProjectRoot "client"
$ClientIndex = Join-Path $ClientRoot "dist\index.html"
$RuntimeDirectory = Join-Path $ProjectRoot ".runtime"
$LogDirectory = Join-Path $ProjectRoot "logs"
$PidFile = Join-Path $RuntimeDirectory "halieus-game-room.pid"
$ClientBuildMarker = Join-Path $ClientRoot "dist\.halieus-game-room-version"
$ServerBuildMarker = Join-Path $ServerRoot "dist\.halieus-game-room-version"
$StdoutLog = Join-Path $LogDirectory "server.log"
$StderrLog = Join-Path $LogDirectory "server-error.log"
$BuildLog = Join-Path $LogDirectory "build.log"
$VersionFile = Join-Path $ProjectRoot "VERSION"

function Test-ViteClientBundle([string]$IndexPath) {
    if (-not (Test-Path -LiteralPath $IndexPath)) { return $false }
    try {
        $html = Get-Content -LiteralPath $IndexPath -Raw
        if ($html -notmatch '/assets/') { return $false }
        if ($html -match '<script\s+type="importmap"') { return $false }
        if ($html -match '/src/main\.(tsx|jsx|ts|js)') { return $false }
        return $true
    } catch {
        return $false
    }
}

New-Item -ItemType Directory -Force -Path $RuntimeDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $LogDirectory | Out-Null

$expectedVersion = if (Test-Path $VersionFile) {
    (Get-Content -LiteralPath $VersionFile -Raw).Trim()
} else {
    "unknown"
}

function Get-PackageVersion([string]$packageFile) {
    if (-not (Test-Path $packageFile)) { return "" }
    return ((Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json).version)
}

$expectedPackageVersion = Convert-HalieusVersionToNpm $expectedVersion
$clientPackageVersion = Get-PackageVersion (Join-Path $ClientRoot "package.json")
$serverPackageVersion = Get-PackageVersion (Join-Path $ServerRoot "package.json")
if ($clientPackageVersion -ne $expectedPackageVersion -or $serverPackageVersion -ne $expectedPackageVersion) {
    throw "Mixed Halieus Game Room release detected. VERSION is $expectedVersion (npm $expectedPackageVersion), client is $clientPackageVersion, server is $serverPackageVersion. Apply the latest update package again."
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction Stop
}

function Invoke-NpmWorkspaceBuild([string]$Workspace, [bool]$AppendLog = $false) {
    # Run npm through cmd.exe and capture its native streams directly. Piping
    # npm's stderr through Windows PowerShell can convert harmless Vite/npm
    # output into a terminating NativeCommandError when ErrorActionPreference
    # is Stop, even though npm itself returned exit code 0.
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $env:ComSpec
    $startInfo.Arguments = ('/d /s /c ""{0}" --workspace {1} run build"' -f $npmCommand.Source, $Workspace)
    $startInfo.WorkingDirectory = $ProjectRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $buildProcess = New-Object System.Diagnostics.Process
    $buildProcess.StartInfo = $startInfo
    if (-not $buildProcess.Start()) {
        throw "Unable to start the $Workspace build."
    }

    $stdoutTask = $buildProcess.StandardOutput.ReadToEndAsync()
    $stderrTask = $buildProcess.StandardError.ReadToEndAsync()
    $buildProcess.WaitForExit()
    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result

    if (-not $AppendLog) {
        Set-Content -LiteralPath $BuildLog -Value "" -Encoding utf8
    }
    if ($stdout) {
        Write-Host $stdout.TrimEnd()
        Add-Content -LiteralPath $BuildLog -Value $stdout.TrimEnd() -Encoding utf8
    }
    if ($stderr) {
        # Preserve warnings/errors in the build log and console without asking
        # PowerShell to reinterpret the native stderr stream as an exception.
        Write-Host $stderr.TrimEnd()
        Add-Content -LiteralPath $BuildLog -Value $stderr.TrimEnd() -Encoding utf8
    }

    if ($buildProcess.ExitCode -ne 0) {
        throw "$Workspace build failed with exit code $($buildProcess.ExitCode). See $BuildLog"
    }
}

$clientBuildVersion = if (Test-Path $ClientBuildMarker) {
    (Get-Content -LiteralPath $ClientBuildMarker -Raw).Trim()
} else { "" }
$clientNeedsBuild = (-not (Test-Path $ClientIndex)) -or ($clientBuildVersion -ne $expectedVersion) -or (-not (Test-ViteClientBundle $ClientIndex))

if ($clientNeedsBuild) {
    Write-Host "Preparing Halieus Game Room client for $expectedVersion..."
    Push-Location $ProjectRoot
    try {
        if (Test-Path (Join-Path $ClientRoot "dist")) {
            Remove-Item -LiteralPath (Join-Path $ClientRoot "dist") -Recurse -Force
        }
        Invoke-NpmWorkspaceBuild -Workspace "client" -AppendLog $false
    } finally {
        Pop-Location
    }
    if (-not (Test-Path $ClientIndex)) {
        throw "Client build did not produce client\dist\index.html. See $BuildLog"
    }
    if (-not (Test-ViteClientBundle $ClientIndex)) {
        throw "Client build is not a normal Vite production bundle. Refusing to serve it. See $BuildLog"
    }
    Set-Content -LiteralPath $ClientBuildMarker -Value $expectedVersion -Encoding ascii
}

$serverBuildVersion = if (Test-Path $ServerBuildMarker) {
    (Get-Content -LiteralPath $ServerBuildMarker -Raw).Trim()
} else { "" }
$serverNeedsBuild = (-not (Test-Path $ServerEntry)) -or ($serverBuildVersion -ne $expectedVersion)

if ($serverNeedsBuild) {
    Write-Host "Preparing Halieus Game Room server for $expectedVersion..."
    Push-Location $ProjectRoot
    try {
        Invoke-NpmWorkspaceBuild -Workspace "server" -AppendLog $true
    } finally {
        Pop-Location
    }
    if (-not (Test-Path $ServerEntry)) {
        throw "Server build did not produce the production server entry. See $BuildLog"
    }
    Set-Content -LiteralPath $ServerBuildMarker -Value $expectedVersion -Encoding ascii
}

$existing = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    $health = $null
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
    } catch {}

    if ($health -and $health.name -eq "Halieus Game Room Server" -and $health.version -eq $expectedVersion) {
        Write-Host "Halieus Game Room $expectedVersion is already running."
        exit 0
    }

    if ($health -and $health.name -eq "Halieus Game Room Server") {
        Write-Host "Restarting older Halieus server ($($health.version)) as $expectedVersion..."
        try {
            Stop-Process -Id $existing.OwningProcess -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 750
        } catch {
            throw "Unable to restart the older Halieus server on port $Port. Close it and run the launcher again."
        }
    } else {
        throw "Port $Port is already in use by another application. Close that application or choose another port."
    }
}

$nodeCommand = Get-Command node -ErrorAction Stop
$nodePath = $nodeCommand.Source
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
Write-Host "Halieus Game Room $expectedVersion started with PID $($process.Id)."
Write-Host "Logs: $StdoutLog"
Write-Host "Errors: $StderrLog"
