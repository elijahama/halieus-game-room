param(
    [string]$OracleHost = "",
    [string]$OracleUser = "ubuntu",
    [string]$KeyPath = "",
    [switch]$UseDefaultSshAuth,
    [string]$SourceZip = "",
    [switch]$PackageOnly,
    [int]$SshPort = 22,
    [string]$PublicAppUrl = "https://halieus.remotewire.net"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-HalieusVersionToNpm([string]$Version) {
    $match = [regex]::Match(([string]$Version).Trim(), '^(\d+\.\d+\.\d+)([A-Za-z])?$')
    if (-not $match.Success) { throw "Invalid Halieus VERSION: $Version" }
    if ($match.Groups[2].Success) { return "$($match.Groups[1].Value)-$($match.Groups[2].Value.ToLowerInvariant())" }
    return $match.Groups[1].Value
}

if (-not $PackageOnly) {
    foreach ($cmd in @("ssh", "scp")) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            throw "Windows command '$cmd' is required. Enable the Windows OpenSSH Client first."
        }
    }
}


function Get-HalieusPublicHealth([string]$Uri, [int]$TimeoutSeconds = 8) {
    # Windows PowerShell 5.1 can negotiate legacy TLS for Invoke-RestMethod even
    # when Edge/Brave can open the same HTTPS site. Prefer the Windows curl.exe
    # client, then fall back to Invoke-RestMethod with TLS 1.2 explicitly enabled.
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
        try {
            $connectTimeout = [Math]::Min($TimeoutSeconds, 5)
            $raw = & $curl.Source `
                "--silent" `
                "--show-error" `
                "--fail" `
                "--location" `
                "--connect-timeout" "$connectTimeout" `
                "--max-time" "$TimeoutSeconds" `
                "--header" "Cache-Control: no-cache" `
                $Uri 2>$null
            if ($LASTEXITCODE -eq 0 -and $raw) {
                return (($raw -join "`n") | ConvertFrom-Json -ErrorAction Stop)
            }
        } catch {}
    }

    $previousProtocol = [Net.ServicePointManager]::SecurityProtocol
    try {
        [Net.ServicePointManager]::SecurityProtocol = $previousProtocol -bor [Net.SecurityProtocolType]::Tls12
        return Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec $TimeoutSeconds -Headers @{ "Cache-Control" = "no-cache" }
    } finally {
        [Net.ServicePointManager]::SecurityProtocol = $previousProtocol
    }
}


if ([string]::IsNullOrWhiteSpace($OracleHost)) {
    $OracleHost = if ($env:HALIEUS_ORACLE_HOST) { $env:HALIEUS_ORACLE_HOST } else { "145.241.205.106" }
}
if ([string]::IsNullOrWhiteSpace($OracleUser)) {
    $OracleUser = if ($env:HALIEUS_ORACLE_USER) { $env:HALIEUS_ORACLE_USER } else { "ubuntu" }
}
if (-not $PackageOnly -and -not $UseDefaultSshAuth) {
    if ([string]::IsNullOrWhiteSpace($KeyPath)) {
        $KeyPath = $env:HALIEUS_ORACLE_KEY
    }
    if ([string]::IsNullOrWhiteSpace($KeyPath)) {
        throw "No SSH key was selected. Run the root Update Halieus Website launcher so it can discover your existing Oracle credential, or supply -KeyPath explicitly."
    }
    if (-not (Test-Path -LiteralPath $KeyPath)) { throw "SSH key not found: $KeyPath" }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = $scriptDir
while ($true) {
    $hasPackage = Test-Path -LiteralPath (Join-Path $projectRoot "package.json")
    $hasVersion = Test-Path -LiteralPath (Join-Path $projectRoot "VERSION")
    # Historical test snapshots under /tests also contain package.json + VERSION.
    # The real owner workspace is identified by the root updater as well, so a
    # tracked helper nested under /tests can never mistake a fixture for HGR root.
    $hasRootUpdater = Test-Path -LiteralPath (Join-Path $projectRoot "Update HGR GitHub.cmd")
    if ($hasPackage -and $hasVersion -and $hasRootUpdater) { break }

    $parent = Split-Path -Parent $projectRoot
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $projectRoot) {
        throw "Could not locate the Halieus project root above $scriptDir."
    }
    $projectRoot = $parent
}

