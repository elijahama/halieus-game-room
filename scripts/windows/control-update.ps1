param(
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$OperationId
)

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

$progressMarkers = @(
    @{ Match = "STEP 1 - Updating LOCAL files from GitHub"; Phase = "Syncing from GitHub"; Progress = 10 },
    @{ Match = "STEP 2 - Preparing release identity"; Phase = "Preparing release identity"; Progress = 22 },
    @{ Match = "STEP 3 - HGR validation"; Phase = "Typecheck, build and regressions"; Progress = 38 },
    @{ Match = "STEP 3B - Validating the real Oracle deployment package"; Phase = "Oracle package preflight"; Progress = 54 },
    @{ Match = "STEP 4 - Reviewing local SOURCE changes"; Phase = "Reviewing source state"; Progress = 62 },
    @{ Match = "STEP 8 - Regenerating final release identity"; Phase = "Final release identity"; Progress = 70 },
    @{ Match = "STEP 8B - Final release check"; Phase = "Validating final release"; Progress = 78 },
    @{ Match = "STEP 9 - Publishing the validated HGR release"; Phase = "Publishing to Oracle"; Progress = 88 },
    @{ Match = "FINAL STEP - Refreshing the HGR client"; Phase = "Refreshing HGR client"; Progress = 96 }
)
$currentProgress = 3
$currentPhase = "Starting approved updater"

function Write-HgrUpdateCheckpoint {
    param([Parameter(Mandatory = $true)][int]$Progress,[Parameter(Mandatory = $true)][string]$Phase)
    $script:currentProgress = [Math]::Max($script:currentProgress, [Math]::Min(99, $Progress))
    if (-not [string]::IsNullOrWhiteSpace($Phase)) { $script:currentPhase = $Phase }
    Write-HgrUpdateResult -Value @{
        state = "running"; startedAt = $script:startedAt; finishedAt = $null; exitCode = $null; reason = $null
        operationId = $script:OperationId
        progress = $script:currentProgress; phase = $script:currentPhase
    }
}

function Update-HgrProgressFromLine {
    param([Parameter(Mandatory = $true)][string]$Line)
    foreach ($marker in $progressMarkers) {
        if ($Line -notlike "*$($marker.Match)*") { continue }
        $nextProgress = [int]$marker.Progress
        $nextPhase = [string]$marker.Phase
        if ($nextProgress -gt $script:currentProgress -or $nextPhase -ne $script:currentPhase) {
            Write-HgrUpdateCheckpoint -Progress $nextProgress -Phase $nextPhase
        }
        break
    }
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
    operationId = $OperationId
    progress = $currentProgress
    phase = $currentPhase
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
    & $updateLauncher 2>&1 |
        Tee-Object -FilePath $updateOutputLog |
        ForEach-Object {
            $line = [string]$_
            Update-HgrProgressFromLine -Line $line
            Write-Output $_
        }
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $failureReason = Get-HgrUpdateFailureReason -Path $updateOutputLog -ExitCode $exitCode
    } else {
        Write-HgrUpdateCheckpoint -Progress 97 -Phase "Finalizing Control handoff"
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
            operationId = $OperationId
            progress = $currentProgress
            phase = "Update failed"
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
