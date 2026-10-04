param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$updateLauncher = Join-Path $projectRoot "Update HGR GitHub.cmd"
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$resultPath = Join-Path $runtimeDir "hgr-control-update-result.json"
$updateOutputLog = Join-Path $runtimeDir "hgr-control-update.out.log"
$finalizerPath = Join-Path $PSScriptRoot "control-update-finalize.ps1"
$finalizerStdout = Join-Path $runtimeDir "hgr-control-update-finalize.out.log"
$finalizerStderr = Join-Path $runtimeDir "hgr-control-update-finalize.err.log"

function Write-HgrUpdateResult {
    param([Parameter(Mandatory = $true)][hashtable]$Value)
    $json = $Value | ConvertTo-Json
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($resultPath, $json, $utf8)
}

function Get-HgrUpdateFailureReason {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][int]$ExitCode
    )

    $fallback = "Update HGR GitHub.cmd exited with code $ExitCode."
    if (-not (Test-Path -LiteralPath $Path)) {
        return $fallback
    }

    try {
        $lines = @(
            Get-Content -LiteralPath $Path -Tail 120 -ErrorAction Stop |
                ForEach-Object { ([string]$_).Trim() } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )
        if ($lines.Count -eq 0) {
            return $fallback
        }

        $important = @(
            $lines | Where-Object {
                $_ -match '\[STOPPED\]|\[ERROR\]|npm ERR!|\bFAIL\b|\bAssertionError\b|\bTS\d{4}\b|\b(error|failed|failure|missing|refused|incomplete|could not|exit(ed)? with code)\b'
            }
        )
        $selected = if ($important.Count -gt 0) {
            @($important | Select-Object -Last 6)
        } else {
            @($lines | Select-Object -Last 6)
        }

        $sanitized = @(
            $selected | ForEach-Object {
                $line = [string]$_
                $line = $line -replace [regex]::Escape($projectRoot), "<HGR_ROOT>"
                $line = $line -replace '(?i)(authorization:\s*bearer\s+)\S+', '$1<redacted>'
                $line = $line -replace '(?i)\b(token|secret|credential)\s*[:=]\s*\S+', '$1=<redacted>'
                $line
            }
        )
        $detail = ($sanitized -join " · ").Trim()
        if ([string]::IsNullOrWhiteSpace($detail)) {
            return $fallback
        }
        if ($detail.Length -gt 900) {
            $detail = $detail.Substring(0, 900)
        }
        return "Update failed: $detail"
    } catch {
        return $fallback
    }
}

if (-not (Test-Path -LiteralPath $updateLauncher)) {
    throw "Update HGR GitHub.cmd is missing from the HGR repository root."
}
if (-not (Test-Path -LiteralPath $finalizerPath)) {
    throw "The HGR Control update finalizer is missing."
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$startedAt = [DateTimeOffset]::UtcNow.ToString("o")
Write-HgrUpdateResult -Value @{
    state = "running"
    startedAt = $startedAt
    finishedAt = $null
    exitCode = $null
    reason = $null
}

$previousMode = $env:HGR_UPDATE_NONINTERACTIVE
$previousDeferRefresh = $env:HGR_CONTROL_DEFER_REFRESH
$exitCode = 1
$failureReason = $null
$finalizerStarted = $false
try {
    $env:HGR_UPDATE_NONINTERACTIVE = "1"
    # A cloud-triggered update cannot safely let the updater stop the Control
    # Agent that owns this wrapper. The normal final Control refresh is deferred
    # to an independent PowerShell finalizer after deploy/client handoff succeeds.
    $env:HGR_CONTROL_DEFER_REFRESH = "1"
    Remove-Item -LiteralPath $updateOutputLog -Force -ErrorAction SilentlyContinue
    # Stream the updater output exactly as before so Control can keep deriving
    # live progress, while also keeping a bounded local transcript that can be
    # reduced to a safe failure reason if the CMD exits non-zero.
    & $updateLauncher 2>&1 | Tee-Object -FilePath $updateOutputLog
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $failureReason = Get-HgrUpdateFailureReason -Path $updateOutputLog -ExitCode $exitCode
    } else {
        Remove-Item -LiteralPath $finalizerStdout -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $finalizerStderr -Force -ErrorAction SilentlyContinue
        $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
        $finalizer = Start-Process -FilePath $powershell -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", "`"$finalizerPath`""
        ) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $finalizerStdout -RedirectStandardError $finalizerStderr -PassThru
        Start-Sleep -Milliseconds 200
        if ($finalizer.HasExited) {
            $tail = if (Test-Path -LiteralPath $finalizerStderr) { (Get-Content -LiteralPath $finalizerStderr -Tail 20 | Out-String).Trim() } else { "" }
            $failureReason = if ($tail) { "Control update finalizer exited during startup: $tail" } else { "Control update finalizer exited during startup." }
            $exitCode = 1
        } else {
            $finalizerStarted = $true
        }
    }
} catch {
    $exitCode = 1
    $failureReason = $_.Exception.Message
} finally {
    if ($null -eq $previousMode) {
        Remove-Item Env:HGR_UPDATE_NONINTERACTIVE -ErrorAction SilentlyContinue
    } else {
        $env:HGR_UPDATE_NONINTERACTIVE = $previousMode
    }
    if ($null -eq $previousDeferRefresh) {
        Remove-Item Env:HGR_CONTROL_DEFER_REFRESH -ErrorAction SilentlyContinue
    } else {
        $env:HGR_CONTROL_DEFER_REFRESH = $previousDeferRefresh
    }

    if ($exitCode -ne 0 -or -not [string]::IsNullOrWhiteSpace($failureReason)) {
        Write-HgrUpdateResult -Value @{
            state = "failed"
            startedAt = $startedAt
            finishedAt = [DateTimeOffset]::UtcNow.ToString("o")
            exitCode = $exitCode
            reason = $failureReason
        }
    }
}

if (-not [string]::IsNullOrWhiteSpace($failureReason)) {
    throw $failureReason
}
if ($exitCode -ne 0) {
    throw "Update HGR GitHub.cmd exited with code $exitCode."
}
if (-not $finalizerStarted) {
    throw "HGR Control update finalizer did not start."
}

# Deliberately leave hgr-control-update-result.json in the running state here.
# The detached finalizer owns the Control restart and is the only process that
# can authoritatively write the final succeeded/failed marker after that restart.
Write-Output "HGR update/deploy core completed. Independent Control handoff finalizer is running."
