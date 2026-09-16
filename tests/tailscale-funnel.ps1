# DEVELOPMENT/ADMIN ONLY: production play.halieus.net is hosted on Oracle and does not depend on this Funnel.
param(
    [int]$Port = 3000,
    [ValidateSet("start", "status", "stop", "reset")]
    [string]$Action = "start"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $tailscale) {
    $fallback = "C:\Program Files\Tailscale\tailscale.exe"
    if (Test-Path $fallback) {
        $tailscalePath = $fallback
    } else {
        throw "Tailscale is not installed or is not available in PATH."
    }
} else {
    $tailscalePath = $tailscale.Source
}

switch ($Action) {
    "start" {
        & $tailscalePath funnel --bg $Port
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & $tailscalePath funnel status
    }
    "status" {
        & $tailscalePath funnel status
    }
    "stop" {
        & $tailscalePath funnel --https=443 off
    }
    "reset" {
        & $tailscalePath funnel reset
    }
}
