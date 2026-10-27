# HGR manual Oracle deploy: use the same saved owner key path as Cloud Update.
# This script never scans folders, opens a picker, logs private key paths, copies
# credentials into HGR, or changes the Windows SSH agent service.
param(
    [string]$DeployHelperPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:HGR_UPDATE_NONINTERACTIVE -eq "1") {
    throw "Manual Oracle deployment cannot run as a Cloud Update. Use the authenticated Cloud Update path."
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if ([string]::IsNullOrWhiteSpace($DeployHelperPath)) {
    $DeployHelperPath = Join-Path $projectRoot "dev-tools\Oracle Quick Deploy\deploy-from-windows.ps1"
}
if (-not (Test-Path -LiteralPath $DeployHelperPath -PathType Leaf)) {
    throw "The tracked Oracle deployment helper is missing."
}

$ownerConfig = if ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA "Halieus Game Room\owner-update.json"
} else { $null }

$keyPath = if ($env:HALIEUS_ORACLE_KEY) { [string]$env:HALIEUS_ORACLE_KEY } else { "" }
if ([string]::IsNullOrWhiteSpace($keyPath) -and $ownerConfig -and (Test-Path -LiteralPath $ownerConfig -PathType Leaf)) {
    try {
        $saved = Get-Content -LiteralPath $ownerConfig -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        if ($saved -and $saved.KeyPath) { $keyPath = [string]$saved.KeyPath }
    } catch {
        throw "Saved Oracle SSH credential configuration is unreadable. Review the owner-only key setup."
    }
}

if ([string]::IsNullOrWhiteSpace($keyPath) -or -not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
    throw "No saved, accessible Oracle SSH private key. Configure the owner-only Oracle credential before updating."
}
$firstLine = [string](Get-Content -LiteralPath $keyPath -TotalCount 1 -ErrorAction Stop)
if ($firstLine -notmatch '^-----BEGIN (?:OPENSSH |RSA |EC |DSA |ENCRYPTED )?PRIVATE KEY-----$') {
    throw "Saved Oracle credential is not a supported SSH private key."
}

Write-Host "[ORACLE] Using the preconfigured owner SSH credential; no SSH agent or key picker required."
& $DeployHelperPath -KeyPath $keyPath
$helperSucceeded = $?
if (-not $helperSucceeded) { throw "The Oracle deployment helper failed." }
Write-Host "[ORACLE] Oracle helper completed; the updater will verify release outcome separately."
