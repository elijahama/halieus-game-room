# HGR 4.5.5n - deterministic, unattended Oracle deployment for Cloud Update.
# Do not search arbitrary owner folders or open GUI credential pickers here.
# The root update-website.ps1 is an ignored owner-private helper and remains
# untouched; manual updates continue using its interactive discovery.
param(
    [string]$DeployHelperPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:HGR_UPDATE_NONINTERACTIVE -ne "1" -or $env:HGR_CONTROL_DEFER_REFRESH -ne "1") {
    throw "The unattended Oracle helper is reserved for an authenticated HGR Cloud Update."
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if ([string]::IsNullOrWhiteSpace($DeployHelperPath)) {
    $DeployHelperPath = Join-Path $projectRoot "dev-tools\Oracle Quick Deploy\deploy-from-windows.ps1"
}
if (-not (Test-Path -LiteralPath $DeployHelperPath -PathType Leaf)) {
    throw "The tracked Oracle deployment helper was not installed."
}

$ownerConfig = if ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA "Halieus Game Room\owner-update.json"
} else { $null }

# An explicit environment override wins, otherwise use the saved, owner-
# approved key path. Never log the private key path or its contents.
$keyPath = if ($env:HALIEUS_ORACLE_KEY) { [string]$env:HALIEUS_ORACLE_KEY } else { "" }
if ([string]::IsNullOrWhiteSpace($keyPath) -and $ownerConfig -and (Test-Path -LiteralPath $ownerConfig -PathType Leaf)) {
    try {
        $saved = Get-Content -LiteralPath $ownerConfig -Raw -ErrorAction Stop | ConvertFrom-Json
        if ($saved -and $saved.KeyPath) { $keyPath = [string]$saved.KeyPath }
    } catch { throw "The saved Oracle key path configuration is unreadable. Run the owner website updater interactively once." }
}

if ([string]::IsNullOrWhiteSpace($keyPath) -or -not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
    throw "Cloud Update cannot deploy: no saved, accessible Oracle SSH private key. Run the owner website updater interactively once to confirm the key."
}
$firstLine = [string](Get-Content -LiteralPath $keyPath -TotalCount 1 -ErrorAction Stop)
if ($firstLine -notmatch '^-----BEGIN (?:OPENSSH |RSA |EC |DSA |ENCRYPTED )?PRIVATE KEY-----$') {
    throw "The saved Oracle credential is not an OpenSSH/PEM private key. Cloud Update will not prompt for a different file."
}

Write-Output "[CLOUD] Using the preconfigured owner Oracle credential; no folder scan or file picker."
& $DeployHelperPath -KeyPath $keyPath
$helperSucceeded = $?
if (-not $helperSucceeded) { throw "The approved Oracle deployment helper failed." }
Write-Output "[CLOUD] Oracle deployment helper completed. Control will verify the final release identity."
