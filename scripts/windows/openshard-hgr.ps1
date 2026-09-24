param(
    [ValidateSet("setup","doctor","last","history","stats","tui","telemetry-off")]
    [string]$Action = "doctor"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$OpenShard = Get-Command openshard -ErrorAction SilentlyContinue

if (-not $OpenShard) {
    Write-Host ""
    Write-Host "Openshard is not installed or is not on PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommended Windows bootstrap:" -ForegroundColor Cyan
    Write-Host "  py -m ensurepip --upgrade"
    Write-Host "  py -m pip install --upgrade pip"
    Write-Host "  py -m pip install --user pipx"
    Write-Host "  py -m pipx ensurepath"
    Write-Host "  py -m pipx install openshard"
    Write-Host ""
    Write-Host "Then open a new terminal and run:"
    Write-Host "  scripts\windows\OpenShard-HGR.cmd setup"
    exit 1
}

Push-Location $RepoRoot
try {
    switch ($Action) {
        "setup" {
            & openshard setup
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            Write-Host ""
            & openshard doctor
        }
        "doctor" {
            & openshard doctor
        }
        "last" {
            & openshard last --more
        }
        "history" {
            & openshard history
        }
        "stats" {
            & openshard stats
        }
        "tui" {
            & openshard tui
        }
        "telemetry-off" {
            & openshard telemetry off
        }
    }

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