$installer = Join-Path $scriptDir "quick-install.sh"
$versionFile = Join-Path $projectRoot "VERSION"
if (-not (Test-Path -LiteralPath $installer)) { throw "quick-install.sh not found beside this script." }

$expectedVersion = (Get-Content -LiteralPath $versionFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($expectedVersion)) { throw "VERSION is empty." }
$expectedPackageVersion = Convert-HalieusVersionToNpm $expectedVersion
$releaseManifestPath = Join-Path $projectRoot "RELEASE.json"
if (-not (Test-Path -LiteralPath $releaseManifestPath)) { throw "RELEASE.json is missing. This package has not passed release-integrity preparation." }
$releaseManifest = Get-Content -LiteralPath $releaseManifestPath -Raw | ConvertFrom-Json
$expectedFingerprint = [string]$releaseManifest.fingerprint
if ([string]::IsNullOrWhiteSpace($expectedFingerprint) -or ([string]$releaseManifest.version) -ne $expectedVersion) { throw "RELEASE.json does not match VERSION $expectedVersion." }
$integrityFileSet = @{}
foreach ($releaseFile in @($releaseManifest.integrityFiles)) {
    if (-not [string]::IsNullOrWhiteSpace([string]$releaseFile)) {
        $integrityFileSet[[string]$releaseFile] = $true
    }
}
if ($integrityFileSet.Count -lt 1) { throw "RELEASE.json does not contain the exact integrity file inventory." }
Write-Host "Exact release fingerprint: $expectedFingerprint" -ForegroundColor DarkGray

# Validate the owner workspace before any upload. This prevents a partially
# copied release (for example, VERSION updated but client/server left old) from
# being accepted as a production update.
foreach ($relative in @("package.json", "client\package.json", "server\package.json", "shared\package.json")) {
    $packagePath = Join-Path $projectRoot $relative
    if (-not (Test-Path -LiteralPath $packagePath)) { throw "Required package file missing: $relative" }
    $packageVersion = ((Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json).version)
    if ($packageVersion -ne $expectedPackageVersion) {
        throw "Mixed Halieus release detected before deploy. VERSION is $expectedVersion (npm $expectedPackageVersion) but $relative is $packageVersion. Re-extract the release."
    }
}

