Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$FeedbackPath =
    Join-Path `
        $ProjectRoot `
        "server\data\feedback.ndjson"

if (-not (Test-Path $FeedbackPath)) {
    Write-Host "No feedback has been submitted yet."
    exit 0
}

$Entries =
    Get-Content $FeedbackPath |
    Where-Object {
        $_.Trim().Length -gt 0
    } |
    ForEach-Object {
        $_ | ConvertFrom-Json
    }

$Entries |
    Sort-Object submittedAt -Descending |
    Select-Object -First 30 |
    Format-List `
        submittedAt,
        category,
        playerName,
        roomCode,
        details,
        pageUrl
