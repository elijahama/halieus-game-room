# HGR Control Cloud Update: release from an isolated GitHub main checkout.
# Never switch, reset, rebase, commit, push or mutate the owner's active worktree.
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9_-]{8,80}$')][string]$OperationId,
    [switch]$AuditOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if ($env:HGR_UPDATE_NONINTERACTIVE -ne "1" -or $env:HGR_CONTROL_DEFER_REFRESH -ne "1") {
    throw "Isolated deployment is reserved for the authenticated HGR Control Cloud Update."
}

$repoUrl = "https://github.com/elijahama/halieus-game-room.git"
$workspaceBase = Join-Path $env:LOCALAPPDATA "Halieus Game Room\isolated-cloud-updates"
$checkout = Join-Path $workspaceBase ("main-" + $OperationId)
$previousPrompt = $env:GIT_TERMINAL_PROMPT
$created = $false

function Invoke-Gate([string]$Label, [scriptblock]$Command) {
    Write-Output "[CHECK] $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Label failed; no website deployment has been started." }
}
try {
    if (Test-Path -LiteralPath $checkout) {
        throw "Isolated update directory already exists. Refusing to reuse unknown source."
    }
    New-Item -ItemType Directory -Path $workspaceBase -Force | Out-Null
    $env:GIT_TERMINAL_PROMPT = "0"
    Write-Output "STEP 1 - Fetching isolated main release from GitHub..."
    $created = $true
    Invoke-Gate "Clone protected public HGR main" {
        & git clone --no-tags --single-branch --depth 1 --branch main $repoUrl $checkout
    }
    $versionPath = Join-Path $checkout "VERSION"
    $manifestPath = Join-Path $checkout "RELEASE.json"
    $masterbookPath = Join-Path $checkout "docs\HGR_MASTERBOOK.md"
    $deployPath = Join-Path $checkout "scripts\windows\cloud-oracle-deploy.ps1"
    foreach ($file in @($versionPath, $manifestPath, $masterbookPath, $deployPath)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "GitHub main is missing a required HGR release file."
        }
    }
    Push-Location -LiteralPath $checkout
    try {
        $branch = (& git branch --show-current).Trim()
        $origin = (& git remote get-url origin).Trim()
        $dirty = @(& git status --porcelain --untracked-files=all)
        if ($branch -ne "main" -or $origin -ne $repoUrl -or $dirty.Count -ne 0) {
            throw "The isolated checkout is not a clean canonical GitHub main."
        }
        $commit = (& git rev-parse HEAD).Trim()
        $declaredVersion = (Get-Content -LiteralPath $versionPath -Raw).Trim()
        $declaredManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        if ($declaredManifest.version -ne $declaredVersion -or
            -not ([string]$declaredManifest.fingerprint).StartsWith("hgr-$declaredVersion-")) {
            throw "The GitHub release version or manifest is inconsistent."
        }
        Write-Output ("[SOURCE] Isolated main commit " + $commit.Substring(0, 12) +
            " / HGR " + $declaredVersion)
        Write-Output "STEP 2 - Verifying published release identity..."
        Invoke-Gate "Exact GitHub main release fingerprint" {
            & node "scripts\release-integrity.mjs" --verify
        }
        if ($AuditOnly) {
            Write-Output "[AUDIT] Clean main release verified. No dependencies, deploy or PC services touched."
            return
        }
        Write-Output "STEP 3 - Installing isolated release dependencies..."
        Invoke-Gate "Dependency installation" { & npm.cmd ci --no-fund --no-audit }
        Write-Output "STEP 4 - Checking security and HGR release..."
        Invoke-Gate "Security audit" { & npm.cmd audit --audit-level=high }
        Invoke-Gate "Client/server types" { & npm.cmd run typecheck }
        Invoke-Gate "Release production build" { & npm.cmd run build }
        Invoke-Gate "Full platform regression" { & npm.cmd run test:regression }
        Invoke-Gate "Oracle release package preflight" {
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tests\package-oracle-4.0.0.ps1"
        }
        Invoke-Gate "Final release fingerprint" { & node "scripts\release-integrity.mjs" --verify }

        Write-Output "STEP 9 - Publishing the validated HGR release to the website..."
        # Uses the existing owner-private key-path configuration outside the repo
        # and the exact release/fingerprint Oracle installer and rollback gates.
        Invoke-Gate "Approved Oracle release helper" {
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $deployPath
        }
        Write-Output "[OK] Oracle verified the isolated main release. Owner feature branch was not modified."
    } finally {
        Pop-Location
    }
} finally {
    if ($null -eq $previousPrompt) {
        Remove-Item Env:GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
    } else {
        $env:GIT_TERMINAL_PROMPT = $previousPrompt
    }
    if ($created -and (Test-Path -LiteralPath $checkout) -and
        $checkout.StartsWith(($workspaceBase.TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase)) {
        try { Remove-Item -LiteralPath $checkout -Recurse -Force -ErrorAction Stop }
        catch { Write-Warning "Could not remove the isolated temporary checkout; owner source was not touched." }
    }
}
