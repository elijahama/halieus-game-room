param([switch]$ShowWindow)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$startLauncher = Join-Path $projectRoot "Start Halieus Game Room.cmd"
$restartLauncher = Join-Path $projectRoot "Restart Halieus Game Room.cmd"
$profilePath = Join-Path $env:LOCALAPPDATA "Halieus Game Room\Website"
$capabilityRoot = Join-Path $env:LOCALAPPDATA "Halieus Game Room"
$releaseAwareMarker = Join-Path $capabilityRoot "release-aware-refresh.enabled"
$cmdExe = (Get-Command cmd.exe -ErrorAction Stop).Source

function Test-HgrVisibleAppWindow {
    $candidates = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profilePath) }

    foreach ($candidate in $candidates) {
        $process = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
        if ($process -and $process.MainWindowHandle -ne 0) {
            return $true
        }
    }
    return $false
}

function Show-HgrVisibleAppWindow {
    # Manual Update must make the already-running dedicated Edge app visible,
    # not mistake a minimised window for a completed owner-facing handoff.
    if (-not ("HgrWindowActivation" -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class HgrWindowActivation {
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr handle, int command);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
}
'@
    }
    $candidates = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profilePath) }

    foreach ($candidate in $candidates) {
        $process = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
        if ($process -and $process.MainWindowHandle -ne 0) {
            [void][HgrWindowActivation]::ShowWindowAsync($process.MainWindowHandle, 9)
            [void][HgrWindowActivation]::SetForegroundWindow($process.MainWindowHandle)
            Write-Output "Requested foreground activation for visible dedicated HGR window."
            return $true
        }
    }
    return $false
}

function Invoke-HgrCmdLauncher {
    param([Parameter(Mandatory = $true)][string]$LauncherPath)

    if (-not (Test-Path -LiteralPath $LauncherPath)) {
        throw "HGR launcher is missing: $LauncherPath"
    }

    $escapedLauncher = $LauncherPath.Replace('"', '""')
    & $cmdExe /d /s /c "call `"$escapedLauncher`""
    if ($LASTEXITCODE -ne 0) {
        throw "$(Split-Path -Leaf $LauncherPath) exited with code $LASTEXITCODE."
    }
}

function Wait-HgrVisibleAppWindow {
    param([int]$TimeoutSeconds = 12)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if (Test-HgrVisibleAppWindow) { return $true }
        Start-Sleep -Milliseconds 350
    } while ((Get-Date) -lt $deadline)

    return $false
}

New-Item -ItemType Directory -Force -Path $capabilityRoot | Out-Null
$visibleWindow = Test-HgrVisibleAppWindow

if ($visibleWindow -and (Test-Path -LiteralPath $releaseAwareMarker)) {
    Write-Output "Existing visible release-aware HGR app window detected. Leaving it open so Socket.IO reconnect can refresh this window in place."
    if ($ShowWindow -and -not (Show-HgrVisibleAppWindow)) {
        throw "Manual Update could not restore the detected HGR window."
    }
    exit 0
}

if ($visibleWindow) {
    Write-Output "Existing visible HGR window predates release-aware refresh. Performing the one-time bootstrap restart."
    Invoke-HgrCmdLauncher -LauncherPath $restartLauncher
    if (-not (Wait-HgrVisibleAppWindow)) {
        throw "Restart completed but no visible dedicated HGR app window appeared."
    }
    Set-Content -LiteralPath $releaseAwareMarker -Value "enabled" -Encoding ascii
    if ($ShowWindow -and -not (Show-HgrVisibleAppWindow)) { throw "Manual Update could not restore the restarted HGR window." }
    Write-Output "Release-aware HGR client bootstrap completed and the visible HGR window is open."
    exit 0
}

Write-Output "No visible dedicated HGR app window was found. Opening HGR on the updated release."
Invoke-HgrCmdLauncher -LauncherPath $startLauncher
if (-not (Wait-HgrVisibleAppWindow)) {
    throw "Start completed but no visible dedicated HGR app window appeared."
}

Set-Content -LiteralPath $releaseAwareMarker -Value "enabled" -Encoding ascii
if ($ShowWindow -and -not (Show-HgrVisibleAppWindow)) { throw "Manual Update opened HGR but could not restore its window." }
Write-Output "HGR opened successfully on the new release. Future updates can refresh a visible release-aware window in place."