# Routine updates deploy from the one owner workspace. If SourceZip is supplied
# explicitly we still accept it for diagnostics, but normal releases need no
# second clean-source archive.
$tempSourceZip = Join-Path $env:TEMP "halieus-game-room-source.zip"
$createdTempSource = $false
if ([string]::IsNullOrWhiteSpace($SourceZip)) {
    Write-Host "Packing Halieus Game Room $expectedVersion for Oracle..." -ForegroundColor Cyan
    Remove-Item $tempSourceZip -Force -ErrorAction SilentlyContinue

    # Windows PowerShell 5.1 splits these ZIP types across two framework assemblies.
    # FileSystem provides ZipFile/ZipFileExtensions; System.IO.Compression provides
    # ZipArchiveMode and CompressionLevel. Load both explicitly before referencing
    # any of those types.
    Add-Type -AssemblyName System.IO.Compression -ErrorAction Stop
    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
    $archive = [System.IO.Compression.ZipFile]::Open($tempSourceZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $includeRoots = @(".github", "assets", "client", "server", "shared", "deploy", "scripts", "desktop", "tests", "docs")
        $rootFiles = @(
            "package.json",
            "package-lock.json",
            "VERSION",
            "RELEASE.json",
            ".gitignore",
            "SECURITY.md",
            "README.md",
            "ARCHITECTURE.md",
            "Start Halieus Game Room.cmd",
            "Restart Halieus Game Room.cmd",
            "Close Halieus Game Room.cmd",
            "FIRST RUN - Refresh Halieus Launchers.cmd",
            "Update HGR GitHub.cmd"
        )
        # Owner-only wrappers, private SSH helpers and Windows launcher artwork are
        # not part of the Oracle application payload.
        $optionalRootFiles = @("Update Halieus Website.cmd")

        foreach ($name in $rootFiles) {
            $full = Join-Path $projectRoot $name
            if (-not (Test-Path -LiteralPath $full)) { throw "Required deployment file missing: $name" }
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $full, $name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
        foreach ($name in $optionalRootFiles) {
            $full = Join-Path $projectRoot $name
            if (Test-Path -LiteralPath $full) {
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $full, $name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
            } else {
                Write-Host "Optional local launcher file missing; website deployment will continue: $name" -ForegroundColor DarkYellow
            }
        }

        foreach ($folder in $includeRoots) {
            $base = Join-Path $projectRoot $folder
            if (-not (Test-Path -LiteralPath $base)) { continue }
            Get-ChildItem -LiteralPath $base -File -Recurse | ForEach-Object {
                $relative = $_.FullName.Substring($projectRoot.Length).TrimStart('\','/').Replace('\','/')
                if ($relative -match '(^|/)(node_modules|dist|logs|\.runtime|\.history)(/|$)') { return }
                # server/data mixes shipped static dictionaries with private/runtime state.
                # Only release-signed server/data files are allowed into the Oracle archive.
                if ($relative -match '^server/data(/|$)' -and -not $integrityFileSet.ContainsKey($relative)) { return }
                if ($relative -match '\.(key|pem|ppk|pub)$') {
                    Write-Host "Skipping local SSH credential file: $relative" -ForegroundColor DarkYellow
                } else {
                    $trackedRoot = $relative -match '^(\.github/|assets/branding/|client/src/|client/public/|server/src/|server/data/|shared/|deploy/|tests/)'
                    if ($trackedRoot -and $relative -ne 'shared/release.ts' -and -not $integrityFileSet.ContainsKey($relative)) {
                        Write-Host "Skipping stale/untracked release file: $relative" -ForegroundColor DarkGray
                    } else {
                        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
                    }
                }
            }
        }
    }
    finally {
        $archive.Dispose()
    }
    # Release integrity is only useful if every file used to calculate the
    # fingerprint is actually present in the deployment ZIP. Validate the ZIP
    # locally before any SSH/SCP work so a packaging bug can never reach Oracle.
    $packageCheck = [System.IO.Compression.ZipFile]::OpenRead($tempSourceZip)
    try {
        $entrySet = @{}
        foreach ($entry in $packageCheck.Entries) {
            if (-not [string]::IsNullOrWhiteSpace($entry.FullName)) {
                $entrySet[$entry.FullName.Replace('\','/')] = $true
            }
        }
        $missingReleaseFiles = @()
        foreach ($releaseFile in @($releaseManifest.integrityFiles)) {
            $normalizedReleaseFile = ([string]$releaseFile).Replace('\','/')
            if (-not [string]::IsNullOrWhiteSpace($normalizedReleaseFile) -and -not $entrySet.ContainsKey($normalizedReleaseFile)) {
                $missingReleaseFiles += $normalizedReleaseFile
            }
        }
        foreach ($requiredBuildFile in @('RELEASE.json','shared/release.ts','client/tsconfig.json','client/tsconfig.node.json','server/tsconfig.json')) {
            if (-not $entrySet.ContainsKey($requiredBuildFile) -and -not ($missingReleaseFiles -contains $requiredBuildFile)) {
                $missingReleaseFiles += $requiredBuildFile
            }
        }
        if ($missingReleaseFiles.Count -gt 0) {
            throw "Deployment package is incomplete before upload. Missing release/build files: $($missingReleaseFiles -join ', ')"
        }
        Write-Host "Deployment package completeness verified: $($releaseManifest.integrityFiles.Count) release integrity inputs present." -ForegroundColor DarkGray
    }
    finally {
        $packageCheck.Dispose()
    }

    $SourceZip = $tempSourceZip
    $createdTempSource = $true
} elseif (-not (Test-Path -LiteralPath $SourceZip)) {
    throw "Source ZIP not found: $SourceZip"
}

if ($PackageOnly) {
    $createdTempSource = $false
    Write-Output $SourceZip
    exit 0
}

$target = "$OracleUser@$OracleHost"
$sshArgs = @("-p", "$SshPort", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")
$scpArgs = @("-P", "$SshPort", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")
if (-not $UseDefaultSshAuth) {
    $sshArgs += @("-i", $KeyPath, "-o", "IdentitiesOnly=yes")
    $scpArgs += @("-i", $KeyPath, "-o", "IdentitiesOnly=yes")
}

try {
    Write-Host "Uploading Halieus $expectedVersion source..." -ForegroundColor Cyan
    & scp @scpArgs $SourceZip "${target}:/tmp/halieus-game-room-source.zip"
    if ($LASTEXITCODE -ne 0) { throw "Source upload failed." }

    Write-Host "Uploading Oracle installer..." -ForegroundColor Cyan
    & scp @scpArgs $installer "${target}:/tmp/halieus-quick-install.sh"
    if ($LASTEXITCODE -ne 0) { throw "Installer upload failed." }

    Write-Host "Installing/building Halieus $expectedVersion on Oracle..." -ForegroundColor Yellow
    & ssh @sshArgs $target "sudo bash /tmp/halieus-quick-install.sh"
    if ($LASTEXITCODE -ne 0) {
        throw "Oracle installation failed. The live production data was not replaced from the laptop. Read the output above for the rollback/build error."
    }

    # Verify the exact release directly on Oracle. Public DNS/TLS is not a
    # release-integrity gate because the browser-facing route can be temporarily
    # unavailable even when the new application is correctly active on Oracle.
    Write-Host "Verifying exact release on Oracle..." -ForegroundColor Cyan
    $healthRaw = & ssh @sshArgs $target "curl -fsS -H 'Cache-Control: no-cache' http://127.0.0.1:3000/health"
    if ($LASTEXITCODE -ne 0 -or -not $healthRaw) { throw "Oracle application health check failed after deployment." }
    try { $oracleHealth = (($healthRaw -join "`n") | ConvertFrom-Json -ErrorAction Stop) } catch { throw "Oracle returned an unreadable /health response after deployment." }
    $actualVersion = [string]$oracleHealth.version
    $actualFingerprint = [string]$oracleHealth.releaseFingerprint
    if ($actualVersion -ne $expectedVersion -or $actualFingerprint -ne $expectedFingerprint) {
        throw "Oracle is serving a different release than this ZIP. Expected $expectedVersion / $expectedFingerprint; got $actualVersion / $actualFingerprint."
    }

    Write-Host "Oracle release verified: $actualVersion / $actualFingerprint" -ForegroundColor Green

    # Public check is diagnostic only. It must never turn a successful Oracle
    # application deployment into a false failure.
    $healthBase = "$($PublicAppUrl.TrimEnd('/'))/health"
    try {
        $uri = "$healthBase?build=$([uri]::EscapeDataString($expectedVersion))&refresh=$([guid]::NewGuid().ToString('N'))"
        $publicHealth = Get-HalieusPublicHealth -Uri $uri -TimeoutSeconds 8
        if ($publicHealth -and ([string]$publicHealth.version) -eq $expectedVersion -and ([string]$publicHealth.releaseFingerprint) -eq $expectedFingerprint) {
            Write-Host "Public route also reports this exact release." -ForegroundColor DarkGreen
        } else {
            $publicVersion = if ($publicHealth) { [string]$publicHealth.version } else { "unreachable" }
            Write-Host "Public route did not yet report the exact fingerprint (reported: $publicVersion). Oracle deployment is still valid; refresh the browser after DNS/proxy catches up." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Public route check was unavailable. Oracle deployment is verified, so Update will not fail for this." -ForegroundColor Yellow
    }

    Write-Host "`nHalieus application update verified: $expectedVersion" -ForegroundColor Green
    Write-Host "Production data were preserved. Routine Update did not install OS packages or reconfigure nginx/Certbot." -ForegroundColor Green
}
finally {
    if ($createdTempSource) { Remove-Item $tempSourceZip -Force -ErrorAction SilentlyContinue }
}
